"use client";

import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabaseClient";

export default function Indicar() {
  const [referrerName, setReferrerName] = useState("");
  const [referrerWhats, setReferrerWhats] = useState("");
  const [referredName, setReferredName] = useState("");
  const [referredWhats, setReferredWhats] = useState("");
  const [msg, setMsg] = useState("");

  useEffect(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const ref = params.get("ref");
      if (ref) {
        setReferrerWhats(ref);
      }
    }
  }, []);

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
      <p>Preencha os dados abaixo para registrar a indicação.</p>

      <form onSubmit={handleSubmit} style={{ display: "grid", gap: 12, marginTop: 16 }}>
        <h3 style={{ marginTop: 10 }}>Seus dados</h3>

        <input
          placeholder="Seu nome"
          value={referrerName}
          onChange={(e) => setReferrerName(e.target.value)}
          required
          style={{ padding: 10, borderRadius: 10, border: "1px solid #ddd" }}
        />

        <input
          placeholder="Seu WhatsApp (com DDD)"
          value={referrerWhats}
          onChange={(e) => setReferrerWhats(e.target.value)}
          required
          style={{ padding: 10, borderRadius: 10, border: "1px solid #ddd" }}
        />

        <h3 style={{ marginTop: 10 }}>Dados do indicado</h3>

        <input
          placeholder="Nome do indicado"
          value={referredName}
          onChange={(e) => setReferredName(e.target.value)}
          required
          style={{ padding: 10, borderRadius: 10, border: "1px solid #ddd" }}
        />

        <input
          placeholder="WhatsApp do indicado (com DDD)"
          value={referredWhats}
          onChange={(e) => setReferredWhats(e.target.value)}
          required
          style={{ padding: 10, borderRadius: 10, border: "1px solid #ddd" }}
        />

        <button
          type="submit"
          style={{
            background: "black",
            color: "white",
            padding: "12px 16px",
            borderRadius: 10,
            border: "none",
            fontWeight: 800,
            cursor: "pointer",
            marginTop: 10,
          }}
        >
          Enviar indicação
        </button>

        {msg ? <p style={{ marginTop: 8 }}>{msg}</p> : null}
      </form>
    </main>
  );
}
