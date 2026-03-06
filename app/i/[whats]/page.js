"use client";

import { useEffect, useState } from "react";
import { supabase } from "../../../lib/supabaseClient";

export default function IndicacaoPublica({ params }) {
  const [indicatorName, setIndicatorName] = useState("");
  const [loading, setLoading] = useState(true);

  const whats = params.whats;

  useEffect(() => {
    async function loadIndicator() {
      const { data } = await supabase
        .from("referrals")
        .select("referrer_name")
        .eq("referrer_whatsapp", whats)
        .limit(1);

      if (data && data.length > 0) {
        setIndicatorName(data[0].referrer_name || "");
      }

      setLoading(false);
    }

    loadIndicator();
  }, [whats]);

  return (
    <main
      style={{
        minHeight: "80vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 24,
      }}
    >
      <div
        style={{
          maxWidth: 700,
          width: "100%",
          border: "1px solid #eee",
          borderRadius: 20,
          padding: 32,
          textAlign: "center",
        }}
      >
        <h1 style={{ fontSize: 40, marginBottom: 12 }}>
          {loading
            ? "Carregando..."
            : `${indicatorName || "Alguém"} te indicou a Tenex 👓`}
        </h1>

        <p style={{ fontSize: 22, marginBottom: 24 }}>
          Ganhe atendimento e descontos diferenciados!
        </p>

        <a
          href={`/indicar?ref=${whats}`}
          style={{
            display: "inline-block",
            background: "black",
            color: "white",
            textDecoration: "none",
            padding: "14px 22px",
            borderRadius: 12,
            fontWeight: 800,
          }}
        >
          Quero minha indicação
        </a>
      </div>
    </main>
  );
}
