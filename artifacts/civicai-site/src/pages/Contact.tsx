import { useState } from "react";
import { motion, type Variants } from "framer-motion";
import { ArrowRight, Mail, MapPin, ChevronDown, CheckCircle2 } from "lucide-react";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { useLang, T } from "@/lib/lang";

const fadeUp: Variants = {
  hidden: { opacity: 0, y: 24 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.55, ease: "easeOut" } },
};
const stagger: Variants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.1 } },
};

export default function Contact() {
  const { lang } = useLang();
  const t = T[lang];

  const [form, setForm] = useState({ name: "", org: "", email: "", phone: "", service: "", msg: "" });
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, lang }),
      });
      if (res.ok) {
        setSubmitted(true);
      } else if (res.status === 429) {
        setError(lang === "fr" ? "Trop de tentatives. Réessayez dans 5 minutes." : "Too many attempts. Please try again in 5 minutes.");
      } else {
        setError(lang === "fr" ? "Une erreur est survenue. Veuillez réessayer." : "An error occurred. Please try again.");
      }
    } catch {
      setError(lang === "fr" ? "Impossible d'envoyer le message. Vérifiez votre connexion." : "Unable to send message. Check your connection.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 overflow-x-hidden">
      <Navbar />

      {/* PAGE HEADER */}
      <section className="pt-28 pb-16 px-6 bg-gradient-to-br from-[#070d24] via-[#0d1a4a] to-[#070d24] relative overflow-hidden">
        <div className="absolute inset-0 opacity-[0.04]" style={{ backgroundImage: "radial-gradient(circle, #ffffff 1px, transparent 1px)", backgroundSize: "28px 28px" }} />
        <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-blue-500/40 to-transparent" />
        <div className="max-w-6xl mx-auto relative z-10">
          <motion.div initial="hidden" animate="visible" variants={stagger}>
            <motion.div variants={fadeUp} className="inline-flex items-center gap-2 bg-blue-900/40 border border-blue-700/50 text-blue-300 text-sm font-bold px-4 py-2 rounded-full mb-6">
              {t.contact_tag}
            </motion.div>
            <motion.h1 variants={fadeUp} className="text-4xl md:text-6xl font-black text-white tracking-tight mb-5">
              {t.contact_title}
            </motion.h1>
            <motion.p variants={fadeUp} className="text-xl text-blue-200/80 max-w-2xl">
              {t.contact_sub}
            </motion.p>
          </motion.div>
        </div>
      </section>

      {/* CONTACT FORM + INFO */}
      <section className="py-20 px-6 bg-white">
        <div className="max-w-6xl mx-auto">
          <div className="grid lg:grid-cols-5 gap-14">
            {/* Form */}
            <div className="lg:col-span-3">
              <motion.div
                initial={{ opacity: 0, y: 24 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.55 }}
              >
                {submitted ? (
                  <div className="flex flex-col items-center justify-center py-16 text-center">
                    <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mb-4">
                      <CheckCircle2 className="w-8 h-8 text-green-600" />
                    </div>
                    <h2 className="text-2xl font-black text-slate-900 mb-3">{t.form_success}</h2>
                    <p className="text-slate-600">{lang === "fr" ? "Notre équipe vous répondra sous 48 heures ouvrables." : "Our team will respond within 48 business hours."}</p>
                  </div>
                ) : (
                  <form onSubmit={handleSubmit} className="flex flex-col gap-5">
                    <div className="grid sm:grid-cols-2 gap-5">
                      <div>
                        <label className="block text-sm font-semibold text-slate-700 mb-1.5">{t.form_name} *</label>
                        <input
                          type="text"
                          required
                          value={form.name}
                          onChange={e => setForm({ ...form, name: e.target.value })}
                          className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none transition-all text-sm"
                          placeholder={lang === "fr" ? "Jean Dupont" : "John Smith"}
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-semibold text-slate-700 mb-1.5">{t.form_org}</label>
                        <input
                          type="text"
                          value={form.org}
                          onChange={e => setForm({ ...form, org: e.target.value })}
                          className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none transition-all text-sm"
                          placeholder={lang === "fr" ? "Ville de Québec" : "City of Quebec"}
                        />
                      </div>
                    </div>

                    <div className="grid sm:grid-cols-2 gap-5">
                      <div>
                        <label className="block text-sm font-semibold text-slate-700 mb-1.5">{t.form_email} *</label>
                        <input
                          type="email"
                          required
                          value={form.email}
                          onChange={e => setForm({ ...form, email: e.target.value })}
                          className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none transition-all text-sm"
                          placeholder="jean@organisation.ca"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-semibold text-slate-700 mb-1.5">{t.form_phone}</label>
                        <input
                          type="tel"
                          value={form.phone}
                          onChange={e => setForm({ ...form, phone: e.target.value })}
                          className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none transition-all text-sm"
                          placeholder="+1 418 555-0000"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-semibold text-slate-700 mb-1.5">{t.form_service}</label>
                      <select
                        value={form.service}
                        onChange={e => setForm({ ...form, service: e.target.value })}
                        className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none transition-all text-sm bg-white"
                      >
                        <option value="">{lang === "fr" ? "Choisir un service" : "Choose a service"}</option>
                        {t.form_service_options.map((opt) => (
                          <option key={opt} value={opt}>{opt}</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-semibold text-slate-700 mb-1.5">{t.form_msg} *</label>
                      <textarea
                        required
                        rows={5}
                        value={form.msg}
                        onChange={e => setForm({ ...form, msg: e.target.value })}
                        className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none transition-all text-sm resize-none"
                        placeholder={t.form_msg}
                      />
                    </div>

                    {error && (
                      <p className="text-red-600 text-sm font-medium bg-red-50 border border-red-200 rounded-xl px-4 py-3">
                        {error}
                      </p>
                    )}

                    <button
                      type="submit"
                      disabled={loading}
                      className="self-start inline-flex items-center gap-2 bg-blue-700 text-white font-bold px-8 py-4 rounded-xl hover:bg-blue-800 transition-all shadow-md hover:-translate-y-0.5 text-base disabled:opacity-60 disabled:cursor-not-allowed"
                    >
                      {loading
                        ? (lang === "fr" ? "Envoi en cours…" : "Sending…")
                        : <>{t.form_send} <ArrowRight className="w-5 h-5" /></>}
                    </button>
                  </form>
                )}
              </motion.div>
            </div>

            {/* Info sidebar */}
            <div className="lg:col-span-2">
              <motion.div
                initial={{ opacity: 0, x: 16 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.55, delay: 0.1 }}
                className="flex flex-col gap-6"
              >
                <div className="bg-slate-50 border border-slate-200 rounded-2xl p-6">
                  <h3 className="font-bold text-slate-900 text-base mb-4">
                    {lang === "fr" ? "Nous contacter directement" : "Contact us directly"}
                  </h3>
                  <div className="flex flex-col gap-4">
                    <a href="mailto:civicai@attentezero.ca" className="flex items-center gap-3 text-slate-700 hover:text-blue-700 transition-colors group">
                      <div className="w-10 h-10 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center group-hover:bg-blue-100 transition-colors flex-shrink-0">
                        <Mail className="w-5 h-5 text-blue-600" />
                      </div>
                      <div>
                        <div className="text-xs text-slate-400 font-medium mb-0.5">{lang === "fr" ? "Courriel" : "Email"}</div>
                        <div className="font-semibold text-sm">civicai@attentezero.ca</div>
                      </div>
                    </a>
                    <div className="flex items-center gap-3 text-slate-700">
                      <div className="w-10 h-10 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center flex-shrink-0">
                        <MapPin className="w-5 h-5 text-blue-600" />
                      </div>
                      <div>
                        <div className="text-xs text-slate-400 font-medium mb-0.5">{lang === "fr" ? "Siège social" : "Headquarters"}</div>
                        <div className="font-semibold text-sm">Québec, Canada</div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="bg-blue-50 border border-blue-100 rounded-2xl p-6">
                  <h3 className="font-bold text-slate-900 text-base mb-3">
                    {lang === "fr" ? "Réponse sous 48h" : "Reply within 48h"}
                  </h3>
                  <p className="text-slate-600 text-sm leading-relaxed">
                    {lang === "fr"
                      ? "Toutes les demandes reçoivent une réponse sous 48 heures ouvrables. La première rencontre est gratuite et sans engagement."
                      : "All requests receive a response within 48 business hours. The first meeting is free and no commitment required."}
                  </p>
                </div>

                {/* Map placeholder */}
                <div className="rounded-2xl overflow-hidden border border-slate-200 shadow-sm">
                  <iframe
                    title="CivicAI — Québec, Canada"
                    src="https://www.openstreetmap.org/export/embed.html?bbox=-71.3500%2C46.7800%2C-71.1500%2C46.8600&amp;layer=mapnik&amp;marker=46.8139%2C-71.2080"
                    className="w-full"
                    style={{ height: 180, border: 0 }}
                    loading="lazy"
                  />
                  <div className="bg-white px-4 py-2.5 flex items-center gap-2 border-t border-slate-100">
                    <MapPin className="w-4 h-4 text-blue-600 flex-shrink-0" />
                    <span className="text-xs text-slate-600 font-medium">Québec, Canada — NEQ 2280791601</span>
                  </div>
                </div>

                {/* Trust badges */}
                <div className="flex flex-col gap-2">
                  {t.trust_badges.map((b, i) => (
                    <div key={i} className="flex items-center gap-3 bg-white border border-slate-100 rounded-xl px-4 py-3">
                      <span className="text-lg">{b.icon}</span>
                      <div>
                        <div className="text-sm font-bold text-slate-800 leading-tight">{b.label}</div>
                        <div className="text-xs text-slate-400">{b.sub}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </motion.div>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="py-20 px-6 bg-slate-50">
        <div className="max-w-3xl mx-auto">
          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true, margin: "-80px" }} variants={stagger} className="text-center mb-12">
            <motion.div variants={fadeUp} className="inline-flex items-center gap-2 bg-blue-100/50 border border-blue-200 text-blue-800 text-sm font-bold px-4 py-2 rounded-full mb-5">
              FAQ
            </motion.div>
            <motion.h2 variants={fadeUp} className="text-3xl md:text-4xl font-black text-slate-900 tracking-tight">
              {lang === "fr" ? "Questions fréquentes" : "Frequently asked questions"}
            </motion.h2>
          </motion.div>

          <div className="flex flex-col gap-3">
            {t.faqs.map((faq, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.07 }}
                className="bg-white border border-slate-200 rounded-2xl overflow-hidden"
              >
                <button
                  onClick={() => setOpenFaq(openFaq === i ? null : i)}
                  className="w-full flex items-center justify-between px-6 py-5 text-left hover:bg-slate-50 transition-colors"
                  data-testid={`button-faq-${i}`}
                >
                  <span className="font-bold text-slate-900 text-base pr-4">{faq.q}</span>
                  <ChevronDown
                    className={`w-5 h-5 text-slate-400 flex-shrink-0 transition-transform duration-300 ${openFaq === i ? "rotate-180" : ""}`}
                  />
                </button>
                {openFaq === i && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.25 }}
                    className="px-6 pb-5 text-slate-600 leading-relaxed text-sm"
                  >
                    {faq.a}
                  </motion.div>
                )}
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
