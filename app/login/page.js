"use client";

import { useState } from "react";
import { supabase } from "../../lib/supabaseClient";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [msg, setMsg] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleLogin(e) {
    e.preventDefault();
    setLoading(true);
    setMsg("Entrando...");

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error || !data?.session) {
      setLoading(false);
      setMsg("E-mail ou senha inválidos.");
      return;
    }

    setMsg("Login realizado ✅");

    setTimeout(() => {
      window.location.href = "/admin";
    }, 800);
  }

  return (
    <main style={{ padding: 24, maxWidth: 420, margin: "0 auto" }}>
      <h1>Login Admin</h1>

      <form onSubmit={handleLogin} style={{ display: "grid", gap: 12, marginTop: 16 }}>
        <input
          type="email"
          placeholder="Seu e-mail"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          style={{ padding: 10, borderRadius: 10, border: "1px solid #ddd" }}
        />

        <input
          type="password"
          placeholder="Sua senha"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          style={{ padding: 10, borderRadius: 10, border: "1px solid #ddd" }}
        />

        <button
          type="submit"
          disabled={loading}
          style={{
            background: "black",
            color: "white",
            border: "none",
            padding: "12px 16px",
            borderRadius: 10,
            fontWeight: 800,
            cursor: "pointer",
          }}
        >
          {loading ? "Entrando..." : "Entrar"}
        </button>

        {msg ? <p>{msg}</p> : null}
      </form>
    </main>
  );
}
