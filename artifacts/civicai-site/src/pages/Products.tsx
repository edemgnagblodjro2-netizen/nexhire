import { Link } from "wouter";
import { motion, type Variants } from "framer-motion";
import {
  ArrowRight, Star, MapPin, Building2, Smartphone,
  CheckCircle2, BarChart3, Clock, Users, Globe
} from "lucide-react";
import { FaApple, FaGooglePlay } from "react-icons/fa";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { useLang, T } from "@/lib/lang";
import { PageMeta } from "@/components/PageMeta";

const fadeUp: Variants = {
  hidden: { opacity: 0, y: 24 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.55, ease: "easeOut" } },
};
const stagger: Variants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.1 } },
};

const ATTENTEZERO_FEATURES_FR = [
  { icon: <MapPin className="w-5 h-5" />, title: "7 957 services indexés", desc: "Répertoire complet des services communautaires, sociaux et d'urgence au Québec." },
  { icon: <Globe className="w-5 h-5" />, title: "5 langues supportées", desc: "FR, EN, ES, AR, HT — pour rejoindre les communautés les plus vulnérables." },
  { icon: <BarChart3 className="w-5 h-5" />, title: "IA conversationnelle", desc: "Assistant GPT-4o-mini pour trouver les bons services par la conversation naturelle." },
  { icon: <Clock className="w-5 h-5" />, title: "Temps d'attente en temps réel", desc: "Rapports de temps d'attente crowdsourcés pour les services à fort achalandage." },
  { icon: <Users className="w-5 h-5" />, title: "Gratuit pour les citoyens", desc: "Modèle B2G : entièrement gratuit pour les utilisateurs, financé par les administrations publiques." },
  { icon: <Smartphone className="w-5 h-5" />, title: "iOS & Android", desc: "Disponible sur l'App Store et Google Play. Interface optimisée pour mobile." },
];

const ATTENTEZERO_FEATURES_EN = [
  { icon: <MapPin className="w-5 h-5" />, title: "7,957 services indexed", desc: "Comprehensive directory of community, social, and emergency services in Quebec." },
  { icon: <Globe className="w-5 h-5" />, title: "5 languages supported", desc: "FR, EN, ES, AR, HT — to reach the most vulnerable communities." },
  { icon: <BarChart3 className="w-5 h-5" />, title: "Conversational AI", desc: "GPT-4o-mini assistant to find the right services through natural conversation." },
  { icon: <Clock className="w-5 h-5" />, title: "Real-time wait times", desc: "Crowdsourced wait time reports for high-traffic services." },
  { icon: <Users className="w-5 h-5" />, title: "Free for citizens", desc: "B2G model: entirely free for users, funded by public administrations." },
  { icon: <Smartphone className="w-5 h-5" />, title: "iOS & Android", desc: "Available on the App Store and Google Play. Mobile-optimized interface." },
];

const CONSTRUCTPRO_FEATURES_FR = [
  { icon: <Building2 className="w-5 h-5" />, title: "Gestion de projets & chantiers", desc: "Suivez l'avancement de chaque chantier en temps réel, de la planification à la livraison." },
  { icon: <BarChart3 className="w-5 h-5" />, title: "Soumissions & estimations", desc: "Créez des soumissions professionnelles rapidement avec des modèles adaptés au secteur." },
  { icon: <Users className="w-5 h-5" />, title: "Gestion des équipes", desc: "Assignez les ressources, suivez les heures et coordonnez sous-traitants et employés." },
  { icon: <CheckCircle2 className="w-5 h-5" />, title: "Facturation & finances", desc: "Génération de factures, suivi des paiements et rapports financiers intégrés." },
  { icon: <BarChart3 className="w-5 h-5" />, title: "Tableaux de bord", desc: "Vue globale en temps réel sur tous vos projets, finances et ressources." },
  { icon: <Globe className="w-5 h-5" />, title: "Accessible partout", desc: "Interface web responsive, accessible depuis bureau, tablette et téléphone." },
];

const CONSTRUCTPRO_FEATURES_EN = [
  { icon: <Building2 className="w-5 h-5" />, title: "Project & site management", desc: "Track the progress of each job site in real time, from planning to delivery." },
  { icon: <BarChart3 className="w-5 h-5" />, title: "Bids & estimates", desc: "Create professional bids quickly with industry-adapted templates." },
  { icon: <Users className="w-5 h-5" />, title: "Team management", desc: "Assign resources, track hours, and coordinate subcontractors and employees." },
  { icon: <CheckCircle2 className="w-5 h-5" />, title: "Invoicing & finances", desc: "Invoice generation, payment tracking, and integrated financial reporting." },
  { icon: <BarChart3 className="w-5 h-5" />, title: "Dashboards", desc: "Real-time global view of all your projects, finances, and resources." },
  { icon: <Globe className="w-5 h-5" />, title: "Accessible anywhere", desc: "Responsive web interface, accessible from desktop, tablet, and phone." },
];

export default function Products() {
  const { lang } = useLang();
  const t = T[lang];
  const azFeatures = lang === "fr" ? ATTENTEZERO_FEATURES_FR : ATTENTEZERO_FEATURES_EN;
  const cpFeatures = lang === "fr" ? CONSTRUCTPRO_FEATURES_FR : CONSTRUCTPRO_FEATURES_EN;

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 overflow-x-hidden">
      <PageMeta
        title="Nos produits — CivicAI"
        description="AttenteZéro, ConstructPro ERP et d'autres solutions SaaS innovantes conçues par CivicAI pour moderniser les services publics et privés au Canada."
        ogUrl="https://www.civicai.ca/products"
        jsonLd={[
          {
            "@context": "https://schema.org",
            "@type": "SoftwareApplication",
            "name": "AttenteZéro",
            "url": "https://www.attentezero.ca",
            "applicationCategory": "UtilitiesApplication",
            "operatingSystem": "iOS, Android",
            "description": "Application mobile gratuite connectant les personnes vulnérables aux services communautaires et sociaux au Québec — 7 957 services indexés, 5 langues, IA conversationnelle.",
            "offers": {
              "@type": "Offer",
              "price": "0",
              "priceCurrency": "CAD"
            },
            "author": {
              "@type": "Organization",
              "name": "CivicAI",
              "url": "https://www.civicai.ca"
            },
            "downloadUrl": [
              "https://apps.apple.com/ca/app/attentezero/id6766750916",
              "https://play.google.com/store/apps/details?id=com.attentezero.app"
            ]
          },
          {
            "@context": "https://schema.org",
            "@type": "SoftwareApplication",
            "name": "ConstructPro ERP",
            "url": "https://www.civicai.ca/products",
            "applicationCategory": "BusinessApplication",
            "operatingSystem": "Web",
            "description": "Logiciel ERP cloud pour les entreprises de construction au Québec — gestion de projets, soumissions, facturation, équipes et tableaux de bord en temps réel.",
            "author": {
              "@type": "Organization",
              "name": "CivicAI",
              "url": "https://www.civicai.ca"
            }
          }
        ]}
      />
      <Navbar />

      {/* PAGE HEADER */}
      <section className="pt-28 pb-16 px-6 bg-gradient-to-br from-[#070d24] via-[#0d1a4a] to-[#070d24] relative overflow-hidden">
        <div className="absolute inset-0 opacity-[0.04]" style={{ backgroundImage: "radial-gradient(circle, #ffffff 1px, transparent 1px)", backgroundSize: "28px 28px" }} />
        <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-blue-500/40 to-transparent" />
        <div className="max-w-6xl mx-auto relative z-10">
          <motion.div initial="hidden" animate="visible" variants={stagger}>
            <motion.div variants={fadeUp} className="inline-flex items-center gap-2 bg-blue-900/40 border border-blue-700/50 text-blue-300 text-sm font-bold px-4 py-2 rounded-full mb-6">
              {t.products_tag}
            </motion.div>
            <motion.h1 variants={fadeUp} className="text-4xl md:text-6xl font-black text-white tracking-tight mb-5">
              {t.products_title}
            </motion.h1>
            <motion.p variants={fadeUp} className="text-xl text-blue-200/80 max-w-2xl">
              {t.products_sub}
            </motion.p>
          </motion.div>
        </div>
      </section>

      {/* ATTENTEZÉRO */}
      <section className="py-24 px-6 bg-white" data-testid="section-attentezero">
        <div className="max-w-6xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-16 items-center mb-16">
            <motion.div
              initial={{ opacity: 0, x: -24 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
            >
              <div className="inline-flex items-center gap-2 bg-teal-50 border border-teal-200 text-teal-800 text-sm font-bold px-4 py-2 rounded-full mb-6">
                <Star className="w-4 h-4 fill-teal-700" /> {t.flagship_tag}
              </div>
              <div className="flex items-center gap-4 mb-5">
                <div className="w-16 h-16 rounded-3xl bg-gradient-to-br from-teal-400 to-teal-700 flex items-center justify-center shadow-lg">
                  <MapPin className="w-8 h-8 text-white" />
                </div>
                <h2 className="text-4xl font-black text-slate-900">{t.flagship_name}</h2>
              </div>
              <p className="text-lg text-slate-600 leading-relaxed mb-8">{t.flagship_desc}</p>
              <div className="grid grid-cols-3 gap-4 mb-8">
                {[0,1,2].map(i => (
                  <div key={i} className="bg-teal-50 rounded-2xl p-5 border border-teal-100 text-center">
                    <div className="text-2xl font-black text-teal-700 mb-1">{t.flagship_stats[i*2]}</div>
                    <div className="text-xs font-semibold text-teal-500">{t.flagship_stats[i*2+1]}</div>
                  </div>
                ))}
              </div>
              <div className="flex flex-wrap gap-3">
                <a href="https://apps.apple.com/ca/app/attentezero/id6766750916" target="_blank" rel="noreferrer"
                  className="flex items-center gap-3 bg-slate-900 text-white font-bold px-6 py-4 rounded-xl hover:bg-slate-800 transition-colors shadow-md">
                  <FaApple className="w-6 h-6" />
                  <span className="text-left text-sm leading-tight">Download on the<br /><span className="text-base font-black">{t.flagship_ios}</span></span>
                </a>
                <a href="https://play.google.com/store/apps/details?id=com.attentezero.app" target="_blank" rel="noreferrer"
                  className="flex items-center gap-3 bg-white border-2 border-slate-200 text-slate-900 font-bold px-6 py-4 rounded-xl hover:border-teal-400 hover:bg-teal-50 transition-all shadow-sm">
                  <FaGooglePlay className="w-6 h-6 text-slate-700" />
                  <span className="text-left text-sm leading-tight">GET IT ON<br /><span className="text-base font-black">{t.flagship_android}</span></span>
                </a>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, scale: 0.92 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
              className="relative"
            >
              <div className="absolute inset-0 bg-teal-200 blur-3xl rounded-full opacity-30 scale-75" />
              <div className="relative bg-slate-900 rounded-[2.5rem] p-1 shadow-2xl border-4 border-slate-100 max-w-xs mx-auto">
                <div className="rounded-[2rem] overflow-hidden bg-gradient-to-b from-teal-900 to-slate-900 aspect-[9/19] relative">
                  <div className="absolute top-0 inset-x-0 h-7 flex justify-center z-10">
                    <div className="w-28 h-6 bg-slate-900 rounded-b-2xl" />
                  </div>
                  <div className="absolute inset-0 p-5 pt-14 flex flex-col">
                    <div className="w-14 h-14 rounded-2xl bg-white flex items-center justify-center mb-4 shadow-lg">
                      <MapPin className="w-8 h-8 text-teal-700" />
                    </div>
                    <h3 className="text-2xl font-black text-white mb-1">AttenteZéro</h3>
                    <p className="text-teal-200 text-sm font-medium mb-6">Services communautaires QC</p>
                    <div className="flex flex-col gap-3">
                      {[1,2,3,4].map(j => (
                        <div key={j} className="bg-white/10 rounded-xl p-3 flex gap-3 items-center">
                          <div className="w-10 h-10 rounded-lg bg-teal-500/30 flex-shrink-0" />
                          <div className="flex-1">
                            <div className="h-2.5 bg-white/40 rounded-full w-3/4 mb-1.5" />
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

          <motion.div
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            <h3 className="text-2xl font-black text-slate-900 mb-8">{lang === "fr" ? "Fonctionnalités clés" : "Key features"}</h3>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {azFeatures.map((feat, i) => (
                <div key={i} className="bg-teal-50/50 border border-teal-100 rounded-2xl p-5 hover:border-teal-300 hover:shadow-sm transition-all">
                  <div className="w-10 h-10 rounded-xl bg-teal-100 text-teal-700 flex items-center justify-center mb-3">
                    {feat.icon}
                  </div>
                  <h4 className="font-bold text-slate-900 mb-1 text-sm">{feat.title}</h4>
                  <p className="text-slate-600 text-xs leading-relaxed">{feat.desc}</p>
                </div>
              ))}
            </div>
          </motion.div>
        </div>
      </section>

      {/* CONSTRUCTPRO ERP */}
      <section className="py-24 px-6 bg-slate-50" data-testid="section-constructpro">
        <div className="max-w-6xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-16 items-center mb-16">
            <motion.div
              initial={{ opacity: 0, scale: 0.92 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
              className="relative order-2 lg:order-1"
            >
              <div className="absolute inset-0 bg-orange-200 blur-3xl rounded-full opacity-20 scale-75" />
              <div className="relative bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden max-w-md mx-auto">
                <div className="bg-gradient-to-r from-orange-600 to-orange-700 p-5 flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center">
                    <Building2 className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <div className="font-black text-white text-base">ConstructPro ERP</div>
                    <div className="text-orange-200 text-xs">Tableau de bord</div>
                  </div>
                </div>
                <div className="p-5 flex flex-col gap-4">
                  <div className="grid grid-cols-3 gap-3">
                    {["12", "3", "87%"].map((v, j) => (
                      <div key={j} className="bg-orange-50 rounded-xl p-3 text-center">
                        <div className="text-xl font-black text-orange-700">{v}</div>
                        <div className="text-xs text-slate-500">{["projets", "chantiers", "complété"][j]}</div>
                      </div>
                    ))}
                  </div>
                  {[1,2,3].map(j => (
                    <div key={j} className="bg-slate-50 rounded-xl p-3 flex gap-3 items-center border border-slate-100">
                      <div className="w-9 h-9 rounded-lg bg-orange-100 flex-shrink-0 flex items-center justify-center">
                        <Building2 className="w-4 h-4 text-orange-600" />
                      </div>
                      <div className="flex-1">
                        <div className="h-2.5 bg-slate-200 rounded-full w-3/4 mb-1.5" />
                        <div className="h-2 bg-orange-200 rounded-full w-1/2" />
                      </div>
                      <span className="text-xs font-bold text-green-600 bg-green-50 px-2 py-0.5 rounded-full">En cours</span>
                    </div>
                  ))}
                </div>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, x: 24 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
              className="order-1 lg:order-2"
            >
              <div className="inline-flex items-center gap-2 bg-orange-50 border border-orange-200 text-orange-800 text-sm font-bold px-4 py-2 rounded-full mb-6">
                <Building2 className="w-4 h-4" /> {t.erp_tag}
              </div>
              <div className="flex items-center gap-4 mb-5">
                <div className="w-16 h-16 rounded-3xl bg-gradient-to-br from-orange-400 to-orange-700 flex items-center justify-center shadow-lg">
                  <Building2 className="w-8 h-8 text-white" />
                </div>
                <h2 className="text-4xl font-black text-slate-900">{t.erp_name}</h2>
              </div>
              <p className="text-lg text-slate-600 leading-relaxed mb-8">{t.erp_desc}</p>
              <ul className="flex flex-col gap-3 mb-8">
                {t.erp_features.map((f, i) => (
                  <li key={i} className="flex items-center gap-3 text-slate-700 font-medium">
                    <CheckCircle2 className="w-5 h-5 text-orange-600 flex-shrink-0" />{f}
                  </li>
                ))}
              </ul>
              <Link href="/contact" className="inline-flex items-center gap-2 bg-orange-600 text-white font-bold px-7 py-4 rounded-xl hover:bg-orange-500 transition-all shadow-md hover:-translate-y-0.5 text-base">
                {t.erp_cta} <ArrowRight className="w-4 h-4" />
              </Link>
            </motion.div>
          </div>

          <motion.div
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            <h3 className="text-2xl font-black text-slate-900 mb-8">{lang === "fr" ? "Fonctionnalités clés" : "Key features"}</h3>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {cpFeatures.map((feat, i) => (
                <div key={i} className="bg-orange-50/50 border border-orange-100 rounded-2xl p-5 hover:border-orange-300 hover:shadow-sm transition-all">
                  <div className="w-10 h-10 rounded-xl bg-orange-100 text-orange-700 flex items-center justify-center mb-3">
                    {feat.icon}
                  </div>
                  <h4 className="font-bold text-slate-900 mb-1 text-sm">{feat.title}</h4>
                  <p className="text-slate-600 text-xs leading-relaxed">{feat.desc}</p>
                </div>
              ))}
            </div>
          </motion.div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 px-6 bg-gradient-to-br from-blue-700 via-blue-800 to-blue-900 relative overflow-hidden">
        <div className="absolute inset-0 opacity-10" style={{ backgroundImage: "radial-gradient(circle, #ffffff 1px, transparent 1px)", backgroundSize: "28px 28px" }} />
        <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={stagger} className="max-w-3xl mx-auto text-center relative z-10">
          <motion.h2 variants={fadeUp} className="text-3xl md:text-5xl font-black text-white mb-4 tracking-tight">{t.cta_banner_title}</motion.h2>
          <motion.p variants={fadeUp} className="text-blue-200 text-lg mb-8">{t.cta_banner_sub}</motion.p>
          <motion.div variants={fadeUp}>
            <Link href="/contact" className="inline-flex items-center gap-2 bg-white text-blue-900 font-bold px-10 py-4 rounded-xl hover:bg-blue-50 transition-all shadow-xl text-lg hover:-translate-y-0.5">
              {t.cta_banner_btn} <ArrowRight className="w-5 h-5" />
            </Link>
          </motion.div>
        </motion.div>
      </section>

      <Footer />
    </div>
  );
}
