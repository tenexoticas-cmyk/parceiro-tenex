export default function RootLayout({ children }) {
  return (
    <html lang="pt-BR">
      <body style={{ margin: 0, fontFamily: "Arial, sans-serif" }}>
        <header
          style={{
            borderBottom: "1px solid #eee",
            padding: "14px 24px",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <a href="/" style={{ textDecoration: "none", color: "black", fontWeight: 800 }}>
            Parceiro Tenex
          </a>

          <nav style={{ display: "flex", gap: 14 }}>
            <a href="/" style={{ textDecoration: "none", color: "black" }}>Home</a>
            <a href="/indicar" style={{ textDecoration: "none", color: "black" }}>Indicar</a>
            <a href="/painel" style={{ textDecoration: "none", color: "black" }}>Painel</a>
          </nav>
        </header>

        <div>{children}</div>
      </body>
    </html>
  );
}
