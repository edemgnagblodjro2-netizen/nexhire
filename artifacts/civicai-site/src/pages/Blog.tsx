import { Link } from "wouter";
import { motion, type Variants } from "framer-motion";
import { ArrowRight, Clock, Calendar, Tag } from "lucide-react";
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

const CATEGORY_COLORS: Record<string, string> = {
  "IA & Public": "bg-blue-100 text-blue-700 border-blue-200",
  "AI & Public": "bg-blue-100 text-blue-700 border-blue-200",
  "Développement web": "bg-cyan-100 text-cyan-700 border-cyan-200",
  "Web Development": "bg-cyan-100 text-cyan-700 border-cyan-200",
  "B2G": "bg-indigo-100 text-indigo-700 border-indigo-200",
};

export default function Blog() {
  const { lang } = useLang();
  const t = T[lang];

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 overflow-x-hidden">
      <PageMeta
        title={lang === "fr" ? "Blog & Ressources — CivicAI" : "Blog & Resources — CivicAI"}
        description={t.blog_sub}
        ogTitle={lang === "fr" ? "Blog CivicAI — Insights IA & numérique public" : "CivicAI Blog — AI & Public Digital Insights"}
        ogUrl="https://www.civicai.ca/blog"
      />
      <Navbar />

      <div className="pt-16">
        {/* HERO */}
        <section className="py-20 px-6 bg-gradient-to-b from-white to-slate-50 border-b border-slate-100">
          <motion.div
            initial="hidden"
            animate="visible"
            variants={stagger}
            className="max-w-4xl mx-auto text-center"
          >
            <motion.div variants={fadeUp} className="inline-flex items-center gap-2 bg-blue-50 border border-blue-200 text-blue-700 text-xs font-bold tracking-wide px-4 py-2 rounded-full mb-6">
              <span className="w-2 h-2 rounded-full bg-blue-600 animate-pulse" />
              {t.blog_tag}
            </motion.div>
            <motion.h1 variants={fadeUp} className="text-4xl md:text-5xl font-black text-slate-900 mb-4 tracking-tight">
              {t.blog_title}
            </motion.h1>
            <motion.p variants={fadeUp} className="text-lg text-slate-600 max-w-2xl mx-auto">
              {t.blog_sub}
            </motion.p>
          </motion.div>
        </section>

        {/* ARTICLES GRID */}
        <section className="py-20 px-6">
          <div className="max-w-6xl mx-auto">
            <motion.div
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, margin: "-60px" }}
              variants={stagger}
              className="grid md:grid-cols-3 gap-8"
            >
              {t.blog_articles.map((article, i) => (
                <motion.article
                  key={article.slug}
                  variants={fadeUp}
                  custom={i}
                  className="group bg-white rounded-2xl border border-slate-200 hover:border-blue-300 hover:shadow-xl transition-all duration-300 flex flex-col overflow-hidden"
                >
                  <div className="p-7 flex flex-col flex-1">
                    <div className="flex items-center gap-2 mb-4 flex-wrap">
                      <span className={`inline-flex items-center gap-1.5 text-xs font-bold px-2.5 py-1 rounded-full border ${CATEGORY_COLORS[article.category] ?? "bg-slate-100 text-slate-600 border-slate-200"}`}>
                        <Tag className="w-3 h-3" />
                        {article.category}
                      </span>
                      <span className="flex items-center gap-1 text-xs text-slate-400">
                        <Clock className="w-3 h-3" />
                        {article.readTime}
                      </span>
                    </div>

                    <h2 className="text-xl font-black text-slate-900 leading-tight mb-3 group-hover:text-blue-700 transition-colors">
                      {article.title}
                    </h2>
                    <p className="text-sm text-slate-500 leading-relaxed flex-1 mb-5">
                      {article.excerpt}
                    </p>

                    <div className="flex items-center justify-between pt-4 border-t border-slate-100">
                      <span className="flex items-center gap-1.5 text-xs text-slate-400">
                        <Calendar className="w-3 h-3" />
                        {article.date}
                      </span>
                      <Link
                        href={`/blog/${article.slug}`}
                        className="inline-flex items-center gap-1.5 text-sm font-bold text-blue-700 hover:text-blue-800 transition-colors"
                        data-testid={`link-blog-${article.slug}`}
                      >
                        {t.blog_read_more} <ArrowRight className="w-4 h-4" />
                      </Link>
                    </div>
                  </div>
                </motion.article>
              ))}
            </motion.div>
          </div>
        </section>

        {/* CTA */}
        <section className="py-16 px-6 bg-gradient-to-br from-blue-700 via-blue-800 to-blue-900 relative overflow-hidden">
          <div className="absolute inset-0 opacity-10" style={{ backgroundImage: "radial-gradient(circle, #ffffff 1px, transparent 1px)", backgroundSize: "28px 28px" }} />
          <div className="max-w-3xl mx-auto text-center relative z-10">
            <h2 className="text-3xl font-black text-white mb-4">
              {t.cta_banner_title}
            </h2>
            <p className="text-blue-200 text-lg mb-8">{t.cta_banner_sub}</p>
            <Link
              href="/contact"
              className="inline-flex items-center gap-2 bg-white text-blue-900 font-bold px-10 py-4 rounded-xl hover:bg-blue-50 transition-all shadow-xl text-base hover:-translate-y-0.5"
            >
              {t.cta_banner_btn} <ArrowRight className="w-5 h-5" />
            </Link>
          </div>
        </section>
      </div>

      <Footer />
    </div>
  );
}
