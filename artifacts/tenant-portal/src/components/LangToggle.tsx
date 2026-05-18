import { useLang } from "@/lib/i18n";
import { Button } from "@/components/ui/button";

export function LangToggle() {
  const { lang, setLang } = useLang();
  return (
    <Button
      variant="ghost"
      size="sm"
      className="text-xs font-semibold px-2 py-1 h-7 text-gray-500 hover:text-gray-900"
      onClick={() => setLang(lang === "fr" ? "en" : "fr")}
    >
      {lang === "fr" ? "EN" : "FR"}
    </Button>
  );
}
