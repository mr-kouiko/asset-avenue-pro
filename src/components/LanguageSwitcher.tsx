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

const FlagIcon = ({ language }: { language: Language }) => {
  const commonProps = {
    viewBox: "0 0 24 16",
    className: "h-4 w-6 shrink-0 rounded-[2px] shadow-sm ring-1 ring-border/40",
    role: "img",
    "aria-label": LANGUAGE_LABELS[language].name,
  } as const;

  switch (language) {
    case "fr":
      return (
        <svg {...commonProps}>
          <rect width="8" height="16" fill="#0055A4" />
          <rect x="8" width="8" height="16" fill="#FFFFFF" />
          <rect x="16" width="8" height="16" fill="#EF4135" />
        </svg>
      );
    case "es":
      return (
        <svg {...commonProps}>
          <rect width="24" height="16" fill="#AA151B" />
          <rect y="4" width="24" height="8" fill="#F1BF00" />
        </svg>
      );
    case "de":
      return (
        <svg {...commonProps}>
          <rect width="24" height="5.33" fill="#000000" />
          <rect y="5.33" width="24" height="5.34" fill="#DD0000" />
          <rect y="10.67" width="24" height="5.33" fill="#FFCE00" />
        </svg>
      );
    case "pt":
      return (
        <svg {...commonProps}>
          <rect width="10" height="16" fill="#006600" />
          <rect x="10" width="14" height="16" fill="#FF0000" />
          <circle cx="10" cy="8" r="2.2" fill="#FFCC00" />
        </svg>
      );
    case "en":
    default:
      return (
        <svg {...commonProps}>
          <rect width="24" height="16" fill="#012169" />
          <path d="M0 0L24 16M24 0L0 16" stroke="#FFFFFF" strokeWidth="3.2" />
          <path d="M0 0L24 16M24 0L0 16" stroke="#C8102E" strokeWidth="1.8" />
          <path d="M12 0V16M0 8H24" stroke="#FFFFFF" strokeWidth="5" />
          <path d="M12 0V16M0 8H24" stroke="#C8102E" strokeWidth="3" />
        </svg>
      );
  }
};

export const LanguageSwitcher = ({ variant = "default" }: LanguageSwitcherProps) => {
  const { language, setLanguage } = useLanguage();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm" className="gap-1.5 h-9 px-2" aria-label={LANGUAGE_LABELS[language].name}>
          <Globe className="h-4 w-4" />
          {variant === "default" && (
            <FlagIcon language={language} />
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
              <span className="mr-2">
                <FlagIcon language={lang} />
              </span>
              {label.name}
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
