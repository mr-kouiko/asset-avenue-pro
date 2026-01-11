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
  Camera, 
  Sparkles, 
  Palette, 
  Maximize2, 
  Users,
  RotateCcw,
  Monitor,
  Smartphone,
  Square,
  Building2,
  Utensils,
  Plane,
  Heart,
  Briefcase,
  ShoppingBag
} from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";

export interface PhotoFilters {
  useCase: string[];
  aiPhotos: string[];
  style: string[];
  subject: string[];
  format: string[];
  orientation: string | null;
  resolution: string | null;
  aiGenerated: boolean | null;
  withPeople: boolean | null;
  numberOfPeople: string | null;
  copySpace: boolean | null;
  color: string | null;
  license: string | null;
}

interface PhotoFiltersPanelProps {
  filters: PhotoFilters;
  onFiltersChange: (filters: PhotoFilters) => void;
  onReset: () => void;
}

const PhotoFiltersPanel = ({ filters, onFiltersChange, onReset }: PhotoFiltersPanelProps) => {
  const { language } = useLanguage();
  const [openSections, setOpenSections] = useState<string[]>(["useCase", "aiPhotos"]);

  const toggleSection = (section: string) => {
    setOpenSections(prev => 
      prev.includes(section) ? prev.filter(s => s !== section) : [...prev, section]
    );
  };

  const updateArrayFilter = (key: keyof PhotoFilters, value: string) => {
    const currentArray = filters[key] as string[];
    const newArray = currentArray.includes(value)
      ? currentArray.filter(v => v !== value)
      : [...currentArray, value];
    onFiltersChange({ ...filters, [key]: newArray });
  };

  const updateBooleanFilter = (key: keyof PhotoFilters, value: boolean | null) => {
    onFiltersChange({ ...filters, [key]: value });
  };

  const updateSingleFilter = (key: keyof PhotoFilters, value: string | null) => {
    onFiltersChange({ ...filters, [key]: value });
  };

  // Photo taxonomy data
  const useCaseOptions = [
    { value: "social-media", label: language === 'en' ? "Social Media" : "Réseaux sociaux" },
    { value: "website-hero", label: language === 'en' ? "Website & Hero Images" : "Sites web & Images d'en-tête" },
    { value: "marketing-ads", label: language === 'en' ? "Marketing & Ads" : "Marketing & Publicités" },
    { value: "blog-editorial", label: language === 'en' ? "Blog & Editorial" : "Blog & Éditorial" },
    { value: "presentation", label: language === 'en' ? "Presentations" : "Présentations" },
    { value: "print", label: language === 'en' ? "Print & Packaging" : "Impression & Packaging" },
    { value: "ecommerce", label: language === 'en' ? "E-commerce" : "E-commerce" },
  ];

  const aiPhotoOptions = [
    { value: "ai-generated", label: language === 'en' ? "AI-Generated Photos" : "Photos générées par IA" },
    { value: "ai-portraits", label: language === 'en' ? "AI Portraits" : "Portraits IA" },
    { value: "ai-landscapes", label: language === 'en' ? "AI Landscapes" : "Paysages IA" },
    { value: "ai-abstract", label: language === 'en' ? "AI Abstract Art" : "Art abstrait IA" },
    { value: "ai-product", label: language === 'en' ? "AI Product Photos" : "Photos produits IA" },
    { value: "ai-concept", label: language === 'en' ? "AI Concept Art" : "Concept Art IA" },
  ];

  const styleOptions = [
    { value: "professional", label: language === 'en' ? "Professional" : "Professionnel" },
    { value: "candid", label: language === 'en' ? "Candid / Natural" : "Naturel / Spontané" },
    { value: "editorial", label: language === 'en' ? "Editorial" : "Éditorial" },
    { value: "minimalist", label: language === 'en' ? "Minimalist" : "Minimaliste" },
    { value: "vintage", label: language === 'en' ? "Vintage / Retro" : "Vintage / Rétro" },
    { value: "moody", label: language === 'en' ? "Moody / Dark" : "Sombre / Moody" },
    { value: "bright-airy", label: language === 'en' ? "Bright & Airy" : "Lumineux & Aéré" },
    { value: "cinematic", label: language === 'en' ? "Cinematic" : "Cinématique" },
  ];

  const subjectOptions = [
    { value: "people-portraits", label: language === 'en' ? "People & Portraits" : "Personnes & Portraits", icon: Users },
    { value: "business", label: language === 'en' ? "Business & Office" : "Business & Bureau", icon: Briefcase },
    { value: "nature-landscapes", label: language === 'en' ? "Nature & Landscapes" : "Nature & Paysages", icon: Plane },
    { value: "architecture", label: language === 'en' ? "Architecture & Buildings" : "Architecture & Bâtiments", icon: Building2 },
    { value: "food-drink", label: language === 'en' ? "Food & Drink" : "Alimentation & Boissons", icon: Utensils },
    { value: "lifestyle", label: language === 'en' ? "Lifestyle" : "Lifestyle", icon: Heart },
    { value: "products", label: language === 'en' ? "Products & Objects" : "Produits & Objets", icon: ShoppingBag },
    { value: "travel", label: language === 'en' ? "Travel & Tourism" : "Voyage & Tourisme", icon: Plane },
    { value: "technology", label: language === 'en' ? "Technology" : "Technologie", icon: Monitor },
    { value: "abstract-textures", label: language === 'en' ? "Abstract & Textures" : "Abstraits & Textures", icon: Palette },
  ];

  const formatOptions = [
    { value: "vertical", label: language === 'en' ? "Vertical (Portrait)" : "Vertical (Portrait)", icon: Smartphone },
    { value: "horizontal", label: language === 'en' ? "Horizontal (Landscape)" : "Horizontal (Paysage)", icon: Monitor },
    { value: "square", label: language === 'en' ? "Square (1:1)" : "Carré (1:1)", icon: Square },
    { value: "panoramic", label: language === 'en' ? "Panoramic" : "Panoramique", icon: Maximize2 },
  ];

  const colorOptions = [
    { value: "vibrant", label: language === 'en' ? "Vibrant" : "Vibrant" },
    { value: "muted", label: language === 'en' ? "Muted / Pastel" : "Pastel" },
    { value: "monochrome", label: language === 'en' ? "Black & White" : "Noir & Blanc" },
    { value: "warm", label: language === 'en' ? "Warm Tones" : "Tons chauds" },
    { value: "cool", label: language === 'en' ? "Cool Tones" : "Tons froids" },
  ];

  const peopleOptions = [
    { value: "no-people", label: language === 'en' ? "No People" : "Sans personnes" },
    { value: "1-person", label: language === 'en' ? "1 Person" : "1 personne" },
    { value: "2-people", label: language === 'en' ? "2 People" : "2 personnes" },
    { value: "group", label: language === 'en' ? "Group (3+)" : "Groupe (3+)" },
    { value: "crowd", label: language === 'en' ? "Crowd" : "Foule" },
  ];

  const activeFiltersCount = 
    filters.useCase.length + 
    filters.aiPhotos.length + 
    filters.style.length + 
    filters.subject.length + 
    filters.format.length +
    (filters.orientation ? 1 : 0) +
    (filters.resolution ? 1 : 0) +
    (filters.aiGenerated !== null ? 1 : 0) +
    (filters.withPeople !== null ? 1 : 0) +
    (filters.numberOfPeople ? 1 : 0) +
    (filters.copySpace !== null ? 1 : 0) +
    (filters.color ? 1 : 0);

  return (
    <div className="w-72 bg-card border rounded-lg shadow-lg overflow-hidden">
      {/* Header */}
      <div className="p-4 bg-muted/50 border-b flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Camera className="h-5 w-5 text-primary" />
          <span className="font-semibold">
            {language === 'en' ? "Photo Filters" : "Filtres Photo"}
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
                <Camera className="h-4 w-4 text-orange-500" />
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

          {/* AI Photos Section - Highlighted */}
          <Collapsible open={openSections.includes("aiPhotos")} onOpenChange={() => toggleSection("aiPhotos")}>
            <CollapsibleTrigger className="flex items-center justify-between w-full p-2 hover:bg-muted/50 rounded-md transition-colors bg-gradient-to-r from-purple-500/10 to-pink-500/10">
              <div className="flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-purple-500" />
                <span className="text-sm font-medium">
                  {language === 'en' ? "AI Photos" : "Photos IA"}
                </span>
                <Badge className="bg-gradient-to-r from-purple-500 to-pink-500 text-white text-[10px] px-1.5 py-0">
                  ⭐
                </Badge>
                {filters.aiPhotos.length > 0 && (
                  <Badge variant="outline" className="h-5 px-1.5 text-xs">
                    {filters.aiPhotos.length}
                  </Badge>
                )}
              </div>
              <ChevronDown className={`h-4 w-4 transition-transform ${openSections.includes("aiPhotos") ? "rotate-180" : ""}`} />
            </CollapsibleTrigger>
            <CollapsibleContent className="pt-2 space-y-1.5">
              {aiPhotoOptions.map((option) => (
                <label
                  key={option.value}
                  className="flex items-center gap-2 px-2 py-1.5 hover:bg-muted/30 rounded cursor-pointer text-sm"
                >
                  <Checkbox
                    checked={filters.aiPhotos.includes(option.value)}
                    onCheckedChange={() => updateArrayFilter("aiPhotos", option.value)}
                  />
                  <span className="text-muted-foreground hover:text-foreground transition-colors">
                    {option.label}
                  </span>
                </label>
              ))}
            </CollapsibleContent>
          </Collapsible>

          <Separator />

          {/* Subject Section */}
          <Collapsible open={openSections.includes("subject")} onOpenChange={() => toggleSection("subject")}>
            <CollapsibleTrigger className="flex items-center justify-between w-full p-2 hover:bg-muted/50 rounded-md transition-colors">
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4 text-blue-500" />
                <span className="text-sm font-medium">
                  {language === 'en' ? "By Subject" : "Par Sujet"}
                </span>
                {filters.subject.length > 0 && (
                  <Badge variant="outline" className="h-5 px-1.5 text-xs">
                    {filters.subject.length}
                  </Badge>
                )}
              </div>
              <ChevronDown className={`h-4 w-4 transition-transform ${openSections.includes("subject") ? "rotate-180" : ""}`} />
            </CollapsibleTrigger>
            <CollapsibleContent className="pt-2 space-y-1.5">
              {subjectOptions.map((option) => (
                <label
                  key={option.value}
                  className="flex items-center gap-2 px-2 py-1.5 hover:bg-muted/30 rounded cursor-pointer text-sm"
                >
                  <Checkbox
                    checked={filters.subject.includes(option.value)}
                    onCheckedChange={() => updateArrayFilter("subject", option.value)}
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

          {/* Style Section */}
          <Collapsible open={openSections.includes("style")} onOpenChange={() => toggleSection("style")}>
            <CollapsibleTrigger className="flex items-center justify-between w-full p-2 hover:bg-muted/50 rounded-md transition-colors">
              <div className="flex items-center gap-2">
                <Palette className="h-4 w-4 text-green-500" />
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
                <Maximize2 className="h-4 w-4 text-yellow-500" />
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
                  { value: "vertical", label: language === 'en' ? "Portrait" : "Portrait", icon: Smartphone },
                  { value: "horizontal", label: language === 'en' ? "Landscape" : "Paysage", icon: Monitor },
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
                  { value: "web", label: language === 'en' ? "Web" : "Web" },
                  { value: "print", label: language === 'en' ? "Print" : "Print" },
                  { value: "4k", label: "4K+" },
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

            {/* Color Tone */}
            <div className="space-y-2">
              <Label className="text-sm">{language === 'en' ? "Color Tone" : "Tonalité"}</Label>
              <div className="flex flex-wrap gap-1.5">
                {colorOptions.map((option) => (
                  <Button
                    key={option.value}
                    variant={filters.color === option.value ? "default" : "outline"}
                    size="sm"
                    className="h-7 text-xs"
                    onClick={() => updateSingleFilter("color", filters.color === option.value ? null : option.value)}
                  >
                    {option.label}
                  </Button>
                ))}
              </div>
            </div>

            {/* People */}
            <div className="space-y-2">
              <Label className="text-sm">{language === 'en' ? "People" : "Personnes"}</Label>
              <div className="flex flex-wrap gap-1.5">
                {peopleOptions.map((option) => (
                  <Button
                    key={option.value}
                    variant={filters.numberOfPeople === option.value ? "default" : "outline"}
                    size="sm"
                    className="h-7 text-xs"
                    onClick={() => updateSingleFilter("numberOfPeople", filters.numberOfPeople === option.value ? null : option.value)}
                  >
                    {option.label}
                  </Button>
                ))}
              </div>
            </div>

            {/* Toggle Filters */}
            <div className="space-y-2 pt-2">
              <div className="flex items-center justify-between">
                <Label className="text-sm">{language === 'en' ? "AI Generated" : "Généré par IA"}</Label>
                <div className="flex gap-1">
                  <Button
                    variant={filters.aiGenerated === true ? "default" : "outline"}
                    size="sm"
                    className="h-6 px-2 text-xs"
                    onClick={() => updateBooleanFilter("aiGenerated", filters.aiGenerated === true ? null : true)}
                  >
                    {language === 'en' ? "Yes" : "Oui"}
                  </Button>
                  <Button
                    variant={filters.aiGenerated === false ? "default" : "outline"}
                    size="sm"
                    className="h-6 px-2 text-xs"
                    onClick={() => updateBooleanFilter("aiGenerated", filters.aiGenerated === false ? null : false)}
                  >
                    {language === 'en' ? "No" : "Non"}
                  </Button>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <Label className="text-sm">{language === 'en' ? "Copy Space" : "Espace texte"}</Label>
                <div className="flex gap-1">
                  <Button
                    variant={filters.copySpace === true ? "default" : "outline"}
                    size="sm"
                    className="h-6 px-2 text-xs"
                    onClick={() => updateBooleanFilter("copySpace", filters.copySpace === true ? null : true)}
                  >
                    {language === 'en' ? "Yes" : "Oui"}
                  </Button>
                  <Button
                    variant={filters.copySpace === false ? "default" : "outline"}
                    size="sm"
                    className="h-6 px-2 text-xs"
                    onClick={() => updateBooleanFilter("copySpace", filters.copySpace === false ? null : false)}
                  >
                    {language === 'en' ? "No" : "Non"}
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </ScrollArea>
    </div>
  );
};

export default PhotoFiltersPanel;
