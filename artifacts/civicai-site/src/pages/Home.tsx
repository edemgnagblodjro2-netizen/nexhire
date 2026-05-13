import { useState, useEffect } from "react";
import { motion, type Variants } from "framer-motion";
import { 
  Bot, Settings, Rocket, Laptop, TrendingUp, Search, Palette, 
  BarChart, Link as LinkIcon, Lock, BrainCircuit, Smartphone, 
  Megaphone, Pen, Target, MapPin, Star, ClipboardList, HelpCircle, 
  Mail, Building, ArrowRight, ChevronRight, ChevronLeft
} from "lucide-react";
import { FaApple, FaGooglePlay } from "react-icons/fa";

const LOGO = `${import.meta.env.BASE_URL}civicai-logo.png`;

const SERVICES_FR = [
  { icon: <Bot className="w-8 h-8" />, title: "L'IA au service de votre entreprise", punch: "Travaillez plus intelligemment.", desc: "Nous aidons les entreprises à automatiser leurs tâches et à exploiter l'IA pour gagner en productivité.", features: ["Outils de gestion sur mesure", "Automatisation avec l'IA", "Optimisation des outils existants", "Tableaux de bord intelligents"], accent: "from-blue-600 to-blue-900", bg: "from-[#0a0f2e] via-[#0d1a4a] to-[#0a0f2e]", badge: "IA & Automatisation", visual: "ai-biz" },
  { icon: <Settings className="w-8 h-8" />, title: "Vos idées. Nos solutions technologiques.", punch: "Des outils performants pour avancer vite.", desc: "Solutions personnalisées pour gérer vos projets, clients, finances et analyses en un seul endroit.", features: ["Gestion de projets & tâches", "CRM & gestion clients", "Facturation & paiements", "Rapports & analyses", "Solutions 100% personnalisées"], accent: "from-blue-500 to-indigo-700", bg: "from-[#0d1a4a] via-[#101e50] to-[#0a1235]", badge: "Solutions sur mesure", visual: "tech" },
  { icon: <Rocket className="w-8 h-8" />, title: "Optimiser. Automatiser. Propulser.", punch: "Votre partenaire technologique de confiance.", desc: "Nous optimisons vos outils existants avec l'IA pour des résultats concrets et mesurables.", features: ["Automatisation intelligente", "Gain de temps et d'efficacité", "Meilleures décisions", "Croissance durable"], accent: "from-indigo-500 to-blue-700", bg: "from-[#080d28] via-[#0d1a4a] to-[#080d28]", badge: "Optimisation IA", visual: "optimize" },
  { icon: <Laptop className="w-8 h-8" />, title: "Sites web modernes pour entreprises ambitieuses.", punch: "Design, performance et UX au cœur de tout.", desc: "Nous concevons des sites web sur mesure qui reflètent votre marque et convertissent vos visiteurs.", features: ["Sites web sur mesure", "Design réactif & moderne", "SEO & performance", "Sécurité & évolutivité", "Maintenance & support"], accent: "from-cyan-500 to-blue-700", bg: "from-[#0a1535] via-[#0d1e50] to-[#080d28]", badge: "Développement web", visual: "web" },
  { icon: <TrendingUp className="w-8 h-8" />, title: "Digital. Stratégie. Croissance.", punch: "Ensemble, propulsons votre entreprise.", desc: "Nous vous aidons à bâtir votre présence en ligne et atteindre vos objectifs avec une stratégie complète.", features: ["Stratégie digitale", "Gestion des réseaux sociaux", "Publicité en ligne (SEA & Social Ads)", "Contenu & image de marque", "Analyse & performance"], accent: "from-blue-400 to-blue-800", bg: "from-[#0a0f2e] via-[#0d1a4a] to-[#080d1e]", badge: "Marketing digital", visual: "digital" },
];

const SERVICES_EN = [
  { icon: <Bot className="w-8 h-8" />, title: "AI at the service of your business", punch: "Work smarter. Grow faster.", desc: "We help businesses automate tasks and leverage AI to boost productivity.", features: ["Custom management tools", "AI automation", "Optimization of existing tools", "Smart dashboards"], accent: "from-blue-600 to-blue-900", bg: "from-[#0a0f2e] via-[#0d1a4a] to-[#0a0f2e]", badge: "AI & Automation", visual: "ai-biz" },
  { icon: <Settings className="w-8 h-8" />, title: "Your ideas. Our technology.", punch: "High-performance tools to move fast.", desc: "Customized solutions to manage your projects, clients, finances, and analytics in one place.", features: ["Project & task management", "CRM & client management", "Invoicing & payments", "Reports & analytics", "100% custom solutions"], accent: "from-blue-500 to-indigo-700", bg: "from-[#0d1a4a] via-[#101e50] to-[#0a1235]", badge: "Custom solutions", visual: "tech" },
  { icon: <Rocket className="w-8 h-8" />, title: "Optimize. Automate. Propel.", punch: "Your trusted technology partner.", desc: "We optimize your existing tools with AI for concrete, measurable results.", features: ["Intelligent automation", "Time savings & efficiency", "Better decisions", "Sustainable growth"], accent: "from-indigo-500 to-blue-700", bg: "from-[#080d28] via-[#0d1a4a] to-[#080d28]", badge: "AI Optimization", visual: "optimize" },
  { icon: <Laptop className="w-8 h-8" />, title: "Modern websites for ambitious businesses.", punch: "Design, performance and UX at the core.", desc: "We design custom websites that reflect your brand and convert visitors into customers.", features: ["Custom websites", "Responsive & modern design", "SEO & performance", "Security & scalability", "Maintenance & support"], accent: "from-cyan-500 to-blue-700", bg: "from-[#0a1535] via-[#0d1e50] to-[#080d28]", badge: "Web development", visual: "web" },
  { icon: <TrendingUp className="w-8 h-8" />, title: "Digital. Strategy. Growth.", punch: "Together, let's propel your business.", desc: "We help you build your online presence and achieve your goals with a complete digital strategy.", features: ["Digital strategy", "Social media management", "Online advertising (SEA & Social Ads)", "Content & brand identity", "Analytics & performance"], accent: "from-blue-400 to-blue-800", bg: "from-[#0a0f2e] via-[#0d1a4a] to-[#080d1e]", badge: "Digital marketing", visual: "digital" },
];

const T = {
  fr: {
    nav_services: "Services", nav_mission: "Mission", nav_products: "Produits", nav_contact: "Contact",
    hero_tag: "IA · Bien commun · Québec, Canada",
    hero_title: "Technologie au service\nde vos idées.",
    hero_sub: "CivicAI conçoit des solutions numériques intelligentes pour les entreprises, organisations et administrations publiques — partout au Canada.",
    hero_cta: "Demander une démo", hero_cta2: "Voir nos services",
    services_tag: "Nos services", services_title: "Ce que nous faisons",
    services_sub: "Des solutions technologiques complètes, de l'automatisation IA au marketing digital.",
    how_tag: "Notre approche", how_title: "Comment ça fonctionne",
    how_sub: "Un processus simple et transparent en 3 étapes pour transformer vos idées en solutions concrètes.",
    steps: [
      { n: "01", icon: <Search className="w-6 h-6" />, title: "Analyse & découverte", desc: "Nous prenons le temps de comprendre vos besoins, vos objectifs et vos contraintes. Une rencontre gratuite sans engagement." },
      { n: "02", icon: <Palette className="w-6 h-6" />, title: "Conception & développement", desc: "Notre équipe conçoit et développe votre solution sur mesure, avec des points d'avancement réguliers et vos retours intégrés à chaque étape." },
      { n: "03", icon: <Rocket className="w-6 h-6" />, title: "Livraison & support", desc: "Déploiement, formation et support continu. Nous restons disponibles pour faire évoluer votre solution avec vous." },
    ],
    flagship_tag: "Produit citoyen phare",
    flagship_name: "AttenteZéro",
    flagship_desc: "Un répertoire intelligent de services communautaires propulsé par l'IA. Gratuit pour tous les citoyens.",
    flagship_stats: ["7 957", "services actifs", "5", "langues", "100%", "gratuit"],
    flagship_ios: "App Store", flagship_android: "Google Play", flagship_web: "Politique de confidentialité",
    case_tag: "Étude de cas",
    case_title: "AttenteZéro — De l'idée au terrain",
    case_desc: "CivicAI a conçu et lancé AttenteZéro en moins de 6 mois : de l'idée initiale à l'application disponible sur l'App Store et Google Play, en passant par l'indexation de 7 957 services communautaires au Québec.",
    case_stats: [
      { n: "7 957", l: "services indexés" },
      { n: "< 6 mois", l: "de la conception au lancement" },
      { n: "5", l: "langues supportées" },
      { n: "0 $", l: "coût pour les citoyens" },
    ],
    case_quote: "\"AttenteZéro prouve que l'IA peut directement améliorer la vie des personnes les plus vulnérables. C'est ça, la technologie au service du bien commun.\"",
    case_author: "— Équipe CivicAI",
    upcoming_tag: "Projets à venir", upcoming_title: "D'autres solutions en développement",
    upcoming_sub: "CivicAI travaille sur plusieurs produits B2G pour moderniser les services publics québécois et canadiens.",
    projects: [
      { icon: <BarChart className="w-8 h-8" />, name: "DashboardCivic", desc: "Tableaux de bord anonymisés pour aider les municipalités à mieux comprendre les besoins de leurs citoyens." },
      { icon: <Bot className="w-8 h-8" />, name: "AssistantPublic", desc: "Assistant IA multilingue intégrable sur les portails gouvernementaux pour guider les citoyens dans leurs démarches." },
      { icon: <LinkIcon className="w-8 h-8" />, name: "RéseauOrganismes", desc: "Plateforme de mise en réseau des organismes communautaires pour coordonner les interventions terrain." },
    ],
    blog_tag: "Actualités & ressources", blog_title: "Restez informés",
    blog_sub: "Articles, guides et réflexions sur l'IA, les services publics et la transformation numérique.",
    articles: [
      { tag: "IA & Public", date: "Mai 2026", title: "Comment l'IA peut réduire les délais d'accès aux services communautaires", excerpt: "L'intelligence artificielle ouvre de nouvelles possibilités pour connecter les citoyens vulnérables aux ressources dont ils ont besoin, plus rapidement et plus efficacement.", icon: <BrainCircuit className="w-8 h-8 text-white/50" /> },
      { tag: "Développement web", date: "Avr. 2026", title: "5 raisons pour lesquelles votre organisme a besoin d'un site web moderne en 2026", excerpt: "Dans un monde de plus en plus numérique, un site web performant n'est plus un luxe — c'est une nécessité pour atteindre et servir vos bénéficiaires.", icon: <Laptop className="w-8 h-8 text-white/50" /> },
      { tag: "B2G", date: "Mar. 2026", title: "Loi 25 et IA : ce que les organisations québécoises doivent savoir", excerpt: "La Loi modernisant des dispositions législatives en matière de protection des renseignements personnels impose de nouvelles obligations. Comment s'y conformer avec l'IA ?", icon: <Lock className="w-8 h-8 text-white/50" /> },
    ],
    mission_tag: "À propos", mission_title: "Notre mission",
    mission_text: "CivicAI est une entreprise québécoise spécialisée en intelligence artificielle appliquée aux services publics et privés. Nous croyons que la technologie doit d'abord servir les personnes et les organisations qui en ont le plus besoin.",
    mission_neq: "NEQ : 2280791601", mission_hq: "Siège social : Québec, Canada", mission_founded: "Fondée en 2026",
    faq_tag: "FAQ", faq_title: "Questions fréquentes",
    faq_sub: "Les réponses aux questions que se posent les décideurs publics et les organisations.",
    faqs: [
      { q: "Quels sont vos délais de livraison ?", a: "Selon la complexité du projet, nos délais vont de 2 semaines (site web simple) à 6 mois (solution IA sur mesure). Nous établissons un calendrier précis lors de la rencontre initiale." },
      { q: "Comment garantissez-vous la sécurité des données ?", a: "Toutes nos solutions respectent la Loi 25 du Québec et les meilleures pratiques en cybersécurité : chiffrement TLS/SSL, données hébergées au Canada, anonymisation systématique des données sensibles." },
      { q: "Travaillez-vous avec des organismes à but non lucratif ?", a: "Oui. Nous proposons des tarifs adaptés aux OBNL et organismes communautaires. AttenteZéro en est le meilleur exemple — un produit entièrement gratuit pour les citoyens." },
      { q: "Proposez-vous du support après la livraison ?", a: "Absolument. Chaque projet inclut une période de support post-lancement, et nous proposons des contrats de maintenance et d'évolution pour accompagner votre croissance." },
      { q: "Comment se déroule la première rencontre ?", a: "La première rencontre est gratuite et sans engagement. Nous y découvrons vos besoins, présentons nos solutions, et vous repartirez avec une proposition préliminaire sous 48h." },
    ],
    contact_tag: "Contact", contact_title: "Parlons de votre projet",
    contact_sub: "Entreprise, organisme ou administration publique ? Parlez-nous de votre projet.",
    form_name: "Nom complet", form_org: "Organisation", form_email: "Adresse courriel", form_phone: "Téléphone (optionnel)",
    form_service: "Service souhaité", form_msg: "Décrivez votre projet...", form_send: "Envoyer la demande",
    form_or: "ou contactez-nous directement",
    footer: "© 2026 CivicAI — NEQ 2280791601 — Québec, Canada",
    footer_tagline: "TECHNOLOGIE AU SERVICE DE VOS IDÉES",
    services: SERVICES_FR,
  },
  en: {
    nav_services: "Services", nav_mission: "Mission", nav_products: "Products", nav_contact: "Contact",
    hero_tag: "AI · Public Good · Quebec, Canada",
    hero_title: "Technology at the service\nof your ideas.",
    hero_sub: "CivicAI designs intelligent digital solutions for businesses, organizations, and public administrations — across Canada.",
    hero_cta: "Request a demo", hero_cta2: "See our services",
    services_tag: "Our services", services_title: "What we do",
    services_sub: "Complete technology solutions, from AI automation to digital marketing.",
    how_tag: "Our approach", how_title: "How it works",
    how_sub: "A simple, transparent 3-step process to turn your ideas into concrete solutions.",
    steps: [
      { n: "01", icon: <Search className="w-6 h-6" />, title: "Analysis & discovery", desc: "We take time to understand your needs, goals, and constraints. A free initial meeting, no commitment required." },
      { n: "02", icon: <Palette className="w-6 h-6" />, title: "Design & development", desc: "Our team designs and builds your custom solution with regular progress updates and your feedback integrated at every stage." },
      { n: "03", icon: <Rocket className="w-6 h-6" />, title: "Delivery & support", desc: "Deployment, training, and ongoing support. We stay available to evolve your solution with you." },
    ],
    flagship_tag: "Flagship civic product",
    flagship_name: "AttenteZéro",
    flagship_desc: "An AI-powered directory of community services — free for all citizens.",
    flagship_stats: ["7,957", "active services", "5", "languages", "100%", "free"],
    flagship_ios: "App Store", flagship_android: "Google Play", flagship_web: "Privacy policy",
    case_tag: "Case study",
    case_title: "AttenteZéro — From idea to impact",
    case_desc: "CivicAI designed and launched AttenteZéro in less than 6 months: from initial concept to App Store and Google Play, indexing 7,957 community services across Quebec.",
    case_stats: [
      { n: "7,957", l: "services indexed" },
      { n: "< 6 months", l: "from concept to launch" },
      { n: "5", l: "supported languages" },
      { n: "$0", l: "cost for citizens" },
    ],
    case_quote: "\"AttenteZéro proves that AI can directly improve the lives of the most vulnerable people. That's technology in service of the common good.\"",
    case_author: "— CivicAI Team",
    upcoming_tag: "Coming soon", upcoming_title: "More solutions in development",
    upcoming_sub: "CivicAI is building several B2G products to modernize public services across Quebec and Canada.",
    projects: [
      { icon: <BarChart className="w-8 h-8" />, name: "DashboardCivic", desc: "Anonymized dashboards helping municipalities better understand the needs of their communities." },
      { icon: <Bot className="w-8 h-8" />, name: "AssistantPublic", desc: "A multilingual AI assistant embeddable on government portals to guide citizens through their requests." },
      { icon: <LinkIcon className="w-8 h-8" />, name: "RéseauOrganismes", desc: "A networking platform for community organizations to coordinate frontline interventions." },
    ],
    blog_tag: "News & resources", blog_title: "Stay informed",
    blog_sub: "Articles, guides and insights on AI, public services, and digital transformation.",
    articles: [
      { tag: "AI & Public", date: "May 2026", title: "How AI can reduce wait times for community services", excerpt: "Artificial intelligence opens new possibilities for connecting vulnerable citizens to the resources they need, faster and more effectively.", icon: <BrainCircuit className="w-8 h-8 text-white/50" /> },
      { tag: "Web development", date: "Apr. 2026", title: "5 reasons your organization needs a modern website in 2026", excerpt: "In an increasingly digital world, a high-performing website is no longer a luxury — it's a necessity to reach and serve your beneficiaries.", icon: <Laptop className="w-8 h-8 text-white/50" /> },
      { tag: "B2G", date: "Mar. 2026", title: "Privacy law and AI: what Quebec organizations need to know", excerpt: "Quebec's Act Modernizing Legislative Provisions on Personal Information imposes new obligations. How to comply when using AI solutions?", icon: <Lock className="w-8 h-8 text-white/50" /> },
    ],
    mission_tag: "About", mission_title: "Our mission",
    mission_text: "CivicAI is a Quebec-based company specializing in AI applied to public and private services. We believe technology should first serve the people and organizations that need it most.",
    mission_neq: "QEI: 2280791601", mission_hq: "Headquarters: Quebec, Canada", mission_founded: "Founded in 2026",
    faq_tag: "FAQ", faq_title: "Frequently asked questions",
    faq_sub: "Answers to questions public decision-makers and organizations ask most often.",
    faqs: [
      { q: "What are your delivery timelines?", a: "Depending on project complexity, our timelines range from 2 weeks (simple website) to 6 months (custom AI solution). We set a precise schedule at the initial meeting." },
      { q: "How do you guarantee data security?", a: "All our solutions comply with Quebec's Law 25 and best cybersecurity practices: TLS/SSL encryption, data hosted in Canada, systematic anonymization of sensitive data." },
      { q: "Do you work with non-profit organizations?", a: "Yes. We offer adapted pricing for non-profits and community organizations. AttenteZéro is the best example — a product entirely free for citizens." },
      { q: "Do you offer post-delivery support?", a: "Absolutely. Every project includes a post-launch support period, and we offer maintenance and evolution contracts to support your growth." },
      { q: "How does the first meeting work?", a: "The first meeting is free and without commitment. We discover your needs, present our solutions, and you'll receive a preliminary proposal within 48 hours." },
    ],
    contact_tag: "Contact", contact_title: "Let's talk about your project",
    contact_sub: "Business, organization, or public administration? Tell us about your project.",
    form_name: "Full name", form_org: "Organization", form_email: "Email address", form_phone: "Phone (optional)",
    form_service: "Desired service", form_msg: "Describe your project...", form_send: "Send request",
    form_or: "or contact us directly",
    footer: "© 2026 CivicAI — QEI 2280791601 — Quebec, Canada",
    footer_tagline: "TECHNOLOGY AT THE SERVICE OF YOUR IDEAS",
    services: SERVICES_EN,
  },
};

function SlideVisual({ type }: { type: string }) {
  if (type === "ai-biz") return (
    <svg viewBox="0 0 360 260" fill="none" className="w-full h-full opacity-80">
      <circle cx="180" cy="130" r="50" fill="rgba(59,130,246,0.15)" stroke="rgba(59,130,246,0.4)" strokeWidth="1.5"/>
      <text x="180" y="137" textAnchor="middle" fill="rgb(147,197,253)" fontSize="28" fontWeight="800">AI</text>
      {[{x:60,y:50},{x:300,y:50},{x:40,y:180},{x:320,y:180},{x:180,y:30}].map((n,i)=>(
        <g key={i}>
          <line x1="180" y1="130" x2={n.x} y2={n.y} stroke="rgba(59,130,246,0.2)" strokeWidth="1" strokeDasharray="4 3"/>
          <circle cx={n.x} cy={n.y} r="24" fill="rgba(30,58,138,0.4)" stroke="rgba(59,130,246,0.35)" strokeWidth="1"/>
        </g>
      ))}
      <path d="M0 240 Q90 220 180 228 Q270 218 360 232 L360 260 L0 260Z" fill="rgba(59,130,246,0.08)"/>
    </svg>
  );
  if (type === "tech") return (
    <svg viewBox="0 0 360 260" fill="none" className="w-full h-full opacity-80">
      {[{x:60,y:60,w:100,h:36,t:"Projects"},{x:60,y:110,w:110,h:36,t:"CRM"},{x:60,y:160,w:90,h:36,t:"Invoicing"},{x:200,y:75,w:110,h:36,t:"Analytics"},{x:200,y:130,w:120,h:36,t:"Solutions"}].map((b,i)=>(
        <g key={i}><rect x={b.x} y={b.y} width={b.w} height={b.h} rx="8" fill="rgba(79,70,229,0.18)" stroke="rgba(99,102,241,0.35)" strokeWidth="1"/><text x={b.x+b.w/2} y={b.y+22} textAnchor="middle" fill="rgb(199,210,254)" fontSize="10" fontWeight="500">{b.t}</text></g>
      ))}
      <path d="M0 240 Q180 220 360 232 L360 260 L0 260Z" fill="rgba(79,70,229,0.08)"/>
    </svg>
  );
  if (type === "optimize") return (
    <svg viewBox="0 0 360 260" fill="none" className="w-full h-full opacity-80">
      {["Auto","Efficiency","Decisions","Growth"].map((l,i)=>(
        <g key={i}><rect x={40+i*75} y={200-(i*30+40)} width="55" height={i*30+40} rx="6" fill={`rgba(99,102,241,${0.2+i*0.1})`} stroke="rgba(99,102,241,0.4)" strokeWidth="1"/></g>
      ))}
      <path d="M40 190 Q115 155 190 140 Q265 125 320 90" stroke="rgba(99,102,241,0.6)" strokeWidth="2" strokeDasharray="6 3"/>
      <circle cx="320" cy="90" r="8" fill="rgba(99,102,241,0.5)" stroke="rgba(139,92,246,0.8)" strokeWidth="1.5"/>
      <text x="320" y="78" textAnchor="middle" fill="rgb(196,181,253)" fontSize="10" fontWeight="700">+34%</text>
      <path d="M0 240 Q180 222 360 235 L360 260 L0 260Z" fill="rgba(79,70,229,0.07)"/>
    </svg>
  );
  if (type === "web") return (
    <svg viewBox="0 0 360 260" fill="none" className="w-full h-full opacity-80">
      <rect x="60" y="40" width="240" height="160" rx="10" fill="rgba(14,30,90,0.5)" stroke="rgba(34,211,238,0.3)" strokeWidth="1.2"/>
      <rect x="60" y="40" width="240" height="28" rx="10" fill="rgba(6,182,212,0.15)" stroke="rgba(34,211,238,0.25)" strokeWidth="0.8"/>
      <circle cx="78" cy="54" r="5" fill="rgba(239,68,68,0.5)"/><circle cx="93" cy="54" r="5" fill="rgba(234,179,8,0.5)"/><circle cx="108" cy="54" r="5" fill="rgba(34,197,94,0.5)"/>
      <rect x="75" y="82" width="120" height="8" rx="4" fill="rgba(34,211,238,0.3)"/>
      <rect x="75" y="100" width="80" height="6" rx="3" fill="rgba(148,163,184,0.2)"/>
      <rect x="75" y="114" width="100" height="6" rx="3" fill="rgba(148,163,184,0.2)"/>
      <rect x="200" y="82" width="85" height="80" rx="8" fill="rgba(6,182,212,0.1)" stroke="rgba(34,211,238,0.25)" strokeWidth="1"/>
      <path d="M0 240 Q180 222 360 238 L360 260 L0 260Z" fill="rgba(6,182,212,0.06)"/>
    </svg>
  );
  return (
    <svg viewBox="0 0 360 260" fill="none" className="w-full h-full opacity-80">
      {[{l:"Social",x:50,y:80},{l:"Ads",x:50,y:150},{l:"Content",x:180,y:60},{l:"Analytics",x:180,y:150},{l:"Strategy",x:270,y:110}].map((n,i)=>(
        <g key={i}><rect x={n.x} y={n.y} width="90" height="50" rx="10" fill="rgba(37,99,235,0.18)" stroke="rgba(59,130,246,0.3)" strokeWidth="1"/><text x={n.x+45} y={n.y+30} textAnchor="middle" fill="rgb(147,197,253)" fontSize="11">{n.l}</text></g>
      ))}
      <path d="M0 240 Q90 222 180 230 Q270 220 360 235 L360 260 L0 260Z" fill="rgba(37,99,235,0.07)"/>
    </svg>
  );
}

export default function Home() {
  const [lang, setLang] = useState<"fr" | "en">("fr");
  const [slide, setSlide] = useState(0);
  const [fading, setFading] = useState(false);
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const [formData, setFormData] = useState({ name: "", org: "", email: "", phone: "", service: "", msg: "" });
  const [formSubmitted, setFormSubmitted] = useState(false);
  
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

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFormSubmitted(true);
    // Submit via mailto as fallback if needed or just show success
  };

  const s = t.services[slide];

  const fadeUp: Variants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: "easeOut" as const } }
  };

  const staggerContainer: Variants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { staggerChildren: 0.1 } }
  };

  return (
    <div className="min-h-screen bg-slate-50 font-sans antialiased text-slate-900 overflow-x-hidden">

      {/* NAV */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-white/90 backdrop-blur-md border-b border-slate-200/50 shadow-sm" data-testid="nav-container">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <img src={LOGO} alt="CivicAI" className="h-8 w-auto" data-testid="img-logo" />
          <div className="hidden md:flex items-center gap-8 text-sm font-medium text-slate-600">
            <a href="#services" className="hover:text-blue-700 transition-colors" data-testid="link-nav-services">{t.nav_services}</a>
            <a href="#mission" className="hover:text-blue-700 transition-colors" data-testid="link-nav-mission">{t.nav_mission}</a>
            <a href="#products" className="hover:text-blue-700 transition-colors" data-testid="link-nav-products">{t.nav_products}</a>
            <a href="#contact" className="hover:text-blue-700 transition-colors" data-testid="link-nav-contact">{t.nav_contact}</a>
          </div>
          <div className="flex items-center gap-4">
            <button 
              onClick={() => setLang(lang === "fr" ? "en" : "fr")}
              className="text-xs font-bold px-3 py-1.5 rounded-full border border-slate-200 hover:border-blue-400 hover:text-blue-700 transition-colors"
              data-testid="button-lang-toggle"
            >
              {lang === "fr" ? "EN" : "FR"}
            </button>
            <a href="#contact" className="hidden md:inline-flex bg-blue-700 text-white text-sm font-semibold px-5 py-2 rounded-lg hover:bg-blue-800 transition-all hover:shadow-md hover:-translate-y-0.5" data-testid="link-nav-cta">
              {t.hero_cta}
            </a>
          </div>
        </div>
      </nav>

      {/* HERO CAROUSEL */}
      <section className="pt-16" data-testid="section-hero">
        <div className={`relative w-full h-[600px] overflow-hidden bg-gradient-to-br ${s.bg}`}
          style={{ transition: "opacity 0.35s ease", opacity: fading ? 0 : 1 }}>
          <div className="absolute inset-0 opacity-10"
            style={{ backgroundImage: "radial-gradient(circle, rgba(255,255,255,0.5) 1px, transparent 1px)", backgroundSize: "32px 32px" }} />
          <div className={`absolute top-0 right-0 w-[500px] h-[500px] rounded-full blur-3xl bg-gradient-to-br ${s.accent} opacity-10 pointer-events-none`} />
          <div className="relative h-full max-w-6xl mx-auto px-8 flex flex-col md:flex-row items-center gap-12 py-12">
            <div className="flex-1 min-w-0 flex flex-col justify-center h-full">
              <div className="flex items-center gap-3 mb-8">
                <img src={LOGO} alt="CivicAI" className="h-8 w-auto brightness-0 invert opacity-90" />
                <span className="text-xs font-bold tracking-widest uppercase text-blue-300 border border-white/20 rounded-full px-3 py-1">{s.badge}</span>
              </div>
              <h2 className="text-4xl md:text-5xl font-black text-white leading-tight mb-6">{s.title}</h2>
              <p className="text-blue-100/90 text-lg leading-relaxed max-w-lg mb-8">{s.desc}</p>
              <ul className="flex flex-col gap-3 mb-8">
                {s.features.map((f, i) => (
                  <li key={i} className="flex items-center gap-3 text-slate-300 text-sm font-medium">
                    <span className="w-1.5 h-1.5 rounded-full bg-blue-400 flex-shrink-0 shadow-[0_0_8px_rgba(96,165,250,0.8)]" />{f}
                  </li>
                ))}
              </ul>
              <span className="text-xs font-semibold text-blue-400/80 tracking-widest flex items-center gap-1">
                <MapPin className="w-3 h-3" /> QUÉBEC, CANADA
              </span>
            </div>
            <div className="hidden md:flex w-96 h-80 flex-shrink-0"><SlideVisual type={s.visual} /></div>
          </div>
          <div className="absolute bottom-8 left-0 right-0 flex items-center justify-center gap-3">
            {Array.from({ length: totalSlides }).map((_, i) => (
              <button key={i} onClick={() => goTo(i)}
                className={`transition-all duration-300 rounded-full ${i === slide ? "w-8 h-2 bg-blue-400" : "w-2 h-2 bg-white/30 hover:bg-white/50"}`} 
                data-testid={`button-slide-${i}`}
              />
            ))}
          </div>
          <button onClick={() => goTo((slide + totalSlides - 1) % totalSlides)}
            className="absolute left-6 top-1/2 -translate-y-1/2 w-12 h-12 rounded-full bg-white/5 border border-white/10 hover:bg-white/10 hover:scale-110 text-white text-2xl flex items-center justify-center transition-all backdrop-blur-sm"
            data-testid="button-slide-prev">
            <ChevronLeft className="w-6 h-6" />
          </button>
          <button onClick={() => goTo((slide + 1) % totalSlides)}
            className="absolute right-6 top-1/2 -translate-y-1/2 w-12 h-12 rounded-full bg-white/5 border border-white/10 hover:bg-white/10 hover:scale-110 text-white text-2xl flex items-center justify-center transition-all backdrop-blur-sm"
            data-testid="button-slide-next">
            <ChevronRight className="w-6 h-6" />
          </button>
        </div>

        {/* Hero tagline */}
        <div className="py-24 px-6 bg-gradient-to-b from-white to-slate-50 border-b border-slate-200/60">
          <motion.div 
            initial="hidden" animate="visible" variants={staggerContainer}
            className="max-w-4xl mx-auto text-center md:text-left"
          >
            <motion.div variants={fadeUp} className="inline-flex items-center gap-2 bg-blue-50 border border-blue-200/60 text-blue-700 text-xs font-bold tracking-wide px-4 py-2 rounded-full mb-8 shadow-sm">
              <span className="w-2 h-2 rounded-full bg-blue-600 animate-pulse" />{t.hero_tag}
            </motion.div>
            <motion.h1 variants={fadeUp} className="text-5xl md:text-7xl font-black tracking-tight leading-[1.1] mb-8 text-slate-900">
              {t.hero_title.split("\n").map((line, i) => (
                <span key={i} className={i === 1 ? "text-blue-700 block" : "block"}>{line}</span>
              ))}
            </motion.h1>
            <motion.p variants={fadeUp} className="text-xl md:text-2xl text-slate-600 leading-relaxed max-w-3xl mb-10 font-medium">
              {t.hero_sub}
            </motion.p>
            <motion.div variants={fadeUp} className="flex flex-wrap items-center justify-center md:justify-start gap-4">
              <a href="#contact" className="bg-blue-700 text-white font-bold px-8 py-4 rounded-xl hover:bg-blue-800 transition-all shadow-[0_4px_14px_rgba(29,78,216,0.25)] hover:shadow-[0_6px_20px_rgba(29,78,216,0.3)] hover:-translate-y-0.5 flex items-center gap-2 text-lg">
                {t.hero_cta} <ArrowRight className="w-5 h-5" />
              </a>
              <a href="#services" className="bg-white text-slate-700 font-bold px-8 py-4 rounded-xl border-2 border-slate-200 hover:border-blue-300 hover:bg-blue-50 transition-all flex items-center gap-2 text-lg">
                {t.hero_cta2}
              </a>
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* SERVICES */}
      <section id="services" className="py-32 px-6 bg-slate-50" data-testid="section-services">
        <div className="max-w-6xl mx-auto">
          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true, margin: "-100px" }} variants={fadeUp}>
            <div className="inline-flex items-center gap-2 bg-blue-100/50 border border-blue-200 text-blue-800 text-sm font-bold px-4 py-2 rounded-full mb-6">
              <Settings className="w-4 h-4" /> {t.services_tag}
            </div>
            <h2 className="text-4xl md:text-5xl font-black text-slate-900 mb-4 tracking-tight">{t.services_title}</h2>
            <p className="text-xl text-slate-600 mb-16 max-w-2xl">{t.services_sub}</p>
          </motion.div>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {t.services.map((svc, i) => (
              <motion.div 
                initial="hidden" whileInView="visible" viewport={{ once: true, margin: "-50px" }} 
                variants={{ hidden: { opacity: 0, y: 30 }, visible: { opacity: 1, y: 0, transition: { delay: i * 0.1, duration: 0.5 } } }}
                key={i} 
                className="group relative bg-white rounded-3xl p-8 border border-slate-200 shadow-sm hover:shadow-xl hover:-translate-y-2 transition-all duration-300 overflow-hidden"
              >
                <div className={`absolute inset-0 bg-gradient-to-br ${svc.bg} opacity-0 group-hover:opacity-100 transition-opacity duration-500`} />
                <div className="relative z-10">
                  <div className="w-16 h-16 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center mb-6 group-hover:bg-white/10 group-hover:text-white transition-colors duration-300">
                    {svc.icon}
                  </div>
                  <span className="text-xs font-bold text-blue-700 uppercase tracking-widest group-hover:text-blue-300 transition-colors duration-300 block mb-3">{svc.badge}</span>
                  <h3 className="font-black text-slate-900 group-hover:text-white text-2xl leading-tight mb-6 transition-colors duration-300">{svc.title}</h3>
                  <ul className="flex flex-col gap-3">
                    {svc.features.map((f, fi) => (
                      <li key={fi} className="flex items-start gap-3 text-slate-600 group-hover:text-blue-100 transition-colors duration-300 font-medium">
                        <span className="w-2 h-2 rounded-full bg-blue-500 flex-shrink-0 mt-1.5" />{f}
                      </li>
                    ))}
                  </ul>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* COMMENT ÇA FONCTIONNE */}
      <section className="py-32 px-6 bg-[#0a0f2e] relative overflow-hidden" data-testid="section-how">
        <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-blue-500/50 to-transparent" />
        <div className="absolute inset-0 opacity-[0.03]" style={{ backgroundImage: "radial-gradient(circle, #ffffff 1px, transparent 1px)", backgroundSize: "32px 32px" }} />
        
        <div className="max-w-6xl mx-auto relative z-10">
          <div className="text-center mb-20">
            <div className="inline-flex items-center gap-2 bg-blue-900/40 border border-blue-700/50 text-blue-300 text-sm font-bold px-4 py-2 rounded-full mb-6">
              <Target className="w-4 h-4" /> {t.how_tag}
            </div>
            <h2 className="text-4xl md:text-5xl font-black text-white mb-6 tracking-tight">{t.how_title}</h2>
            <p className="text-xl text-blue-200/80 max-w-2xl mx-auto">{t.how_sub}</p>
          </div>
          
          <div className="grid md:grid-cols-3 gap-12 relative">
            <div className="hidden md:block absolute top-12 left-1/6 right-1/6 h-0.5 bg-gradient-to-r from-transparent via-blue-500/30 to-transparent" />
            {t.steps.map((step, i) => (
              <motion.div 
                initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.2 }}
                key={i} className="relative bg-white/5 backdrop-blur-sm border border-white/10 p-8 rounded-3xl"
              >
                <div className="flex items-center gap-4 mb-6">
                  <div className="w-16 h-16 rounded-2xl bg-blue-600 border border-blue-500 flex items-center justify-center text-white shadow-[0_0_20px_rgba(37,99,235,0.4)]">
                    {step.icon}
                  </div>
                  <span className="text-5xl font-black text-white/10">{step.n}</span>
                </div>
                <h3 className="font-bold text-white text-xl mb-4">{step.title}</h3>
                <p className="text-blue-100/70 text-base leading-relaxed">{step.desc}</p>
              </motion.div>
            ))}
          </div>
          <div className="mt-16 text-center">
            <a href="#contact" className="inline-flex items-center gap-2 bg-blue-600 text-white font-bold px-8 py-4 rounded-xl hover:bg-blue-500 transition-all hover:scale-105 shadow-[0_0_30px_rgba(37,99,235,0.3)] text-lg">
              {t.hero_cta} <ArrowRight className="w-5 h-5" />
            </a>
          </div>
        </div>
      </section>

      {/* FLAGSHIP AttenteZéro */}
      <section id="products" className="py-32 px-6 bg-white overflow-hidden" data-testid="section-flagship">
        <div className="max-w-6xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            <motion.div initial={{ opacity: 0, x: -30 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} transition={{ duration: 0.6 }}>
              <div className="inline-flex items-center gap-2 bg-teal-50 border border-teal-200 text-teal-800 text-sm font-bold px-4 py-2 rounded-full mb-8">
                <Star className="w-4 h-4 fill-teal-800" /> {t.flagship_tag}
              </div>
              <div className="flex items-center gap-4 mb-6">
                <div className="w-16 h-16 rounded-3xl bg-gradient-to-br from-teal-400 to-teal-700 flex items-center justify-center shadow-lg text-white">
                  <MapPin className="w-8 h-8" />
                </div>
                <h2 className="text-4xl md:text-5xl font-black text-slate-900 tracking-tight">{t.flagship_name}</h2>
              </div>
              <p className="text-xl text-slate-600 leading-relaxed mb-10 font-medium">{t.flagship_desc}</p>
              
              <div className="grid grid-cols-3 gap-6 mb-10">
                {[0, 1, 2].map(i => (
                  <div key={i} className="bg-slate-50 rounded-2xl p-5 border border-slate-100">
                    <div className="text-3xl font-black text-teal-600 mb-1">{t.flagship_stats[i * 2]}</div>
                    <div className="text-sm font-semibold text-slate-500">{t.flagship_stats[i * 2 + 1]}</div>
                  </div>
                ))}
              </div>
              
              <div className="flex flex-wrap gap-4">
                <a href="https://apps.apple.com/ca/app/attentezero/id6766750916" target="_blank" rel="noreferrer" className="flex items-center gap-3 bg-slate-900 text-white font-bold px-6 py-4 rounded-xl hover:bg-slate-800 transition-colors shadow-md">
                  <FaApple className="w-6 h-6" />
                  <span className="text-left leading-tight text-sm">Download on the <br/><span className="text-lg">{t.flagship_ios}</span></span>
                </a>
                <a href="https://play.google.com/store/apps/details?id=com.attentezero.app" target="_blank" rel="noreferrer" className="flex items-center gap-3 bg-slate-100 text-slate-900 font-bold px-6 py-4 rounded-xl border border-slate-200 hover:bg-slate-200 transition-colors shadow-sm">
                  <FaGooglePlay className="w-6 h-6 text-slate-700" />
                  <span className="text-left leading-tight text-sm">GET IT ON <br/><span className="text-lg">{t.flagship_android}</span></span>
                </a>
              </div>
            </motion.div>
            
            <motion.div initial={{ opacity: 0, scale: 0.9 }} whileInView={{ opacity: 1, scale: 1 }} viewport={{ once: true }} transition={{ duration: 0.6 }} className="relative">
              <div className="absolute inset-0 bg-teal-100 blur-3xl rounded-full opacity-50 transform translate-x-10 translate-y-10" />
              <div className="relative bg-white rounded-[2.5rem] p-4 shadow-2xl border-4 border-slate-100/50 max-w-sm mx-auto">
                <div className="bg-slate-900 rounded-[2rem] overflow-hidden aspect-[9/19] relative">
                  <div className="absolute top-0 inset-x-0 h-7 flex justify-center z-20">
                    <div className="w-32 h-6 bg-white rounded-b-2xl" />
                  </div>
                  <div className="absolute inset-0 bg-gradient-to-b from-teal-900 to-slate-900 p-6 flex flex-col pt-16">
                    <div className="w-16 h-16 rounded-2xl bg-white text-teal-700 flex items-center justify-center mb-6 shadow-lg">
                      <MapPin className="w-8 h-8" />
                    </div>
                    <h3 className="text-3xl font-black text-white mb-2">AttenteZéro</h3>
                    <p className="text-teal-200 font-medium mb-8">Services communautaires du Québec</p>
                    
                    <div className="space-y-4">
                      {[1,2,3].map(i => (
                        <div key={i} className="bg-white/10 backdrop-blur-md rounded-xl p-4 flex gap-4">
                          <div className="w-12 h-12 rounded-lg bg-teal-500/20" />
                          <div className="flex-1 space-y-2 py-1">
                            <div className="h-2.5 bg-white/40 rounded-full w-3/4" />
                            <div className="h-2 bg-white/20 rounded-full w-1/2" />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* ÉTUDE DE CAS */}
      <section className="py-24 px-6 bg-slate-900 text-white" data-testid="section-case-study">
        <div className="max-w-5xl mx-auto">
          <div className="inline-flex items-center gap-2 bg-slate-800 text-slate-300 text-sm font-bold px-4 py-2 rounded-full mb-6">
            <ClipboardList className="w-4 h-4" /> {t.case_tag}
          </div>
          <h2 className="text-3xl md:text-4xl font-black mb-6">{t.case_title}</h2>
          <p className="text-slate-400 text-lg max-w-3xl mb-12 leading-relaxed">{t.case_desc}</p>
          
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-16">
            {t.case_stats.map((stat, i) => (
              <div key={i} className="bg-slate-800/50 rounded-2xl p-6 text-center border border-slate-700/50">
                <div className="text-4xl font-black text-blue-400 mb-2">{stat.n}</div>
                <div className="text-sm font-medium text-slate-400">{stat.l}</div>
              </div>
            ))}
          </div>
          
          <div className="bg-gradient-to-r from-blue-900/40 to-indigo-900/40 rounded-3xl p-10 md:p-12 border border-blue-500/20 relative">
            <div className="absolute top-6 left-6 text-6xl text-blue-500/20 font-serif leading-none">"</div>
            <p className="text-blue-100 text-xl md:text-2xl italic leading-relaxed mb-6 relative z-10">{t.case_quote}</p>
            <p className="text-blue-400 font-bold uppercase tracking-wider text-sm">{t.case_author}</p>
          </div>
        </div>
      </section>

      {/* PROJETS À VENIR */}
      <section className="py-32 px-6 bg-slate-50" data-testid="section-upcoming">
        <div className="max-w-6xl mx-auto">
          <div className="inline-flex items-center gap-2 bg-indigo-100 text-indigo-800 text-sm font-bold px-4 py-2 rounded-full mb-6">
            <Rocket className="w-4 h-4" /> {t.upcoming_tag}
          </div>
          <h2 className="text-4xl font-black text-slate-900 mb-4 tracking-tight">{t.upcoming_title}</h2>
          <p className="text-xl text-slate-600 mb-16 max-w-2xl">{t.upcoming_sub}</p>
          
          <div className="grid md:grid-cols-3 gap-8">
            {t.projects.map((p, i) => (
              <div key={i} className="bg-white rounded-3xl p-8 border border-slate-200 shadow-sm hover:shadow-lg transition-all duration-300">
                <div className="w-14 h-14 bg-slate-100 rounded-2xl flex items-center justify-center text-slate-700 mb-6">
                  {p.icon}
                </div>
                <div className="flex items-center gap-3 mb-4">
                  <h3 className="font-black text-xl text-slate-900">{p.name}</h3>
                  <span className="text-xs bg-indigo-50 text-indigo-700 font-bold px-2 py-1 rounded-md">
                    {lang === "fr" ? "Bientôt" : "Soon"}
                  </span>
                </div>
                <p className="text-slate-600 leading-relaxed font-medium">{p.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* BLOG */}
      <section className="py-32 px-6 bg-white" data-testid="section-blog">
        <div className="max-w-6xl mx-auto">
          <div className="inline-flex items-center gap-2 bg-blue-50 border border-blue-100 text-blue-700 text-sm font-bold px-4 py-2 rounded-full mb-6">
            <Pen className="w-4 h-4" /> {t.blog_tag}
          </div>
          <h2 className="text-4xl font-black text-slate-900 mb-4 tracking-tight">{t.blog_title}</h2>
          <p className="text-xl text-slate-600 mb-16 max-w-2xl">{t.blog_sub}</p>
          
          <div className="grid md:grid-cols-3 gap-8">
            {t.articles.map((a, i) => (
              <a href="#" key={i} className="group bg-white rounded-3xl overflow-hidden border border-slate-200 shadow-sm hover:shadow-xl transition-all duration-300 block">
                <div className="h-48 bg-gradient-to-br from-[#0a0f2e] to-[#1e3a8a] flex items-center justify-center relative overflow-hidden">
                  <div className="absolute inset-0 opacity-20 bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI4IiBoZWlnaHQ9IjgiPgo8cmVjdCB3aWR0aD0iOCIgaGVpZ2h0PSI4IiBmaWxsPSIjZmZmIj48L3JlY3Q+CjxwYXRoIGQ9Ik0wIDBMOCA4Wk04IDBMMCA4WiIgc3Ryb2tlPSIjMDAwIiBzdHJva2Utd2lkdGg9IjEiPjwvcGF0aD4KPC9zdmc+')] mix-blend-overlay" />
                  {a.icon}
                </div>
                <div className="p-8">
                  <div className="flex items-center gap-3 mb-4">
                    <span className="text-xs bg-slate-100 text-slate-700 font-bold px-3 py-1 rounded-md uppercase tracking-wider">{a.tag}</span>
                    <span className="text-xs font-semibold text-slate-400">{a.date}</span>
                  </div>
                  <h3 className="font-bold text-slate-900 text-xl leading-snug mb-3 group-hover:text-blue-700 transition-colors">{a.title}</h3>
                  <p className="text-sm text-slate-600 leading-relaxed mb-6 line-clamp-3">{a.excerpt}</p>
                  <span className="inline-flex items-center gap-1 text-sm font-bold text-blue-600 group-hover:text-blue-800">
                    {lang === "fr" ? "Lire l'article" : "Read article"} <ArrowRight className="w-4 h-4" />
                  </span>
                </div>
              </a>
            ))}
          </div>
        </div>
      </section>

      {/* MISSION */}
      <section id="mission" className="py-32 px-6 bg-slate-50 border-t border-slate-200/50" data-testid="section-mission">
        <div className="max-w-5xl mx-auto">
          <div className="inline-flex items-center gap-2 bg-slate-200 text-slate-700 text-sm font-bold px-4 py-2 rounded-full mb-8">
            <Building className="w-4 h-4" /> {t.mission_tag}
          </div>
          <div className="grid md:grid-cols-2 gap-16 items-center">
            <div>
              <h2 className="text-4xl font-black text-slate-900 mb-6">{t.mission_title}</h2>
              <p className="text-slate-600 text-xl leading-relaxed mb-8">{t.mission_text}</p>
              <div className="flex flex-col gap-4">
                {[t.mission_neq, t.mission_hq, t.mission_founded].map((item, i) => (
                  <div key={i} className="flex items-center gap-3 text-base font-medium text-slate-700">
                    <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center">✓</div>
                    {item}
                  </div>
                ))}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-6">
              {[
                { n: "5", l: lang === "fr" ? "services offerts" : "services offered" },
                { n: "7 957", l: lang === "fr" ? "services indexés" : "indexed services" },
                { n: "B2G", l: lang === "fr" ? "modèle d'affaires" : "business model" },
                { n: "100%", l: lang === "fr" ? "québécois" : "Quebec-made" },
              ].map((stat, i) => (
                <div key={i} className="bg-white rounded-3xl p-8 border border-slate-200 shadow-sm text-center">
                  <div className="text-4xl font-black text-blue-700 mb-2">{stat.n}</div>
                  <div className="text-sm font-bold text-slate-500 uppercase tracking-wider">{stat.l}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="py-32 px-6 bg-white" data-testid="section-faq">
        <div className="max-w-3xl mx-auto">
          <div className="inline-flex items-center gap-2 bg-blue-50 text-blue-700 text-sm font-bold px-4 py-2 rounded-full mb-6">
            <HelpCircle className="w-4 h-4" /> {t.faq_tag}
          </div>
          <h2 className="text-4xl font-black text-slate-900 mb-4">{t.faq_title}</h2>
          <p className="text-xl text-slate-600 mb-12">{t.faq_sub}</p>
          
          <div className="flex flex-col gap-4">
            {t.faqs.map((faq, i) => (
              <div key={i} className="bg-slate-50 rounded-2xl border border-slate-200 overflow-hidden">
                <button
                  onClick={() => setOpenFaq(openFaq === i ? null : i)}
                  className="w-full flex items-center justify-between p-6 text-left hover:bg-slate-100 transition-colors"
                  data-testid={`button-faq-${i}`}
                >
                  <span className="font-bold text-slate-900 text-lg pr-4">{faq.q}</span>
                  <div className={`w-8 h-8 rounded-full bg-white border border-slate-200 flex items-center justify-center flex-shrink-0 transition-transform duration-300 ${openFaq === i ? "rotate-180 bg-blue-50 text-blue-600 border-blue-200" : "text-slate-500"}`}>
                    <ChevronRight className={`w-5 h-5 transition-transform duration-300 ${openFaq === i ? "rotate-90" : "rotate-90"}`} />
                  </div>
                </button>
                {openFaq === i && (
                  <div className="px-6 pb-6 pt-2 text-base text-slate-600 leading-relaxed font-medium">
                    {faq.a}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CONTACT avec formulaire */}
      <section id="contact" className="py-32 px-6 bg-[#0a0f2e] relative overflow-hidden" data-testid="section-contact">
        <div className="absolute inset-0 bg-gradient-to-br from-blue-900/20 to-transparent" />
        <div className="max-w-6xl mx-auto relative z-10">
          <div className="grid lg:grid-cols-2 gap-16 items-start">
            <div>
              <div className="inline-flex items-center gap-2 bg-white/10 border border-white/20 text-blue-200 text-sm font-bold px-4 py-2 rounded-full mb-8">
                <Mail className="w-4 h-4" /> {t.contact_tag}
              </div>
              <h2 className="text-4xl md:text-5xl font-black text-white mb-6 tracking-tight">{t.contact_title}</h2>
              <p className="text-blue-100/80 text-xl mb-12 leading-relaxed max-w-md">{t.contact_sub}</p>
              
              <div className="flex flex-col gap-8 mb-12">
                {t.steps.map((step, i) => (
                  <div key={i} className="flex items-start gap-5">
                    <div className="w-12 h-12 rounded-xl bg-blue-600/20 border border-blue-500/30 flex items-center justify-center flex-shrink-0">
                      {step.icon}
                    </div>
                    <div>
                      <div className="font-bold text-white text-lg mb-1">{step.title}</div>
                      <div className="text-blue-200/70 text-sm leading-relaxed">{step.desc}</div>
                    </div>
                  </div>
                ))}
              </div>
              
              <div className="bg-white/5 border border-white/10 rounded-2xl p-6 backdrop-blur-sm inline-block">
                <p className="text-blue-200 text-sm font-medium mb-2">{t.form_or}</p>
                <a href="mailto:contact@attentezero.ca" className="text-2xl font-bold text-white hover:text-blue-400 transition-colors flex items-center gap-3">
                  contact@attentezero.ca <ArrowRight className="w-5 h-5 text-blue-500" />
                </a>
              </div>
            </div>
            
            <div className="bg-white rounded-3xl p-8 md:p-10 shadow-2xl relative">
              {formSubmitted ? (
                <div className="text-center py-20">
                  <div className="w-20 h-20 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-6">
                    ✓
                  </div>
                  <h3 className="text-2xl font-black text-slate-900 mb-2">
                    {lang === "fr" ? "Message envoyé !" : "Message sent!"}
                  </h3>
                  <p className="text-slate-600">
                    {lang === "fr" ? "Notre équipe vous contactera d'ici 48h." : "Our team will contact you within 48h."}
                  </p>
                  <button 
                    onClick={() => setFormSubmitted(false)}
                    className="mt-8 text-blue-600 font-bold hover:underline"
                  >
                    {lang === "fr" ? "Envoyer un autre message" : "Send another message"}
                  </button>
                </div>
              ) : (
                <form onSubmit={handleFormSubmit} className="flex flex-col gap-6">
                  <div className="grid md:grid-cols-2 gap-6">
                    <div>
                      <label className="text-sm font-bold text-slate-700 block mb-2">{t.form_name}</label>
                      <input
                        required
                        type="text"
                        value={formData.name}
                        onChange={e => setFormData(d => ({ ...d, name: e.target.value }))}
                        className="w-full border-2 border-slate-200 rounded-xl px-4 py-3 text-slate-900 focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all font-medium"
                        data-testid="input-contact-name"
                      />
                    </div>
                    <div>
                      <label className="text-sm font-bold text-slate-700 block mb-2">{t.form_org}</label>
                      <input
                        required
                        type="text"
                        value={formData.org}
                        onChange={e => setFormData(d => ({ ...d, org: e.target.value }))}
                        className="w-full border-2 border-slate-200 rounded-xl px-4 py-3 text-slate-900 focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all font-medium"
                        data-testid="input-contact-org"
                      />
                    </div>
                  </div>
                  
                  <div className="grid md:grid-cols-2 gap-6">
                    <div>
                      <label className="text-sm font-bold text-slate-700 block mb-2">{t.form_email}</label>
                      <input
                        required
                        type="email"
                        value={formData.email}
                        onChange={e => setFormData(d => ({ ...d, email: e.target.value }))}
                        className="w-full border-2 border-slate-200 rounded-xl px-4 py-3 text-slate-900 focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all font-medium"
                        data-testid="input-contact-email"
                      />
                    </div>
                    <div>
                      <label className="text-sm font-bold text-slate-700 block mb-2">{t.form_phone}</label>
                      <input
                        type="tel"
                        value={formData.phone}
                        onChange={e => setFormData(d => ({ ...d, phone: e.target.value }))}
                        className="w-full border-2 border-slate-200 rounded-xl px-4 py-3 text-slate-900 focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all font-medium"
                        data-testid="input-contact-phone"
                      />
                    </div>
                  </div>
                  
                  <div>
                    <label className="text-sm font-bold text-slate-700 block mb-2">{t.form_service}</label>
                    <select
                      required
                      value={formData.service}
                      onChange={e => setFormData(d => ({ ...d, service: e.target.value }))}
                      className="w-full border-2 border-slate-200 rounded-xl px-4 py-3 text-slate-900 focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all font-medium bg-white"
                      data-testid="select-contact-service"
                    >
                      <option value="">—</option>
                      {t.services.map((svc, i) => <option key={i} value={svc.badge}>{svc.badge}</option>)}
                      <option value="autre">{lang === "fr" ? "Autre / Sur mesure" : "Other / Custom"}</option>
                    </select>
                  </div>
                  
                  <div>
                    <label className="text-sm font-bold text-slate-700 block mb-2">{lang === "fr" ? "Message" : "Message"}</label>
                    <textarea
                      required
                      rows={4}
                      value={formData.msg}
                      onChange={e => setFormData(d => ({ ...d, msg: e.target.value }))}
                      placeholder={t.form_msg}
                      className="w-full border-2 border-slate-200 rounded-xl px-4 py-3 text-slate-900 focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all resize-none font-medium"
                      data-testid="input-contact-message"
                    />
                  </div>
                  
                  <button
                    type="submit"
                    className="w-full bg-blue-600 text-white font-black text-lg py-4 rounded-xl hover:bg-blue-700 transition-all shadow-[0_0_20px_rgba(37,99,235,0.3)] hover:shadow-[0_0_30px_rgba(37,99,235,0.4)] hover:-translate-y-0.5 mt-2"
                    data-testid="button-contact-submit"
                  >
                    {t.form_send}
                  </button>
                </form>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="py-16 px-6 bg-[#040817] text-center" data-testid="footer">
        <div className="flex items-center justify-center mb-8">
          <div className="bg-white/5 rounded-2xl px-6 py-4 inline-flex items-center backdrop-blur-sm border border-white/10">
            <img src={LOGO} alt="CivicAI" className="h-8 w-auto brightness-0 invert" />
          </div>
        </div>
        <p className="text-blue-500 text-xs font-black tracking-[0.2em] mb-4 uppercase">{t.footer_tagline}</p>
        <p className="text-slate-500 text-sm font-medium">{t.footer}</p>
        <div className="flex items-center justify-center gap-6 mt-8 text-sm font-bold text-slate-400">
          <a href="https://attentezero.ca/privacy" target="_blank" rel="noreferrer" className="hover:text-white transition-colors">{lang === "fr" ? "Politique de confidentialité" : "Privacy Policy"}</a>
          <span className="w-1.5 h-1.5 rounded-full bg-slate-700" />
          <a href="https://attentezero.ca" target="_blank" rel="noreferrer" className="hover:text-white transition-colors">AttenteZéro</a>
        </div>
      </footer>
    </div>
  );
}
