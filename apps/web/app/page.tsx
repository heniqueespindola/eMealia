import Link from 'next/link';

// ─── Dados das features ───────────────────────────────────────────────────────
const features = [
  {
    icon: '🧅',
    title: 'O que tens em casa',
    desc:  'Diz-nos o que está na tua despensa. Nós encontramos o que podes cozinhar hoje.',
  },
  {
    icon: '▶',
    title: 'Vídeos de receitas',
    desc:  'Feed de receitas do YouTube, TikTok e Instagram — tudo num só lugar, sem publicidade.',
  },
  {
    icon: '📅',
    title: 'Plano semanal',
    desc:  'Planeia as refeições da semana e gera a lista de compras automaticamente.',
  },
];

// ─── Filtros em destaque ───────────────────────────────────────────────────────
const filtros = ['Vegan', 'Sem glúten', 'Airfryer', 'Rápidas', 'Sobremesas', 'Pequeno-almoço'];

// ─── Mercados ─────────────────────────────────────────────────────────────────
const mercados = [
  { flag: '🇵🇹', pais: 'Portugal' },
  { flag: '🇪🇸', pais: 'Espanha' },
];

export default function HomePage() {
  return (
    <div className="min-h-screen bg-bgLight font-sans">

      {/* ── Navbar ── */}
      <header className="fixed top-0 inset-x-0 z-50 bg-bgDark/95 backdrop-blur-sm border-b border-white/5">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <span className="font-display text-2xl text-primary tracking-tight">eMealia</span>
          <nav className="hidden md:flex items-center gap-8 text-sm text-border">
            <a href="#features" className="hover:text-bgLight transition-colors">Funcionalidades </a>
            <a href="#filtros"  className="hover:text-bgLight transition-colors">Receitas sfg</a>
            <a href="#mercados" className="hover:text-bgLight transition-colors">Mercados</a>
          </nav>
          <div className="flex items-center gap-3">
            <Link
              href="/login"
              className="text-sm text-border hover:text-bgLight transition-colors px-4 py-2"
            >
              Entrar
            </Link>
            <Link
              href="/register"
              className="text-sm font-medium bg-primary text-bgDark rounded-full px-5 py-2 hover:bg-primary/90 transition-colors"
            >
              Começar grátis
            </Link>
          </div>
        </div>
      </header>

      {/* ── Hero ── */}
      <section className="pt-40 pb-28 px-6 bg-bgDark relative overflow-hidden">
        {/* Textura subtil de fundo */}
        <div
          aria-hidden
          className="absolute inset-0 opacity-5"
          style={{
            backgroundImage:
              'radial-gradient(circle at 20% 50%, #FFB162 0%, transparent 50%), radial-gradient(circle at 80% 20%, #A35139 0%, transparent 40%)',
          }}
        />

        <div className="max-w-4xl mx-auto text-center relative">
          {/* Pill de mercado */}
          <div className="inline-flex items-center gap-2 border border-primary/30 rounded-full px-4 py-1.5 mb-10">
            <span className="text-xs text-primary tracking-widest uppercase font-medium">Portugal · Espanha</span>
          </div>

          <h1 className="font-display text-5xl md:text-7xl text-bgLight leading-tight mb-6">
            Da tua despensa<br />
            <span className="text-primary">à mesa.</span>
          </h1>

          <p className="text-border text-lg md:text-xl max-w-xl mx-auto mb-12 leading-relaxed">
            Diz-nos o que tens em casa. Nós mostramos o que podes cozinhar — em vídeo, sem desperdício, sem stress.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/register"
              className="bg-primary text-bgDark font-semibold rounded-full px-8 py-4 text-base hover:bg-primary/90 transition-colors"
            >
              Começar grátis
            </Link>
            <a
              href="#features"
              className="border border-white/15 text-bgLight rounded-full px-8 py-4 text-base hover:border-white/30 transition-colors"
            >
              Saber mais
            </a>
          </div>
        </div>
      </section>

      {/* ── Tagline de transição ── */}
      <div className="bg-primary py-4 overflow-hidden">
        <p className="text-center text-bgDark font-display text-lg tracking-wide">
          Sem desperdício. Sem stress. Só receitas que funcionam.
        </p>
      </div>

      {/* ── Features ── */}
      <section id="features" className="py-28 px-6 bg-bgLight">
        <div className="max-w-5xl mx-auto">
          <p className="text-primaryDark text-sm uppercase tracking-widest font-medium mb-4 text-center">
            Como funciona
          </p>
          <h2 className="font-display text-4xl md:text-5xl text-bgDark text-center mb-16 leading-tight">
            Cozinha o que tens.<br />Descobre o que queres.
          </h2>

          <div className="grid md:grid-cols-3 gap-8">
            {features.map((f) => (
              <div
                key={f.title}
                className="bg-white rounded-2xl p-8 border border-border/40 hover:border-primary/40 hover:shadow-lg transition-all"
              >
                <div className="w-12 h-12 bg-bgDark rounded-xl flex items-center justify-center text-xl mb-6">
                  {f.icon}
                </div>
                <h3 className="font-display text-xl text-bgDark mb-3">{f.title}</h3>
                <p className="text-bgDarkAlt/70 text-sm leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Filtros ── */}
      <section id="filtros" className="py-28 px-6 bg-bgDark">
        <div className="max-w-4xl mx-auto text-center">
          <p className="text-primary text-sm uppercase tracking-widest font-medium mb-4">
            Para todos os gostos
          </p>
          <h2 className="font-display text-4xl md:text-5xl text-bgLight mb-6 leading-tight">
            As tuas preferências,<br />sempre em primeiro.
          </h2>
          <p className="text-border text-lg mb-14 max-w-xl mx-auto leading-relaxed">
            Filtra receitas pelo que precisas — dietético, tempo, ou equipamento. Nunca mais vês uma receita que não é para ti.
          </p>
          <div className="flex flex-wrap gap-3 justify-center">
            {filtros.map((f, i) => (
              <span
                key={f}
                className={`rounded-full px-5 py-2.5 text-sm font-medium border transition-colors ${
                  i === 0
                    ? 'bg-primary text-bgDark border-primary'
                    : 'border-white/15 text-bgLight hover:border-primary/50 hover:text-primary'
                }`}
              >
                {f}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* ── Mercados ── */}
      <section id="mercados" className="py-28 px-6 bg-bgLight">
        <div className="max-w-3xl mx-auto text-center">
          <p className="text-primaryDark text-sm uppercase tracking-widest font-medium mb-4">
            Feito para ti
          </p>
          <h2 className="font-display text-4xl md:text-5xl text-bgDark mb-6 leading-tight">
            Receitas ibéricas.<br />Ingredientes reais.
          </h2>
          <p className="text-bgDarkAlt/70 text-lg mb-14 max-w-xl mx-auto leading-relaxed">
            Pensado para cozinhas portuguesas e espanholas — com ingredientes que encontras no teu supermercado, não em lojas especializadas.
          </p>
          <div className="flex gap-6 justify-center">
            {mercados.map((m) => (
              <div
                key={m.pais}
                className="bg-white border border-border/40 rounded-2xl px-10 py-8 text-center hover:border-primary/40 hover:shadow-md transition-all"
              >
                <span className="text-4xl block mb-3">{m.flag}</span>
                <span className="font-display text-bgDark text-lg">{m.pais}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA Final ── */}
      <section className="py-28 px-6 bg-bgDark">
        <div className="max-w-2xl mx-auto text-center">
          <h2 className="font-display text-4xl md:text-5xl text-bgLight mb-6 leading-tight">
            Pronto para cozinhar<br />
            <span className="text-primary">sem stress?</span>
          </h2>
          <p className="text-border text-lg mb-10 leading-relaxed">
            Começa grátis. Sem cartão de crédito.
          </p>
          <Link
            href="/register"
            className="inline-block bg-primary text-bgDark font-semibold rounded-full px-10 py-4 text-base hover:bg-primary/90 transition-colors"
          >
            Criar conta grátis
          </Link>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="bg-bgDark border-t border-white/5 py-8 px-6">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <span className="font-display text-xl text-primary">eMealia</span>
          <p className="text-border text-sm">
            © {new Date().getFullYear()} mocruz · Feito em Portugal 🇵🇹
          </p>
          <div className="flex gap-6 text-sm text-border">
            <a href="#" className="hover:text-bgLight transition-colors">Privacidade</a>
            <a href="#" className="hover:text-bgLight transition-colors">Termos</a>
            <a href="#" className="hover:text-bgLight transition-colors">Contacto</a>
          </div>
        </div>
      </footer>

    </div>
  );
}
