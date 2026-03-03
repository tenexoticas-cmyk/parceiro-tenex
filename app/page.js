export default function Home() {
  return (
    <main style={{ padding: 24, fontFamily: "Arial, sans-serif", maxWidth: 900, margin: "0 auto" }}>
      <h1 style={{ fontSize: 42, marginBottom: 8 }}>Parceiro Tenex 🚀</h1>
      <p style={{ fontSize: 18, opacity: 0.85, marginBottom: 18 }}>
        Indique amigos para a Tenex e acompanhe seus créditos de forma simples.
      </p>

      <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginTop: 18 }}>
        <a
          href="/indicar"
          style={{
            background: "black",
            color: "white",
            padding: "12px 16px",
            borderRadius: 10,
            textDecoration: "none",
            fontWeight: 700,
          }}
        >
          Fazer uma indicação
        </a>

        <a
          href="/painel"
          style={{
            border: "1px solid #ddd",
            padding: "12px 16px",
            borderRadius: 10,
            textDecoration: "none",
            fontWeight: 700,
          }}
        >
          Ver meu painel
        </a>
      </div>

      <div style={{ marginTop: 28, padding: 16, border: "1px solid #eee", borderRadius: 12 }}>
        <h2 style={{ margin: 0, fontSize: 18 }}>Como funciona</h2>
        <ol style={{ marginTop: 10, lineHeight: 1.6 }}>
          <li>Você indica alguém.</li>
          <li>Quando a pessoa compra, você recebe crédito.</li>
          <li>O crédito fica disponível por até <b>365 dias</b>.</li>
        </ol>
      </div>
    </main>
  );
}
