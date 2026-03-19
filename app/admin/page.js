"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "../../lib/supabaseClient";
import { checkAdmin } from "../../lib/checkAdmin";

function money(n) {
  return `R$ ${Number(n || 0).toFixed(2)}`;
}

function StatusBadge({ status }) {
  let bg = "#eee";
  let color = "#333";
  let label = status;

  if (status === "pendente") {
    bg = "#FFF3CD";
    color = "#856404";
    label = "🟡 Pendente";
  }
  if (status === "validado") {
    bg = "#D4EDDA";
    color = "#155724";
    label = "🟢 Validado";
  }
  if (status === "cancelado") {
    bg = "#F8D7DA";
    color = "#721C24";
    label = "🔴 Cancelado";
  }

  return (
    <span
      style={{
        background: bg,
        color,
        padding: "4px 10px",
        borderRadius: 20,
        fontSize: 12,
        fontWeight: 600,
      }}
    >
      {label}
    </span>
  );
}

function Modal({ open, title, children, onClose }) {
  if (!open) return null;

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.45)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 16,
        zIndex: 9999,
      }}
      onClick={onClose}
    >
      <div
        style={{
          width: "100%",
          maxWidth: 520,
          background: "white",
          borderRadius: 14,
          padding: 18,
          boxShadow: "0 12px 32px rgba(0,0,0,0.25)",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
          <h2 style={{ margin: 0, fontSize: 18 }}>{title}</h2>
          <button
            onClick={onClose}
            style={{
              border: "none",
              background: "transparent",
              cursor: "pointer",
              fontSize: 18,
            }}
          >
            ✕
          </button>
        </div>
        <div style={{ marginTop: 12 }}>{children}</div>
      </div>
    </div>
  );
}

export default function PainelAdmin() {
  const [authorized, setAuthorized] = useState(false);
  const [loadingAuth, setLoadingAuth] = useState(true);

  const [referrals, setReferrals] = useState([]);
  const [rewards, setRewards] = useState([]);
  const [credits, setCredits] = useState([]);
  const [creditUsages, setCreditUsages] = useState([]);
  const [loading, setLoading] = useState(true);

  const [openModal, setOpenModal] = useState(false);
  const [selected, setSelected] = useState(null);
  const [purchaseValue, setPurchaseValue] = useState("");
  const [productType, setProductType] = useState("geral");
  const [paymentType, setPaymentType] = useState("avista");
  const [msg, setMsg] = useState("");

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

  async function fetchAll() {
    setLoading(true);

    const [
      { data: refData },
      { data: rewData },
      { data: credData },
      { data: usageData },
    ] = await Promise.all([
      supabase.from("referrals").select("*").order("created_at", { ascending: false }),
      supabase.from("rewards").select("*").order("created_at", { ascending: false }),
      supabase.from("credits").select("*").order("created_at", { ascending: false }),
      supabase.from("credit_usages").select("*").order("created_at", { ascending: false }),
    ]);

    setReferrals(refData || []);
    setRewards(rewData || []);
    setCredits(credData || []);
    setCreditUsages(usageData || []);
    setLoading(false);
  }

  useEffect(() => {
    if (authorized) {
      fetchAll();
    }
  }, [authorized]);

  function openValidateModal(referral) {
    setSelected(referral);
    setPurchaseValue("");
    setProductType("geral");
    setPaymentType("avista");
    setMsg("");
    setOpenModal(true);
  }

  function closeModal() {
    setOpenModal(false);
    setSelected(null);
    setMsg("");
  }

  async function cancelReferral(id) {
    await supabase.from("referrals").update({ status: "cancelado" }).eq("id", id);
    await fetchAll();
  }

async function validateReferral() {
  if (!selected) return;

  const val = Number(String(purchaseValue).replace(",", "."));
  if (!val || val <= 0) {
    setMsg("Informe um valor de compra maior que zero.");
    return;
  }

  async function validar(...) {

  // 1. Atualiza a indicação
  const { error: updErr } = await supabase
    .from("referrals")
    .update({
      status: "validado",
      purchase_value: val,
      product_type: productType,
      payment_type: paymentType,
    })
    .eq("id", selected.id);

  if (updErr) {
    setMsg("Erro ao validar indicação ❌");
    return;
  }

  // 2. Calcula crédito
  const creditAmount = Math.round(val * 0.1 * 100) / 100;

  const expires = new Date();
  expires.setDate(expires.getDate() + 365);

  // 3. Tenta criar crédito (AGORA COM TRATAMENTO)
  const { error: creditErr } = await supabase.from("credits").insert([
    {
      user_whatsapp: selected.referrer_whatsapp,
      amount: creditAmount,
      remaining_amount: creditAmount,
      referral_id: selected.id,
      expires_at: expires.toISOString(),
      used: false,
    },
  ]);

  if (creditErr) {
    console.error("Erro ao gerar crédito:", creditErr);
    setMsg("Validou, mas erro ao gerar crédito ❌");
    return;
  }

  // 4. Verifica recompensa (a cada 3 indicações)
  const { data } = await supabase
    .from("referrals")
    .select("*")
    .eq("referrer_whatsapp", selected.referrer_whatsapp)
    .eq("status", "validado");

  const validPurchases = (data || []).filter(
    (r) => Number(r.purchase_value || 0) > 0
  ).length;

  if (validPurchases > 0 && validPurchases % 3 === 0) {
    await supabase.from("rewards").insert([
      {
        user_whatsapp: selected.referrer_whatsapp,
        reward_type: "oculos_exclusivo_tenex",
        referral_count: validPurchases,
        delivered: false,
      },
    ]);
  }

  setMsg("Indicação validada e crédito gerado com sucesso ✅");

  await fetchAll();
  closeModal();
}
    if (!selected) return;

    const val = Number(String(purchaseValue).replace(",", "."));
    if (!val || val <= 0) {
      setMsg("Informe um valor de compra maior que zero.");
      return;
    }

    async function validar(...) {

    const { error: updErr } = await supabase
      .from("referrals")
      .update({
        status: "validado",
        purchase_value: val,
        product_type: productType,
        payment_type: paymentType,
      })
      .eq("id", selected.id);

    if (updErr) {
      setMsg("Erro ao validar.");
      return;
    }

    const creditAmount = Math.round(val * 0.1 * 100) / 100;
    const expires = new Date();
    expires.setDate(expires.getDate() + 365);

    await supabase.from("credits").insert([
      {
        user_whatsapp: selected.referrer_whatsapp,
        amount: creditAmount,
        remaining_amount: creditAmount,
        referral_id: selected.id,
        expires_at: expires.toISOString(),
        used: false,
      },
    ]);

    const { data } = await supabase
      .from("referrals")
      .select("*")
      .eq("referrer_whatsapp", selected.referrer_whatsapp)
      .eq("status", "validado");

    const validPurchases = (data || []).filter(
      (r) => Number(r.purchase_value || 0) > 0
    ).length;

    if (validPurchases > 0 && validPurchases % 3 === 0) {
      await supabase.from("rewards").insert([
        {
          user_whatsapp: selected.referrer_whatsapp,
          reward_type: "oculos_exclusivo_tenex",
          referral_count: validPurchases,
          delivered: false,
        },
      ]);
    }

    await fetchAll();
    closeModal();
  }

  async function markRewardDelivered(id) {
    await supabase.from("rewards").update({ delivered: true }).eq("id", id);
    await fetchAll();
  }

  const pendingRewards = useMemo(
    () => (rewards || []).filter((r) => !r.delivered),
    [rewards]
  );

  const validReferrals = useMemo(
    () => referrals.filter((r) => r.status === "validado" && Number(r.purchase_value || 0) > 0),
    [referrals]
  );

  const totalReferrals = referrals.length;

  const totalValidReferrals = validReferrals.length;

  const totalSalesFromReferrals = useMemo(
    () => validReferrals.reduce((sum, r) => sum + Number(r.purchase_value || 0), 0),
    [validReferrals]
  );

  const totalCreditsGenerated = useMemo(
    () => credits.reduce((sum, c) => sum + Number(c.amount || 0), 0),
    [credits]
  );

  const totalCreditsUsed = useMemo(
    () => creditUsages.reduce((sum, u) => sum + Number(u.used_amount || 0), 0),
    [creditUsages]
  );

  const topIndicators = useMemo(() => {
    const grouped = {};

    validReferrals.forEach((r) => {
      const key = r.referrer_whatsapp || "sem-whats";

      if (!grouped[key]) {
        grouped[key] = {
          name: r.referrer_name || "Sem nome",
          whatsapp: r.referrer_whatsapp || "-",
          count: 0,
          sales: 0,
        };
      }

      grouped[key].count += 1;
      grouped[key].sales += Number(r.purchase_value || 0);
    });

    return Object.values(grouped)
      .sort((a, b) => {
        if (b.count !== a.count) return b.count - a.count;
        return b.sales - a.sales;
      })
      .slice(0, 5);
  }, [validReferrals]);

  if (loadingAuth) {
    return <p style={{ padding: 24 }}>Verificando acesso...</p>;
  }

  if (!authorized) {
    return null;
  }

  return (
    <main style={{ padding: 24, maxWidth: 1200, margin: "0 auto" }}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          gap: 12,
          alignItems: "center",
          flexWrap: "wrap",
        }}
      >
        <div>
          <h1 style={{ marginBottom: 6 }}>Painel Admin Tenex</h1>
          <p style={{ margin: 0, opacity: 0.75 }}>
            Acompanhe indicações, créditos, vendas e prêmios.
          </p>
        </div>

        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <a
            href="/usar-credito"
            style={{
              background: "black",
              color: "white",
              textDecoration: "none",
              padding: "10px 14px",
              borderRadius: 12,
              fontWeight: 800,
            }}
          >
            Usar crédito
          </a>

          <a
            href="/indicador"
            style={{
              background: "#444",
              color: "white",
              textDecoration: "none",
              padding: "10px 14px",
              borderRadius: 12,
              fontWeight: 800,
            }}
          >
            Painel do indicador
          </a>
        </div>
      </div>

      {loading && <p style={{ marginTop: 20 }}>Carregando...</p>}

      {!loading && (
        <>
          <div
            style={{
              display: "grid",
              gap: 12,
              gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
              marginTop: 20,
            }}
          >
            <div style={{ border: "1px solid #eee", borderRadius: 14, padding: 16 }}>
              <div style={{ fontSize: 12, opacity: 0.75 }}>Total de indicações</div>
              <div style={{ fontSize: 28, fontWeight: 900 }}>{totalReferrals}</div>
            </div>

            <div style={{ border: "1px solid #eee", borderRadius: 14, padding: 16 }}>
              <div style={{ fontSize: 12, opacity: 0.75 }}>Indicações validadas</div>
              <div style={{ fontSize: 28, fontWeight: 900 }}>{totalValidReferrals}</div>
            </div>

            <div style={{ border: "1px solid #eee", borderRadius: 14, padding: 16 }}>
              <div style={{ fontSize: 12, opacity: 0.75 }}>Vendas por indicação</div>
              <div style={{ fontSize: 28, fontWeight: 900 }}>{money(totalSalesFromReferrals)}</div>
            </div>

            <div style={{ border: "1px solid #eee", borderRadius: 14, padding: 16 }}>
              <div style={{ fontSize: 12, opacity: 0.75 }}>Créditos gerados</div>
              <div style={{ fontSize: 28, fontWeight: 900 }}>{money(totalCreditsGenerated)}</div>
            </div>

            <div style={{ border: "1px solid #eee", borderRadius: 14, padding: 16 }}>
              <div style={{ fontSize: 12, opacity: 0.75 }}>Créditos usados</div>
              <div style={{ fontSize: 28, fontWeight: 900 }}>{money(totalCreditsUsed)}</div>
            </div>

            <div style={{ border: "1px solid #eee", borderRadius: 14, padding: 16 }}>
              <div style={{ fontSize: 12, opacity: 0.75 }}>Prêmios pendentes</div>
              <div style={{ fontSize: 28, fontWeight: 900 }}>{pendingRewards.length}</div>
            </div>
          </div>

          <div
            style={{
              display: "grid",
              gap: 16,
              gridTemplateColumns: "1.2fr 1fr",
              marginTop: 20,
            }}
          >
            <div
              style={{
                border: "1px solid #eee",
                borderRadius: 14,
                padding: 16,
                background: pendingRewards.length ? "#f7fff7" : "white",
              }}
            >
              <h2 style={{ marginTop: 0, fontSize: 18 }}>🎁 Prêmios pendentes</h2>

              {pendingRewards.length === 0 ? (
                <p style={{ opacity: 0.75 }}>Nenhum prêmio pendente no momento.</p>
              ) : (
                <div style={{ display: "grid", gap: 10 }}>
                  {pendingRewards.map((r) => (
                    <div
                      key={r.id}
                      style={{
                        border: "1px solid #e6ffe6",
                        borderRadius: 12,
                        padding: 12,
                        display: "flex",
                        justifyContent: "space-between",
                        gap: 12,
                        alignItems: "center",
                        flexWrap: "wrap",
                        background: "white",
                      }}
                    >
                      <div>
                        <div style={{ fontWeight: 800 }}>Óculos Exclusivo Tenex</div>
                        <div style={{ fontSize: 13, opacity: 0.8 }}>
                          Whats: {r.user_whatsapp} • Atingiu {r.referral_count} compras válidas
                        </div>
                      </div>

                      <button
                        onClick={() => markRewardDelivered(r.id)}
                        style={{
                          background: "black",
                          color: "white",
                          border: "none",
                          padding: "8px 12px",
                          borderRadius: 10,
                          cursor: "pointer",
                          fontWeight: 800,
                        }}
                      >
                        Marcar como entregue
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div
              style={{
                border: "1px solid #eee",
                borderRadius: 14,
                padding: 16,
              }}
            >
              <h2 style={{ marginTop: 0, fontSize: 18 }}>🏆 Top indicadores</h2>

              {topIndicators.length === 0 ? (
                <p style={{ opacity: 0.75 }}>Ainda não há compras válidas suficientes.</p>
              ) : (
                <div style={{ display: "grid", gap: 10 }}>
                  {topIndicators.map((item, index) => (
                    <div
                      key={item.whatsapp}
                      style={{
                        border: "1px solid #eee",
                        borderRadius: 12,
                        padding: 12,
                      }}
                    >
                      <div style={{ fontWeight: 800 }}>
                        {index + 1}º {item.name}
                      </div>
                      <div style={{ fontSize: 13, opacity: 0.8 }}>{item.whatsapp}</div>
                      <div style={{ fontSize: 13, marginTop: 6 }}>
                        {item.count} compra(s) válida(s) • {money(item.sales)}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div style={{ marginTop: 24 }}>
            <h2 style={{ marginBottom: 10, fontSize: 18 }}>Indicações</h2>

            {referrals.length === 0 ? (
              <p>Nenhuma indicação registrada ainda.</p>
            ) : (
              <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse" }}>
                  <thead>
                    <tr style={{ borderBottom: "2px solid #eee" }}>
                      <th align="left">Indicado</th>
                      <th align="left">WhatsApp</th>
                      <th align="left">Indicador</th>
                      <th align="left">Status</th>
                      <th align="left">Compra</th>
                      <th align="left">Produto / Pgto</th>
                      <th align="left">Ações</th>
                    </tr>
                  </thead>
                  <tbody>
                    {referrals.map((r) => (
                      <tr key={r.id} style={{ borderTop: "1px solid #eee" }}>
                        <td>{r.referred_name}</td>
                        <td>{r.referred_whatsapp}</td>
                        <td>
                          {r.referrer_name}
                          <br />
                          <span style={{ opacity: 0.75 }}>{r.referrer_whatsapp}</span>
                        </td>
                        <td>
                          <StatusBadge status={r.status} />
                        </td>
                        <td>
                          {r.purchase_value ? money(r.purchase_value) : "-"}
                        </td>
                        <td>
                          {r.product_type || "-"}
                          <br />
                          <span style={{ opacity: 0.75 }}>{r.payment_type || "-"}</span>
                        </td>
                        <td>
                          {r.status === "pendente" && (
                            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                              <button
                                onClick={() => openValidateModal(r)}
                                style={{
                                  background: "#28a745",
                                  color: "white",
                                  border: "none",
                                  padding: "8px 12px",
                                  borderRadius: 10,
                                  cursor: "pointer",
                                  fontWeight: 800,
                                }}
                              >
                                Validar
                              </button>

                              <button
                                onClick={() => cancelReferral(r.id)}
                                style={{
                                  background: "#dc3545",
                                  color: "white",
                                  border: "none",
                                  padding: "8px 12px",
                                  borderRadius: 10,
                                  cursor: "pointer",
                                  fontWeight: 800,
                                }}
                              >
                                Cancelar
                              </button>
                            </div>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}

      <Modal
        open={openModal}
        title="Validar indicação"
        onClose={closeModal}
      >
        <div style={{ display: "grid", gap: 10 }}>
          <div style={{ fontSize: 13, opacity: 0.85 }}>
            Indicador: <b>{selected?.referrer_name}</b> ({selected?.referrer_whatsapp})
            <br />
            Indicado: <b>{selected?.referred_name}</b>
          </div>

          <input
            value={purchaseValue}
            onChange={(e) => setPurchaseValue(e.target.value)}
            placeholder="Valor da compra"
            style={{ padding: 10, borderRadius: 10, border: "1px solid #ddd" }}
          />

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
            onClick={validateReferral}
            style={{
              background: "black",
              color: "white",
              border: "none",
              padding: "10px 12px",
              borderRadius: 12,
              cursor: "pointer",
              fontWeight: 900,
            }}
          >
            Confirmar validação
          </button>

          {msg ? <div>{msg}</div> : null}
        </div>
      </Modal>
    </main>
  );
}
