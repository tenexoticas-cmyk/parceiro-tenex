"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "../../lib/supabaseClient";
import { checkAdmin } from "../../lib/checkAdmin";

function pctLimit(productType, paymentType) {
  if (productType === "contato") return paymentType === "avista" ? 0.15 : 0.08;
  return paymentType === "avista" ? 0.35 : 0.25;
}

export default function UsarCredito() {
  // proteção admin
  const [authorized, setAuthorized] = useState(false);
  const [loadingAuth, setLoadingAuth] = useState(true);

  // estados da página
  const [whats, setWhats] = useState("");
  const [saleValue, setSaleValue] = useState("");
  const [productType, setProductType] = useState("geral");
  const [paymentType, setPaymentType] = useState("avista");

  const [credits, setCredits] = useState([]);
  const [msg, setMsg] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    async function verify() {
      const ok = await checkAdmin();

      if (!ok) {
        window.location.href = "/login";
        return;
      }

      setAuthorized(true);
      setLoadingAuth(false);
    }

    verify();
  }, []);

  const sale = useMemo(
    () => Number(String(saleValue).replace(",", ".")) || 0,
    [saleValue]
  );

  const availableBalance = useMemo(() => {
    return (credits || []).reduce(
      (sum, c) => sum + Number(c.remaining_amount || 0),
      0
    );
  }, [credits]);

  const ruleMax = useMemo(() => {
    const pct = pctLimit(productType, paymentType);
    return Math.round(sale * pct * 100) / 100;
  }, [sale, productType, paymentType]);

  const canUseMax = useMemo(() => {
    return Math.round(Math.min(ruleMax, availableBalance) * 100) / 100;
  }, [ruleMax, availableBalance]);

  async function loadCredits() {
    setMsg("");
    setLoading(true);

    const { data, error } = await supabase
      .from("credits")
      .select("id, remaining_amount, expires_at, created_at")
      .eq("user_whatsapp", whats)
      .gt("remaining_amount", 0)
      .gt("expires_at", new Date().toISOString())
      .order("created_at", { ascending: true });

    setLoading(false);

    if (error) {
      setMsg("Erro ao buscar créditos.");
      setCredits([]);
      return;
    }

    setCredits(data || []);
    if (!data || data.length === 0) {
      setMsg("Sem créditos disponíveis para este WhatsApp.");
    }
  }

  async function applyMaxCredit() {
    setMsg("");

    if (!whats.trim()) {
      setMsg("Informe o WhatsApp do indicador.");
      return;
    }

    if (!sale || sale <= 0) {
      setMsg("Informe o valor da venda.");
      return;
    }

    if (canUseMax <= 0) {
      setMsg("Nenhum crédito pode ser usado nesta venda.");
      return;
    }

    setLoading(true);

    let remainingToUse = canUseMax;
    const breakdown = [];

    for (const c of credits) {
      if (remainingToUse <= 0) break;

      const cRemain = Number(c.remaining_amount || 0);
      const take = Math.min(cRemain, remainingToUse);

      const { error: updErr } = await supabase
        .from("credits")
        .update({
          remaining_amount: Math.round((cRemain - take) * 100) / 100,
        })
        .eq("id", c.id);

      if (updErr) {
        setLoading(false);
        setMsg("Erro ao abater crédito.");
        return;
      }

      breakdown.push({
        credit_id: c.id,
        used: Math.round(take * 100) / 100,
      });

      remainingToUse = Math.round((remainingToUse - take) * 100) / 100;
    }

    const { error: insErr } = await supabase.from("credit_usages").insert([
      {
        user_whatsapp: whats,
        used_amount: canUseMax,
        sale_value: sale,
        product_type: productType,
        payment_type: paymentType,
        breakdown,
      },
    ]);

    setLoading(false);

    if (insErr) {
      setMsg("Abateu, mas falhou ao registrar histórico.");
      await loadCredits();
      return;
    }

    setMsg(`Crédito aplicado: R$ ${canUseMax.toFixed(2)} ✅`);
    await loadCredits();
  }

  if (loadingAuth) {
    return <p style={{ padding: 24 }}>Verificando acesso...</p>;
  }

  if (!authorized) {
    return null;
  }

  return (
    <main style={{ padding: 24, maxWidth: 900, margin: "0 auto" }}>
      <h1>Simular e Aplicar Crédito</h1>

      <div style={{ display: "grid", gap: 10, marginTop: 14 }}>
        <input
          placeholder="WhatsApp do indicador (somente números)"
          value={whats}
          onChange={(e) => setWhats(e.target.value)}
          style={{ padding: 10, borderRadius: 10, border: "1px solid #ddd" }}
        />

        <input
          placeholder="Valor da venda (ex: 2500,00)"
          value={saleValue}
          onChange={(e) => setSaleValue(e.target.value)}
          style={{ padding: 10, borderRadius: 10, border: "1px solid #ddd" }}
        />

        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <select
            value={productType}
            onChange={(e) => setProductType(e.target.value)}
            style={{ padding: 10, borderRadius: 10, border: "1px solid #ddd" }}
          >
            <option value="geral">Geral (armação/solar/lentes grau)</option>
            <option value="contato">Lentes de contato</option>
          </select>

          <select
            value={paymentType}
            onChange={(e) => setPaymentType(e.target.value)}
            style={{ padding: 10, borderRadius: 10, border: "1px solid #ddd" }}
          >
            <option value="avista">À vista</option>
            <option value="prazo">Parcelado</option>
          </select>

          <button
            onClick={loadCredits}
            style={{
              background: "black",
              color: "white",
              border: "none",
              padding: "10px 12px",
              borderRadius: 12,
              cursor: "pointer",
              fontWeight: 900,
            }}
            disabled={loading}
          >
            Buscar saldo
          </button>
        </div>

        <div
          style={{
            marginTop: 8,
            padding: 14,
            border: "1px solid #eee",
            borderRadius: 12,
          }}
        >
          <div><b>Saldo disponível:</b> R$ {availableBalance.toFixed(2)}</div>
          <div><b>Máximo pela regra:</b> R$ {ruleMax.toFixed(2)}</div>
          <div><b>Pode usar nesta venda:</b> R$ {canUseMax.toFixed(2)}</div>

          <button
            onClick={applyMaxCredit}
            style={{
              marginTop: 12,
              background: "#28a745",
              color: "white",
              border: "none",
              padding: "10px 12px",
              borderRadius: 12,
              cursor: "pointer",
              fontWeight: 900,
            }}
            disabled={loading}
          >
            Aplicar máximo permitido
          </button>

          {msg ? <div style={{ marginTop: 10 }}>{msg}</div> : null}
        </div>

        <div style={{ marginTop: 8 }}>
          <h3 style={{ marginBottom: 8 }}>Créditos ativos (FIFO)</h3>

          {credits.length === 0 ? (
            <p style={{ opacity: 0.8 }}>Nenhum crédito carregado.</p>
          ) : (
            <ul style={{ lineHeight: 1.7 }}>
              {credits.map((c) => (
                <li key={c.id}>
                  R$ {Number(c.remaining_amount).toFixed(2)} • vence em{" "}
                  {new Date(c.expires_at).toLocaleDateString()}
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </main>
  );
}
