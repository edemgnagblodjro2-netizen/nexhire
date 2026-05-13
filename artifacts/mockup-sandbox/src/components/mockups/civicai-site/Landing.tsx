import { useState, useEffect } from "react";

const LOGO = "/__mockup/civicai-logo.png";

const SERVICES_FR = [
  {
    icon: "🤖",
    title: "L'IA au service de votre entreprise",
    punch: "Travaillez plus intelligemment. Croissez plus rapidement.",
    desc: "Nous aidons les entreprises à automatiser leurs tâches et à exploiter l'intelligence artificielle pour gagner en productivité.",
    features: ["Outils de gestion sur mesure", "Automatisation avec l'IA", "Optimisation des outils existants", "Tableaux de bord intelligents"],
    accent: "from-blue-600 to-blue-900",
    bg: "from-[#0a0f2e] via-[#0d1a4a] to-[#0a0f2e]",
    badge: "IA & Automatisation",
    visual: "ai-biz",
  },
  {
    icon: "⚙️",
    title: "Vos idées. Nos solutions technologiques.",
    punch: "Des outils de gestion performants pour avancer à la vitesse supérieure.",
    desc: "Solutions personnalisées pour gérer vos projets, clients, finances et analyses en un seul endroit.",
    features: ["Gestion de projets & tâches", "CRM & gestion clients", "Facturation & paiements", "Rapports & analyses", "Solutions 100% personnalisées"],
    accent: "from-blue-500 to-indigo-700",
    bg: "from-[#0d1a4a] via-[#101e50] to-[#0a1235]",
    badge: "Solutions sur mesure",
    visual: "tech",
  },
  {
    icon: "🚀",
    title: "Optimiser. Automatiser. Propulser.",
    punch: "Votre partenaire technologique de confiance.",
    desc: "Nous optimisons vos outils existants avec l'intelligence artificielle pour des résultats concrets et mesurables.",
    features: ["Automatisation intelligente", "Gain de temps et d'efficacité", "Meilleures décisions", "Croissance durable"],
    accent: "from-indigo-500 to-blue-700",
    bg: "from-[#080d28] via-[#0d1a4a] to-[#080d28]",
    badge: "Optimisation IA",
    visual: "optimize",
  },
  {
    icon: "💻",
    title: "Sites web modernes pour entreprises ambitieuses.",
    punch: "Design, performance et expérience utilisateur au cœur de chaque création.",
    desc: "Nous concevons des sites web sur mesure qui reflètent votre marque et convertissent vos visiteurs en clients.",
    features: ["Sites web sur mesure", "Design réactif & moderne", "SEO & performance", "Sécurité & évolutivité", "Maintenance & support"],
    accent: "from-cyan-500 to-blue-700",
    bg: "from-[#0a1535] via-[#0d1e50] to-[#080d28]",
    badge: "Développement web",
    visual: "web",
  },
  {
    icon: "📈",
    title: "Digital. Stratégie. Croissance.",
    punch: "Ensemble, propulsons votre entreprise vers l'avenir.",
    desc: "Nous vous aidons à bâtir votre présence en ligne et à atteindre vos objectifs avec une stratégie digitale complète.",
    features: ["Stratégie digitale", "Gestion des réseaux sociaux", "Publicité en ligne (SEA & Social Ads)", "Contenu & image de marque", "Analyse & performance"],
    accent: "from-blue-400 to-blue-800",
    bg: "from-[#0a0f2e] via-[#0d1a4a] to-[#080d1e]",
    badge: "Marketing digital",
    visual: "digital",
  },
];

const SERVICES_EN = [
  {
    icon: "🤖",
    title: "AI at the service of your business",
    punch: "Work smarter. Grow faster.",
    desc: "We help businesses automate tasks and leverage artificial intelligence to boost productivity.",
    features: ["Custom management tools", "AI automation", "Optimization of existing tools", "Smart dashboards"],
    accent: "from-blue-600 to-blue-900",
    bg: "from-[#0a0f2e] via-[#0d1a4a] to-[#0a0f2e]",
    badge: "AI & Automation",
    visual: "ai-biz",
  },
  {
    icon: "⚙️",
    title: "Your ideas. Our technology.",
    punch: "High-performance management tools to move at full speed.",
    desc: "Customized solutions to manage your projects, clients, finances, and analytics in one place.",
    features: ["Project & task management", "CRM & client management", "Invoicing & payments", "Reports & analytics", "100% custom solutions"],
    accent: "from-blue-500 to-indigo-700",
    bg: "from-[#0d1a4a] via-[#101e50] to-[#0a1235]",
    badge: "Custom solutions",
    visual: "tech",
  },
  {
    icon: "🚀",
    title: "Optimize. Automate. Propel.",
    punch: "Your trusted technology partner.",
    desc: "We optimize your existing tools with artificial intelligence for concrete, measurable results.",
    features: ["Intelligent automation", "Time savings & efficiency", "Better decisions", "Sustainable growth"],
    accent: "from-indigo-500 to-blue-700",
    bg: "from-[#080d28] via-[#0d1a4a] to-[#080d28]",
    badge: "AI Optimization",
    visual: "optimize",
  },
  {
    icon: "💻",
    title: "Modern websites for ambitious businesses.",
    punch: "Design, performance and user experience at the heart of every creation.",
    desc: "We design custom websites that reflect your brand and convert visitors into customers.",
    features: ["Custom websites", "Responsive & modern design", "SEO & performance", "Security & scalability", "Maintenance & support"],
    accent: "from-cyan-500 to-blue-700",
    bg: "from-[#0a1535] via-[#0d1e50] to-[#080d28]",
    badge: "Web development",
    visual: "web",
  },
  {
    icon: "📈",
    title: "Digital. Strategy. Growth.",
    punch: "Together, let's propel your business into the future.",
    desc: "We help you build your online presence and achieve your goals with a complete digital strategy.",
    features: ["Digital strategy", "Social media management", "Online advertising (SEA & Social Ads)", "Content & brand identity", "Analytics & performance"],
    accent: "from-blue-400 to-blue-800",
    bg: "from-[#0a0f2e] via-[#0d1a4a] to-[#080d1e]",
    badge: "Digital marketing",
    visual: "digital",
  },
];

const T = {
  fr: {
    nav_mission: "Mission",
    nav_services: "Services",
    nav_products: "Produits",
    nav_contact: "Contact",
    hero_tag: "IA · Bien commun · Québec, Canada",
    hero_title: "Technologie au service\nde vos idées.",
    hero_sub: "CivicAI conçoit des solutions numériques intelligentes pour les entreprises, organisations et administrations publiques — partout au Canada.",
    hero_cta: "Demander une démo",
    hero_cta2: "Voir nos services",
    services_tag: "Nos services",
    services_title: "Ce que nous faisons",
    services_sub: "Des solutions technologiques complètes, de l'automatisation IA au marketing digital.",
    flagship_tag: "Produit citoyen phare",
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
    mission_text: "CivicAI est une entreprise québécoise spécialisée en intelligence artificielle appliquée aux services publics et privés. Nous croyons que la technologie doit d'abord servir les personnes et les organisations qui en ont le plus besoin.",
    mission_neq: "NEQ : 2280791601",
    mission_hq: "Siège social : Québec, Canada",
    mission_founded: "Fondée en 2026",
    contact_tag: "Contact",
    contact_title: "Parlons de votre projet",
    contact_sub: "Entreprise, organisme ou administration publique ? Discutons de comment CivicAI peut vous aider à atteindre vos objectifs.",
    contact_email: "Nous écrire",
    contact_demo: "Demander une démo",
    footer: "© 2026 CivicAI — NEQ 2280791601 — Québec, Canada",
    footer_tagline: "TECHNOLOGIE AU SERVICE DE VOS IDÉES",
    services: SERVICES_FR,
  },
  en: {
    nav_mission: "Mission",
    nav_services: "Services",
    nav_products: "Products",
    nav_contact: "Contact",
    hero_tag: "AI · Public Good · Quebec, Canada",
    hero_title: "Technology at the service\nof your ideas.",
    hero_sub: "CivicAI designs intelligent digital solutions for businesses, organizations, and public administrations — across Canada.",
    hero_cta: "Request a demo",
    hero_cta2: "See our services",
    services_tag: "Our services",
    services_title: "What we do",
    services_sub: "Complete technology solutions, from AI automation to digital marketing.",
    flagship_tag: "Flagship civic product",
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
    mission_text: "CivicAI is a Quebec-based company specializing in AI applied to public and private services. We believe technology should first serve the people and organizations that need it most.",
    mission_neq: "QEI: 2280791601",
    mission_hq: "Headquarters: Quebec, Canada",
    mission_founded: "Founded in 2026",
    contact_tag: "Contact",
    contact_title: "Let's talk about your project",
    contact_sub: "Business, organization, or public administration? Let's discuss how CivicAI can help you reach your goals.",
    contact_email: "Send us an email",
    contact_demo: "Request a demo",
    footer: "© 2026 CivicAI — QEI 2280791601 — Quebec, Canada",
    footer_tagline: "TECHNOLOGY AT THE SERVICE OF YOUR IDEAS",
    services: SERVICES_EN,
  },
};

// Simple SVG visuals per slide type
function SlideVisual({ type }: { type: string }) {
  if (type === "ai-biz") return (
    <svg viewBox="0 0 360 260" fill="none" className="w-full h-full opacity-80">
      <circle cx="180" cy="130" r="50" fill="rgba(59,130,246,0.15)" stroke="rgba(59,130,246,0.4)" strokeWidth="1.5"/>
      <text x="180" y="137" textAnchor="middle" fill="rgb(147,197,253)" fontSize="28" fontWeight="800">AI</text>
      {[{x:60,y:50,e:"🧠"},{x:300,y:50,e:"⚡"},{x:40,y:180,e:"📊"},{x:320,y:180,e:"🔧"},{x:180,y:30,e:"🤖"}].map((n,i)=>(
        <g key={i}>
          <line x1="180" y1="130" x2={n.x} y2={n.y} stroke="rgba(59,130,246,0.2)" strokeWidth="1" strokeDasharray="4 3"/>
          <circle cx={n.x} cy={n.y} r="24" fill="rgba(30,58,138,0.4)" stroke="rgba(59,130,246,0.35)" strokeWidth="1"/>
          <text x={n.x} y={n.y+6} textAnchor="middle" fontSize="16">{n.e}</text>
        </g>
      ))}
      <circle cx="180" cy="130" r="80" stroke="rgba(59,130,246,0.07)" strokeWidth="1" strokeDasharray="5 4"/>
      <circle cx="180" cy="130" r="115" stroke="rgba(59,130,246,0.04)" strokeWidth="1" strokeDasharray="5 4"/>
      {/* Quebec skyline silhouette */}
      <path d="M0 240 Q30 220 60 225 Q90 210 120 215 Q150 200 180 205 Q210 200 240 215 Q270 210 300 225 Q330 220 360 230 L360 260 L0 260 Z" fill="rgba(59,130,246,0.08)"/>
    </svg>
  );
  if (type === "tech") return (
    <svg viewBox="0 0 360 260" fill="none" className="w-full h-full opacity-80">
      {[{x:60,y:60,w:100,h:36,t:"Gestion projets"},{x:60,y:110,w:110,h:36,t:"CRM clients"},{x:60,y:160,w:90,h:36,t:"Facturation"},{x:200,y:75,w:110,h:36,t:"Rapports & analytics"},{x:200,y:130,w:120,h:36,t:"Solutions sur mesure"}].map((b,i)=>(
        <g key={i}>
          <rect x={b.x} y={b.y} width={b.w} height={b.h} rx="8" fill="rgba(79,70,229,0.18)" stroke="rgba(99,102,241,0.35)" strokeWidth="1"/>
          <text x={b.x+b.w/2} y={b.y+22} textAnchor="middle" fill="rgb(199,210,254)" fontSize="10" fontWeight="500">{b.t}</text>
        </g>
      ))}
      <rect x="140" y="50" width="2" height="160" fill="rgba(99,102,241,0.15)"/>
      <path d="M0 240 Q90 220 180 228 Q270 218 360 232 L360 260 L0 260Z" fill="rgba(79,70,229,0.08)"/>
    </svg>
  );
  if (type === "optimize") return (
    <svg viewBox="0 0 360 260" fill="none" className="w-full h-full opacity-80">
      {["Automatisation","Efficacité","Décisions","Croissance"].map((l,i)=>(
        <g key={i}>
          <rect x={40+i*75} y={200-(i*30+40)} width="55" height={i*30+40} rx="6"
            fill={`rgba(99,102,241,${0.2+i*0.1})`} stroke="rgba(99,102,241,0.4)" strokeWidth="1"/>
          <text x={40+i*75+27} y={210} textAnchor="middle" fill="rgb(199,210,254)" fontSize="8" transform={`rotate(-35,${40+i*75+27},210)`}>{l}</text>
        </g>
      ))}
      <path d="M40 190 Q115 155 190 140 Q265 125 320 90" stroke="rgba(99,102,241,0.6)" strokeWidth="2" strokeDasharray="6 3"/>
      <circle cx="320" cy="90" r="8" fill="rgba(99,102,241,0.5)" stroke="rgba(139,92,246,0.8)" strokeWidth="1.5"/>
      <text x="320" y="78" textAnchor="middle" fill="rgb(196,181,253)" fontSize="10" fontWeight="700">+34%</text>
      <path d="M0 240 Q180 220 360 235 L360 260 L0 260Z" fill="rgba(79,70,229,0.07)"/>
    </svg>
  );
  if (type === "web") return (
    <svg viewBox="0 0 360 260" fill="none" className="w-full h-full opacity-80">
      <rect x="60" y="40" width="240" height="160" rx="10" fill="rgba(14,30,90,0.5)" stroke="rgba(34,211,238,0.3)" strokeWidth="1.2"/>
      <rect x="60" y="40" width="240" height="28" rx="10" fill="rgba(6,182,212,0.15)" stroke="rgba(34,211,238,0.25)" strokeWidth="0.8"/>
      <circle cx="78" cy="54" r="5" fill="rgba(239,68,68,0.5)"/>
      <circle cx="93" cy="54" r="5" fill="rgba(234,179,8,0.5)"/>
      <circle cx="108" cy="54" r="5" fill="rgba(34,197,94,0.5)"/>
      <rect x="75" y="82" width="120" height="8" rx="4" fill="rgba(34,211,238,0.3)"/>
      <rect x="75" y="100" width="80" height="6" rx="3" fill="rgba(148,163,184,0.2)"/>
      <rect x="75" y="114" width="100" height="6" rx="3" fill="rgba(148,163,184,0.2)"/>
      <rect x="75" y="128" width="60" height="6" rx="3" fill="rgba(148,163,184,0.2)"/>
      <rect x="200" y="82" width="85" height="80" rx="8" fill="rgba(6,182,212,0.1)" stroke="rgba(34,211,238,0.25)" strokeWidth="1"/>
      <text x="242" y="128" textAnchor="middle" fill="rgba(34,211,238,0.6)" fontSize="28">🖥</text>
      <rect x="75" y="155" width="70" height="22" rx="8" fill="rgba(6,182,212,0.25)" stroke="rgba(34,211,238,0.4)" strokeWidth="1"/>
      <text x="110" y="170" textAnchor="middle" fill="rgb(103,232,249)" fontSize="10" fontWeight="600">Voir le site →</text>
      <path d="M0 240 Q180 222 360 238 L360 260 L0 260Z" fill="rgba(6,182,212,0.06)"/>
    </svg>
  );
  // digital
  return (
    <svg viewBox="0 0 360 260" fill="none" className="w-full h-full opacity-80">
      {[{icon:"📱",l:"Réseaux sociaux",x:50,y:80},{icon:"📣",l:"Publicité",x:50,y:145},{icon:"✍️",l:"Contenu",x:180,y:60},{icon:"📊",l:"Analytics",x:180,y:145},{icon:"🎯",l:"Stratégie",x:270,y:100}].map((n,i)=>(
        <g key={i}>
          <rect x={n.x} y={n.y} width="90" height="50" rx="10" fill="rgba(37,99,235,0.18)" stroke="rgba(59,130,246,0.3)" strokeWidth="1"/>
          <text x={n.x+45} y={n.y+22} textAnchor="middle" fontSize="16">{n.icon}</text>
          <text x={n.x+45} y={n.y+40} textAnchor="middle" fill="rgb(147,197,253)" fontSize="9">{n.l}</text>
        </g>
      ))}
      <path d="M95 105 Q135 60 180 85" stroke="rgba(59,130,246,0.25)" strokeWidth="1" strokeDasharray="3 3"/>
      <path d="M140 85 Q180 110 180 145" stroke="rgba(59,130,246,0.2)" strokeWidth="1" strokeDasharray="3 3"/>
      <path d="M270 125 Q250 145 270 170" stroke="rgba(59,130,246,0.2)" strokeWidth="1" strokeDasharray="3 3"/>
      <path d="M0 240 Q90 222 180 230 Q270 220 360 235 L360 260 L0 260Z" fill="rgba(37,99,235,0.07)"/>
    </svg>
  );
}

export function Landing() {
  const [lang, setLang] = useState<"fr" | "en">("fr");
  const [slide, setSlide] = useState(0);
  const [fading, setFading] = useState(false);
  const t = T[lang];
  const totalSlides = t.services.length;

  useEffect(() => {
    const timer = setInterval(() => {
      setFading(true);
      setTimeout(() => { setSlide(s => (s + 1) % totalSlides); setFading(false); }, 350);
    }, 4500);
    return () => clearInterval(timer);
  }, [totalSlides]);

  const goTo = (i: number) => {
    if (i === slide) return;
    setFading(true);
    setTimeout(() => { setSlide(i); setFading(false); }, 350);
  };

  const s = t.services[slide];

  return (
    <div className="min-h-screen bg-white font-sans antialiased text-slate-900 overflow-x-hidden">

      {/* NAV */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-white/95 backdrop-blur border-b border-slate-100 shadow-sm">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <img src={LOGO} alt="CivicAI" className="h-9 w-auto" />
          <div className="hidden md:flex items-center gap-7 text-sm font-medium text-slate-600">
            <a href="#services" className="hover:text-blue-700 transition-colors">{t.nav_services}</a>
            <a href="#mission" className="hover:text-blue-700 transition-colors">{t.nav_mission}</a>
            <a href="#products" className="hover:text-blue-700 transition-colors">{t.nav_products}</a>
            <a href="#contact" className="hover:text-blue-700 transition-colors">{t.nav_contact}</a>
          </div>
          <div className="flex items-center gap-3">
            <button onClick={() => setLang(lang === "fr" ? "en" : "fr")}
              className="text-xs font-semibold px-3 py-1.5 rounded-full border border-slate-200 hover:border-blue-400 hover:text-blue-700 transition-colors">
              {lang === "fr" ? "EN" : "FR"}
            </button>
            <a href="mailto:contact@attentezero.ca"
              className="hidden md:inline-flex bg-blue-700 text-white text-sm font-semibold px-4 py-2 rounded-lg hover:bg-blue-800 transition-colors">
              {t.hero_cta}
            </a>
          </div>
        </div>
      </nav>

      {/* HERO CAROUSEL — dark navy matching reference image */}
      <section className="pt-16">
        <div
          className={`relative w-full h-[500px] overflow-hidden bg-gradient-to-br ${s.bg}`}
          style={{ transition: "opacity 0.35s ease", opacity: fading ? 0 : 1 }}
        >
          {/* dot grid overlay */}
          <div className="absolute inset-0 opacity-10"
            style={{ backgroundImage: "radial-gradient(circle, rgba(255,255,255,0.5) 1px, transparent 1px)", backgroundSize: "28px 28px" }} />

          {/* glow */}
          <div className={`absolute top-0 right-0 w-96 h-96 rounded-full blur-3xl bg-gradient-to-br ${s.accent} opacity-10`} />

          <div className="relative h-full max-w-6xl mx-auto px-8 flex items-center gap-8">
            {/* Left text */}
            <div className="flex-1 min-w-0">
              {/* CivicAI logo in slide */}
              <div className="flex items-center gap-3 mb-6">
                <img src={LOGO} alt="CivicAI" className="h-8 w-auto brightness-0 invert opacity-90" />
                <span className={`text-xs font-bold tracking-widest uppercase bg-gradient-to-r ${s.accent} bg-clip-text text-transparent border border-white/10 rounded-full px-2 py-0.5`}>
                  {s.badge}
                </span>
              </div>

              <h2 className="text-3xl md:text-4xl font-black text-white leading-tight mb-4">
                {s.title}
              </h2>
              <p className="text-blue-200 text-sm leading-relaxed max-w-sm mb-6">{s.desc}</p>

              <ul className="flex flex-col gap-1.5 mb-8">
                {s.features.map((f, i) => (
                  <li key={i} className="flex items-center gap-2 text-slate-300 text-sm">
                    <span className={`w-1.5 h-1.5 rounded-full bg-gradient-to-r ${s.accent} flex-shrink-0`} />
                    {f}
                  </li>
                ))}
              </ul>

              <div className="flex gap-2 text-xs text-blue-300 items-center">
                <span>📍</span>
                <span>QUÉBEC, CANADA</span>
              </div>
            </div>

            {/* Right visual */}
            <div className="hidden md:flex w-72 h-64 flex-shrink-0 items-center justify-center">
              <SlideVisual type={s.visual} />
            </div>
          </div>

          {/* Slide counter + dots */}
          <div className="absolute bottom-5 left-0 right-0 flex items-center justify-center gap-2">
            {Array.from({ length: totalSlides }).map((_, i) => (
              <button key={i} onClick={() => goTo(i)}
                className={`transition-all duration-300 rounded-full ${i === slide
                  ? `w-6 h-2 bg-gradient-to-r ${s.accent}`
                  : "w-2 h-2 bg-white/25 hover:bg-white/40"}`} />
            ))}
          </div>

          <button onClick={() => goTo((slide + totalSlides - 1) % totalSlides)}
            className="absolute left-3 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 text-white text-lg flex items-center justify-center transition-colors">‹</button>
          <button onClick={() => goTo((slide + 1) % totalSlides)}
            className="absolute right-3 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 text-white text-lg flex items-center justify-center transition-colors">›</button>
        </div>

        {/* Hero tagline below carousel */}
        <div className="py-16 px-6 bg-gradient-to-b from-slate-50 to-white">
          <div className="max-w-4xl mx-auto">
            <img src={LOGO} alt="CivicAI" className="h-14 w-auto mb-7" />
            <div className="inline-flex items-center gap-2 bg-blue-50 border border-blue-200 text-blue-700 text-xs font-semibold px-3 py-1.5 rounded-full mb-5">
              <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" />
              {t.hero_tag}
            </div>
            <h1 className="text-5xl md:text-6xl font-black tracking-tight leading-tight mb-5 text-slate-900">
              {t.hero_title.split("\n").map((line, i) => (
                <span key={i} className={i === 1 ? "text-blue-700" : ""}>{line}{i === 0 && <br />}</span>
              ))}
            </h1>
            <p className="text-xl text-slate-600 leading-relaxed max-w-2xl mb-9">{t.hero_sub}</p>
            <div className="flex flex-wrap gap-4">
              <a href="mailto:contact@attentezero.ca"
                className="bg-blue-700 text-white font-semibold px-6 py-3 rounded-xl hover:bg-blue-800 transition-all shadow-lg shadow-blue-100">
                {t.hero_cta}
              </a>
              <a href="#services"
                className="bg-white text-slate-700 font-semibold px-6 py-3 rounded-xl border border-slate-200 hover:border-blue-300 transition-all">
                {t.hero_cta2} →
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* SERVICES */}
      <section id="services" className="py-24 px-6 bg-white">
        <div className="max-w-6xl mx-auto">
          <div className="inline-flex items-center gap-2 bg-blue-50 border border-blue-200 text-blue-700 text-xs font-semibold px-3 py-1.5 rounded-full mb-4">
            🛠️ {t.services_tag}
          </div>
          <h2 className="text-3xl font-black text-slate-900 mb-3">{t.services_title}</h2>
          <p className="text-slate-500 mb-14 max-w-xl">{t.services_sub}</p>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {t.services.map((svc, i) => (
              <div key={i}
                className="group relative bg-white rounded-2xl p-6 border border-slate-100 shadow-sm hover:shadow-lg hover:-translate-y-1 transition-all overflow-hidden">
                <div className={`absolute inset-0 bg-gradient-to-br ${svc.bg} opacity-0 group-hover:opacity-100 transition-opacity duration-300`} />
                <div className="relative">
                  <div className="text-3xl mb-3">{svc.icon}</div>
                  <span className={`text-xs font-bold bg-gradient-to-r ${svc.accent} bg-clip-text text-transparent uppercase tracking-wide`}>
                    {svc.badge}
                  </span>
                  <h3 className="font-black text-slate-900 group-hover:text-white mt-2 mb-3 text-base leading-tight transition-colors">
                    {svc.title}
                  </h3>
                  <ul className="flex flex-col gap-1.5 mt-3">
                    {svc.features.map((f, fi) => (
                      <li key={fi} className="flex items-center gap-2 text-sm text-slate-500 group-hover:text-blue-200 transition-colors">
                        <span className={`w-1.5 h-1.5 rounded-full bg-gradient-to-r ${svc.accent} flex-shrink-0`} />
                        {f}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FLAGSHIP — AttenteZéro */}
      <section id="products" className="py-24 px-6 bg-[#0a0f2e]">
        <div className="max-w-5xl mx-auto">
          <div className="inline-flex items-center gap-2 bg-blue-500/20 border border-blue-500/30 text-blue-400 text-xs font-semibold px-3 py-1.5 rounded-full mb-8">
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
              <p className="text-slate-300 text-lg leading-relaxed mb-8">{t.flagship_desc}</p>
              <div className="grid grid-cols-3 gap-4 mb-8">
                {[0, 1, 2].map(i => (
                  <div key={i} className="bg-white/5 rounded-xl p-4 text-center border border-white/10">
                    <div className="text-2xl font-black text-teal-400">{t.flagship_stats[i * 2]}</div>
                    <div className="text-xs text-slate-400 mt-1">{t.flagship_stats[i * 2 + 1]}</div>
                  </div>
                ))}
              </div>
              <div className="flex gap-3">
                <a href="https://apps.apple.com/ca/app/attentezero/id6766750916"
                  className="flex items-center gap-2 bg-white text-slate-900 font-semibold px-4 py-2.5 rounded-lg text-sm hover:bg-blue-50 transition-colors">
                  🍎 {t.flagship_ios}
                </a>
                <a href="https://play.google.com/store/apps/details?id=com.attentezero.app"
                  className="flex items-center gap-2 bg-white/10 text-white font-semibold px-4 py-2.5 rounded-lg text-sm border border-white/20 hover:bg-white/20 transition-colors">
                  🤖 {t.flagship_android}
                </a>
              </div>
            </div>
            <div className="bg-gradient-to-br from-teal-600/20 to-teal-900/40 rounded-3xl p-8 border border-teal-500/20">
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
                <a href="https://attentezero.ca/privacy" className="hover:text-teal-100 underline">{t.flagship_web}</a>
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
                  <span className="text-xs bg-blue-50 text-blue-600 font-semibold px-2 py-0.5 rounded-full border border-blue-100">
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
          <div className="inline-flex items-center gap-2 bg-blue-50 border border-blue-200 text-blue-700 text-xs font-semibold px-3 py-1.5 rounded-full mb-6">
            🏢 {t.mission_tag}
          </div>
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="text-3xl font-black text-slate-900 mb-6">{t.mission_title}</h2>
              <p className="text-slate-600 text-lg leading-relaxed mb-6">{t.mission_text}</p>
              <div className="flex flex-col gap-2">
                {[t.mission_neq, t.mission_hq, t.mission_founded].map((item, i) => (
                  <div key={i} className="flex items-center gap-2 text-sm text-slate-500">
                    <span className="w-1.5 h-1.5 rounded-full bg-blue-600" />
                    {item}
                  </div>
                ))}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              {[
                { n: "5", l: lang === "fr" ? "services offerts" : "services offered" },
                { n: "7 957", l: lang === "fr" ? "services indexés" : "indexed services" },
                { n: "B2G", l: lang === "fr" ? "modèle d'affaires" : "business model" },
                { n: "100%", l: lang === "fr" ? "québécois" : "Quebec-made" },
              ].map((stat, i) => (
                <div key={i} className="bg-slate-50 rounded-2xl p-5 border border-slate-100">
                  <div className="text-2xl font-black text-blue-700">{stat.n}</div>
                  <div className="text-xs text-slate-500 mt-1">{stat.l}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* CONTACT */}
      <section id="contact" className="py-24 px-6 bg-gradient-to-br from-[#0a0f2e] to-[#0d1a4a] text-white">
        <div className="max-w-3xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 bg-white/10 border border-white/20 text-blue-200 text-xs font-semibold px-3 py-1.5 rounded-full mb-6">
            ✉️ {t.contact_tag}
          </div>
          <h2 className="text-3xl font-black mb-4">{t.contact_title}</h2>
          <p className="text-blue-200 text-lg mb-10 max-w-xl mx-auto leading-relaxed">{t.contact_sub}</p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <a href="mailto:contact@attentezero.ca"
              className="bg-white text-blue-900 font-bold px-8 py-3.5 rounded-xl hover:bg-blue-50 transition-colors shadow-lg">
              {t.contact_email} →
            </a>
            <a href="mailto:contact@attentezero.ca?subject=Demande+de+démo+CivicAI"
              className="bg-white/10 border border-white/30 text-white font-bold px-8 py-3.5 rounded-xl hover:bg-white/20 transition-colors">
              {t.contact_demo}
            </a>
          </div>
          <p className="mt-6 text-blue-300 text-sm">contact@attentezero.ca</p>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="py-8 px-6 bg-[#080d1e] text-center">
        <div className="flex items-center justify-center mb-3">
          <div className="bg-white rounded-xl px-4 py-2 inline-flex items-center">
            <img src={LOGO} alt="CivicAI" className="h-7 w-auto" />
          </div>
        </div>
        <p className="text-blue-400 text-xs tracking-widest mb-2">— {t.footer_tagline} —</p>
        <p className="text-slate-600 text-xs">{t.footer}</p>
        <div className="flex items-center justify-center gap-4 mt-3 text-xs text-slate-700">
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
