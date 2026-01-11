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
  const { language } = useLanguage();
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

  // Video taxonomy data
  const useCaseOptions = [
    { value: "social-media", label: language === 'en' ? "Social Media (Reels/TikTok/Shorts)" : "Réseaux sociaux (Reels/TikTok/Shorts)" },
    { value: "ads-marketing", label: language === 'en' ? "Ads & Marketing" : "Publicités & Marketing" },
    { value: "business-corporate", label: language === 'en' ? "Business & Corporate" : "Business & Corporate" },
    { value: "startup-saas", label: language === 'en' ? "Startup & SaaS" : "Startup & SaaS" },
    { value: "ecommerce-product", label: language === 'en' ? "E-commerce & Product" : "E-commerce & Produits" },
    { value: "real-estate", label: language === 'en' ? "Real Estate" : "Immobilier" },
    { value: "luxury-lifestyle", label: language === 'en' ? "Luxury & Lifestyle" : "Luxe & Lifestyle" },
    { value: "motivation-success", label: language === 'en' ? "Motivation & Success" : "Motivation & Succès" },
  ];

  const aiVideoOptions = [
    { value: "ai-generated", label: language === 'en' ? "AI-Generated Videos" : "Vidéos générées par IA" },
    { value: "ai-cinematic", label: language === 'en' ? "AI Cinematic B-Roll" : "B-Roll cinématique IA" },
    { value: "ai-avatars", label: language === 'en' ? "AI Avatars" : "Avatars IA" },
    { value: "ai-backgrounds", label: language === 'en' ? "AI Background Loops" : "Boucles de fond IA" },
    { value: "ai-motion-graphics", label: language === 'en' ? "AI Motion Graphics" : "Motion Graphics IA" },
  ];

  const styleOptions = [
    { value: "cinematic", label: language === 'en' ? "Cinematic" : "Cinématique" },
    { value: "minimal", label: language === 'en' ? "Minimal" : "Minimaliste" },
    { value: "futuristic", label: language === 'en' ? "Futuristic" : "Futuriste" },
    { value: "abstract", label: language === 'en' ? "Abstract" : "Abstrait" },
    { value: "documentary", label: language === 'en' ? "Documentary" : "Documentaire" },
    { value: "urban-street", label: language === 'en' ? "Urban / Street" : "Urbain / Street" },
    { value: "nature-travel", label: language === 'en' ? "Nature / Travel" : "Nature / Voyage" },
  ];

  const formatOptions = [
    { value: "vertical", label: language === 'en' ? "Vertical (9:16)" : "Vertical (9:16)", icon: Smartphone },
    { value: "square", label: language === 'en' ? "Square (1:1)" : "Carré (1:1)", icon: Square },
    { value: "horizontal", label: language === 'en' ? "Horizontal (16:9)" : "Horizontal (16:9)", icon: Monitor },
    { value: "4k", label: "4K", icon: Maximize2 },
    { value: "loopable", label: language === 'en' ? "Loopable" : "En boucle", icon: RotateCcw },
  ];

  const effectsOptions = [
    { value: "backgrounds-loops", label: language === 'en' ? "Backgrounds & Loops" : "Arrière-plans & Boucles" },
    { value: "transitions", label: language === 'en' ? "Transitions" : "Transitions" },
    { value: "overlays", label: language === 'en' ? "Overlays" : "Overlays" },
    { value: "light-leaks", label: language === 'en' ? "Light Leaks / Glitches" : "Light Leaks / Glitches" },
    { value: "particles", label: language === 'en' ? "Particles" : "Particules" },
    { value: "countdowns", label: language === 'en' ? "Countdowns" : "Comptes à rebours" },
  ];

  const platformOptions = [
    { value: "tiktok", label: "TikTok" },
    { value: "instagram", label: "Instagram" },
    { value: "youtube", label: "YouTube" },
    { value: "ads", label: language === 'en' ? "Ads" : "Publicités" },
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
