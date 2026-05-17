import { useState, useEffect } from "react";
import { Link } from "wouter";
import { motion, AnimatePresence, type Variants } from "framer-motion";
import { ArrowRight, ChevronLeft, ChevronRight, Star, Building2, MapPin } from "lucide-react";
import { FaApple, FaGooglePlay } from "react-icons/fa";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { useLang, T } from "@/lib/lang";
import { PageMeta } from "@/components/PageMeta";

const LOGO = `${import.meta.env.BASE_URL}civicai-logo.png`;

const fadeUp: Variants = {
  hidden: { opacity: 0, y: 24 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.55, ease: "easeOut" } },
};

const stagger: Variants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.1 } },
};

export default function Home() {
  const { lang } = useLang();
  const t = T[lang];
  const slides = t.slides;

  const [current, setCurrent] = useState(0);
  const [direction, setDirection] = useState(1);
  const [isAnimating, setIsAnimating] = useState(false);

  useEffect(() => {
    const timer = setInterval(() => advance(1), 5500);
    return () => clearInterval(timer);
  }, [current]);

  function advance(dir: number) {
    if (isAnimating) return;
    setIsAnimating(true);
    setDirection(dir);
    setCurrent((c) => (c + dir + slides.length) % slides.length);
    setTimeout(() => setIsAnimating(false), 500);
  }

  const slide = slides[current];

  const slideVariants: Variants = {
    enter: (d: number) => ({ x: d > 0 ? 60 : -60, opacity: 0 }),
    center: { x: 0, opacity: 1, transition: { duration: 0.5, ease: "easeOut" } },
    exit: (d: number) => ({ x: d > 0 ? -60 : 60, opacity: 0, transition: { duration: 0.3 } }),
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 overflow-x-hidden">
      <PageMeta
        title="CivicAI — Intelligence artificielle au service du bien commun"
        description="CivicAI conçoit des solutions numériques intelligentes pour les entreprises, organisations et administrations publiques — partout au Canada."
        ogTitle="CivicAI — IA au service du bien commun"
        ogUrl="https://www.civicai.ca/"
      />
      <Navbar />

      {/* HERO CAROUSEL */}
      <section className="pt-16 relative" data-testid="section-hero">
        <div
          className="relative w-full overflow-hidden"
          style={{ height: "clamp(520px, 70vh, 700px)" }}
        >
          <AnimatePresence initial={false} custom={direction} mode="sync">
            <motion.div
              key={current}
              custom={direction}
              variants={slideVariants}
              initial="enter"
              animate="center"
              exit="exit"
              className="absolute inset-0"
              style={{
                backgroundImage: `url(${slide.image})`,
                backgroundSize: "cover",
                backgroundPosition: "center",
              }}
            >
              <div className={`absolute inset-0 bg-gradient-to-r ${slide.gradient}`} />
              <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent" />

              <div className="relative h-full max-w-6xl mx-auto px-6 md:px-10 flex items-center">
                <div className="max-w-xl">
                  <motion.div
                    initial={{ opacity: 0, y: 16 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1, duration: 0.5 }}
                    className="flex items-center gap-3 mb-6"
                  >
                    <img src={LOGO} alt="CivicAI" className="h-7 brightness-0 invert opacity-90" />
                    <span className="text-xs font-bold tracking-widest uppercase text-blue-200 border border-white/20 rounded-full px-3 py-1 bg-white/5 backdrop-blur-sm">
                      {slide.badge}
                    </span>
                  </motion.div>

                  <motion.h2
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.15, duration: 0.55 }}
                    className="text-3xl md:text-5xl font-black text-white leading-tight mb-4"
                  >
                    {slide.title}
                  </motion.h2>

                  <motion.p
                    initial={{ opacity: 0, y: 16 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2, duration: 0.5 }}
                    className="text-blue-100/90 text-base md:text-lg leading-relaxed mb-6 max-w-md"
                  >
                    {slide.desc}
                  </motion.p>

                  <motion.ul
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.25, duration: 0.5 }}
                    className="flex flex-col gap-2 mb-8"
                  >
                    {slide.features.map((f, i) => (
                      <li key={i} className="flex items-center gap-2.5 text-slate-200 text-sm font-medium">
                        <span className="w-1.5 h-1.5 rounded-full bg-blue-400 flex-shrink-0 shadow-[0_0_6px_rgba(96,165,250,0.8)]" />
                        {f}
                      </li>
                    ))}
                  </motion.ul>

                  <motion.div
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3, duration: 0.45 }}
                  >
                    <Link
                      href="/contact"
                      className="inline-flex items-center gap-2 bg-white text-slate-900 font-bold px-6 py-3 rounded-xl hover:bg-blue-50 transition-all shadow-lg hover:-translate-y-0.5 text-sm"
                    >
                      {t.hero_cta} <ArrowRight className="w-4 h-4" />
                    </Link>
                  </motion.div>
                </div>
              </div>
            </motion.div>
          </AnimatePresence>

          <button
            onClick={() => advance(-1)}
            className="absolute left-4 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-white/10 border border-white/20 hover:bg-white/20 text-white flex items-center justify-center transition-all backdrop-blur-sm z-10"
            data-testid="button-slide-prev"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <button
            onClick={() => advance(1)}
            className="absolute right-4 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-white/10 border border-white/20 hover:bg-white/20 text-white flex items-center justify-center transition-all backdrop-blur-sm z-10"
            data-testid="button-slide-next"
          >
            <ChevronRight className="w-5 h-5" />
          </button>

          <div className="absolute bottom-5 left-0 right-0 flex items-center justify-center gap-2 z-10">
            {slides.map((_, i) => (
              <button
                key={i}
                onClick={() => { setDirection(i > current ? 1 : -1); setCurrent(i); }}
                className={`transition-all duration-300 rounded-full ${i === current ? "w-8 h-2 bg-white" : "w-2 h-2 bg-white/40 hover:bg-white/60"}`}
                data-testid={`button-slide-${i}`}
              />
            ))}
          </div>
        </div>

        {/* TAGLINE */}
        <div className="py-20 px-6 bg-gradient-to-b from-white to-slate-50">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-80px" }}
            variants={stagger}
            className="max-w-4xl mx-auto text-center"
          >
            <motion.div variants={fadeUp} className="inline-flex items-center gap-2 bg-blue-50 border border-blue-200/60 text-blue-700 text-xs font-bold tracking-wide px-4 py-2 rounded-full mb-8 shadow-sm">
              <span className="w-2 h-2 rounded-full bg-blue-600 animate-pulse" />
              {t.hero_tag}
            </motion.div>
            <motion.h1 variants={fadeUp} className="text-4xl md:text-6xl font-black tracking-tight leading-[1.1] mb-6 text-slate-900">
              <span className="block">{t.hero_title_1}</span>
              <span className="text-blue-700 block">{t.hero_title_2}</span>
            </motion.h1>
            <motion.p variants={fadeUp} className="text-lg md:text-xl text-slate-600 leading-relaxed max-w-2xl mx-auto mb-10 font-medium">
              {t.hero_sub}
            </motion.p>
            <motion.div variants={fadeUp} className="flex flex-wrap items-center justify-center gap-4">
              <Link href="/contact" className="bg-blue-700 text-white font-bold px-8 py-4 rounded-xl hover:bg-blue-800 transition-all shadow-[0_4px_14px_rgba(29,78,216,0.3)] hover:-translate-y-0.5 flex items-center gap-2 text-base">
                {t.hero_cta} <ArrowRight className="w-5 h-5" />
              </Link>
              <Link href="/services" className="bg-white text-slate-700 font-bold px-8 py-4 rounded-xl border-2 border-slate-200 hover:border-blue-300 hover:bg-blue-50 transition-all flex items-center gap-2 text-base">
                {t.hero_cta2}
              </Link>
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* TRUST STATS */}
      <section className="py-14 px-6 bg-white border-y border-slate-100" data-testid="section-trust">
        <div className="max-w-6xl mx-auto">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-10">
            {t.trust_stats.map((stat, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.08 }}
                className="text-center"
              >
                <div className="text-3xl md:text-4xl font-black text-blue-700 mb-1 tracking-tight">{stat.value}</div>
                <div className="text-xs text-slate-500 leading-snug whitespace-pre-line">{stat.label}</div>
              </motion.div>
            ))}
          </div>
          <div className="border-t border-slate-100 mb-8" />
          <div className="flex flex-wrap items-center justify-center gap-3">
            {t.trust_badges.map((b, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, scale: 0.95 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.07 }}
                className="flex items-center gap-3 bg-slate-50 border border-slate-200 rounded-xl px-4 py-3"
              >
                <span className="text-xl">{b.icon}</span>
                <div>
                  <div className="text-sm font-bold text-slate-800 leading-tight">{b.label}</div>
                  <div className="text-xs text-slate-400">{b.sub}</div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* IMPACT STATS */}
      <section className="py-16 px-6 bg-[#070d24] relative overflow-hidden">
        <div className="absolute inset-0 opacity-[0.03]" style={{ backgroundImage: "radial-gradient(circle, #ffffff 1px, transparent 1px)", backgroundSize: "32px 32px" }} />
        <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-blue-500/40 to-transparent" />
        <div className="max-w-4xl mx-auto relative z-10">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 text-center">
            {t.impact_stats.map((stat, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.12, duration: 0.5 }}
                className="flex flex-col items-center"
              >
                <div className="text-5xl md:text-6xl font-black text-white mb-2 tracking-tight">{stat.value}</div>
                <div className="text-blue-200 font-semibold text-base mb-1">{stat.label}</div>
                <div className="text-blue-400/60 text-sm">{stat.sub}</div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* WHY CIVICAI */}
      <section className="py-24 px-6 bg-slate-50">
        <div className="max-w-6xl mx-auto">
          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true, margin: "-80px" }} variants={stagger} className="text-center mb-16">
            <motion.div variants={fadeUp} className="inline-flex items-center gap-2 bg-blue-100/50 border border-blue-200 text-blue-800 text-sm font-bold px-4 py-2 rounded-full mb-5">
              {t.why_tag}
            </motion.div>
            <motion.h2 variants={fadeUp} className="text-3xl md:text-5xl font-black text-slate-900 mb-4 tracking-tight">{t.why_title}</motion.h2>
            <motion.p variants={fadeUp} className="text-lg text-slate-600 max-w-2xl mx-auto">{t.why_sub}</motion.p>
          </motion.div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {t.why_items.map((item, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 28 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1, duration: 0.5 }}
                className="bg-white rounded-2xl p-7 border border-slate-200 hover:border-blue-200 hover:shadow-md transition-all"
              >
                <div className="text-3xl mb-4">{item.icon}</div>
                <h3 className="font-bold text-slate-900 text-lg mb-2">{item.title}</h3>
                <p className="text-slate-600 text-sm leading-relaxed">{item.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* SERVICES TEASER */}
      <section className="py-24 px-6 bg-white">
        <div className="max-w-6xl mx-auto">
          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true, margin: "-80px" }} variants={stagger} className="mb-14">
            <motion.div variants={fadeUp} className="inline-flex items-center gap-2 bg-blue-100/50 border border-blue-200 text-blue-800 text-sm font-bold px-4 py-2 rounded-full mb-5">
              {t.services_tag}
            </motion.div>
            <motion.h2 variants={fadeUp} className="text-3xl md:text-5xl font-black text-slate-900 mb-4 tracking-tight">{t.services_title}</motion.h2>
            <motion.p variants={fadeUp} className="text-lg text-slate-600 max-w-2xl">{t.services_sub}</motion.p>
          </motion.div>

          <div className="grid md:grid-cols-3 gap-6 mb-10">
            {slides.slice(0, 3).map((svc, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 28 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1, duration: 0.5 }}
                className="group relative rounded-2xl overflow-hidden border border-slate-200 hover:border-blue-300 hover:shadow-xl transition-all duration-300"
                style={{ minHeight: 280 }}
              >
                <div
                  className="absolute inset-0"
                  style={{
                    backgroundImage: `url(${svc.image})`,
                    backgroundSize: "cover",
                    backgroundPosition: "center",
                  }}
                />
                <div className={`absolute inset-0 bg-gradient-to-t ${svc.gradient} opacity-90 group-hover:opacity-95 transition-opacity`} />
                <div className="relative h-full p-7 flex flex-col justify-between" style={{ minHeight: 280 }}>
                  <div>
                    <span className="text-xs font-bold tracking-widest uppercase text-blue-300 block mb-3">{svc.badge}</span>
                    <h3 className="font-black text-white text-xl leading-tight mb-3">{svc.title}</h3>
                    <p className="text-blue-100/80 text-sm leading-relaxed">{svc.desc}</p>
                  </div>
                  <ul className="flex flex-col gap-1.5 mt-4">
                    {svc.features.slice(0, 3).map((f, fi) => (
                      <li key={fi} className="flex items-center gap-2 text-slate-300 text-xs font-medium">
                        <span className="w-1 h-1 rounded-full bg-blue-400 flex-shrink-0" />{f}
                      </li>
                    ))}
                  </ul>
                </div>
              </motion.div>
            ))}
          </div>

          <div className="text-center">
            <Link href="/services" className="inline-flex items-center gap-2 bg-blue-700 text-white font-bold px-8 py-4 rounded-xl hover:bg-blue-800 transition-all shadow-md hover:-translate-y-0.5 text-base">
              {t.services_cta} <ArrowRight className="w-5 h-5" />
            </Link>
          </div>
        </div>
      </section>

      {/* PRODUCTS TEASER */}
      <section className="py-24 px-6 bg-[#070d24] relative overflow-hidden" data-testid="section-products">
        <div className="absolute inset-0 opacity-[0.03]" style={{ backgroundImage: "radial-gradient(circle, #ffffff 1px, transparent 1px)", backgroundSize: "30px 30px" }} />
        <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-blue-500/40 to-transparent" />
        <div className="max-w-6xl mx-auto relative z-10">
          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true, margin: "-80px" }} variants={stagger} className="text-center mb-14">
            <motion.div variants={fadeUp} className="inline-flex items-center gap-2 bg-blue-900/40 border border-blue-700/50 text-blue-300 text-sm font-bold px-4 py-2 rounded-full mb-5">
              {t.products_tag}
            </motion.div>
            <motion.h2 variants={fadeUp} className="text-3xl md:text-5xl font-black text-white mb-4 tracking-tight">{t.products_title}</motion.h2>
            <motion.p variants={fadeUp} className="text-lg text-blue-200/70 max-w-2xl mx-auto">{t.products_sub}</motion.p>
          </motion.div>

          <div className="grid md:grid-cols-2 gap-8">
            {/* AttenteZéro */}
            <motion.div
              initial={{ opacity: 0, x: -24 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
              className="bg-gradient-to-br from-teal-900/40 to-teal-800/20 border border-teal-700/40 rounded-3xl p-8 hover:border-teal-500/50 transition-all"
            >
              <div className="flex items-center gap-3 mb-2">
                <div className="inline-flex items-center gap-2 bg-teal-900/40 border border-teal-700/50 text-teal-300 text-xs font-bold px-3 py-1 rounded-full">
                  <Star className="w-3 h-3 fill-teal-300" /> {t.flagship_tag}
                </div>
              </div>
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-teal-400 to-teal-700 flex items-center justify-center shadow-lg">
                  <MapPin className="w-6 h-6 text-white" />
                </div>
                <h3 className="text-2xl font-black text-white">{t.flagship_name}</h3>
              </div>
              <p className="text-teal-100/80 leading-relaxed mb-6 text-sm">{t.flagship_desc}</p>
              <div className="grid grid-cols-3 gap-3 mb-6">
                {[0,1,2].map(i => (
                  <div key={i} className="bg-teal-900/30 rounded-xl p-3 text-center">
                    <div className="text-xl font-black text-teal-300">{t.flagship_stats[i*2]}</div>
                    <div className="text-xs text-teal-400/80 mt-0.5">{t.flagship_stats[i*2+1]}</div>
                  </div>
                ))}
              </div>
              <div className="flex flex-wrap gap-3">
                <a href="https://apps.apple.com/ca/app/attentezero/id6766750916" target="_blank" rel="noreferrer" className="flex items-center gap-2 bg-slate-900 text-white text-sm font-bold px-5 py-2.5 rounded-xl hover:bg-slate-800 transition-colors shadow-md">
                  <FaApple className="w-5 h-5" /> {t.flagship_ios}
                </a>
                <a href="https://play.google.com/store/apps/details?id=com.attentezero.app" target="_blank" rel="noreferrer" className="flex items-center gap-2 bg-white/10 text-white text-sm font-bold px-5 py-2.5 rounded-xl hover:bg-white/15 transition-colors border border-white/10">
                  <FaGooglePlay className="w-5 h-5" /> {t.flagship_android}
                </a>
              </div>
            </motion.div>

            {/* ConstructPro ERP */}
            <motion.div
              initial={{ opacity: 0, x: 24 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
              className="bg-gradient-to-br from-orange-900/30 to-orange-800/20 border border-orange-700/40 rounded-3xl p-8 hover:border-orange-500/50 transition-all"
            >
              <div className="inline-flex items-center gap-2 bg-orange-900/40 border border-orange-700/50 text-orange-300 text-xs font-bold px-3 py-1 rounded-full mb-4">
                <Building2 className="w-3 h-3" /> {t.erp_tag}
              </div>
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-orange-400 to-orange-700 flex items-center justify-center shadow-lg">
                  <Building2 className="w-6 h-6 text-white" />
                </div>
                <h3 className="text-2xl font-black text-white">{t.erp_name}</h3>
              </div>
              <p className="text-orange-100/80 leading-relaxed mb-6 text-sm">{t.erp_desc}</p>
              <ul className="flex flex-col gap-2 mb-6">
                {t.erp_features.map((f, i) => (
                  <li key={i} className="flex items-center gap-2.5 text-orange-100/80 text-sm">
                    <span className="w-1.5 h-1.5 rounded-full bg-orange-400 flex-shrink-0" />{f}
                  </li>
                ))}
              </ul>
              <Link href="/contact" className="inline-flex items-center gap-2 bg-orange-600 text-white font-bold px-6 py-3 rounded-xl hover:bg-orange-500 transition-colors text-sm">
                {t.erp_cta} <ArrowRight className="w-4 h-4" />
              </Link>
            </motion.div>
          </div>

          <div className="mt-8 text-center">
            <Link href="/products" className="text-sm text-blue-300 hover:text-white transition-colors font-medium underline underline-offset-4">
              {lang === "fr" ? "Voir tous nos produits" : "View all products"} →
            </Link>
          </div>
        </div>
      </section>

      {/* RÉSULTATS CONCRETS */}
      <section className="py-24 px-6 bg-slate-50">
        <div className="max-w-6xl mx-auto">
          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true, margin: "-80px" }} variants={stagger} className="text-center mb-16">
            <motion.div variants={fadeUp} className="inline-flex items-center gap-2 bg-blue-100/50 border border-blue-200 text-blue-800 text-sm font-bold px-4 py-2 rounded-full mb-5">
              {t.results_tag}
            </motion.div>
            <motion.h2 variants={fadeUp} className="text-3xl md:text-5xl font-black text-slate-900 mb-4 tracking-tight">{t.results_title}</motion.h2>
            <motion.p variants={fadeUp} className="text-lg text-slate-600 max-w-2xl mx-auto">{t.results_sub}</motion.p>
          </motion.div>

          <div className="grid sm:grid-cols-2 gap-6">
            {t.results_items.map((item, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 28 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1, duration: 0.5 }}
                className="bg-white rounded-3xl border border-slate-200 hover:border-blue-200 hover:shadow-lg transition-all p-8 flex flex-col gap-5"
              >
                <div className="flex items-start gap-4">
                  <span className="text-4xl flex-shrink-0">{item.icon}</span>
                  <div>
                    <div className="font-black text-slate-900 text-lg leading-tight mb-1">{item.sector}</div>
                    <div className="inline-flex items-center gap-1.5 bg-green-50 border border-green-200 text-green-700 text-sm font-bold px-3 py-1 rounded-full">
                      <span className="w-1.5 h-1.5 rounded-full bg-green-500 flex-shrink-0" />
                      {item.metric}
                    </div>
                  </div>
                </div>
                <div className="border-t border-slate-100 pt-4 flex flex-col gap-3">
                  <div>
                    <div className="text-xs font-bold text-slate-400 uppercase tracking-wide mb-1">{lang === "fr" ? "Problème" : "Problem"}</div>
                    <p className="text-slate-600 text-sm leading-relaxed">{item.problem}</p>
                  </div>
                  <div>
                    <div className="text-xs font-bold text-blue-600 uppercase tracking-wide mb-1">{lang === "fr" ? "Solution CivicAI" : "CivicAI solution"}</div>
                    <p className="text-slate-700 text-sm font-medium leading-relaxed">{item.solution}</p>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>

          <div className="text-center mt-12">
            <Link href="/contact" className="inline-flex items-center gap-2 bg-blue-700 text-white font-bold px-8 py-4 rounded-xl hover:bg-blue-800 transition-all shadow-md hover:-translate-y-0.5 text-base">
              {t.cta_banner_btn} <ArrowRight className="w-5 h-5" />
            </Link>
          </div>
        </div>
      </section>

      {/* CTA BANNER */}
      <section className="py-20 px-6 bg-gradient-to-br from-blue-700 via-blue-800 to-blue-900 relative overflow-hidden">
        <div className="absolute inset-0 opacity-10" style={{ backgroundImage: "radial-gradient(circle, #ffffff 1px, transparent 1px)", backgroundSize: "28px 28px" }} />
        <div className="absolute top-0 right-0 w-96 h-96 rounded-full bg-blue-500/20 blur-3xl" />
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          variants={stagger}
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
