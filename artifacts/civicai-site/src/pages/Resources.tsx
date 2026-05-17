import { motion } from "framer-motion";
import { Download, FileText, BookOpen, Scale, Tag, Presentation } from "lucide-react";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { useLang } from "@/lib/lang";

const BASE = import.meta.env.BASE_URL;

interface DocCard {
  title: string;
  desc: string;
  file: string;
  size: string;
  badge?: string;
}

interface Section {
  icon: React.ReactNode;
  heading: string;
  color: string;
  docs: DocCard[];
}

function getSections(lang: "fr" | "en"): Section[] {
  const fr = lang === "fr";
  return [
    {
      icon: <Presentation className="w-5 h-5" />,
      heading: fr ? "Documents commerciaux" : "Commercial documents",
      color: "blue",
      docs: [
        {
          title: fr ? "Flyer A4" : "A4 Flyer",
          desc: fr ? "Aperçu de nos solutions en une page — à partager facilement." : "One-page overview of our solutions — easy to share.",
          file: "flyer-a4.pdf",
          size: "262 Ko",
        },
        {
          title: fr ? "Plaquette commerciale" : "Commercial brochure",
          desc: fr ? "Présentation complète de CivicAI : services, cas clients, processus et tarifs." : "Full CivicAI presentation: services, client cases, process and pricing.",
          file: "plaquette-commerciale.pdf",
          size: "915 Ko",
        },
        {
          title: fr ? "Présentation 10 minutes" : "10-minute presentation",
          desc: fr ? "Deck complet pour présenter CivicAI à un prospect ou partenaire." : "Full deck to present CivicAI to a prospect or partner.",
          file: "presentation-10min.pdf",
          size: "382 Ko",
        },
        {
          title: fr ? "Fiche produit AttenteZéro" : "AttenteZéro product sheet",
          desc: fr ? "Description détaillée de l'application AttenteZéro, ses modules et ses résultats." : "Detailed description of the AttenteZéro app, its modules and results.",
          file: "fiche-attentezero.pdf",
          size: "1,1 Mo",
        },
      ],
    },
    {
      icon: <Tag className="w-5 h-5" />,
      heading: fr ? "Tarification & Devis" : "Pricing & Quotes",
      color: "teal",
      docs: [
        {
          title: fr ? "Fiche tarifaire 2025–2026" : "2025–2026 price list",
          desc: fr ? "Grille complète des prix : ERP, développement web & mobile, automatisation, marketing digital." : "Full price grid: ERP, web & mobile development, automation, digital marketing.",
          file: "fiche-tarifaire.pdf",
          size: "814 Ko",
          badge: fr ? "Nouveaux tarifs" : "New pricing",
        },
        {
          title: fr ? "Offre de lancement" : "Launch offer",
          desc: fr ? "2 mois offerts + frais d'installation offerts pour les nouveaux clients." : "2 months free + no setup fees for new clients.",
          file: "offre-lancement.pdf",
          size: "804 Ko",
          badge: fr ? "Offre limitée" : "Limited offer",
        },
        {
          title: fr ? "Formulaire de demande de devis" : "Quote request form",
          desc: fr ? "Remplissez et retournez ce formulaire pour recevoir une proposition personnalisée sous 24–48h." : "Fill out and return this form to receive a custom proposal within 24–48h.",
          file: "demande-devis.pdf",
          size: "589 Ko",
        },
      ],
    },
    {
      icon: <BookOpen className="w-5 h-5" />,
      heading: fr ? "Documentation technique" : "Technical documentation",
      color: "violet",
      docs: [
        {
          title: fr ? "Guide d'utilisation ConstructPro ERP" : "ConstructPro ERP user guide",
          desc: fr ? "Guide de formation complet pour tous les rôles : Direction, Bureau, Terrain et Portail client." : "Complete training guide for all roles: Management, Office, Field and Client portal.",
          file: "guide-constructpro-erp.pdf",
          size: "4,1 Mo",
        },
      ],
    },
    {
      icon: <Scale className="w-5 h-5" />,
      heading: fr ? "Documents légaux" : "Legal documents",
      color: "slate",
      docs: [
        {
          title: fr ? "Politique de confidentialité" : "Privacy policy",
          desc: fr ? "Conforme à la Loi 25 (Québec) & LPRPDE Canada. Version 1.0 — Mai 2025." : "Compliant with Law 25 (Quebec) & PIPEDA Canada. Version 1.0 — May 2025.",
          file: "politique-confidentialite.pdf",
          size: "323 Ko",
        },
      ],
    },
  ];
}

const colorMap: Record<string, { bg: string; border: string; icon: string; btn: string; badge: string }> = {
  blue: {
    bg: "bg-blue-950/30",
    border: "border-blue-800/40",
    icon: "bg-blue-900/50 text-blue-300",
    btn: "bg-blue-600 hover:bg-blue-500",
    badge: "bg-blue-500/20 text-blue-300 border border-blue-500/30",
  },
  teal: {
    bg: "bg-teal-950/30",
    border: "border-teal-800/40",
    icon: "bg-teal-900/50 text-teal-300",
    btn: "bg-teal-600 hover:bg-teal-500",
    badge: "bg-teal-500/20 text-teal-300 border border-teal-500/30",
  },
  violet: {
    bg: "bg-violet-950/30",
    border: "border-violet-800/40",
    icon: "bg-violet-900/50 text-violet-300",
    btn: "bg-violet-600 hover:bg-violet-500",
    badge: "bg-violet-500/20 text-violet-300 border border-violet-500/30",
  },
  slate: {
    bg: "bg-slate-800/30",
    border: "border-slate-700/40",
    icon: "bg-slate-700/50 text-slate-300",
    btn: "bg-slate-600 hover:bg-slate-500",
    badge: "bg-slate-500/20 text-slate-300 border border-slate-500/30",
  },
};

export default function Resources() {
  const { lang } = useLang();
  const fr = lang === "fr";
  const sections = getSections(lang);

  return (
    <div className="min-h-screen bg-[#060d1f] text-white">
      <Navbar />

      <section className="bg-gradient-to-br from-slate-900 via-blue-950/40 to-slate-900 border-b border-white/5 py-20 px-6">
        <div className="max-w-3xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 bg-blue-500/10 border border-blue-500/20 text-blue-300 text-sm font-semibold px-4 py-1.5 rounded-full mb-6">
            <FileText className="w-4 h-4" />
            {fr ? "Centre de ressources" : "Resource centre"}
          </div>
          <h1 className="text-4xl md:text-5xl font-black mb-4">
            {fr ? "Tous nos documents," : "All our documents,"}<br />
            <span className="text-blue-400">{fr ? "au même endroit." : "in one place."}</span>
          </h1>
          <p className="text-slate-400 text-lg max-w-xl mx-auto">
            {fr
              ? "Téléchargez librement nos fiches produits, tarifs, guides et documents légaux."
              : "Freely download our product sheets, pricing, guides and legal documents."}
          </p>
        </div>
      </section>

      <div className="max-w-5xl mx-auto px-6 py-16 space-y-14">
        {sections.map((section, si) => {
          const c = colorMap[section.color];
          return (
            <motion.div
              key={si}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: si * 0.08 }}
            >
              <div className="flex items-center gap-3 mb-6">
                <div className={`p-2 rounded-lg ${c.icon}`}>{section.icon}</div>
                <h2 className="text-xl font-bold text-white">{section.heading}</h2>
              </div>
              <div className="grid sm:grid-cols-2 gap-4">
                {section.docs.map((doc, di) => (
                  <div
                    key={di}
                    className={`rounded-2xl border p-5 flex flex-col gap-3 ${c.bg} ${c.border} hover:border-opacity-70 transition-all`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="font-bold text-white text-sm">{doc.title}</h3>
                          {doc.badge && (
                            <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${c.badge}`}>
                              {doc.badge}
                            </span>
                          )}
                        </div>
                        <p className="text-slate-400 text-xs mt-1 leading-relaxed">{doc.desc}</p>
                      </div>
                    </div>
                    <div className="flex items-center justify-between mt-auto pt-1">
                      <span className="text-xs text-slate-500 font-mono">PDF · {doc.size}</span>
                      <a
                        href={`${BASE}docs/${doc.file}`}
                        download
                        className={`inline-flex items-center gap-1.5 text-white text-xs font-bold px-4 py-2 rounded-lg transition-colors ${c.btn}`}
                      >
                        <Download className="w-3.5 h-3.5" />
                        {fr ? "Télécharger" : "Download"}
                      </a>
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
          );
        })}

        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="bg-gradient-to-r from-blue-900/30 to-teal-900/30 border border-blue-700/30 rounded-2xl p-8 text-center"
        >
          <h3 className="text-xl font-bold mb-2">
            {fr ? "Vous cherchez un document spécifique ?" : "Looking for a specific document?"}
          </h3>
          <p className="text-slate-400 text-sm mb-5">
            {fr
              ? "Contactez-nous et nous vous préparerons une proposition personnalisée sous 24h."
              : "Contact us and we'll prepare a custom proposal within 24h."}
          </p>
          <a
            href="/contact"
            className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-500 transition-colors text-white font-bold px-6 py-3 rounded-xl text-sm"
          >
            {fr ? "Nous contacter" : "Contact us"}
          </a>
        </motion.div>
      </div>

      <Footer />
    </div>
  );
}
