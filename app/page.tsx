"use client";

import React, { useMemo, useState } from "react";
import nonlifeSasang from "../lib/data/nonlife_sasang.json";
import nonlifePayout from "../lib/data/nonlife_payout.json";
import { calc, faGradeFromRecognized, settlementSupport, type InsuranceType, type FaGrade } from "../lib/logic";

const INSURERS_NONLIFE = ["삼성","현대","DB","KB","메리츠","한화","롯데","흥국","MG","농협","AIG","하나","라이나"];
const FA_GRADES: FaGrade[] = ["도전","일반","표준","우수","프로","VIP","노블레스","시그니처"];
const PRODUCT_GROUPS_NONLIFE = ["보장","연금","저축"];

function fmt(n: number) {
  return new Intl.NumberFormat("ko-KR").format(Math.round(n));
}

export default function Page() {
  const [insuranceType, setInsuranceType] = useState<InsuranceType>("손보");
  const [insurer, setInsurer] = useState<string>("메리츠");
  const [productGroup, setProductGroup] = useState<string>("보장");

  const [recognized, setRecognized] = useState<number>(700_000);
  const [rateFactor, setRateFactor] = useState<number>(1.0);
  const [monthlyPremium, setMonthlyPremium] = useState<number>(100_000);

  const [lifePersist, setLifePersist] = useState<number>(85);
  const [monthNo, setMonthNo] = useState<number>(1);
  const [insurerAward, setInsurerAward] = useState<number>(0);

  const autoGrade = useMemo(() => faGradeFromRecognized(recognized), [recognized]);
  const [faGrade, setFaGrade] = useState<FaGrade>("우수");

  // keep faGrade synced to autoGrade unless user changed
  React.useEffect(() => {
    setFaGrade(autoGrade);
  }, [autoGrade]);

  const out = useMemo(() => calc({
    insuranceType,
    insurer,
    productGroup,
    faGrade,
    인정실적: recognized,
    수정률_or_환산률: rateFactor,
    월보험료: monthlyPremium,
    lifePersistRatePct: insuranceType === "생보" ? lifePersist : undefined,
    보험사시상_원: insurerAward,
  }, monthNo), [insuranceType, insurer, productGroup, faGrade, recognized, rateFactor, monthlyPremium, lifePersist, monthNo, insurerAward]);

  const settlement = useMemo(() => settlementSupport(monthNo, recognized), [monthNo, recognized]);

  const hasSasang = (nonlifeSasang as any)[insurer] != null;

  return (
    <main style={{ maxWidth: 880, margin: "0 auto", padding: 16, fontFamily: "system-ui, -apple-system, Segoe UI, Roboto, sans-serif" }}>
      <h1 style={{ fontSize: 22, fontWeight: 800, marginBottom: 8 }}>인카 수수료 계산기 (MVP)</h1>
      <p style={{ marginTop: 0, color: "#555" }}>
        데이터가 없으면 <b>정보없음</b>으로 표시하고 해당 항목은 0원 처리됩니다.
      </p>

      <section style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        <div style={{ border: "1px solid #ddd", borderRadius: 12, padding: 12 }}>
          <h2 style={{ fontSize: 16, marginTop: 0 }}>기본 입력</h2>

          <label style={{ display: "block", marginBottom: 8 }}>
            구분
            <select value={insuranceType} onChange={e => setInsuranceType(e.target.value as InsuranceType)} style={{ display: "block", width: "100%", padding: 8, marginTop: 4 }}>
              <option value="손보">손보</option>
              <option value="생보">생보</option>
            </select>
          </label>

          <label style={{ display: "block", marginBottom: 8 }}>
            보험사
            <select value={insurer} onChange={e => setInsurer(e.target.value)} style={{ display: "block", width: "100%", padding: 8, marginTop: 4 }}>
              {INSURERS_NONLIFE.map(n => <option key={n} value={n}>{n}</option>)}
            </select>
          </label>

          {insuranceType === "손보" && (
            <label style={{ display: "block", marginBottom: 8 }}>
              상품군(예시표 기준)
              <select value={productGroup} onChange={e => setProductGroup(e.target.value)} style={{ display: "block", width: "100%", padding: 8, marginTop: 4 }}>
                {PRODUCT_GROUPS_NONLIFE.map(g => <option key={g} value={g}>{g}</option>)}
              </select>
            </label>
          )}

          <label style={{ display: "block", marginBottom: 8 }}>
            인정실적(원)
            <input type="number" value={recognized} onChange={e => setRecognized(Number(e.target.value))} style={{ display: "block", width: "100%", padding: 8, marginTop: 4 }} />
          </label>

          <label style={{ display: "block", marginBottom: 8 }}>
            수정률/환산률(배수)
            <input type="number" step="0.01" value={rateFactor} onChange={e => setRateFactor(Number(e.target.value))} style={{ display: "block", width: "100%", padding: 8, marginTop: 4 }} />
            <small style={{ color: "#666" }}>예: 1.2 (120%가 아니라 ‘배수’로 입력)</small>
          </label>

          <label style={{ display: "block", marginBottom: 8 }}>
            월보험료(원)
            <input type="number" value={monthlyPremium} onChange={e => setMonthlyPremium(Number(e.target.value))} style={{ display: "block", width: "100%", padding: 8, marginTop: 4 }} />
          </label>

          <label style={{ display: "block", marginBottom: 8 }}>
            FA 등급 (인정실적 기준 자동 선택)
            <select value={faGrade} onChange={e => setFaGrade(e.target.value as FaGrade)} style={{ display: "block", width: "100%", padding: 8, marginTop: 4 }}>
              {FA_GRADES.map(g => <option key={g} value={g}>{g}</option>)}
            </select>
            <small style={{ color: "#666" }}>자동 계산 등급: <b>{autoGrade}</b></small>
          </label>

          {insuranceType === "생보" && (
            <label style={{ display: "block", marginBottom: 8 }}>
              2~25회 통산유지율(%)
              <input type="number" value={lifePersist} onChange={e => setLifePersist(Number(e.target.value))} style={{ display: "block", width: "100%", padding: 8, marginTop: 4 }} />
              <small style={{ color: "#666" }}>초회에만 반영: 85%↑ 100%, 75~85% 90%, 70~75% 85%, 70%↓ 80%</small>
            </label>
          )}

          <label style={{ display: "block", marginBottom: 8 }}>
            위촉 차월(1~24)
            <input type="number" value={monthNo} onChange={e => setMonthNo(Number(e.target.value))} style={{ display: "block", width: "100%", padding: 8, marginTop: 4 }} />
            <small style={{ color: "#666" }}>정착지원금 자동 계산(지급액 상한 500만원)</small>
          </label>

          <label style={{ display: "block", marginBottom: 8 }}>
            보험사 시상(원) — 직접 입력
            <input type="number" value={insurerAward} onChange={e => setInsurerAward(Number(e.target.value))} style={{ display: "block", width: "100%", padding: 8, marginTop: 4 }} />
          </label>

          <div style={{ marginTop: 10, padding: 10, background: "#fafafa", borderRadius: 10, border: "1px solid #eee" }}>
            <div style={{ fontSize: 13, color: "#444" }}>
              ※ 노블레스/시그니처 등급은 손보+생보 합산 25회차 통산유지율 90% 이상 시 적용(안내).
            </div>
          </div>
        </div>

        <div style={{ border: "1px solid #ddd", borderRadius: 12, padding: 12 }}>
          <h2 style={{ fontSize: 16, marginTop: 0 }}>계산 결과</h2>

          {out.errors.length > 0 && (
            <div style={{ padding: 10, border: "1px solid #f2c2c2", background: "#fff5f5", borderRadius: 10, marginBottom: 10 }}>
              <b>정보없음/에러</b>
              <ul style={{ marginTop: 6 }}>
                {out.errors.map((e, idx) => <li key={idx}>{e}</li>)}
              </ul>
            </div>
          )}

          {out.warnings.length > 0 && (
            <div style={{ padding: 10, border: "1px solid #ffe7b3", background: "#fffaf0", borderRadius: 10, marginBottom: 10 }}>
              <b>안내</b>
              <ul style={{ marginTop: 6 }}>
                {out.warnings.map((w, idx) => <li key={idx}>{w}</li>)}
              </ul>
            </div>
          )}

          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <tbody>
              <Row label="기본수수료-초회" value={out.basicFirst} />
              <Row label="기본수수료-계약관리(분급 합)" value={out.basicManage} />
              <Row label="기본수수료 합계" value={out.basicTotal} bold />
              <Sep />
              <Row label="보험사 시상(직접입력)" value={out.insurerAward} />
              <Row label="인카 직영 법인시상(익월, 월보험료×80%)" value={out.incaDirect} note={hasSasang ? "" : "정보없음"} />
              <Row label="인카 추가시상(월보험료×(260~400%) 등)" value={out.incaExtra} note={hasSasang ? "" : "정보없음"} />
              <Sep />
              <Row label="정착지원금" value={out.settlement} />
              <Sep />
              <Row label="총 수령 수수료(합산)" value={out.grandTotal} bold />
            </tbody>
          </table>
        </div>
      </section>

      <footer style={{ marginTop: 16, color: "#666", fontSize: 13 }}>
        <div>• 손보 지급률은 업로드된 “직영_손보 수수료 예시표.xlsx(손보_테이블)”에서 추출된 데이터만 포함되어 있습니다.</div>
        <div>• 생보 지급률 연결은 다음 단계에서 “직영_생보 수수료 예시표.xlsx” 파싱/정규화로 확장합니다.</div>
      </footer>
    </main>
  );
}

function Row({ label, value, bold, note }: { label: string; value: number; bold?: boolean; note?: string }) {
  return (
    <tr style={{ borderTop: "1px solid #eee" }}>
      <td style={{ padding: "10px 6px", verticalAlign: "top" }}>
        <div style={{ fontWeight: bold ? 800 : 600 }}>{label}</div>
        {note ? <div style={{ fontSize: 12, color: "#b00" }}>{note}</div> : null}
      </td>
      <td style={{ padding: "10px 6px", textAlign: "right", fontWeight: bold ? 900 : 700 }}>
        {fmt(value)} 원
      </td>
    </tr>
  );
}
function Sep() {
  return (
    <tr>
      <td colSpan={2} style={{ height: 8 }} />
    </tr>
  );
}
