import { motion } from "framer-motion";
import { Shield, Download, Mail, Phone } from "lucide-react";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { useLang } from "@/lib/lang";

const BASE = import.meta.env.BASE_URL;

const SECTIONS = [
  {
    num: "1",
    title: "Responsable de la protection des renseignements personnels",
    body: (
      <>
        <p>Le responsable de la protection des renseignements personnels au sein de CivicAI est :</p>
        <div className="mt-3 bg-slate-800/50 rounded-xl p-4 text-sm space-y-1">
          <p className="font-semibold text-white">Ayaovi Edem Gnagblodjro — Fondateur & CEO</p>
          <p className="flex items-center gap-2 text-slate-300"><Mail className="w-4 h-4 text-blue-400" /> civicai@attentezero.ca</p>
          <p className="flex items-center gap-2 text-slate-300"><Phone className="w-4 h-4 text-blue-400" /> 905 809-7798</p>
        </div>
      </>
    ),
  },
  {
    num: "2",
    title: "Renseignements personnels collectés",
    body: (
      <ul className="space-y-2 text-slate-300 text-sm">
        {[
          ["Informations d'identification", "nom, prénom, poste, nom de l'entreprise"],
          ["Coordonnées", "adresse courriel, numéro de téléphone, adresse postale"],
          ["Informations commerciales", "besoins en services, historique des transactions"],
          ["Données d'utilisation", "informations de connexion, utilisation des plateformes CivicAI"],
          ["Données techniques", "adresse IP, type de navigateur, cookies fonctionnels"],
        ].map(([label, detail]) => (
          <li key={label} className="flex gap-2">
            <span className="text-blue-400 mt-0.5 shrink-0">•</span>
            <span><strong className="text-white">{label} :</strong> {detail}</span>
          </li>
        ))}
      </ul>
    ),
  },
  {
    num: "3",
    title: "Finalités de la collecte et utilisation",
    body: (
      <ul className="space-y-2 text-slate-300 text-sm">
        {[
          "Fournir et améliorer nos services (ERP, AttenteZéro, développement web, etc.)",
          "Communiquer avec nos clients concernant leurs projets et contrats",
          "Envoyer des informations commerciales pertinentes (avec consentement)",
          "Respecter nos obligations légales et contractuelles",
          "Améliorer la sécurité et la performance de nos plateformes",
        ].map((item) => (
          <li key={item} className="flex gap-2">
            <span className="text-blue-400 mt-0.5 shrink-0">•</span>
            <span>{item}</span>
          </li>
        ))}
      </ul>
    ),
  },
  {
    num: "4",
    title: "Consentement",
    body: (
      <p className="text-slate-300 text-sm leading-relaxed">
        CivicAI collecte vos renseignements personnels avec votre consentement explicite, obtenu au moment de la prise de contact, de la signature d'un contrat ou de l'utilisation de nos services. Vous pouvez retirer votre consentement en tout temps en nous contactant directement, sans que cela n'affecte les traitements déjà effectués.
      </p>
    ),
  },
  {
    num: "5",
    title: "Conservation et sécurité des données",
    body: (
      <>
        <p className="text-slate-300 text-sm leading-relaxed mb-3">
          Vos données sont hébergées au Canada, sur des serveurs sécurisés conformes aux normes canadiennes. CivicAI applique les mesures de sécurité suivantes :
        </p>
        <ul className="space-y-2 text-slate-300 text-sm">
          {[
            "Chiffrement AES-256 des données au repos et TLS 1.3 en transit",
            "Accès restreint aux seuls employés autorisés, selon le principe du moindre privilège",
            "Sauvegardes automatiques régulières avec rétention de 90 jours",
            "Journalisation des accès et audit trail complet",
          ].map((item) => (
            <li key={item} className="flex gap-2">
              <span className="text-teal-400 mt-0.5 shrink-0">✓</span>
              <span>{item}</span>
            </li>
          ))}
        </ul>
        <p className="text-slate-400 text-sm mt-3">
          Les renseignements personnels sont conservés aussi longtemps que nécessaire aux fins énoncées, ou selon les exigences légales applicables (généralement 7 ans pour les données comptables).
        </p>
      </>
    ),
  },
  {
    num: "6",
    title: "Communication à des tiers",
    body: (
      <>
        <p className="text-slate-300 text-sm leading-relaxed mb-3">
          CivicAI ne vend, ne loue et ne divulgue jamais vos renseignements personnels à des tiers à des fins commerciales. Vos données peuvent être partagées uniquement :
        </p>
        <ul className="space-y-2 text-slate-300 text-sm">
          {[
            "Avec des sous-traitants techniques qui participent à la fourniture de nos services (hébergement, paiement), liés par des accords de confidentialité stricts",
            "Lorsque requis par la loi ou une autorité compétente",
            "Avec votre consentement explicite et préalable",
          ].map((item) => (
            <li key={item} className="flex gap-2">
              <span className="text-blue-400 mt-0.5 shrink-0">•</span>
              <span>{item}</span>
            </li>
          ))}
        </ul>
      </>
    ),
  },
  {
    num: "7",
    title: "Vos droits (Loi 25 — Québec)",
    body: (
      <div className="grid sm:grid-cols-2 gap-3">
        {[
          ["Droit d'accès", "Consulter les renseignements personnels vous concernant détenus par CivicAI"],
          ["Droit de rectification", "Demander la correction de renseignements inexacts ou incomplets"],
          ["Droit à l'effacement", "Demander la suppression de vos données sous réserve des obligations légales"],
          ["Droit à la portabilité", "Recevoir vos données dans un format structuré et lisible par machine"],
          ["Droit d'opposition", "Vous opposer au traitement de vos données à des fins de prospection commerciale"],
          ["Droit de retrait du consentement", "Retirer votre consentement en tout temps sans préjudice rétroactif"],
        ].map(([right, desc]) => (
          <div key={right} className="bg-slate-800/40 rounded-xl p-4 border border-slate-700/30">
            <p className="font-semibold text-white text-sm mb-1">{right}</p>
            <p className="text-slate-400 text-xs leading-relaxed">{desc}</p>
          </div>
        ))}
      </div>
    ),
  },
  {
    num: "8",
    title: "Cookies et technologies de suivi",
    body: (
      <p className="text-slate-300 text-sm leading-relaxed">
        Notre site web utilise uniquement des cookies fonctionnels essentiels au bon fonctionnement du site. Aucun cookie publicitaire ou de pistage tiers n'est utilisé sans votre consentement explicite. Vous pouvez désactiver les cookies dans les paramètres de votre navigateur, ce qui pourrait affecter certaines fonctionnalités du site.
      </p>
    ),
  },
  {
    num: "9",
    title: "Incidents de confidentialité",
    body: (
      <p className="text-slate-300 text-sm leading-relaxed">
        En cas d'incident impliquant vos renseignements personnels présentant un risque sérieux de préjudice, CivicAI s'engage à vous en informer dans les meilleurs délais et à signaler l'incident à la Commission d'accès à l'information du Québec (CAI) conformément à la Loi 25 et au Règlement sur les incidents de confidentialité.
      </p>
    ),
  },
  {
    num: "10",
    title: "Modifications de la politique",
    body: (
      <p className="text-slate-300 text-sm leading-relaxed">
        CivicAI se réserve le droit de modifier la présente politique en tout temps afin de refléter les changements légaux ou opérationnels. Toute modification substantielle sera communiquée par courriel aux clients actifs au moins 30 jours avant son entrée en vigueur. La version en vigueur est toujours disponible sur notre site web.
      </p>
    ),
  },
];

export default function Privacy() {
  const { lang } = useLang();
  const fr = lang === "fr";

  return (
    <div className="min-h-screen bg-[#060d1f] text-white">
      <Navbar />

      <section className="bg-gradient-to-br from-slate-900 via-slate-800/30 to-slate-900 border-b border-white/5 py-16 px-6">
        <div className="max-w-3xl mx-auto">
          <div className="inline-flex items-center gap-2 bg-teal-500/10 border border-teal-500/20 text-teal-300 text-sm font-semibold px-4 py-1.5 rounded-full mb-6">
            <Shield className="w-4 h-4" />
            {fr ? "Légal & Confidentialité" : "Legal & Privacy"}
          </div>
          <h1 className="text-4xl font-black mb-3">
            {fr ? "Politique de confidentialité" : "Privacy Policy"}
          </h1>
          <p className="text-slate-400 text-sm mb-6">
            {fr
              ? "Conforme à la Loi 25 (Québec) & LPRPDE Canada · Version 1.0 · En vigueur depuis le 1ᵉʳ mai 2025"
              : "Compliant with Law 25 (Quebec) & PIPEDA Canada · Version 1.0 · In effect since May 1, 2025"}
          </p>
          <div className="flex flex-wrap gap-3">
            <a
              href={`${BASE}docs/politique-confidentialite.pdf`}
              download
              className="inline-flex items-center gap-2 bg-slate-700 hover:bg-slate-600 transition-colors text-white text-sm font-bold px-5 py-2.5 rounded-xl"
            >
              <Download className="w-4 h-4" />
              {fr ? "Télécharger le PDF" : "Download PDF"}
            </a>
          </div>
        </div>
      </section>

      <div className="max-w-3xl mx-auto px-6 py-14 space-y-10">
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-slate-300 text-sm leading-relaxed border-l-4 border-blue-500/40 pl-4 py-1"
        >
          {fr
            ? "La présente politique de confidentialité décrit la manière dont CivicAI (NEQ : 2280791601), dont le siège social est au Canada, collecte, utilise, conserve et protège les renseignements personnels de ses clients, partenaires et visiteurs, conformément à la Loi sur la protection des renseignements personnels dans le secteur privé (Loi 25) du Québec et à la Loi sur la protection des renseignements personnels et les documents électroniques (LPRPDE) du Canada."
            : "This privacy policy describes how CivicAI (NEQ: 2280791601), headquartered in Canada, collects, uses, retains and protects the personal information of its clients, partners and visitors, in accordance with Quebec's Act respecting the protection of personal information in the private sector (Law 25) and Canada's Personal Information Protection and Electronic Documents Act (PIPEDA)."}
        </motion.p>

        {SECTIONS.map((section, i) => (
          <motion.div
            key={section.num}
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.4, delay: i * 0.04 }}
            className="border-t border-white/5 pt-8"
          >
            <div className="flex items-start gap-4">
              <span className="text-blue-400 font-black text-lg w-7 shrink-0">{section.num}.</span>
              <div className="flex-1">
                <h2 className="font-bold text-white text-base mb-3">{section.title}</h2>
                {section.body}
              </div>
            </div>
          </motion.div>
        ))}

        <div className="bg-slate-800/40 border border-slate-700/40 rounded-2xl p-6 mt-10">
          <p className="font-semibold text-white mb-3 text-sm">
            {fr ? "Pour toute question relative à cette politique ou pour exercer vos droits :" : "For any question about this policy or to exercise your rights:"}
          </p>
          <div className="space-y-2 text-sm text-slate-300">
            <p><strong className="text-white">CivicAI</strong> · Ayaovi Edem Gnagblodjro, {fr ? "Responsable de la protection des renseignements personnels" : "Privacy Officer"}</p>
            <p className="flex items-center gap-2"><Mail className="w-4 h-4 text-blue-400" /> <a href="mailto:civicai@attentezero.ca" className="hover:text-white transition-colors">civicai@attentezero.ca</a></p>
            <p className="flex items-center gap-2"><Phone className="w-4 h-4 text-blue-400" /> 905 809-7798</p>
            <p className="text-slate-500 text-xs mt-2">NEQ : 2280791601 · {fr ? "Basé au Canada" : "Based in Canada"} · {fr ? "Politique en vigueur depuis le 1ᵉʳ mai 2025 · Version 1.0" : "Policy in effect since May 1, 2025 · Version 1.0"}</p>
          </div>
        </div>
      </div>

      <Footer />
    </div>
  );
}
