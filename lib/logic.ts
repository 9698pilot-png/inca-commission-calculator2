import nonlifePayout from "./data/nonlife_payout.json";
import nonlifeSasang from "./data/nonlife_sasang.json";

export type InsuranceType = "손보" | "생보";
export type FaGrade = "도전" | "일반" | "표준" | "우수" | "프로" | "VIP" | "노블레스" | "시그니처";

export type CalcInput = {
  insuranceType: InsuranceType;
  insurer: string;
  productGroup: string; // 예: 보장/연금/저축 (손보)
  faGrade: FaGrade;

  인정실적: number;   // 원
  수정률_or_환산률: number; // %가 아니라 '배수' (예: 1.2)
  월보험료: number;   // 원

  // 생보 초회에만 적용되는 "2~25회 통산유지율(%)"
  lifePersistRatePct?: number; // 0~100

  // 변동항목(사용자가 직접 입력)
  보험사시상_원?: number;
};

export type CalcOutput = {
  errors: string[];
  warnings: string[];

  basicFirst: number;   // 기본수수료-초회
  basicManage: number;  // 기본수수료-계약관리(분급 총합 개념)
  basicTotal: number;

  insurerAward: number; // 보험사 시상(직접 입력)
  incaDirect: number;   // 인카 직영 법인시상
  incaExtra: number;    // 인카 추가시상

  settlement: number;   // 정착지원금
  grandTotal: number;
};

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

export function faGradeFromRecognized(인정실적: number): FaGrade {
  if (인정실적 < 300_000) return "도전";
  if (인정실적 < 500_000) return "일반";
  if (인정실적 < 700_000) return "표준";
  if (인정실적 < 1_000_000) return "우수";
  if (인정실적 < 1_500_000) return "프로";
  if (인정실적 < 2_000_000) return "VIP";
  if (인정실적 < 2_500_000) return "노블레스";
  return "시그니처";
}

export function settlementSupport(monthNo: number, recognized: number): number {
  // 지급액 상한 500만원
  const cap = 5_000_000;
  let pay = 0;

  if (monthNo >= 1 && monthNo <= 12) {
    if (recognized < 300_000) pay = 0;
    else if (recognized < 1_000_000) pay = recognized * 1.5;
    else if (recognized < 2_000_000) pay = recognized * 1.8;
    else pay = recognized * 2.0;
  } else if (monthNo >= 13 && monthNo <= 24) {
    if (recognized < 300_000) pay = 0;
    else pay = recognized * 1.0;
  } else {
    pay = 0;
  }
  return Math.min(pay, cap);
}

function lifePersistMultiplier(pct: number | undefined): number {
  if (pct === undefined || Number.isNaN(pct)) return 1.0; // 입력 안하면 100%로 간주(사용자 요구에 따라 변경 가능)
  const p = clamp(pct, 0, 100);
  if (p >= 85) return 1.0;
  if (p >= 75) return 0.9;
  if (p >= 70) return 0.85;
  return 0.8;
}

function getNonlifeRates(insurer: string, productGroup: string, grade: FaGrade) {
  const rec = (nonlifePayout as any[]).find(r =>
    r.insurer === insurer && r.product_group === productGroup && r.fa_grade === grade
  );
  if (!rec) return null;
  return {
    firstPct: Number(rec.first_pct),     // 예: 276.66 (%=배수*100)
    managePct: Number(rec.renewal_pct),  // 예: 70.67
  };
}

function pctToMultiplier(pct: number): number {
  // 276.66% -> 2.7666
  return pct / 100.0;
}

export function calc(input: CalcInput, monthNo: number): CalcOutput {
  const errors: string[] = [];
  const warnings: string[] = [];

  // NOTE: 노블레스/시그니처 적용 조건은 MVP에서는 안내문(하단)으로만 표기
  if ((input.faGrade === "노블레스" || input.faGrade === "시그니처")) {
    warnings.push("노블레스/시그니처 등급은 손보+생보 합산 25회차 통산유지율 90% 이상 시 적용(안내).");
  }

  // 기본: (인정실적 x 수정률/환산률) x 지급률
  const basePremium = input.인정실적 * input.수정률_or_환산률;

  let firstPct: number | null = null;
  let managePct: number | null = null;

  if (input.insuranceType === "손보") {
    const r = getNonlifeRates(input.insurer, input.productGroup, input.faGrade);
    if (!r) {
      errors.push("손보 지급률 정보없음(보험사/상품군/등급 조합).");
    } else {
      firstPct = r.firstPct;
      managePct = r.managePct;
    }
  } else {
    // 생보 지급률표 파싱은 추후 확장 (현재는 수동 입력 또는 별도 데이터로 연결)
    errors.push("생보 지급률표(보험사/상품/등급) 연결이 아직 필요합니다. 현재는 정보없음 처리.");
  }

  const lifeMult = input.insuranceType === "생보" ? lifePersistMultiplier(input.lifePersistRatePct) : 1.0;

  const basicFirst = firstPct === null ? 0 : basePremium * pctToMultiplier(firstPct) * lifeMult;
  const basicManage = managePct === null ? 0 : basePremium * pctToMultiplier(managePct); // 생보는 추후 별도
  const basicTotal = basicFirst + basicManage;

  // 보험사 시상(직접 입력)
  const insurerAward = Math.max(0, input.보험사시상_원 ?? 0);

  // 인카 직영/추가: 월보험료 기준, 보험사별 % (없으면 정보없음)
  const sasang = (nonlifeSasang as any)[input.insurer];
  let incaDirect = 0;
  let incaExtra = 0;

  if (!sasang) {
    warnings.push("인카 시상표에서 보험사 정보를 찾지 못했습니다(직영/추가 시상: 정보없음).");
  } else {
    const directPct = sasang.direct_pct as number | null;
    const extraPct = sasang.extra_pct as number | null;

    if (directPct === null || directPct === undefined) warnings.push("직영시상: 정보없음");
    else incaDirect = input.월보험료 * pctToMultiplier(directPct);

    if (extraPct === null || extraPct === undefined) warnings.push("추가시상: 정보없음");
    else incaExtra = input.월보험료 * pctToMultiplier(extraPct);
  }

  const settlement = settlementSupport(monthNo, input.인정실적);

  const grandTotal = basicTotal + insurerAward + incaDirect + incaExtra + settlement;

  return {
    errors,
    warnings,
    basicFirst,
    basicManage,
    basicTotal,
    insurerAward,
    incaDirect,
    incaExtra,
    settlement,
    grandTotal,
  };
}
