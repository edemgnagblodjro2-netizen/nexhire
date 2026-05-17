import { Link } from "wouter";
import { Mail, MapPin, ExternalLink } from "lucide-react";
import { useLang, T } from "@/lib/lang";

const LOGO = `${import.meta.env.BASE_URL}civicai-logo.png`;

export function Footer() {
  const { lang } = useLang();
  const t = T[lang];

  return (
    <footer className="bg-[#070d24] text-white" data-testid="footer">
      <div className="max-w-6xl mx-auto px-6 pt-16 pb-8">
        <div className="grid md:grid-cols-4 gap-10 mb-12">
          <div className="md:col-span-2">
            <img src={LOGO} alt="CivicAI" className="h-9 w-auto brightness-0 invert mb-4" />
            <p className="text-slate-400 text-sm leading-relaxed max-w-xs mb-6">
              {t.hero_sub}
            </p>
            <div className="flex flex-col gap-2 text-sm text-slate-400">
              <div className="flex items-center gap-2">
                <MapPin className="w-4 h-4 text-blue-400 flex-shrink-0" />
                <span>Québec, Canada</span>
              </div>
              <div className="flex items-center gap-2">
                <Mail className="w-4 h-4 text-blue-400 flex-shrink-0" />
                <a href="mailto:civicai@attentezero.com" className="hover:text-white transition-colors">
                  civicai@attentezero.com
                </a>
              </div>
            </div>
          </div>

          <div>
            <h4 className="text-xs font-bold tracking-widest text-slate-400 uppercase mb-4">
              {t.footer_links_services}
            </h4>
            <ul className="flex flex-col gap-2 text-sm text-slate-300">
              <li><Link href="/services" className="hover:text-white transition-colors">IA & Automatisation</Link></li>
              <li><Link href="/services" className="hover:text-white transition-colors">{lang === "fr" ? "Solutions sur mesure" : "Custom solutions"}</Link></li>
              <li><Link href="/services" className="hover:text-white transition-colors">{lang === "fr" ? "Développement web" : "Web development"}</Link></li>
              <li><Link href="/services" className="hover:text-white transition-colors">{lang === "fr" ? "Marketing digital" : "Digital marketing"}</Link></li>
            </ul>
          </div>

          <div>
            <h4 className="text-xs font-bold tracking-widest text-slate-400 uppercase mb-4">
              {t.footer_links_products}
            </h4>
            <ul className="flex flex-col gap-2 text-sm text-slate-300">
              <li>
                <a
                  href="https://apps.apple.com/ca/app/attentezero/id6766750916"
                  target="_blank" rel="noreferrer"
                  className="hover:text-white transition-colors flex items-center gap-1"
                >
                  AttenteZéro <ExternalLink className="w-3 h-3 opacity-50" />
                </a>
              </li>
              <li><Link href="/products" className="hover:text-white transition-colors">ConstructPro ERP</Link></li>
              <li>
                <a
                  href="https://attentezero.ca/privacy"
                  target="_blank" rel="noreferrer"
                  className="hover:text-white transition-colors flex items-center gap-1"
                >
                  {t.footer_privacy} <ExternalLink className="w-3 h-3 opacity-50" />
                </a>
              </li>
            </ul>

            <h4 className="text-xs font-bold tracking-widest text-slate-400 uppercase mb-4 mt-6">
              {t.footer_links_legal}
            </h4>
            <ul className="flex flex-col gap-2 text-sm text-slate-300">
              <li><span className="text-slate-500">NEQ 2280791601</span></li>
              <li><Link href="/contact" className="hover:text-white transition-colors">{t.footer_about}</Link></li>
            </ul>
          </div>
        </div>

        <div className="border-t border-white/10 pt-6 flex flex-col md:flex-row items-center justify-between gap-3 text-xs text-slate-500">
          <span>{t.footer_copy}</span>
          <span className="tracking-widest font-bold text-slate-600">{t.footer_tagline}</span>
        </div>
      </div>
    </footer>
  );
}
