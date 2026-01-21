export const metadata = {
  title: "인카 수수료 계산기",
  description: "인카 수수료 계산기 (MVP)",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ko">
      <body style={{ margin: 0 }}>{children}</body>
    </html>
  );
}
