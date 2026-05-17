import { Link, useParams } from "wouter";
import { motion } from "framer-motion";
import { ArrowLeft, Clock, Calendar, Tag, ArrowRight } from "lucide-react";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { useLang, T } from "@/lib/lang";
import { PageMeta } from "@/components/PageMeta";
import NotFound from "@/pages/not-found";

const CATEGORY_COLORS: Record<string, string> = {
  "IA & Public": "bg-blue-100 text-blue-700 border-blue-200",
  "AI & Public": "bg-blue-100 text-blue-700 border-blue-200",
  "Développement web": "bg-cyan-100 text-cyan-700 border-cyan-200",
  "Web Development": "bg-cyan-100 text-cyan-700 border-cyan-200",
  "B2G": "bg-indigo-100 text-indigo-700 border-indigo-200",
};

export default function BlogPost() {
  const { lang } = useLang();
  const t = T[lang];
  const params = useParams<{ slug: string }>();
  const slug = params.slug;

  const article = t.blog_articles.find((a) => a.slug === slug);

  if (!article) {
    return <NotFound />;
  }

  const otherArticles = t.blog_articles.filter((a) => a.slug !== slug).slice(0, 2);

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 overflow-x-hidden">
      <PageMeta
        title={`${article.title} — CivicAI Blog`}
        description={article.excerpt}
        ogTitle={article.title}
        ogUrl={`https://civicai.attentezero.ca/blog/${slug}`}
        jsonLd={{
          "@context": "https://schema.org",
          "@type": "Article",
          "headline": article.title,
          "description": article.excerpt,
          "url": `https://civicai.attentezero.ca/blog/${slug}`,
          "datePublished": ({ "ia-secteur-public": "2026-05-12", "developpement-web-2026": "2026-04-28", "modele-b2g": "2026-04-10" } as Record<string, string>)[slug] ?? "2026-01-01",
          "author": {
            "@type": "Organization",
            "name": "CivicAI",
            "url": "https://civicai.attentezero.ca",
          },
          "publisher": {
            "@type": "Organization",
            "name": "CivicAI",
            "url": "https://civicai.attentezero.ca",
            "logo": {
              "@type": "ImageObject",
              "url": "https://civicai.attentezero.ca/civicai-banner.png",
            },
          },
          "inLanguage": lang === "fr" ? "fr-CA" : "en-CA",
          "keywords": article.category,
          "mainEntityOfPage": {
            "@type": "WebPage",
            "@id": `https://civicai.attentezero.ca/blog/${slug}`,
          },
        }}
      />
      <Navbar />

      <div className="pt-16">
        {/* BACK + HEADER */}
        <section className="py-16 px-6 bg-gradient-to-b from-white to-slate-50 border-b border-slate-100">
          <div className="max-w-3xl mx-auto">
            <motion.div
              initial={{ opacity: 0, x: -12 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.4 }}
            >
              <Link
                href="/blog"
                className="inline-flex items-center gap-2 text-sm font-medium text-slate-500 hover:text-blue-700 transition-colors mb-8"
                data-testid="link-blog-back"
              >
                <ArrowLeft className="w-4 h-4" />
                {t.blog_back}
              </Link>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.55, ease: "easeOut", delay: 0.05 }}
            >
              <div className="flex items-center gap-3 mb-6 flex-wrap">
                <span className={`inline-flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-full border ${CATEGORY_COLORS[article.category] ?? "bg-slate-100 text-slate-600 border-slate-200"}`}>
                  <Tag className="w-3 h-3" />
                  {article.category}
                </span>
                <span className="flex items-center gap-1.5 text-sm text-slate-400">
                  <Calendar className="w-4 h-4" />
                  {article.date}
                </span>
                <span className="flex items-center gap-1.5 text-sm text-slate-400">
                  <Clock className="w-4 h-4" />
                  {article.readTime.replace(" min", "")} {t.blog_min_read}
                </span>
              </div>

              <h1 className="text-3xl md:text-4xl font-black text-slate-900 leading-tight mb-6">
                {article.title}
              </h1>
              <p className="text-lg text-slate-600 leading-relaxed border-l-4 border-blue-500 pl-5">
                {article.excerpt}
              </p>
            </motion.div>
          </div>
        </section>

        {/* ARTICLE BODY */}
        <section className="py-14 px-6">
          <div className="max-w-3xl mx-auto">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.15 }}
              className="prose prose-slate max-w-none"
            >
              {article.sections.map((section, i) => (
                <div key={i} className="mb-8">
                  {"h" in section && section.h && (
                    <h2 className="text-xl md:text-2xl font-black text-slate-900 mb-3 mt-10 first:mt-0">
                      {section.h}
                    </h2>
                  )}
                  <p className="text-base md:text-lg text-slate-700 leading-relaxed">
                    {section.p}
                  </p>
                </div>
              ))}
            </motion.div>

            {/* CTA inline */}
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5 }}
              className="mt-14 bg-gradient-to-br from-blue-700 to-blue-900 rounded-2xl p-8 text-center relative overflow-hidden"
            >
              <div className="absolute inset-0 opacity-10" style={{ backgroundImage: "radial-gradient(circle, #ffffff 1px, transparent 1px)", backgroundSize: "24px 24px" }} />
              <div className="relative z-10">
                <h3 className="text-2xl font-black text-white mb-2">{t.cta_banner_title}</h3>
                <p className="text-blue-200 mb-6 text-sm">{t.cta_banner_sub}</p>
                <Link
                  href="/contact"
                  className="inline-flex items-center gap-2 bg-white text-blue-900 font-bold px-8 py-3 rounded-xl hover:bg-blue-50 transition-all shadow-lg text-sm hover:-translate-y-0.5"
                >
                  {t.cta_banner_btn} <ArrowRight className="w-4 h-4" />
                </Link>
              </div>
            </motion.div>
          </div>
        </section>

        {/* OTHER ARTICLES */}
        {otherArticles.length > 0 && (
          <section className="py-16 px-6 border-t border-slate-200 bg-white">
            <div className="max-w-3xl mx-auto">
              <h3 className="text-xl font-black text-slate-900 mb-8">
                {lang === "fr" ? "Autres articles" : "More articles"}
              </h3>
              <div className="grid sm:grid-cols-2 gap-6">
                {otherArticles.map((other) => (
                  <Link
                    key={other.slug}
                    href={`/blog/${other.slug}`}
                    className="group block bg-slate-50 rounded-xl p-5 border border-slate-200 hover:border-blue-300 hover:bg-blue-50/30 transition-all"
                  >
                    <span className={`inline-flex items-center gap-1 text-xs font-bold px-2 py-0.5 rounded-full border mb-3 ${CATEGORY_COLORS[other.category] ?? "bg-slate-100 text-slate-600 border-slate-200"}`}>
                      {other.category}
                    </span>
                    <h4 className="font-bold text-slate-900 text-sm leading-snug group-hover:text-blue-700 transition-colors mb-2">
                      {other.title}
                    </h4>
                    <span className="text-xs text-blue-600 font-medium flex items-center gap-1">
                      {t.blog_read_more} <ArrowRight className="w-3 h-3" />
                    </span>
                  </Link>
                ))}
              </div>
            </div>
          </section>
        )}
      </div>

      <Footer />
    </div>
  );
}
