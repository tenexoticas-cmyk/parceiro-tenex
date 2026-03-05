"use client";

import { useMemo, useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { supabase } from "../../lib/supabaseClient";

function money(n) {
  const v = Number(n || 0);
  return `R$ ${v.toFixed(2)}`;
}

export default function Indicador() {
  const searchParams = useSearchParams();

  const [whats, setWhats] = useState("");
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState("");

  const [credits, setCredits] = useState([]);
  const [usages, setUsages] = useState([]);
  const [referrals, setReferrals] = useState([]);
  const [rewards, setRewards] = useState([]);

  useEffect(() => {
    const ref = searchParams.get("ref");
    if (ref) {
      setWhats(ref);
    }
  }, [searchParams]);

  const activeCredits = useMemo(() => {
    const now = new Date().toISOString();
    return (credits || []).filter(
      (c) => Number(c.remaining_amount || 0) > 0 && String(c.expires_at) > now
    );
  }, [credits]);

  const balance = useMemo(() => {
    return activeCredits.reduce(
      (sum, c) => sum + Number(c.remaining_amount || 0),
      0
    );
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
      .select("id, amount, remaining_amount, expires_at, created_at")
      .eq("user_whatsapp", whats)
      .order("created_at", { ascending: true });

    const { data: useData, error: useErr } = await supabase
      .from("credit_usages")
      .select(
        "id, used_amount, sale_value, product_type, payment_type, created_at"
      )
      .eq("user_whatsapp", whats)
      .order("created_at", { ascending: false });

    const { data: refData, error: refErr } = await supabase
      .from("referrals")
      .select(
        "id, referred_name, referred_whatsapp, status, purchase_value, created_at"
      )
      .eq("referrer_whatsapp", whats)
      .order("created_at", { ascending: false });

    const { data: rewData, error: rewErr } = await supabase
      .from("rewards")
      .select("id, reward_type, referral_count, delivered, created_at")
      .eq("user_whatsapp", whats)
      .order("created_at", { ascending: false });

    setLoading(false);

    if (credErr || useErr || refErr || rewErr) {
      setMsg("Erro ao carregar dados.");
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
          style={{
            padding: 10,
            borderRadius: 10,
            border: "1px solid #ddd",
            minWidth: 280,
          }}
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

        {msg && (
          <div style={{ alignSelf: "center", fontSize: 13 }}>{msg}</div>
        )}
      </div>

      <div
        style={{
          display: "grid",
          gap: 10,
          gridTemplateColumns: "repeat(auto-fit,minmax(220px,1fr))",
          marginTop: 16,
        }}
      >
        <div style={{ border: "1px solid #eee", borderRadius: 14, padding: 14 }}>
          <div>Saldo disponível</div>
          <div style={{ fontSize: 22, fontWeight: 900 }}>{money(balance)}</div>
        </div>

        <div style={{ border: "1px solid #eee", borderRadius: 14, padding: 14 }}>
          <div>Compras válidas</div>
          <div style={{ fontSize: 22, fontWeight: 900 }}>
            {validPurchasesCount}
          </div>
        </div>

        <div style={{ border: "1px solid #eee", borderRadius: 14, padding: 14 }}>
          <div>Prêmios</div>
          <div style={{ fontSize: 22, fontWeight: 900 }}>
            {rewardsPending > 0
              ? `🎁 ${rewardsPending} pendente`
              : "Nenhum pendente"}
          </div>
        </div>
      </div>

      <div style={{ marginTop: 20 }}>
        <h2>Indicações</h2>

        {referrals.length === 0 ? (
          <p>Nenhuma indicação.</p>
        ) : (
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ borderBottom: "2px solid #eee" }}>
                <th>Nome</th>
                <th>Whats</th>
                <th>Status</th>
                <th>Compra</th>
                <th>Data</th>
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
