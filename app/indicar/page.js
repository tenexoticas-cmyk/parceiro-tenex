"use client";

import { useState } from "react";
import { supabase } from "../../lib/supabaseClient";

export default function Indicar() {
  const [referrerName, setReferrerName] = useState("");
  const [referrerWhats, setReferrerWhats] = useState("");
  const [referredName, setReferredName] = useState("");
  const [referredWhats, setReferredWhats] = useState("");
  const [msg, setMsg] = useState("");

  async function handleSubmit(e) {
    e.preventDefault();
    setMsg("Enviando...");

    const { error } = await supabase.from("referrals").insert([
      {
        referrer_name: referrerName,
        referrer_whatsapp: referrerWhats,
        referred_name: referredName,
        referred_whatsapp: referredWhats,
      },
    ]);

    if (error) {
      setMsg("Erro ao enviar.");
      return;
    }

    setMsg("Indicação enviada com sucesso ✅");
    setReferrerName("");
    setReferrerWhats("");
    setReferredName("");
    setReferredWhats("");
  }

  return (
    <main style={{ padding: 24, maxWidth: 700, margin: "0 auto" }}>
      <h1>Fazer uma indicação</h1>

      <form onSubmit={handleSubmit} style={{ display: "grid", gap: 12 }}>
        <input
          placeholder="Seu nome"
          value={referrerName}
          onChange={(e) => setReferrerName(e.target.value)}
          required
        />

        <input
          placeholder="Seu WhatsApp"
          value={referrerWhats}
          onChange={(e) => setReferrerWhats(e.target.value)}
          required
        />

        <input
          placeholder="Nome do indicado"
          value={referredName}
          onChange={(e) => setReferredName(e.target.value)}
          required
        />

        <input
          placeholder="WhatsApp do indicado"
          value={referredWhats}
          onChange={(e) => setReferredWhats(e.target.value)}
          required
        />

        <button
          type="submit"
          style={{
            background: "black",
            color: "white",
            padding: "12px",
            borderRadius: 8,
            border: "none",
            fontWeight: 700,
          }}
        >
          Enviar indicação
        </button>

        {msg && <p>{msg}</p>}
      </form>
    </main>
  );
}
