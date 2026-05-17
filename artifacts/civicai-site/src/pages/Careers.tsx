import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ChevronDown,
  MapPin,
  Clock,
  CheckCircle2,
  Globe,
  Zap,
  Users,
  Sparkles,
  ArrowRight,
} from "lucide-react";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { useLang, T } from "@/lib/lang";
import { PageMeta } from "@/components/PageMeta";

const fadeUp = {
  hidden: { opacity: 0, y: 28 },
  show: { opacity: 1, y: 0, transition: { duration: 0.55, ease: [0.22, 1, 0.36, 1] as const } },
};
const stagger = { hidden: {}, show: { transition: { staggerChildren: 0.1 } } };

const WHY_ICONS = [Globe, Zap, Users, Sparkles];

const TAG_COLORS: Record<string, string> = {
  React: "bg-cyan-50 text-cyan-700 border-cyan-100",
  TypeScript: "bg-blue-50 text-blue-700 border-blue-100",
  "Node.js": "bg-green-50 text-green-700 border-green-100",
  PostgreSQL: "bg-indigo-50 text-indigo-700 border-indigo-100",
  "React Native": "bg-purple-50 text-purple-700 border-purple-100",
  Expo: "bg-slate-50 text-slate-700 border-slate-200",
  iOS: "bg-sky-50 text-sky-700 border-sky-100",
  Android: "bg-emerald-50 text-emerald-700 border-emerald-100",
  "OpenAI API": "bg-amber-50 text-amber-700 border-amber-100",
  Python: "bg-yellow-50 text-yellow-700 border-yellow-100",
  Automatisation: "bg-orange-50 text-orange-700 border-orange-100",
  Automation: "bg-orange-50 text-orange-700 border-orange-100",
  B2G: "bg-red-50 text-red-700 border-red-100",
};

function getTagColor(tag: string): string {
  return TAG_COLORS[tag] ?? "bg-slate-50 text-slate-600 border-slate-200";
}

export default function Careers() {
  const { lang } = useLang();
  const t = T[lang];
  const [openJob, setOpenJob] = useState<string | null>(null);

  const jobs = t.careers_jobs;

  return (
    <div className="min-h-screen bg-white text-slate-900 overflow-x-hidden">
      <PageMeta
        title={lang === "fr" ? "Carrières — CivicAI" : "Careers — CivicAI"}
        description={
          lang === "fr"
            ? "Rejoignez l'équipe CivicAI. Nous recrutons des développeurs, spécialistes IA et chefs de projet passionnés par la technologie à impact."
            : "Join the CivicAI team. We're hiring developers, AI specialists, and project managers passionate about impactful technology."
        }
        ogUrl="https://www.civicai.ca/careers"
        jsonLd={{
          "@context": "https://schema.org",
          "@type": "CollectionPage",
          "name": lang === "fr" ? "Carrières — CivicAI" : "Careers — CivicAI",
          "url": "https://www.civicai.ca/careers",
          "description":
            lang === "fr" ? "Postes ouverts chez CivicAI" : "Open positions at CivicAI",
          "mainEntity": jobs.map((job) => ({
            "@type": "JobPosting",
            "title": job.title,
            "employmentType": "FULL_TIME",
            "jobLocationType": job.location.toLowerCase().includes("remote")
              ? "TELECOMMUTE"
              : "ONSITE",
            "hiringOrganization": {
              "@type": "Organization",
              "name": "CivicAI",
              "url": "https://www.civicai.ca",
            },
            "jobLocation": {
              "@type": "Place",
              "address": {
                "@type": "PostalAddress",
                "addressLocality": "Québec",
                "addressRegion": "QC",
                "addressCountry": "CA",
              },
            },
            "description": job.summary,
          })),
        }}
      />
      <Navbar />

      <div className="pt-16">
        {/* ── HERO ── */}
        <section className="relative bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900 text-white overflow-hidden">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_60%_0%,rgba(59,130,246,0.18),transparent_70%)] pointer-events-none" />
          <div className="absolute -top-32 -right-32 w-96 h-96 rounded-full bg-blue-600/10 blur-3xl pointer-events-none" />
          <div className="max-w-4xl mx-auto px-6 py-28 text-center relative z-10">
            <motion.div initial="hidden" animate="show" variants={stagger}>
              <motion.span
                variants={fadeUp}
                className="inline-flex items-center gap-2 bg-blue-500/20 border border-blue-400/30 text-blue-300 text-sm font-semibold px-4 py-1.5 rounded-full mb-6"
              >
                {t.careers_hero_tag}
              </motion.span>
              <motion.h1
                variants={fadeUp}
                className="text-4xl md:text-5xl font-black tracking-tight mb-5 leading-tight"
              >
                {t.careers_hero_title}
              </motion.h1>
              <motion.p
                variants={fadeUp}
                className="text-lg text-slate-300 max-w-2xl mx-auto mb-10 leading-relaxed"
              >
                {t.careers_hero_sub}
              </motion.p>
              <motion.a
                variants={fadeUp}
                href="#postes"
                className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white font-semibold px-7 py-3.5 rounded-xl transition-all hover:shadow-lg hover:-translate-y-0.5"
              >
                {t.careers_hero_cta}
                <ArrowRight className="w-4 h-4" />
              </motion.a>
            </motion.div>
          </div>
        </section>

        {/* ── POURQUOI CIVICAI ── */}
        <section className="py-20 px-6 bg-slate-50">
          <div className="max-w-5xl mx-auto">
            <motion.div
              initial="hidden"
              whileInView="show"
              viewport={{ once: true, amount: 0.2 }}
              variants={stagger}
              className="text-center mb-12"
            >
              <motion.span
                variants={fadeUp}
                className="text-blue-600 font-semibold text-sm uppercase tracking-widest"
              >
                {t.careers_why_tag}
              </motion.span>
              <motion.h2
                variants={fadeUp}
                className="text-3xl md:text-4xl font-black text-slate-900 mt-2"
              >
                {t.careers_why_title}
              </motion.h2>
            </motion.div>
            <motion.div
              initial="hidden"
              whileInView="show"
              viewport={{ once: true, amount: 0.15 }}
              variants={stagger}
              className="grid md:grid-cols-2 lg:grid-cols-4 gap-5"
            >
              {t.careers_why_items.map((item, i) => {
                const Icon = WHY_ICONS[i % WHY_ICONS.length];
                return (
                  <motion.div
                    key={i}
                    variants={fadeUp}
                    className="bg-white border border-slate-100 rounded-2xl p-6 shadow-sm hover:shadow-md transition-shadow"
                  >
                    <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center mb-4">
                      <Icon className="w-5 h-5 text-blue-600" />
                    </div>
                    <h3 className="font-bold text-slate-900 mb-2">{item.title}</h3>
                    <p className="text-sm text-slate-600 leading-relaxed">{item.desc}</p>
                  </motion.div>
                );
              })}
            </motion.div>
          </div>
        </section>

        {/* ── POSTES OUVERTS ── */}
        <section id="postes" className="py-20 px-6 bg-white scroll-mt-20">
          <div className="max-w-3xl mx-auto">
            <motion.div
              initial="hidden"
              whileInView="show"
              viewport={{ once: true, amount: 0.2 }}
              variants={stagger}
              className="text-center mb-12"
            >
              <motion.span
                variants={fadeUp}
                className="text-blue-600 font-semibold text-sm uppercase tracking-widest"
              >
                {t.careers_jobs_tag}
              </motion.span>
              <motion.h2
                variants={fadeUp}
                className="text-3xl md:text-4xl font-black text-slate-900 mt-2"
              >
                {t.careers_jobs_title}
              </motion.h2>
            </motion.div>

            <motion.div
              initial="hidden"
              whileInView="show"
              viewport={{ once: true, amount: 0.05 }}
              variants={stagger}
              className="flex flex-col gap-4"
            >
              {jobs.map((job) => {
                const isOpen = openJob === job.id;
                return (
                  <motion.div
                    key={job.id}
                    variants={fadeUp}
                    className={`border rounded-2xl overflow-hidden transition-all duration-200 ${
                      isOpen
                        ? "border-blue-200 shadow-md"
                        : "border-slate-200 hover:border-slate-300 hover:shadow-sm"
                    }`}
                  >
                    <button
                      className="w-full text-left p-6 flex items-start justify-between gap-4"
                      onClick={() => setOpenJob(isOpen ? null : job.id)}
                      aria-expanded={isOpen}
                    >
                      <div className="flex-1 min-w-0">
                        <h3 className="font-bold text-slate-900 text-lg leading-tight mb-2">
                          {job.title}
                        </h3>
                        <div className="flex flex-wrap items-center gap-2 text-sm text-slate-500 mb-3">
                          <span className="flex items-center gap-1">
                            <Clock className="w-3.5 h-3.5" />
                            {job.type}
                          </span>
                          <span className="text-slate-300">·</span>
                          <span className="flex items-center gap-1">
                            <MapPin className="w-3.5 h-3.5" />
                            {job.location}
                          </span>
                        </div>
                        <div className="flex flex-wrap gap-1.5">
                          {job.tags.map((tag) => (
                            <span
                              key={tag}
                              className={`text-xs font-medium px-2.5 py-0.5 rounded-full border ${getTagColor(tag)}`}
                            >
                              {tag}
                            </span>
                          ))}
                        </div>
                      </div>
                      <motion.div
                        animate={{ rotate: isOpen ? 180 : 0 }}
                        transition={{ duration: 0.2 }}
                        className="flex-shrink-0 mt-1"
                      >
                        <ChevronDown
                          className={`w-5 h-5 transition-colors ${isOpen ? "text-blue-600" : "text-slate-400"}`}
                        />
                      </motion.div>
                    </button>

                    <AnimatePresence initial={false}>
                      {isOpen && (
                        <motion.div
                          key="content"
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: "auto", opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
                          className="overflow-hidden"
                        >
                          <div className="px-6 pb-6 border-t border-slate-100 pt-5 space-y-5">
                            <p className="text-slate-600 leading-relaxed">{job.summary}</p>
                            <div className="grid md:grid-cols-2 gap-5">
                              <div>
                                <h4 className="font-semibold text-slate-800 text-xs mb-3 uppercase tracking-widest">
                                  {lang === "fr" ? "Responsabilités" : "Responsibilities"}
                                </h4>
                                <ul className="space-y-2">
                                  {job.responsibilities.map((r, i) => (
                                    <li
                                      key={i}
                                      className="flex items-start gap-2 text-sm text-slate-600"
                                    >
                                      <CheckCircle2 className="w-4 h-4 text-blue-500 mt-0.5 flex-shrink-0" />
                                      {r}
                                    </li>
                                  ))}
                                </ul>
                              </div>
                              <div>
                                <h4 className="font-semibold text-slate-800 text-xs mb-3 uppercase tracking-widest">
                                  {lang === "fr" ? "Profil recherché" : "Requirements"}
                                </h4>
                                <ul className="space-y-2">
                                  {job.requirements.map((r, i) => (
                                    <li
                                      key={i}
                                      className="flex items-start gap-2 text-sm text-slate-600"
                                    >
                                      <CheckCircle2 className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                                      {r}
                                    </li>
                                  ))}
                                </ul>
                              </div>
                            </div>
                            <div className="pt-1">
                              <a
                                href={`mailto:civicai@attentezero.ca?subject=${encodeURIComponent(
                                  (lang === "fr" ? "Candidature — " : "Application — ") + job.title,
                                )}`}
                                className="inline-flex items-center gap-2 bg-blue-700 hover:bg-blue-800 text-white font-semibold px-5 py-2.5 rounded-xl text-sm transition-all hover:shadow-md hover:-translate-y-0.5"
                              >
                                {t.careers_apply}
                                <ArrowRight className="w-4 h-4" />
                              </a>
                            </div>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </motion.div>
                );
              })}
            </motion.div>
          </div>
        </section>

        {/* ── CANDIDATURE SPONTANÉE ── */}
        <section className="py-20 px-6 bg-gradient-to-br from-blue-700 to-blue-900 text-white">
          <div className="max-w-2xl mx-auto text-center">
            <motion.div
              initial="hidden"
              whileInView="show"
              viewport={{ once: true }}
              variants={stagger}
            >
              <motion.h2 variants={fadeUp} className="text-3xl font-black mb-4">
                {t.careers_spontaneous_title}
              </motion.h2>
              <motion.p
                variants={fadeUp}
                className="text-blue-100 mb-8 text-lg leading-relaxed"
              >
                {t.careers_spontaneous_sub}
              </motion.p>
              <motion.a
                variants={fadeUp}
                href={`mailto:civicai@attentezero.ca?subject=${encodeURIComponent(
                  lang === "fr" ? "Candidature spontanée" : "Spontaneous application",
                )}`}
                className="inline-flex items-center gap-2 bg-white text-blue-700 font-bold px-7 py-3.5 rounded-xl hover:bg-blue-50 transition-all hover:shadow-lg hover:-translate-y-0.5"
              >
                {t.careers_spontaneous_cta}
                <ArrowRight className="w-4 h-4" />
              </motion.a>
            </motion.div>
          </div>
        </section>
      </div>
      <Footer />
    </div>
  );
}
