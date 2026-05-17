import { Link } from "wouter";
import { motion, type Variants } from "framer-motion";
import { ArrowRight, CheckCircle2 } from "lucide-react";
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

export default function Services() {
  const { lang } = useLang();
  const t = T[lang];
  const slides = t.slides;

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
              {t.services_tag}
            </motion.div>
            <motion.h1 variants={fadeUp} className="text-4xl md:text-6xl font-black text-white tracking-tight mb-5">
              {t.services_title}
            </motion.h1>
            <motion.p variants={fadeUp} className="text-xl text-blue-200/80 max-w-2xl mb-8">
              {t.services_sub}
            </motion.p>
            <motion.div variants={fadeUp}>
              <Link href="/contact" className="inline-flex items-center gap-2 bg-blue-600 text-white font-bold px-7 py-3.5 rounded-xl hover:bg-blue-500 transition-all shadow-lg text-base">
                {t.hero_cta} <ArrowRight className="w-4 h-4" />
              </Link>
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* ALL SERVICE CARDS WITH IMAGES */}
      <section className="py-20 px-6 bg-slate-50">
        <div className="max-w-6xl mx-auto flex flex-col gap-16">
          {slides.map((svc, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 32 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-80px" }}
              transition={{ duration: 0.6 }}
              className={`flex flex-col ${i % 2 === 0 ? "lg:flex-row" : "lg:flex-row-reverse"} gap-0 rounded-3xl overflow-hidden border border-slate-200 shadow-md hover:shadow-xl transition-shadow bg-white`}
            >
              {/* Image */}
              <div className="relative lg:w-2/5 min-h-64 lg:min-h-0 flex-shrink-0">
                <div
                  className="absolute inset-0"
                  style={{
                    backgroundImage: `url(${svc.image})`,
                    backgroundSize: "cover",
                    backgroundPosition: "center",
                  }}
                />
                <div className={`absolute inset-0 bg-gradient-to-br ${svc.gradient} opacity-80`} />
                <div className="relative h-full min-h-64 flex flex-col justify-end p-8">
                  <div className="w-14 h-14 rounded-2xl bg-white/15 backdrop-blur-sm border border-white/20 flex items-center justify-center text-white mb-4">
                    {svc.icon}
                  </div>
                  <span className="text-xs font-bold tracking-widest uppercase text-blue-200 block">{svc.badge}</span>
                </div>
              </div>

              {/* Content */}
              <div className="flex-1 p-8 md:p-10 flex flex-col justify-center">
                <h2 className="text-2xl md:text-3xl font-black text-slate-900 leading-tight mb-4">{svc.title}</h2>
                <p className="text-slate-600 leading-relaxed mb-6 text-base">{svc.desc}</p>
                <ul className="flex flex-col gap-3 mb-8">
                  {svc.features.map((f, fi) => (
                    <li key={fi} className="flex items-center gap-3 text-slate-700 font-medium">
                      <CheckCircle2 className="w-5 h-5 text-blue-600 flex-shrink-0" />
                      {f}
                    </li>
                  ))}
                </ul>
                <Link href="/contact" className="self-start inline-flex items-center gap-2 bg-blue-700 text-white font-bold px-6 py-3 rounded-xl hover:bg-blue-800 transition-all shadow-sm hover:-translate-y-0.5 text-sm">
                  {t.hero_cta} <ArrowRight className="w-4 h-4" />
                </Link>
              </div>
            </motion.div>
          ))}
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section className="py-24 px-6 bg-[#070d24] relative overflow-hidden">
        <div className="absolute inset-0 opacity-[0.03]" style={{ backgroundImage: "radial-gradient(circle, #ffffff 1px, transparent 1px)", backgroundSize: "32px 32px" }} />
        <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-blue-500/40 to-transparent" />
        <div className="max-w-6xl mx-auto relative z-10">
          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true, margin: "-80px" }} variants={stagger} className="text-center mb-16">
            <motion.div variants={fadeUp} className="inline-flex items-center gap-2 bg-blue-900/40 border border-blue-700/50 text-blue-300 text-sm font-bold px-4 py-2 rounded-full mb-6">
              {t.how_tag}
            </motion.div>
            <motion.h2 variants={fadeUp} className="text-4xl md:text-5xl font-black text-white mb-4 tracking-tight">{t.how_title}</motion.h2>
            <motion.p variants={fadeUp} className="text-xl text-blue-200/80 max-w-2xl mx-auto">{t.how_sub}</motion.p>
          </motion.div>

          <div className="grid md:grid-cols-3 gap-8">
            {t.steps.map((step, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 24 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.15, duration: 0.5 }}
                className="bg-white/5 backdrop-blur-sm border border-white/10 p-8 rounded-3xl hover:bg-white/8 transition-all"
              >
                <div className="flex items-center gap-4 mb-6">
                  <div className="w-14 h-14 rounded-2xl bg-blue-600 border border-blue-500 flex items-center justify-center text-white shadow-[0_0_20px_rgba(37,99,235,0.4)]">
                    {step.icon}
                  </div>
                  <span className="text-5xl font-black text-white/10">{step.n}</span>
                </div>
                <h3 className="font-bold text-white text-xl mb-3">{step.title}</h3>
                <p className="text-blue-100/70 leading-relaxed text-sm">{step.desc}</p>
              </motion.div>
            ))}
          </div>

          <div className="mt-14 text-center">
            <Link href="/contact" className="inline-flex items-center gap-2 bg-blue-600 text-white font-bold px-8 py-4 rounded-xl hover:bg-blue-500 transition-all shadow-[0_0_24px_rgba(37,99,235,0.35)] text-base">
              {t.hero_cta} <ArrowRight className="w-5 h-5" />
            </Link>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 px-6 bg-gradient-to-br from-blue-700 via-blue-800 to-blue-900 relative overflow-hidden">
        <div className="absolute inset-0 opacity-10" style={{ backgroundImage: "radial-gradient(circle, #ffffff 1px, transparent 1px)", backgroundSize: "28px 28px" }} />
        <motion.div
          initial="hidden" whileInView="visible" viewport={{ once: true }} variants={stagger}
          className="max-w-3xl mx-auto text-center relative z-10"
        >
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
