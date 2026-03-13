"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "../../lib/supabaseClient";
import { checkAdmin } from "../../lib/checkAdmin";

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

  // 🔐 proteção de admin
  const [authorized, setAuthorized] = useState(false);
  const [loadingAuth, setLoadingAuth] = useState(true);

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

  if (loadingAuth) return <p style={{ padding: 24 }}>Verificando acesso...</p>;
  if (!authorized) return null;

  const [referrals, setReferrals] = useState([]);
  const [rewards, setRewards] = useState([]);
  const [loading, setLoading] = useState(true);

  const [openModal, setOpenModal] = useState(false);
  const [selected, setSelected] = useState(null);
  const [purchaseValue, setPurchaseValue] = useState("");
  const [productType, setProductType] = useState("geral");
  const [paymentType, setPaymentType] = useState("avista");
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
        referral_id: selected.id,
        expires_at: expires.toISOString(),
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

  const pendingRewards = useMemo(
    () => (rewards || []).filter((r) => !r.delivered),
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
                    <td>
                      {r.referrer_name}
                      <br />
                      {r.referrer_whatsapp}
                    </td>
                    <td>
                      <StatusBadge status={r.status} />
                    </td>
                    <td>
                      {r.purchase_value
                        ? `R$ ${Number(r.purchase_value).toFixed(2)}`
                        : "-"}
                    </td>
                    <td>
                      {r.status === "pendente" && (
                        <>
                          <button onClick={() => openValidateModal(r)}>
                            Validar
                          </button>

                          <button onClick={() => cancelReferral(r.id)}>
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

      <Modal open={openModal} title="Validar indicação" onClose={closeModal}>
        <div style={{ display: "grid", gap: 10 }}>
          <input
            value={purchaseValue}
            onChange={(e) => setPurchaseValue(e.target.value)}
            placeholder="Valor da compra"
          />

          <button onClick={validateReferral}>Confirmar validação</button>

          {msg && <div>{msg}</div>}
        </div>
      </Modal>
    </main>
  );
}
