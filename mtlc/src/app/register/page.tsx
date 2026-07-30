"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";
import { createClient } from "@/lib/supabase/client";

export default function RegisterPage() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    if (username.length < 3) {
      setError("Username com no mínimo 3 caracteres");
      setLoading(false);
      return;
    }

    const supabase = createClient();
    const { error: err } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { username, theme: "lua" },
      },
    });

    if (err) {
      setError(err.message);
      setLoading(false);
      return;
    }

    router.push("/dashboard");
    router.refresh();
  };

  return (
    <div className="flex min-h-screen">
      <div className="relative hidden w-1/2 overflow-hidden border-r border-white/10 bg-[#080808] lg:block">
        <div className="absolute inset-0 mesh-bg opacity-60" />
        <div className="relative z-10 flex h-full flex-col justify-between p-12">
          <a
            href="https://linarcteam.site/"
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs uppercase tracking-[0.3em] text-white/40 hover:text-white"
          >
            Linarc Team
          </a>
          <div>
            <h1 className="font-display text-5xl font-semibold leading-none">
              Crie sua conta
            </h1>
            <p className="mt-4 max-w-sm text-white/45">
              1 consulta gratuita por dia. Assine por R$ 3,99/mês para
              ilimitado.
            </p>
          </div>
          <p className="text-xs text-white/25">MTLC · Metadata Tool</p>
        </div>
      </div>

      <div className="flex w-full items-center justify-center bg-[#050505] px-6 py-12 lg:w-1/2">
        <form onSubmit={onSubmit} className="w-full max-w-md">
          <h2 className="font-display text-3xl font-semibold">Registrar</h2>
          <p className="mt-2 text-sm text-white/45">
            Já tem conta?{" "}
            <Link href="/login" className="text-white underline">
              Entrar
            </Link>
          </p>

          <label className="mt-8 block text-xs uppercase tracking-wider text-white/40">
            Username
          </label>
          <input
            required
            value={username}
            onChange={(e) => setUsername(e.target.value.replace(/\s/g, ""))}
            className="mt-2 w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-white outline-none focus:border-white/30"
            placeholder="seu_nick"
          />

          <label className="mt-4 block text-xs uppercase tracking-wider text-white/40">
            E-mail
          </label>
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="mt-2 w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-white outline-none focus:border-white/30"
          />

          <label className="mt-4 block text-xs uppercase tracking-wider text-white/40">
            Senha
          </label>
          <input
            type="password"
            required
            minLength={6}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="mt-2 w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-white outline-none focus:border-white/30"
          />

          {error && <p className="mt-4 text-sm text-red-400">{error}</p>}

          <button
            type="submit"
            disabled={loading}
            className="mt-8 w-full rounded-xl bg-white py-3 font-semibold text-black disabled:opacity-60"
          >
            {loading ? "Criando..." : "Criar conta"}
          </button>
        </form>
      </div>
    </div>
  );
}
