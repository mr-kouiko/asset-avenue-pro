import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { 
  ChevronDown, 
  Video, 
  Sparkles, 
  Palette, 
  Maximize2, 
  Wand2,
  RotateCcw,
  Monitor,
  Smartphone,
  Square
} from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";

export interface VideoFilters {
  useCase: string[];
  aiVideos: string[];
  style: string[];
  format: string[];
  effects: string[];
  orientation: string | null;
  resolution: string | null;
  aiGenerated: boolean | null;
  loopable: boolean | null;
  withPeople: boolean | null;
  copySpace: boolean | null;
  platform: string[];
  duration: [number, number];
}

interface VideoFiltersPanelProps {
  filters: VideoFilters;
  onFiltersChange: (filters: VideoFilters) => void;
  onReset: () => void;
}

const VideoFiltersPanel = ({ filters, onFiltersChange, onReset }: VideoFiltersPanelProps) => {
  const { t } = useLanguage();
  const [openSections, setOpenSections] = useState<string[]>(["useCase", "aiVideos"]);

  const toggleSection = (section: string) => {
    setOpenSections(prev =>
      prev.includes(section) ? prev.filter(s => s !== section) : [...prev, section]
    );
  };

  const updateArrayFilter = (key: keyof VideoFilters, value: string) => {
    const currentArray = filters[key] as string[];
    const newArray = currentArray.includes(value)
      ? currentArray.filter(v => v !== value)
      : [...currentArray, value];
    onFiltersChange({ ...filters, [key]: newArray });
  };

  const updateBooleanFilter = (key: keyof VideoFilters, value: boolean | null) => {
    onFiltersChange({ ...filters, [key]: value });
  };

  const updateSingleFilter = (key: keyof VideoFilters, value: string | null) => {
    onFiltersChange({ ...filters, [key]: value });
  };

  // Video taxonomy data — labels resolved via i18n keys (filter values unchanged)
  const useCaseOptions = [
    { value: "social-media", label: t("vf.uc.social-media") },
    { value: "ads-marketing", label: t("vf.uc.ads-marketing") },
    { value: "business-corporate", label: t("vf.uc.business-corporate") },
    { value: "startup-saas", label: t("vf.uc.startup-saas") },
    { value: "ecommerce-product", label: t("vf.uc.ecommerce-product") },
    { value: "real-estate", label: t("vf.uc.real-estate") },
    { value: "luxury-lifestyle", label: t("vf.uc.luxury-lifestyle") },
    { value: "motivation-success", label: t("vf.uc.motivation-success") },
  ];

  const aiVideoOptions = [
    { value: "ai-generated", label: t("vf.ai.ai-generated") },
    { value: "ai-cinematic", label: t("vf.ai.ai-cinematic") },
    { value: "ai-avatars", label: t("vf.ai.ai-avatars") },
    { value: "ai-backgrounds", label: t("vf.ai.ai-backgrounds") },
    { value: "ai-motion-graphics", label: t("vf.ai.ai-motion-graphics") },
  ];

  const styleOptions = [
    { value: "cinematic", label: t("vf.style.cinematic") },
    { value: "minimal", label: t("vf.style.minimal") },
    { value: "futuristic", label: t("vf.style.futuristic") },
    { value: "abstract", label: t("vf.style.abstract") },
    { value: "documentary", label: t("vf.style.documentary") },
    { value: "urban-street", label: t("vf.style.urban-street") },
    { value: "nature-travel", label: t("vf.style.nature-travel") },
  ];

  const formatOptions = [
    { value: "vertical", label: t("vf.fmt.vertical"), icon: Smartphone },
    { value: "square", label: t("vf.fmt.square"), icon: Square },
    { value: "horizontal", label: t("vf.fmt.horizontal"), icon: Monitor },
    { value: "4k", label: t("vf.fmt.4k"), icon: Maximize2 },
    { value: "loopable", label: t("vf.fmt.loopable"), icon: RotateCcw },
  ];

  const effectsOptions = [
    { value: "backgrounds-loops", label: t("vf.effect.backgrounds-loops") },
    { value: "transitions", label: t("vf.effect.transitions") },
    { value: "overlays", label: t("vf.effect.overlays") },
    { value: "light-leaks", label: t("vf.effect.light-leaks") },
    { value: "particles", label: t("vf.effect.particles") },
    { value: "countdowns", label: t("vf.effect.countdowns") },
  ];

  const platformOptions = [
    { value: "tiktok", label: t("vf.plat.tiktok") },
    { value: "instagram", label: t("vf.plat.instagram") },
    { value: "youtube", label: t("vf.plat.youtube") },
    { value: "ads", label: t("vf.plat.ads") },
  ];


  const activeFiltersCount = 
    filters.useCase.length + 
    filters.aiVideos.length + 
    filters.style.length + 
    filters.format.length + 
    filters.effects.length +
    filters.platform.length +
    (filters.orientation ? 1 : 0) +
    (filters.resolution ? 1 : 0) +
    (filters.aiGenerated !== null ? 1 : 0) +
    (filters.loopable !== null ? 1 : 0) +
    (filters.withPeople !== null ? 1 : 0) +
    (filters.copySpace !== null ? 1 : 0);

  return (
    <div className="w-72 bg-card border rounded-lg shadow-lg overflow-hidden">
      {/* Header */}
      <div className="p-4 bg-muted/50 border-b flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Video className="h-5 w-5 text-primary" />
          <span className="font-semibold">
            {language === 'en' ? "Video Filters" : "Filtres Vidéo"}
          </span>
          {activeFiltersCount > 0 && (
            <Badge variant="secondary" className="ml-1">
              {activeFiltersCount}
            </Badge>
          )}
        </div>
        {activeFiltersCount > 0 && (
          <Button variant="ghost" size="sm" onClick={onReset} className="h-8 px-2 text-xs">
            <RotateCcw className="h-3 w-3 mr-1" />
            {language === 'en' ? "Reset" : "Réinitialiser"}
          </Button>
        )}
      </div>

      <ScrollArea className="h-[calc(100vh-280px)] max-h-[600px]">
        <div className="p-4 space-y-4">
          {/* Use Case Section */}
          <Collapsible open={openSections.includes("useCase")} onOpenChange={() => toggleSection("useCase")}>
            <CollapsibleTrigger className="flex items-center justify-between w-full p-2 hover:bg-muted/50 rounded-md transition-colors">
              <div className="flex items-center gap-2">
                <Video className="h-4 w-4 text-orange-500" />
                <span className="text-sm font-medium">
                  {language === 'en' ? "By Use Case" : "Par Utilisation"}
                </span>
                {filters.useCase.length > 0 && (
                  <Badge variant="outline" className="h-5 px-1.5 text-xs">
                    {filters.useCase.length}
                  </Badge>
                )}
              </div>
              <ChevronDown className={`h-4 w-4 transition-transform ${openSections.includes("useCase") ? "rotate-180" : ""}`} />
            </CollapsibleTrigger>
            <CollapsibleContent className="pt-2 space-y-1.5">
              {useCaseOptions.map((option) => (
                <label
                  key={option.value}
                  className="flex items-center gap-2 px-2 py-1.5 hover:bg-muted/30 rounded cursor-pointer text-sm"
                >
                  <Checkbox
                    checked={filters.useCase.includes(option.value)}
                    onCheckedChange={() => updateArrayFilter("useCase", option.value)}
                  />
                  <span className="text-muted-foreground hover:text-foreground transition-colors">
                    {option.label}
                  </span>
                </label>
              ))}
            </CollapsibleContent>
          </Collapsible>

          <Separator />

          {/* AI Videos Section - Highlighted */}
          <Collapsible open={openSections.includes("aiVideos")} onOpenChange={() => toggleSection("aiVideos")}>
            <CollapsibleTrigger className="flex items-center justify-between w-full p-2 hover:bg-muted/50 rounded-md transition-colors bg-gradient-to-r from-purple-500/10 to-pink-500/10">
              <div className="flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-purple-500" />
                <span className="text-sm font-medium">
                  {language === 'en' ? "AI Videos" : "Vidéos IA"}
                </span>
                <Badge className="bg-gradient-to-r from-purple-500 to-pink-500 text-white text-[10px] px-1.5 py-0">
                  ⭐
                </Badge>
                {filters.aiVideos.length > 0 && (
                  <Badge variant="outline" className="h-5 px-1.5 text-xs">
                    {filters.aiVideos.length}
                  </Badge>
                )}
              </div>
              <ChevronDown className={`h-4 w-4 transition-transform ${openSections.includes("aiVideos") ? "rotate-180" : ""}`} />
            </CollapsibleTrigger>
            <CollapsibleContent className="pt-2 space-y-1.5">
              {aiVideoOptions.map((option) => (
                <label
                  key={option.value}
                  className="flex items-center gap-2 px-2 py-1.5 hover:bg-muted/30 rounded cursor-pointer text-sm"
                >
                  <Checkbox
                    checked={filters.aiVideos.includes(option.value)}
                    onCheckedChange={() => updateArrayFilter("aiVideos", option.value)}
                  />
                  <span className="text-muted-foreground hover:text-foreground transition-colors">
                    {option.label}
                  </span>
                </label>
              ))}
            </CollapsibleContent>
          </Collapsible>

          <Separator />

          {/* Style Section */}
          <Collapsible open={openSections.includes("style")} onOpenChange={() => toggleSection("style")}>
            <CollapsibleTrigger className="flex items-center justify-between w-full p-2 hover:bg-muted/50 rounded-md transition-colors">
              <div className="flex items-center gap-2">
                <Palette className="h-4 w-4 text-blue-500" />
                <span className="text-sm font-medium">
                  {language === 'en' ? "By Style" : "Par Style"}
                </span>
                {filters.style.length > 0 && (
                  <Badge variant="outline" className="h-5 px-1.5 text-xs">
                    {filters.style.length}
                  </Badge>
                )}
              </div>
              <ChevronDown className={`h-4 w-4 transition-transform ${openSections.includes("style") ? "rotate-180" : ""}`} />
            </CollapsibleTrigger>
            <CollapsibleContent className="pt-2 space-y-1.5">
              {styleOptions.map((option) => (
                <label
                  key={option.value}
                  className="flex items-center gap-2 px-2 py-1.5 hover:bg-muted/30 rounded cursor-pointer text-sm"
                >
                  <Checkbox
                    checked={filters.style.includes(option.value)}
                    onCheckedChange={() => updateArrayFilter("style", option.value)}
                  />
                  <span className="text-muted-foreground hover:text-foreground transition-colors">
                    {option.label}
                  </span>
                </label>
              ))}
            </CollapsibleContent>
          </Collapsible>

          <Separator />

          {/* Format Section */}
          <Collapsible open={openSections.includes("format")} onOpenChange={() => toggleSection("format")}>
            <CollapsibleTrigger className="flex items-center justify-between w-full p-2 hover:bg-muted/50 rounded-md transition-colors">
              <div className="flex items-center gap-2">
                <Maximize2 className="h-4 w-4 text-green-500" />
                <span className="text-sm font-medium">
                  {language === 'en' ? "By Format" : "Par Format"}
                </span>
                {filters.format.length > 0 && (
                  <Badge variant="outline" className="h-5 px-1.5 text-xs">
                    {filters.format.length}
                  </Badge>
                )}
              </div>
              <ChevronDown className={`h-4 w-4 transition-transform ${openSections.includes("format") ? "rotate-180" : ""}`} />
            </CollapsibleTrigger>
            <CollapsibleContent className="pt-2 space-y-1.5">
              {formatOptions.map((option) => (
                <label
                  key={option.value}
                  className="flex items-center gap-2 px-2 py-1.5 hover:bg-muted/30 rounded cursor-pointer text-sm"
                >
                  <Checkbox
                    checked={filters.format.includes(option.value)}
                    onCheckedChange={() => updateArrayFilter("format", option.value)}
                  />
                  <option.icon className="h-3.5 w-3.5 text-muted-foreground" />
                  <span className="text-muted-foreground hover:text-foreground transition-colors">
                    {option.label}
                  </span>
                </label>
              ))}
            </CollapsibleContent>
          </Collapsible>

          <Separator />

          {/* Effects Section */}
          <Collapsible open={openSections.includes("effects")} onOpenChange={() => toggleSection("effects")}>
            <CollapsibleTrigger className="flex items-center justify-between w-full p-2 hover:bg-muted/50 rounded-md transition-colors">
              <div className="flex items-center gap-2">
                <Wand2 className="h-4 w-4 text-yellow-500" />
                <span className="text-sm font-medium">
                  {language === 'en' ? "Effects & Elements" : "Effets & Éléments"}
                </span>
                {filters.effects.length > 0 && (
                  <Badge variant="outline" className="h-5 px-1.5 text-xs">
                    {filters.effects.length}
                  </Badge>
                )}
              </div>
              <ChevronDown className={`h-4 w-4 transition-transform ${openSections.includes("effects") ? "rotate-180" : ""}`} />
            </CollapsibleTrigger>
            <CollapsibleContent className="pt-2 space-y-1.5">
              {effectsOptions.map((option) => (
                <label
                  key={option.value}
                  className="flex items-center gap-2 px-2 py-1.5 hover:bg-muted/30 rounded cursor-pointer text-sm"
                >
                  <Checkbox
                    checked={filters.effects.includes(option.value)}
                    onCheckedChange={() => updateArrayFilter("effects", option.value)}
                  />
                  <span className="text-muted-foreground hover:text-foreground transition-colors">
                    {option.label}
                  </span>
                </label>
              ))}
            </CollapsibleContent>
          </Collapsible>

          <Separator className="my-4" />

          {/* Quick Filters */}
          <div className="space-y-3">
            <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              {language === 'en' ? "Quick Filters" : "Filtres rapides"}
            </Label>

            {/* Orientation */}
            <div className="space-y-2">
              <Label className="text-sm">{language === 'en' ? "Orientation" : "Orientation"}</Label>
              <div className="flex flex-wrap gap-1.5">
                {[
                  { value: "vertical", label: language === 'en' ? "Vertical" : "Vertical", icon: Smartphone },
                  { value: "horizontal", label: language === 'en' ? "Horizontal" : "Horizontal", icon: Monitor },
                  { value: "square", label: language === 'en' ? "Square" : "Carré", icon: Square },
                ].map((option) => (
                  <Button
                    key={option.value}
                    variant={filters.orientation === option.value ? "default" : "outline"}
                    size="sm"
                    className="h-7 text-xs gap-1"
                    onClick={() => updateSingleFilter("orientation", filters.orientation === option.value ? null : option.value)}
                  >
                    <option.icon className="h-3 w-3" />
                    {option.label}
                  </Button>
                ))}
              </div>
            </div>

            {/* Resolution */}
            <div className="space-y-2">
              <Label className="text-sm">{language === 'en' ? "Resolution" : "Résolution"}</Label>
              <div className="flex gap-1.5">
                {[
                  { value: "hd", label: "HD" },
                  { value: "4k", label: "4K" },
                ].map((option) => (
                  <Button
                    key={option.value}
                    variant={filters.resolution === option.value ? "default" : "outline"}
                    size="sm"
                    className="h-7 text-xs"
                    onClick={() => updateSingleFilter("resolution", filters.resolution === option.value ? null : option.value)}
                  >
                    {option.label}
                  </Button>
                ))}
              </div>
            </div>

            {/* AI Generated Toggle */}
            <div className="space-y-2">
              <Label className="text-sm">{language === 'en' ? "AI Generated" : "Généré par IA"}</Label>
              <div className="flex gap-1.5">
                <Button
                  variant={filters.aiGenerated === true ? "default" : "outline"}
                  size="sm"
                  className="h-7 text-xs"
                  onClick={() => updateBooleanFilter("aiGenerated", filters.aiGenerated === true ? null : true)}
                >
                  {language === 'en' ? "Yes" : "Oui"}
                </Button>
                <Button
                  variant={filters.aiGenerated === false ? "default" : "outline"}
                  size="sm"
                  className="h-7 text-xs"
                  onClick={() => updateBooleanFilter("aiGenerated", filters.aiGenerated === false ? null : false)}
                >
                  {language === 'en' ? "No" : "Non"}
                </Button>
              </div>
            </div>

            {/* Loopable */}
            <div className="space-y-2">
              <Label className="text-sm">{language === 'en' ? "Loopable" : "En boucle"}</Label>
              <div className="flex gap-1.5">
                <Button
                  variant={filters.loopable === true ? "default" : "outline"}
                  size="sm"
                  className="h-7 text-xs"
                  onClick={() => updateBooleanFilter("loopable", filters.loopable === true ? null : true)}
                >
                  {language === 'en' ? "Yes" : "Oui"}
                </Button>
                <Button
                  variant={filters.loopable === false ? "default" : "outline"}
                  size="sm"
                  className="h-7 text-xs"
                  onClick={() => updateBooleanFilter("loopable", filters.loopable === false ? null : false)}
                >
                  {language === 'en' ? "No" : "Non"}
                </Button>
              </div>
            </div>

            {/* With People */}
            <div className="space-y-2">
              <Label className="text-sm">{language === 'en' ? "With People" : "Avec des personnes"}</Label>
              <div className="flex gap-1.5">
                <Button
                  variant={filters.withPeople === true ? "default" : "outline"}
                  size="sm"
                  className="h-7 text-xs"
                  onClick={() => updateBooleanFilter("withPeople", filters.withPeople === true ? null : true)}
                >
                  {language === 'en' ? "Yes" : "Oui"}
                </Button>
                <Button
                  variant={filters.withPeople === false ? "default" : "outline"}
                  size="sm"
                  className="h-7 text-xs"
                  onClick={() => updateBooleanFilter("withPeople", filters.withPeople === false ? null : false)}
                >
                  {language === 'en' ? "No" : "Non"}
                </Button>
              </div>
            </div>

            {/* Copy Space */}
            <div className="space-y-2">
              <Label className="text-sm">{language === 'en' ? "Copy Space" : "Espace texte"}</Label>
              <div className="flex gap-1.5">
                <Button
                  variant={filters.copySpace === true ? "default" : "outline"}
                  size="sm"
                  className="h-7 text-xs"
                  onClick={() => updateBooleanFilter("copySpace", filters.copySpace === true ? null : true)}
                >
                  {language === 'en' ? "Yes" : "Oui"}
                </Button>
              </div>
            </div>

            {/* Platform */}
            <div className="space-y-2">
              <Label className="text-sm">{language === 'en' ? "Platform" : "Plateforme"}</Label>
              <div className="flex flex-wrap gap-1.5">
                {platformOptions.map((option) => (
                  <Button
                    key={option.value}
                    variant={filters.platform.includes(option.value) ? "default" : "outline"}
                    size="sm"
                    className="h-7 text-xs"
                    onClick={() => updateArrayFilter("platform", option.value)}
                  >
                    {option.label}
                  </Button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </ScrollArea>
    </div>
  );
};

export default VideoFiltersPanel;
