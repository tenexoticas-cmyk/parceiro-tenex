"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "../../lib/supabaseClient";

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
            style={{ border: "none", background: "transparent", cursor: "pointer", fontSize: 18 }}
            aria-label="Fechar"
          >
            ✕
          </button>
        </div>
        <div style={{ marginTop: 12 }}>{children}</div>
      </div>
    </div>
  );
}

export default function Painel() {
  const [referrals, setReferrals] = useState([]);
  const [rewards, setRewards] = useState([]);
  const [loading, setLoading] = useState(true);

  // modal validar
  const [openModal, setOpenModal] = useState(false);
  const [selected, setSelected] = useState(null);
  const [purchaseValue, setPurchaseValue] = useState("");
  const [productType, setProductType] = useState("geral"); // geral | contato
  const [paymentType, setPaymentType] = useState("avista"); // avista | prazo
  const [msg, setMsg] = useState("");

  async function fetchAll() {
    setLoading(true);

    const { data: refData } = await supabase
      .from("referrals")
      .select("*")
      .order("created_at", { ascending: false });

    const { data: rewData } = await supabase
      .from("rewards")
      .select("*")
      .order("created_at", { ascending: false });

    setReferrals(refData || []);
    setRewards(rewData || []);
    setLoading(false);
  }

  useEffect(() => {
    fetchAll();
  }, []);

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

    setMsg("Validando...");

    // 1) atualiza a indicação
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
      setMsg("Erro ao validar. Tente novamente.");
      return;
    }

    // 2) cria crédito = 10% do valor
    const creditAmount = Math.round(val * 0.1 * 100) / 100;
    const expires = new Date();
    expires.setDate(expires.getDate() + 365);

    const { error: credErr } = await supabase.from("credits").insert([
      {
        user_whatsapp: selected.referrer_whatsapp,
        amount: creditAmount,
        referral_id: selected.id,
        expires_at: expires.toISOString(),
        used: false,
      },
    ]);

    if (credErr) {
      setMsg("Validou, mas erro ao gerar crédito. (A gente corrige já)");
      await fetchAll();
      return;
    }

    // 3) conta quantas compras válidas esse indicador já tem (validado + purchase_value > 0)
    const { data: countData, error: cntErr } = await supabase
      .from("referrals")
      .select("id, purchase_value", { count: "exact" })
      .eq("referrer_whatsapp", selected.referrer_whatsapp)
      .eq("status", "validado");

    if (!cntErr) {
      const validPurchases = (countData || []).filter((r) => Number(r.purchase_value || 0) > 0).length;

      // 4) a cada 3 compras válidas -> cria reward
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
    }

    setMsg("Validado ✅ Crédito gerado.");
    await fetchAll();
    closeModal();
  }

  const pendingRewards = useMemo(
    () => (rewards || []).filter((r) => r.reward_type === "oculos_exclusivo_tenex" && !r.delivered),
    [rewards]
  );

  async function markRewardDelivered(id) {
    await supabase.from("rewards").update({ delivered: true }).eq("id", id);
    await fetchAll();
  }

  return (
    <main style={{ padding: 24, maxWidth: 1100, margin: "0 auto" }}>
      <h1>Painel (Admin)</h1>

      {loading && <p>Carregando...</p>}

      {!loading && (
        <>
          {/* ALERTAS DE PRÊMIO */}
          <div
            style={{
              marginTop: 14,
              padding: 14,
              border: "1px solid #eee",
              borderRadius: 12,
              background: pendingRewards.length ? "#f7fff7" : "#fafafa",
            }}
          >
            <h2 style={{ margin: 0, fontSize: 16 }}>Prêmios pendentes</h2>

            {pendingRewards.length === 0 ? (
              <p style={{ marginTop: 8, marginBottom: 0, opacity: 0.8 }}>
                Nenhum prêmio pendente no momento.
              </p>
            ) : (
              <div style={{ marginTop: 10, display: "grid", gap: 10 }}>
                {pendingRewards.map((r) => (
                  <div
                    key={r.id}
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      gap: 12,
                      alignItems: "center",
                      padding: 10,
                      borderRadius: 10,
                      border: "1px solid #e6ffe6",
                      background: "white",
                    }}
                  >
                    <div>
                      <div style={{ fontWeight: 800 }}>🎁 Óculos Exclusivo Tenex</div>
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

          {/* TABELA DE INDICAÇÕES */}
          <h2 style={{ marginTop: 22, fontSize: 16 }}>Indicações</h2>

          {referrals.length === 0 ? (
            <p>Nenhuma indicação registrada ainda.</p>
          ) : (
            <table style={{ width: "100%", marginTop: 10, borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ borderBottom: "2px solid #eee" }}>
                  <th align="left">Indicado</th>
                  <th align="left">WhatsApp</th>
                  <th align="left">Indicador</th>
                  <th align="left">Status</th>
                  <th align="left">Compra</th>
                  <th align="left">Ações</th>
                </tr>
              </thead>
              <tbody>
                {referrals.map((r) => (
                  <tr key={r.id} style={{ borderTop: "1px solid #eee" }}>
                    <td>{r.referred_name}</td>
                    <td>{r.referred_whatsapp}</td>
                    <td style={{ fontSize: 13, opacity: 0.85 }}>
                      {r.referrer_name} <br />
                      {r.referrer_whatsapp}
                    </td>
                    <td>
                      <StatusBadge status={r.status} />
                    </td>
                    <td style={{ fontSize: 13, opacity: 0.85 }}>
                      {r.purchase_value ? `R$ ${Number(r.purchase_value).toFixed(2)}` : "-"}
                      <br />
                      {r.product_type ? `Tipo: ${r.product_type}` : ""}
                      {r.payment_type ? ` • Pgto: ${r.payment_type}` : ""}
                    </td>
                    <td>
                      {r.status === "pendente" && (
                        <>
                          <button
                            onClick={() => openValidateModal(r)}
                            style={{
                              marginRight: 8,
                              background: "#28a745",
                              color: "white",
                              border: "none",
                              padding: "6px 10px",
                              borderRadius: 8,
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
                              padding: "6px 10px",
                              borderRadius: 8,
                              cursor: "pointer",
                              fontWeight: 800,
                            }}
                          >
                            Cancelar
                          </button>
                        </>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </>
      )}

      {/* MODAL VALIDAR */}
      <Modal
        open={openModal}
        title="Validar indicação (gera crédito + conta para prêmio)"
        onClose={closeModal}
      >
        <div style={{ display: "grid", gap: 10 }}>
          <div style={{ fontSize: 13, opacity: 0.85 }}>
            Indicador: <b>{selected?.referrer_name}</b> ({selected?.referrer_whatsapp})<br />
            Indicado: <b>{selected?.referred_name}</b>
          </div>

          <label style={{ display: "grid", gap: 6 }}>
            <span style={{ fontWeight: 700 }}>Valor da compra (R$)</span>
            <input
              value={purchaseValue}
              onChange={(e) => setPurchaseValue(e.target.value)}
              placeholder="Ex: 799,90"
              style={{ padding: 10, borderRadius: 10, border: "1px solid #ddd" }}
            />
          </label>

          <label style={{ display: "grid", gap: 6 }}>
            <span style={{ fontWeight: 700 }}>Tipo de produto</span>
            <select
              value={productType}
              onChange={(e) => setProductType(e.target.value)}
              style={{ padding: 10, borderRadius: 10, border: "1px solid #ddd" }}
            >
              <option value="geral">Geral (armação/solar/lentes grau)</option>
              <option value="contato">Lentes de contato</option>
            </select>
          </label>

          <label style={{ display: "grid", gap: 6 }}>
            <span style={{ fontWeight: 700 }}>Forma de pagamento</span>
            <select
              value={paymentType}
              onChange={(e) => setPaymentType(e.target.value)}
              style={{ padding: 10, borderRadius: 10, border: "1px solid #ddd" }}
            >
              <option value="avista">À vista</option>
              <option value="prazo">Parcelado</option>
            </select>
          </label>

          <div style={{ fontSize: 13, opacity: 0.85, marginTop: 4 }}>
            Crédito gerado: <b>10%</b> do valor da compra • Validade: <b>365 dias</b>
          </div>

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
              marginTop: 6,
            }}
          >
            Confirmar validação
          </button>

          {msg ? <div style={{ marginTop: 6, fontSize: 13 }}>{msg}</div> : null}
        </div>
      </Modal>
    </main>
  );
}
