import { useState } from "react";

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

export function Landing() {
  const [lang, setLang] = useState<"fr" | "en">("fr");
  const t = T[lang];

  return (
    <div className="min-h-screen bg-white font-sans antialiased text-slate-900 overflow-x-hidden">

      {/* NAV */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-white/90 backdrop-blur border-b border-slate-100">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-teal-500 to-teal-700 flex items-center justify-center">
              <span className="text-white font-black text-sm">C</span>
            </div>
            <span className="font-bold text-lg tracking-tight">CivicAI</span>
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
      <section className="pt-32 pb-24 px-6 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-teal-50 via-white to-slate-50" />
        <div className="absolute top-20 right-0 w-96 h-96 bg-teal-100 rounded-full blur-3xl opacity-40" />
        <div className="absolute bottom-0 left-10 w-64 h-64 bg-teal-200 rounded-full blur-3xl opacity-20" />
        <div className="max-w-4xl mx-auto relative">
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
                {[0,1,2].map(i => (
                  <div key={i} className="bg-white/5 rounded-xl p-4 text-center border border-white/10">
                    <div className="text-2xl font-black text-teal-400">{t.flagship_stats[i*2]}</div>
                    <div className="text-xs text-slate-400 mt-1">{t.flagship_stats[i*2+1]}</div>
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
              <div className="absolute -top-4 -right-4 w-24 h-24 bg-teal-500/10 rounded-full blur-2xl" />
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
                <div className="flex items-center gap-2 text-sm text-slate-500">
                  <span className="w-1.5 h-1.5 rounded-full bg-teal-500" />
                  {t.mission_neq}
                </div>
                <div className="flex items-center gap-2 text-sm text-slate-500">
                  <span className="w-1.5 h-1.5 rounded-full bg-teal-500" />
                  {t.mission_hq}
                </div>
                <div className="flex items-center gap-2 text-sm text-slate-500">
                  <span className="w-1.5 h-1.5 rounded-full bg-teal-500" />
                  {lang === "fr" ? "Fondée en 2024" : "Founded in 2024"}
                </div>
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
        <div className="flex items-center justify-center gap-2 mb-2">
          <div className="w-6 h-6 rounded-md bg-gradient-to-br from-teal-500 to-teal-700 flex items-center justify-center">
            <span className="text-white font-black text-xs">C</span>
          </div>
          <span className="text-white font-bold text-sm">CivicAI</span>
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
