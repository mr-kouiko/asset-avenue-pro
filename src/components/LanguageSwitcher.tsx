import { Globe } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/contexts/LanguageContext";
import { SUPPORTED_LANGUAGES, LANGUAGE_LABELS, type Language } from "@/i18n";

interface LanguageSwitcherProps {
  variant?: "default" | "compact";
}

export const LanguageSwitcher = ({ variant = "default" }: LanguageSwitcherProps) => {
  const { language, setLanguage } = useLanguage();
  const current = LANGUAGE_LABELS[language];

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm" className="gap-1.5 h-9 px-2">
          <Globe className="h-4 w-4" />
          {variant === "default" && (
            <span className="text-sm font-medium">{current.flag} {language.toUpperCase()}</span>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-44">
        {SUPPORTED_LANGUAGES.map((lang: Language) => {
          const label = LANGUAGE_LABELS[lang];
          return (
            <DropdownMenuItem
              key={lang}
              onClick={() => setLanguage(lang)}
              className={language === lang ? "bg-accent/40 font-semibold" : ""}
            >
              <span className="mr-2">{label.flag}</span>
              {label.name}
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
