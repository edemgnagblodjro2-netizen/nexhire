import { useState, useEffect } from "react";

const T = {
  fr: {
    nav_mission: "Mission",
    nav_products: "Produits",
    nav_contact: "Contact",
    hero_tag: "IA · Bien commun · Canada",
    hero_title: "L'intelligence artificielle\nau service du public.",
    hero_sub: "CivicAI conçoit des solutions numériques qui connectent les citoyens aux services dont ils ont besoin — rapidement, gratuitement, partout au Canada.",
    hero_cta: "Demander une démo",
    hero_cta2: "Voir nos produits",
    slides: [
      {
        tag: "Accessibilité",
        title: "Des services à portée de main",
        sub: "7 957 organismes communautaires indexés et accessibles en quelques secondes, partout au Québec.",
        accent: "from-teal-500 to-cyan-600",
        bg: "from-teal-950 via-teal-900 to-slate-900",
        visual: "network",
      },
      {
        tag: "Intelligence artificielle",
        title: "Une IA qui comprend les besoins réels",
        sub: "Un assistant conversationnel multilingue qui guide les citoyens vers les bons services, en FR, EN, ES, AR et HT.",
        accent: "from-violet-500 to-indigo-600",
        bg: "from-indigo-950 via-violet-950 to-slate-900",
        visual: "ai",
      },
      {
        tag: "Données publiques",
        title: "Des données pour de meilleures décisions",
        sub: "Des tableaux de bord anonymisés permettent aux administrations de mieux comprendre les besoins de leurs citoyens.",
        accent: "from-amber-500 to-orange-600",
        bg: "from-slate-950 via-slate-900 to-orange-950",
        visual: "data",
      },
    ],
    flagship_tag: "Produit phare",
    flagship_name: "AttenteZéro",
    flagship_desc: "Un répertoire intelligent de services communautaires (banques alimentaires, hébergement d'urgence, santé mentale, aide juridique) propulsé par l'IA. Gratuit pour tous les citoyens.",
    flagship_stats: ["7 957", "services actifs", "5", "langues", "100%", "gratuit"],
    flagship_ios: "App Store",
    flagship_android: "Google Play",
    flagship_web: "Voir la politique de confidentialité",
    upcoming_tag: "Projets à venir",
    upcoming_title: "D'autres solutions en développement",
    upcoming_sub: "CivicAI travaille sur plusieurs produits B2G pour moderniser les services publics québécois et canadiens.",
    projects: [
      { icon: "📊", name: "DashboardCivic", desc: "Tableaux de bord anonymisés pour aider les municipalités à mieux comprendre les besoins de leurs citoyens." },
      { icon: "🤖", name: "AssistantPublic", desc: "Assistant IA multilingue intégrable sur les portails gouvernementaux pour guider les citoyens dans leurs démarches." },
      { icon: "🔗", name: "RéseauOrganismes", desc: "Plateforme de mise en réseau des organismes communautaires pour coordonner les interventions terrain." },
    ],
    mission_tag: "À propos",
    mission_title: "Notre mission",
    mission_text: "CivicAI est une entreprise québécoise spécialisée en intelligence artificielle appliquée aux services publics. Nous croyons que la technologie doit d'abord servir les personnes les plus vulnérables — sans abonnement, sans publicité, sans compromis.",
    mission_neq: "NEQ : 2280791601",
    mission_hq: "Siège social : Québec, Canada",
    contact_tag: "Contact",
    contact_title: "Parlons de votre projet",
    contact_sub: "Vous êtes une municipalité, un ministère ou un organisme communautaire ? Discutons de comment CivicAI peut vous aider.",
    contact_email: "Nous écrire",
    contact_demo: "Demander une démo",
    footer: "© 2026 CivicAI — NEQ 2280791601 — Québec, Canada",
  },
  en: {
    nav_mission: "Mission",
    nav_products: "Products",
    nav_contact: "Contact",
    hero_tag: "AI · Public Good · Canada",
    hero_title: "Artificial intelligence\nfor the public good.",
    hero_sub: "CivicAI builds digital solutions that connect citizens to the services they need — fast, free, and across Canada.",
    hero_cta: "Request a demo",
    hero_cta2: "See our products",
    slides: [
      {
        tag: "Accessibility",
        title: "Services at your fingertips",
        sub: "7,957 community organizations indexed and accessible in seconds, across Quebec.",
        accent: "from-teal-500 to-cyan-600",
        bg: "from-teal-950 via-teal-900 to-slate-900",
        visual: "network",
      },
      {
        tag: "Artificial Intelligence",
        title: "An AI that understands real needs",
        sub: "A multilingual conversational assistant guiding citizens to the right services, in FR, EN, ES, AR and HT.",
        accent: "from-violet-500 to-indigo-600",
        bg: "from-indigo-950 via-violet-950 to-slate-900",
        visual: "ai",
      },
      {
        tag: "Public Data",
        title: "Data for better public decisions",
        sub: "Anonymized dashboards help administrations better understand the needs of their citizens.",
        accent: "from-amber-500 to-orange-600",
        bg: "from-slate-950 via-slate-900 to-orange-950",
        visual: "data",
      },
    ],
    flagship_tag: "Flagship product",
    flagship_name: "AttenteZéro",
    flagship_desc: "An AI-powered directory of community services (food banks, emergency shelters, mental health, legal aid) — free for all citizens.",
    flagship_stats: ["7,957", "active services", "5", "languages", "100%", "free"],
    flagship_ios: "App Store",
    flagship_android: "Google Play",
    flagship_web: "View privacy policy",
    upcoming_tag: "Coming soon",
    upcoming_title: "More solutions in development",
    upcoming_sub: "CivicAI is building several B2G products to modernize public services across Quebec and Canada.",
    projects: [
      { icon: "📊", name: "DashboardCivic", desc: "Anonymized dashboards helping municipalities better understand the needs of their communities." },
      { icon: "🤖", name: "AssistantPublic", desc: "A multilingual AI assistant embeddable on government portals to guide citizens through their requests." },
      { icon: "🔗", name: "RéseauOrganismes", desc: "A networking platform for community organizations to coordinate frontline interventions." },
    ],
    mission_tag: "About",
    mission_title: "Our mission",
    mission_text: "CivicAI is a Quebec-based company specializing in AI applied to public services. We believe technology should first serve the most vulnerable — no subscriptions, no ads, no compromise.",
    mission_neq: "QEI: 2280791601",
    mission_hq: "Headquarters: Quebec, Canada",
    contact_tag: "Contact",
    contact_title: "Let's talk about your project",
    contact_sub: "Are you a municipality, ministry, or community organization? Let's discuss how CivicAI can help.",
    contact_email: "Send us an email",
    contact_demo: "Request a demo",
    footer: "© 2026 CivicAI — QEI 2280791601 — Quebec, Canada",
  },
};

function NetworkVisual() {
  return (
    <svg viewBox="0 0 400 300" className="w-full h-full opacity-90" fill="none">
      <circle cx="200" cy="150" r="36" className="fill-teal-400/20 stroke-teal-400" strokeWidth="1.5" />
      <circle cx="200" cy="150" r="20" className="fill-teal-400/30" />
      <text x="200" y="155" textAnchor="middle" className="fill-teal-300" fontSize="14" fontWeight="700">IA</text>
      {[
        { cx: 80, cy: 80, label: "🏥", lx: 80, ly: 118 },
        { cx: 320, cy: 80, label: "🍽️", lx: 320, ly: 118 },
        { cx: 60, cy: 210, label: "⚖️", lx: 60, ly: 248 },
        { cx: 340, cy: 210, label: "🏠", lx: 340, ly: 248 },
        { cx: 200, cy: 40, label: "🧠", lx: 200, ly: 28 },
        { cx: 200, cy: 260, label: "📍", lx: 200, ly: 298 },
      ].map((n, i) => (
        <g key={i}>
          <line x1="200" y1="150" x2={n.cx} y2={n.cy} stroke="rgba(94,234,212,0.25)" strokeWidth="1" strokeDasharray="4 3" />
          <circle cx={n.cx} cy={n.cy} r="22" fill="rgba(20,184,166,0.12)" stroke="rgba(94,234,212,0.4)" strokeWidth="1.2" />
          <text x={n.cx} y={n.cy + 5} textAnchor="middle" fontSize="16">{n.label}</text>
        </g>
      ))}
      <circle cx="200" cy="150" r="70" stroke="rgba(94,234,212,0.08)" strokeWidth="1" strokeDasharray="6 4" />
      <circle cx="200" cy="150" r="110" stroke="rgba(94,234,212,0.05)" strokeWidth="1" strokeDasharray="6 4" />
    </svg>
  );
}

function AIVisual() {
  return (
    <svg viewBox="0 0 400 300" className="w-full h-full opacity-90" fill="none">
      <rect x="60" y="180" width="180" height="48" rx="24" fill="rgba(139,92,246,0.15)" stroke="rgba(139,92,246,0.4)" strokeWidth="1.2" />
      <text x="150" y="210" textAnchor="middle" fill="rgb(196,181,253)" fontSize="12" fontWeight="500">Comment trouver un refuge ?</text>
      <rect x="160" y="110" width="180" height="48" rx="24" fill="rgba(99,102,241,0.25)" stroke="rgba(99,102,241,0.5)" strokeWidth="1.2" />
      <text x="250" y="138" textAnchor="middle" fill="rgb(199,210,254)" fontSize="11">3 hébergements près de vous</text>
      <text x="250" y="152" textAnchor="middle" fill="rgb(165,180,252)" fontSize="10">↓ Afficher sur la carte</text>
      <rect x="60" y="50" width="150" height="40" rx="20" fill="rgba(139,92,246,0.1)" stroke="rgba(139,92,246,0.3)" strokeWidth="1" />
      <text x="135" y="75" textAnchor="middle" fill="rgb(196,181,253)" fontSize="11">Banques alimentaires ?</text>
      <circle cx="340" cy="150" r="38" fill="rgba(99,102,241,0.2)" stroke="rgba(99,102,241,0.5)" strokeWidth="1.5" />
      <text x="340" y="143" textAnchor="middle" fill="rgb(199,210,254)" fontSize="20">🤖</text>
      <text x="340" y="162" textAnchor="middle" fill="rgb(165,180,252)" fontSize="10" fontWeight="600">CivicAI</text>
      <line x1="240" y1="204" x2="305" y2="170" stroke="rgba(139,92,246,0.3)" strokeWidth="1" strokeDasharray="3 3" />
      <line x1="340" y1="175" x2="340" y2="190" stroke="rgba(99,102,241,0.3)" strokeWidth="1" />
      <line x1="210" y1="134" x2="302" y2="140" stroke="rgba(99,102,241,0.3)" strokeWidth="1" strokeDasharray="3 3" />
      {["FR","EN","ES","AR","HT"].map((l, i) => (
        <g key={i}>
          <circle cx={30 + i * 22} cy={270} r="10" fill="rgba(139,92,246,0.2)" stroke="rgba(139,92,246,0.35)" strokeWidth="1" />
          <text x={30 + i * 22} y={274} textAnchor="middle" fill="rgb(196,181,253)" fontSize="7" fontWeight="700">{l}</text>
        </g>
      ))}
    </svg>
  );
}

function DataVisual() {
  const bars = [55, 72, 48, 88, 63, 95, 70];
  return (
    <svg viewBox="0 0 400 300" className="w-full h-full opacity-90" fill="none">
      <rect x="40" y="40" width="320" height="200" rx="12" fill="rgba(251,146,60,0.06)" stroke="rgba(251,146,60,0.2)" strokeWidth="1" />
      <text x="60" y="68" fill="rgb(253,186,116)" fontSize="11" fontWeight="600">Utilisation des services — Québec</text>
      {bars.map((h, i) => (
        <g key={i}>
          <rect
            x={68 + i * 40}
            y={200 - h * 1.1}
            width="22"
            height={h * 1.1}
            rx="4"
            fill={`rgba(251,146,60,${0.3 + (h / 100) * 0.5})`}
            stroke="rgba(251,146,60,0.4)"
            strokeWidth="0.8"
          />
        </g>
      ))}
      <line x1="55" y1="200" x2="355" y2="200" stroke="rgba(251,146,60,0.2)" strokeWidth="1" />
      {[0,1,2,3].map(i => (
        <line key={i} x1="55" y1={200 - i * 40} x2="355" y2={200 - i * 40} stroke="rgba(251,146,60,0.08)" strokeWidth="0.8" strokeDasharray="4 3" />
      ))}
      <rect x="250" y="55" width="100" height="60" rx="8" fill="rgba(251,146,60,0.12)" stroke="rgba(251,146,60,0.25)" strokeWidth="1" />
      <text x="300" y="78" textAnchor="middle" fill="rgb(253,186,116)" fontSize="18" fontWeight="800">+34%</text>
      <text x="300" y="94" textAnchor="middle" fill="rgb(253,186,116)" fontSize="9">demandes IA</text>
      <text x="300" y="107" textAnchor="middle" fill="rgba(253,186,116,0.6)" fontSize="8">ce mois-ci</text>
      <circle cx="80" cy="260" r="8" fill="rgba(251,146,60,0.3)" stroke="rgba(251,146,60,0.5)" strokeWidth="1" />
      <text x="95" y="264" fill="rgba(253,186,116,0.7)" fontSize="9">Données anonymisées · MIN_AGGREGATE = 5</text>
    </svg>
  );
}

function SlideVisual({ type }: { type: string }) {
  if (type === "network") return <NetworkVisual />;
  if (type === "ai") return <AIVisual />;
  return <DataVisual />;
}

export function Landing() {
  const [lang, setLang] = useState<"fr" | "en">("fr");
  const [slide, setSlide] = useState(0);
  const [fading, setFading] = useState(false);
  const t = T[lang];

  useEffect(() => {
    const timer = setInterval(() => {
      setFading(true);
      setTimeout(() => {
        setSlide(s => (s + 1) % 3);
        setFading(false);
      }, 400);
    }, 5000);
    return () => clearInterval(timer);
  }, []);

  const goToSlide = (i: number) => {
    if (i === slide) return;
    setFading(true);
    setTimeout(() => { setSlide(i); setFading(false); }, 400);
  };

  const s = t.slides[slide];

  return (
    <div className="min-h-screen bg-white font-sans antialiased text-slate-900 overflow-x-hidden">

      {/* NAV */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-white/90 backdrop-blur border-b border-slate-100">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <img src="/__mockup/civicai-logo.png" alt="CivicAI" className="h-9 w-auto" />
          </div>
          <div className="hidden md:flex items-center gap-8 text-sm font-medium text-slate-600">
            <a href="#mission" className="hover:text-teal-600 transition-colors">{t.nav_mission}</a>
            <a href="#products" className="hover:text-teal-600 transition-colors">{t.nav_products}</a>
            <a href="#contact" className="hover:text-teal-600 transition-colors">{t.nav_contact}</a>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setLang(lang === "fr" ? "en" : "fr")}
              className="text-xs font-semibold px-3 py-1.5 rounded-full border border-slate-200 hover:border-teal-400 hover:text-teal-600 transition-colors"
            >
              {lang === "fr" ? "EN" : "FR"}
            </button>
            <a href="mailto:contact@civicai.ca" className="hidden md:inline-flex bg-teal-600 text-white text-sm font-semibold px-4 py-2 rounded-lg hover:bg-teal-700 transition-colors">
              {t.hero_cta}
            </a>
          </div>
        </div>
      </nav>

      {/* HERO */}
      <section className="pt-16">
        {/* Slide Banner */}
        <div className={`relative w-full h-[480px] bg-gradient-to-br ${s.bg} overflow-hidden transition-opacity duration-400 ${fading ? "opacity-0" : "opacity-100"}`}
          style={{ transition: "opacity 0.4s ease" }}>

          {/* Background decorative orbs */}
          <div className={`absolute top-10 right-20 w-80 h-80 rounded-full bg-gradient-to-br ${s.accent} opacity-10 blur-3xl`} />
          <div className={`absolute bottom-0 left-10 w-60 h-60 rounded-full bg-gradient-to-br ${s.accent} opacity-8 blur-3xl`} />

          {/* Grid pattern overlay */}
          <div className="absolute inset-0 opacity-5"
            style={{ backgroundImage: "radial-gradient(circle, rgba(255,255,255,0.4) 1px, transparent 1px)", backgroundSize: "32px 32px" }} />

          <div className="relative h-full max-w-6xl mx-auto px-6 flex items-center gap-12">
            {/* Text side */}
            <div className="flex-1 min-w-0">
              <div className={`inline-flex items-center gap-2 bg-gradient-to-r ${s.accent} bg-clip-text mb-4`}>
                <span className={`text-xs font-bold uppercase tracking-widest bg-gradient-to-r ${s.accent} bg-clip-text text-transparent`}>
                  {s.tag}
                </span>
              </div>
              <h2 className="text-3xl md:text-4xl font-black text-white leading-tight mb-4">
                {s.title}
              </h2>
              <p className="text-slate-300 text-base leading-relaxed max-w-md">
                {s.sub}
              </p>
            </div>

            {/* Visual side */}
            <div className="hidden md:block w-80 h-72 flex-shrink-0">
              <SlideVisual type={s.visual} />
            </div>
          </div>

          {/* Slide indicators + nav arrows */}
          <div className="absolute bottom-5 left-0 right-0 flex items-center justify-center gap-3">
            {[0, 1, 2].map(i => (
              <button
                key={i}
                onClick={() => goToSlide(i)}
                className={`transition-all duration-300 rounded-full ${i === slide
                  ? `w-8 h-2 bg-gradient-to-r ${s.accent}`
                  : "w-2 h-2 bg-white/30 hover:bg-white/50"
                  }`}
              />
            ))}
          </div>

          {/* Arrow buttons */}
          <button
            onClick={() => goToSlide((slide + 2) % 3)}
            className="absolute left-4 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors"
          >‹</button>
          <button
            onClick={() => goToSlide((slide + 1) % 3)}
            className="absolute right-4 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors"
          >›</button>
        </div>

        {/* Hero text below banner */}
        <div className="py-16 px-6 bg-gradient-to-b from-slate-50 to-white">
          <div className="max-w-4xl mx-auto">
            <img src="/__mockup/civicai-logo.png" alt="CivicAI" className="h-16 w-auto mb-8" />
            <div className="inline-flex items-center gap-2 bg-teal-50 border border-teal-200 text-teal-700 text-xs font-semibold px-3 py-1.5 rounded-full mb-6">
              <span className="w-1.5 h-1.5 rounded-full bg-teal-500 animate-pulse" />
              {t.hero_tag}
            </div>
            <h1 className="text-5xl md:text-6xl font-black tracking-tight leading-tight mb-6 text-slate-900">
              {t.hero_title.split("\n").map((line, i) => (
                <span key={i} className={i === 1 ? "text-teal-600" : ""}>{line}{i === 0 && <br />}</span>
              ))}
            </h1>
            <p className="text-xl text-slate-600 leading-relaxed max-w-2xl mb-10">
              {t.hero_sub}
            </p>
            <div className="flex flex-wrap gap-4">
              <a href="mailto:contact@civicai.ca" className="bg-teal-600 text-white font-semibold px-6 py-3 rounded-xl hover:bg-teal-700 transition-all shadow-lg shadow-teal-200">
                {t.hero_cta}
              </a>
              <a href="#products" className="bg-white text-slate-700 font-semibold px-6 py-3 rounded-xl border border-slate-200 hover:border-teal-300 transition-all">
                {t.hero_cta2} →
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* FLAGSHIP — AttenteZéro */}
      <section id="products" className="py-24 px-6 bg-slate-900">
        <div className="max-w-5xl mx-auto">
          <div className="inline-flex items-center gap-2 bg-teal-500/20 border border-teal-500/30 text-teal-400 text-xs font-semibold px-3 py-1.5 rounded-full mb-8">
            ⭐ {t.flagship_tag}
          </div>
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div>
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-teal-400 to-teal-700 flex items-center justify-center shadow-lg">
                  <span className="text-2xl">📍</span>
                </div>
                <h2 className="text-3xl font-black text-white">{t.flagship_name}</h2>
              </div>
              <p className="text-slate-300 text-lg leading-relaxed mb-8">
                {t.flagship_desc}
              </p>
              <div className="grid grid-cols-3 gap-4 mb-8">
                {[0, 1, 2].map(i => (
                  <div key={i} className="bg-white/5 rounded-xl p-4 text-center border border-white/10">
                    <div className="text-2xl font-black text-teal-400">{t.flagship_stats[i * 2]}</div>
                    <div className="text-xs text-slate-400 mt-1">{t.flagship_stats[i * 2 + 1]}</div>
                  </div>
                ))}
              </div>
              <div className="flex gap-3">
                <a href="https://apps.apple.com/ca/app/attentezero/id6766750916" className="flex items-center gap-2 bg-white text-slate-900 font-semibold px-4 py-2.5 rounded-lg text-sm hover:bg-teal-50 transition-colors">
                  🍎 {t.flagship_ios}
                </a>
                <a href="https://play.google.com/store/apps/details?id=com.attentezero.app" className="flex items-center gap-2 bg-white/10 text-white font-semibold px-4 py-2.5 rounded-lg text-sm border border-white/20 hover:bg-white/20 transition-colors">
                  🤖 {t.flagship_android}
                </a>
              </div>
            </div>
            <div className="relative">
              <div className="bg-gradient-to-br from-teal-600/20 to-teal-900/40 rounded-3xl p-8 border border-teal-500/20 backdrop-blur">
                <div className="bg-teal-600 rounded-2xl p-6 text-center mb-4 shadow-2xl">
                  <div className="text-5xl mb-3">📍</div>
                  <div className="text-white font-black text-xl">AttenteZéro</div>
                  <div className="text-teal-200 text-sm mt-1">Services communautaires du Québec</div>
                  <div className="mt-4 bg-white/20 rounded-full px-4 py-1.5 inline-flex items-center gap-2 text-white text-xs">
                    <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
                    7 957 services actifs
                  </div>
                </div>
                <div className="text-center text-teal-300 text-xs">
                  <a href="https://attentezero.ca/privacy" className="hover:text-teal-100 underline">
                    {t.flagship_web}
                  </a>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* PROJETS À VENIR */}
      <section className="py-24 px-6 bg-slate-50">
        <div className="max-w-5xl mx-auto">
          <div className="inline-flex items-center gap-2 bg-slate-200 text-slate-600 text-xs font-semibold px-3 py-1.5 rounded-full mb-4">
            🚀 {t.upcoming_tag}
          </div>
          <h2 className="text-3xl font-black text-slate-900 mb-3">{t.upcoming_title}</h2>
          <p className="text-slate-500 mb-12 max-w-xl">{t.upcoming_sub}</p>
          <div className="grid md:grid-cols-3 gap-6">
            {t.projects.map((p, i) => (
              <div key={i} className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all">
                <div className="text-3xl mb-4">{p.icon}</div>
                <div className="flex items-center gap-2 mb-2">
                  <h3 className="font-bold text-slate-900">{p.name}</h3>
                  <span className="text-xs bg-teal-50 text-teal-600 font-semibold px-2 py-0.5 rounded-full border border-teal-100">
                    {lang === "fr" ? "Bientôt" : "Soon"}
                  </span>
                </div>
                <p className="text-sm text-slate-500 leading-relaxed">{p.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* MISSION */}
      <section id="mission" className="py-24 px-6 bg-white">
        <div className="max-w-4xl mx-auto">
          <div className="inline-flex items-center gap-2 bg-teal-50 border border-teal-200 text-teal-700 text-xs font-semibold px-3 py-1.5 rounded-full mb-6">
            🏢 {t.mission_tag}
          </div>
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="text-3xl font-black text-slate-900 mb-6">{t.mission_title}</h2>
              <p className="text-slate-600 text-lg leading-relaxed mb-6">{t.mission_text}</p>
              <div className="flex flex-col gap-2">
                {[t.mission_neq, t.mission_hq, lang === "fr" ? "Fondée en 2026" : "Founded in 2026"].map((item, i) => (
                  <div key={i} className="flex items-center gap-2 text-sm text-slate-500">
                    <span className="w-1.5 h-1.5 rounded-full bg-teal-500" />
                    {item}
                  </div>
                ))}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              {[
                { n: "7 957", l: lang === "fr" ? "services indexés" : "indexed services" },
                { n: "5", l: lang === "fr" ? "langues supportées" : "supported languages" },
                { n: "B2G", l: lang === "fr" ? "modèle d'affaires" : "business model" },
                { n: "100%", l: lang === "fr" ? "gratuit pour le citoyen" : "free for citizens" },
              ].map((s, i) => (
                <div key={i} className="bg-slate-50 rounded-2xl p-5 border border-slate-100">
                  <div className="text-2xl font-black text-teal-600">{s.n}</div>
                  <div className="text-xs text-slate-500 mt-1">{s.l}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* CONTACT */}
      <section id="contact" className="py-24 px-6 bg-gradient-to-br from-teal-600 to-teal-800 text-white">
        <div className="max-w-3xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 bg-white/10 border border-white/20 text-teal-100 text-xs font-semibold px-3 py-1.5 rounded-full mb-6">
            ✉️ {t.contact_tag}
          </div>
          <h2 className="text-3xl font-black mb-4">{t.contact_title}</h2>
          <p className="text-teal-100 text-lg mb-10 max-w-xl mx-auto leading-relaxed">{t.contact_sub}</p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <a href="mailto:contact@civicai.ca" className="bg-white text-teal-700 font-bold px-8 py-3.5 rounded-xl hover:bg-teal-50 transition-colors shadow-lg">
              {t.contact_email} →
            </a>
            <a href="mailto:demo@civicai.ca?subject=Demande+de+démo+CivicAI" className="bg-white/10 border border-white/30 text-white font-bold px-8 py-3.5 rounded-xl hover:bg-white/20 transition-colors">
              {t.contact_demo}
            </a>
          </div>
          <p className="mt-6 text-teal-200 text-sm">contact@civicai.ca</p>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="py-8 px-6 bg-slate-900 text-center">
        <div className="flex items-center justify-center mb-3">
          <div className="bg-white rounded-lg px-3 py-1.5 inline-flex items-center">
            <img src="/__mockup/civicai-logo.png" alt="CivicAI" className="h-7 w-auto" />
          </div>
        </div>
        <p className="text-slate-500 text-xs">{t.footer}</p>
        <div className="flex items-center justify-center gap-4 mt-3 text-xs text-slate-600">
          <a href="https://attentezero.ca/privacy" className="hover:text-slate-400 transition-colors">
            {lang === "fr" ? "Confidentialité" : "Privacy"}
          </a>
          <span>·</span>
          <a href="https://attentezero.ca" className="hover:text-slate-400 transition-colors">AttenteZéro</a>
        </div>
      </footer>
    </div>
  );
}
