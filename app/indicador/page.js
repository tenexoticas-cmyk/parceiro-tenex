"use client";

import { useMemo, useState } from "react";
import { supabase } from "../../lib/supabaseClient";

function money(n) {
  const v = Number(n || 0);
  return `R$ ${v.toFixed(2)}`;
}

export default function Indicador() {
  const [whats, setWhats] = useState("");
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState("");

  const [credits, setCredits] = useState([]);
  const [usages, setUsages] = useState([]);
  const [referrals, setReferrals] = useState([]);
  const [rewards, setRewards] = useState([]);

  const referralLink = useMemo(() => {
    if (!whats) return "";
    if (typeof window === "undefined") return "";
    return `${window.location.origin}/i/${encodeURIComponent(whats)}`;
  }, [whats]);

  const whatsappShareLink = useMemo(() => {
    if (!referralLink) return "";
    const text = `Seu link de indicação Tenex 👇

${referralLink}

Compartilhe com seus amigos. Quando eles comprarem, você ganha créditos para usar na loja.`;
    return `https://wa.me/?text=${encodeURIComponent(text)}`;
  }, [referralLink]);

  const qrCodeUrl = useMemo(() => {
    if (!referralLink) return "";
    return `https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(referralLink)}`;
  }, [referralLink]);

  async function copyLink() {
    if (!referralLink) return;
    try {
      await navigator.clipboard.writeText(referralLink);
      setMsg("Link copiado ✅");
    } catch {
      setMsg("Não consegui copiar. Copie manualmente.");
    }
  }

  const activeCredits = useMemo(() => {
    const now = new Date().toISOString();
    return (credits || []).filter(
      (c) => Number(c.remaining_amount || 0) > 0 && String(c.expires_at) > now
    );
  }, [credits]);

  const balance = useMemo(() => {
    return activeCredits.reduce((sum, c) => sum + Number(c.remaining_amount || 0), 0);
  }, [activeCredits]);

  const validPurchasesCount = useMemo(() => {
    return (referrals || []).filter(
      (r) => r.status === "validado" && Number(r.purchase_value || 0) > 0
    ).length;
  }, [referrals]);

  const totalRewardsEarned = useMemo(
    () => Math.floor(validPurchasesCount / 3),
    [validPurchasesCount]
  );

  const rewardsDelivered = useMemo(
    () => (rewards || []).filter((r) => r.delivered).length,
    [rewards]
  );

  const rewardsPending = useMemo(
    () => totalRewardsEarned - rewardsDelivered,
    [totalRewardsEarned, rewardsDelivered]
  );

  async function load() {
    if (!whats.trim()) return;

    setLoading(true);
    setMsg("");

    const { data: credData, error: credErr } = await supabase
      .from("credits")
      .select("id, amount, remaining_amount, expires_at, created_at, referral_id")
      .eq("user_whatsapp", whats.replace(/\D/g, ""))
      .order("created_at", { ascending: true });

    const { data: useData, error: useErr } = await supabase
      .from("credit_usages")
      .select("id, used_amount, sale_value, product_type, payment_type, created_at, breakdown")
      .eq("user_whatsapp", whats.replace(/\D/g, ""))
      .order("created_at", { ascending: false });

    const { data: refData, error: refErr } = await supabase
      .from("referrals")
      .select("id, referred_name, referred_whatsapp, status, purchase_value, created_at")
      .eq("user_whatsapp", whats.replace(/\D/g, ""))
      .order("created_at", { ascending: false });

    const { data: rewData, error: rewErr } = await supabase
      .from("rewards")
      .select("id, reward_type, referral_count, delivered, created_at")
      .eq("user_whatsapp", whats.replace(/\D/g, ""))
      .order("created_at", { ascending: false });

    setLoading(false);

    if (credErr || useErr || refErr || rewErr) {
      setMsg("Erro ao carregar dados. Confira o WhatsApp e tente novamente.");
      setCredits([]);
      setUsages([]);
      setReferrals([]);
      setRewards([]);
      return;
    }

    setCredits(credData || []);
    setUsages(useData || []);
    setReferrals(refData || []);
    setRewards(rewData || []);
    setMsg("Dados carregados ✅");
  }

  return (
    <main style={{ padding: 24, maxWidth: 1100, margin: "0 auto" }}>
      <h1>Painel do Indicador</h1>

      <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 12 }}>
        <input
          placeholder="WhatsApp do indicador (só números)"
          value={whats}
          onChange={(e) => setWhats(e.target.value)}
          style={{ padding: 10, borderRadius: 10, border: "1px solid #ddd", minWidth: 280 }}
        />
        <button
          onClick={load}
          disabled={loading}
          style={{
            background: "black",
            color: "white",
            border: "none",
            padding: "10px 14px",
            borderRadius: 12,
            cursor: "pointer",
            fontWeight: 900,
          }}
        >
          {loading ? "Carregando..." : "Buscar"}
        </button>
        {msg ? <div style={{ alignSelf: "center", fontSize: 13, opacity: 0.85 }}>{msg}</div> : null}
      </div>

      {referralLink ? (
        <div
          style={{
            marginTop: 16,
            border: "1px solid #eee",
            borderRadius: 14,
            padding: 16,
            display: "grid",
            gap: 16,
            gridTemplateColumns: "1.5fr 260px",
            alignItems: "center",
          }}
        >
          <div>
            <div style={{ fontSize: 12, opacity: 0.75 }}>Seu link de indicação</div>
            <div style={{ fontWeight: 800, wordBreak: "break-all", marginTop: 6 }}>
              {referralLink}
            </div>

            <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 14 }}>
              <button
                onClick={copyLink}
                style={{
                  background: "black",
                  color: "white",
                  border: "none",
                  padding: "10px 14px",
                  borderRadius: 12,
                  cursor: "pointer",
                  fontWeight: 900,
                }}
              >
                Copiar link
              </button>

              <a
                href={whatsappShareLink}
                target="_blank"
                rel="noreferrer"
                style={{
                  background: "#25D366",
                  color: "white",
                  textDecoration: "none",
                  padding: "10px 14px",
                  borderRadius: 12,
                  fontWeight: 900,
                  display: "inline-flex",
                  alignItems: "center",
                }}
              >
                Compartilhar no WhatsApp
              </a>
            </div>
          </div>

          <div style={{ textAlign: "center" }}>
            <div style={{ fontSize: 12, opacity: 0.75, marginBottom: 8 }}>QR Code do link</div>
            <img
              src={qrCodeUrl}
              alt="QR Code do link de indicação"
              style={{
                width: 220,
                height: 220,
                maxWidth: "100%",
                border: "1px solid #eee",
                borderRadius: 12,
              }}
            />
          </div>
        </div>
      ) : null}

      <div
        style={{
          display: "grid",
          gap: 10,
          gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
          marginTop: 16,
        }}
      >
        <div style={{ border: "1px solid #eee", borderRadius: 14, padding: 14 }}>
          <div style={{ fontSize: 12, opacity: 0.75 }}>Saldo disponível</div>
          <div style={{ fontSize: 22, fontWeight: 900 }}>{money(balance)}</div>
          <div style={{ fontSize: 12, opacity: 0.75, marginTop: 6 }}>
            Considera créditos com saldo e não vencidos
          </div>
        </div>

        <div style={{ border: "1px solid #eee", borderRadius: 14, padding: 14 }}>
          <div style={{ fontSize: 12, opacity: 0.75 }}>Compras válidas geradas</div>
          <div style={{ fontSize: 22, fontWeight: 900 }}>{validPurchasesCount}</div>
          <div style={{ fontSize: 12, opacity: 0.75, marginTop: 6 }}>
            (validado + compra &gt; 0)
          </div>
        </div>

        <div style={{ border: "1px solid #eee", borderRadius: 14, padding: 14 }}>
          <div style={{ fontSize: 12, opacity: 0.75 }}>Prêmios</div>
          <div style={{ fontSize: 22, fontWeight: 900 }}>
            {rewardsPending > 0 ? `🎁 ${rewardsPending} pendente(s)` : "✅ Nenhum pendente"}
          </div>
          <div style={{ fontSize: 12, opacity: 0.75, marginTop: 6 }}>
            Ganhos: {totalRewardsEarned} • Entregues: {rewardsDelivered}
          </div>
        </div>
      </div>

      <div style={{ marginTop: 18, border: "1px solid #eee", borderRadius: 14, padding: 14 }}>
        <h2 style={{ margin: 0, fontSize: 16 }}>Regras do crédito</h2>
        <ul style={{ marginTop: 10, lineHeight: 1.7 }}>
          <li>Geração: <b>10%</b> do valor da compra do indicado (quando a compra é validada).</li>
          <li>Validade: <b>365 dias</b>.</li>
          <li>Uso em produtos gerais: até <b>35% à vista</b> ou <b>25% parcelado</b>.</li>
          <li>Uso em lentes de contato: até <b>15% à vista</b> ou <b>8% parcelado</b>.</li>
          <li>Bônus: a cada <b>3 compras válidas</b> → <b>1 Óculos Exclusivo Tenex</b> (acumulativo).</li>
        </ul>
      </div>

      <div style={{ marginTop: 18 }}>
        <h2 style={{ fontSize: 16, marginBottom: 8 }}>Créditos ativos</h2>
        {activeCredits.length === 0 ? (
          <p style={{ opacity: 0.8 }}>Nenhum crédito ativo.</p>
        ) : (
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ borderBottom: "2px solid #eee" }}>
                <th align="left">Saldo</th>
                <th align="left">Vencimento</th>
                <th align="left">Criado em</th>
              </tr>
            </thead>
            <tbody>
              {activeCredits.map((c) => (
                <tr key={c.id} style={{ borderTop: "1px solid #eee" }}>
                  <td>{money(c.remaining_amount)}</td>
                  <td>{new Date(c.expires_at).toLocaleDateString()}</td>
                  <td>{new Date(c.created_at).toLocaleDateString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <div style={{ marginTop: 18 }}>
        <h2 style={{ fontSize: 16, marginBottom: 8 }}>Histórico de uso</h2>
        {usages.length === 0 ? (
          <p style={{ opacity: 0.8 }}>Nenhum uso registrado.</p>
        ) : (
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ borderBottom: "2px solid #eee" }}>
                <th align="left">Usou</th>
                <th align="left">Venda</th>
                <th align="left">Tipo</th>
                <th align="left">Pagamento</th>
                <th align="left">Data</th>
              </tr>
            </thead>
            <tbody>
              {usages.map((u) => (
                <tr key={u.id} style={{ borderTop: "1px solid #eee" }}>
                  <td>{money(u.used_amount)}</td>
                  <td>{money(u.sale_value)}</td>
                  <td>{u.product_type}</td>
                  <td>{u.payment_type}</td>
                  <td>{new Date(u.created_at).toLocaleDateString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <div style={{ marginTop: 18 }}>
        <h2 style={{ fontSize: 16, marginBottom: 8 }}>Indicações</h2>
        {referrals.length === 0 ? (
          <p style={{ opacity: 0.8 }}>Nenhuma indicação encontrada.</p>
        ) : (
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ borderBottom: "2px solid #eee" }}>
                <th align="left">Indicado</th>
                <th align="left">Whats</th>
                <th align="left">Status</th>
                <th align="left">Compra</th>
                <th align="left">Data</th>
              </tr>
            </thead>
            <tbody>
              {referrals.map((r) => (
                <tr key={r.id} style={{ borderTop: "1px solid #eee" }}>
                  <td>{r.referred_name}</td>
                  <td>{r.referred_whatsapp}</td>
                  <td>{r.status}</td>
                  <td>{r.purchase_value ? money(r.purchase_value) : "-"}</td>
                  <td>{new Date(r.created_at).toLocaleDateString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </main>
  );
}
