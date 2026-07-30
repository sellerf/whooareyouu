import Link from "next/link";
import { ArrowRight, Eye, MapPin, Shield, Zap } from "lucide-react";

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-[#050505] text-white">
      <div className="pointer-events-none fixed inset-0 landing-noise opacity-40" />
      <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(ellipse_at_top,rgba(255,255,255,0.08),transparent_55%)]" />

      <header className="relative z-10 mx-auto flex max-w-6xl items-center justify-between px-6 py-6">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/15 bg-white/5 font-display text-sm font-bold tracking-wider">
            M
          </div>
          <div>
            <p className="font-display text-lg font-semibold tracking-tight">
              MTLC
            </p>
            <a
              href="https://linarcteam.site/"
              target="_blank"
              rel="noopener noreferrer"
              className="text-[11px] uppercase tracking-[0.22em] text-white/45 transition hover:text-white"
            >
              Linarc Team
            </a>
          </div>
        </div>
        <nav className="flex items-center gap-3">
          <Link
            href="/login"
            className="rounded-full px-4 py-2 text-sm text-white/70 transition hover:text-white"
          >
            Entrar
          </Link>
          <Link
            href="/register"
            className="rounded-full border border-white/20 bg-white px-5 py-2 text-sm font-semibold text-black transition hover:bg-white/90"
          >
            Criar conta
          </Link>
        </nav>
      </header>

      <main className="relative z-10">
        <section className="mx-auto max-w-6xl px-6 pb-24 pt-16 md:pt-24">
          <p className="animate-fade-up text-xs font-medium uppercase tracking-[0.35em] text-white/40">
            Metadata Tool · Linarc Cybersecurity
          </p>
          <h1 className="font-display animate-fade-up-delay mt-6 max-w-4xl text-5xl font-semibold leading-[0.95] tracking-tight md:text-7xl">
            Extraia o{" "}
            <span className="italic text-white/55">máximo</span> de cada
            arquivo.
          </h1>
          <p className="animate-fade-up-delay-2 mt-6 max-w-xl text-lg text-white/55">
            GPS, câmera, EXIF, IPTC, XMP, ICC e rastros embutidos em imagens e
            vídeos. Feito pela{" "}
            <a
              href="https://linarcteam.site/"
              className="text-white underline decoration-white/30 underline-offset-4 hover:decoration-white"
              target="_blank"
              rel="noopener noreferrer"
            >
              Linarc Team
            </a>
            .
          </p>
          <div className="animate-fade-up-delay-2 mt-10 flex flex-wrap gap-4">
            <Link
              href="/register"
              className="animate-pulse-glow inline-flex items-center gap-2 rounded-full bg-white px-7 py-3.5 text-sm font-semibold text-black"
            >
              Começar agora <ArrowRight className="h-4 w-4" />
            </Link>
            <a
              href="https://linarcteam.site/"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-full border border-white/20 px-7 py-3.5 text-sm text-white/80 hover:bg-white/5"
            >
              Conhecer a Linarc
            </a>
          </div>
        </section>

        <section className="border-y border-white/8 bg-white/[0.02]">
          <div className="mx-auto grid max-w-6xl gap-px bg-white/8 md:grid-cols-3">
            {[
              {
                icon: MapPin,
                title: "GPS & geolocalização",
                text: "Coordenadas, altitude, mapa interativo e links para Google Maps / OSM.",
              },
              {
                icon: Eye,
                title: "Metadados profundos",
                text: "EXIF, MakerNote, IPTC, XMP, ICC, dimensões, duração e átomos de vídeo.",
              },
              {
                icon: Zap,
                title: "R$ 3,99 / mês",
                text: "1 consulta grátis por dia. Plano ilimitado com desconto a partir de 3 meses.",
              },
            ].map((f) => (
              <div
                key={f.title}
                className="bg-[#050505] p-8 transition hover:bg-white/[0.03]"
              >
                <f.icon className="mb-4 h-5 w-5 text-white/70" />
                <h3 className="font-display text-xl font-medium">{f.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-white/45">
                  {f.text}
                </p>
              </div>
            ))}
          </div>
        </section>

        <section className="mx-auto max-w-6xl px-6 py-24">
          <div className="grid items-center gap-12 md:grid-cols-2">
            <div>
              <p className="text-xs uppercase tracking-[0.3em] text-white/40">
                Por que MTLC
              </p>
              <h2 className="font-display mt-4 text-4xl font-semibold tracking-tight md:text-5xl">
                Painel estilo operação.
                <br />
                <span className="text-white/45">Resultados sem filtro.</span>
              </h2>
              <p className="mt-5 text-white/50">
                Interface dark com temas, assinatura via PIX.
              </p>
              <ul className="mt-8 space-y-3 text-sm text-white/60">
                {[
                  "Checkout oculto | só QR Code / chave PIX",
                  "Renovação antecipada e multi-meses",
                  "Temas salvos na conta",
                ].map((t) => (
                  <li key={t} className="flex items-center gap-3">
                    <Shield className="h-4 w-4 text-white/40" />
                    {t}
                  </li>
                ))}
              </ul>
            </div>
            <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-br from-white/10 to-transparent p-1">
              <div className="grid-pattern rounded-[1.35rem] bg-[#0a0a0a] p-8">
                <div className="rounded-2xl border border-white/10 bg-black/60 p-5 backdrop-blur">
                  <p className="text-[10px] uppercase tracking-[0.25em] text-white/35">
                    Exemplo de saída
                  </p>
                  <pre className="mt-4 overflow-x-auto font-mono text-xs leading-relaxed text-emerald-300/90">
{`GPSLatitude   23.550520° S
GPSLongitude  46.633308° W
Make          Apple
Model         iPhone 15 Pro
DateTime      2026:07:12 21:04:18
LensModel     iPhone 15 Pro back...
Software      18.5`}
                  </pre>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>

      <footer className="relative z-10 border-t border-white/8 px-6 py-10">
        <div className="mx-auto flex max-w-6xl flex-col items-start justify-between gap-4 md:flex-row md:items-center">
          <p className="text-sm text-white/40">
            © {new Date().getFullYear()} MTLC ·{" "}
            <a
              href="https://linarcteam.site/"
              className="text-white/70 hover:text-white"
              target="_blank"
              rel="noopener noreferrer"
            >
              Linarc Team
            </a>
          </p>
          <p className="text-xs text-white/30">
            Societad Group · ferramenta de metadados
          </p>
        </div>
      </footer>
    </div>
  );
}
