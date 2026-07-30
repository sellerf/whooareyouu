"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { FormEvent, Suspense, useState } from "react";
import { createClient } from "@/lib/supabase/client";

function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const next = params.get("next") || "/dashboard";
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    const supabase = createClient();
    const { error: err } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (err) {
      setError(err.message);
      setLoading(false);
      return;
    }
    router.push(next);
    router.refresh();
  };

  return (
    <div className="flex min-h-screen">
      <div className="relative hidden w-1/2 overflow-hidden border-r border-white/10 bg-[#080808] lg:block">
        <div className="absolute inset-0 grid-pattern opacity-40" />
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
              MTLC
            </h1>
            <p className="mt-4 max-w-sm text-white/45">
              Entre para consultar metadados com precisão operacional.
            </p>
          </div>
          <p className="text-xs text-white/25">Metadata Tool</p>
        </div>
      </div>

      <div className="flex w-full items-center justify-center bg-[#050505] px-6 py-12 lg:w-1/2">
        <form onSubmit={onSubmit} className="w-full max-w-md">
          <h2 className="font-display text-3xl font-semibold">Entrar</h2>
          <p className="mt-2 text-sm text-white/45">
            Não tem conta?{" "}
            <Link href="/register" className="text-white underline">
              Criar agora
            </Link>
          </p>

          <label className="mt-8 block text-xs uppercase tracking-wider text-white/40">
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
            {loading ? "Entrando..." : "Entrar"}
          </button>

          <Link
            href="/"
            className="mt-6 block text-center text-sm text-white/40 hover:text-white"
          >
            Voltar ao início
          </Link>
        </form>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}
