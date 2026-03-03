"use client";

import { useEffect, useState } from "react";
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
        color: color,
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

export default function Painel() {
  const [referrals, setReferrals] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      const { data } = await supabase
        .from("referrals")
        .select("*")
        .order("created_at", { ascending: false });

      setReferrals(data || []);
      setLoading(false);
    }

    fetchData();
  }, []);

  return (
    <main style={{ padding: 24, maxWidth: 1000, margin: "0 auto" }}>
      <h1>Meu Painel</h1>

      {loading && <p>Carregando...</p>}

      {!loading && referrals.length === 0 && (
        <p>Nenhuma indicação registrada ainda.</p>
      )}

      {!loading && referrals.length > 0 && (
        <table
          style={{
            width: "100%",
            marginTop: 20,
            borderCollapse: "collapse",
          }}
        >
          <thead>
            <tr style={{ borderBottom: "2px solid #eee" }}>
              <th align="left">Indicado</th>
              <th align="left">WhatsApp</th>
              <th align="left">Status</th>
              <th align="left">Data</th>
            </tr>
          </thead>
          <tbody>
            {referrals.map((r) => (
              <tr key={r.id} style={{ borderTop: "1px solid #eee" }}>
                <td>{r.referred_name}</td>
                <td>{r.referred_whatsapp}</td>
                <td>
                  <StatusBadge status={r.status} />
                </td>
                <td>
                  {new Date(r.created_at).toLocaleDateString()}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </main>
  );
}
