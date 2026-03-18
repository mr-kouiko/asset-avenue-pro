import { Link } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { MapPin, Target, Palette, Tag, Shield } from "lucide-react";
import type { PexelsSEOContent } from "@/hooks/usePexelsSEOContent";

interface Props {
  content: PexelsSEOContent;
  isVideo: boolean;
}

export const PexelsSEOSections = ({ content, isVideo }: Props) => (
  <>
    {/* Intro */}
    {content.intro && (
      <p className="text-lg text-muted-foreground leading-relaxed mt-6">
        {content.intro}
      </p>
    )}

    {/* Main Content */}
    {content.main_content && (
      <div className="mt-6 prose prose-sm max-w-none text-foreground/90">
        {content.main_content.split("\n\n").map((para, i) => (
          <p key={i} className="mb-4 leading-relaxed">{para}</p>
        ))}
      </div>
    )}

    {/* Info Cards Row */}
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-8">
      {/* About */}
      {content.about_section && (
        <Card className="p-4">
          <h3 className="flex items-center gap-2 font-semibold text-foreground mb-3">
            <MapPin className="h-4 w-4 text-primary" />
            About this {isVideo ? "video" : "photo"}
          </h3>
          <dl className="space-y-2 text-sm">
            <div className="flex justify-between">
              <dt className="text-muted-foreground">Location</dt>
              <dd className="font-medium text-foreground">{content.about_section.location}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-muted-foreground">Subject</dt>
              <dd className="font-medium text-foreground">{content.about_section.subject}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-muted-foreground">Style</dt>
              <dd className="font-medium text-foreground">{content.about_section.style}</dd>
            </div>
          </dl>
        </Card>
      )}

      {/* Use Cases */}
      {content.use_cases?.length > 0 && (
        <Card className="p-4">
          <h3 className="flex items-center gap-2 font-semibold text-foreground mb-3">
            <Target className="h-4 w-4 text-primary" />
            Best use cases
          </h3>
          <ul className="space-y-1.5 text-sm text-muted-foreground">
            {content.use_cases.map((uc, i) => (
              <li key={i} className="flex items-start gap-2">
                <span className="text-primary mt-0.5">•</span>
                {uc}
              </li>
            ))}
          </ul>
        </Card>
      )}

      {/* Visual Style */}
      {content.visual_style?.length > 0 && (
        <Card className="p-4">
          <h3 className="flex items-center gap-2 font-semibold text-foreground mb-3">
            <Palette className="h-4 w-4 text-primary" />
            Visual style
          </h3>
          <div className="flex flex-wrap gap-2">
            {content.visual_style.map((vs, i) => (
              <Badge key={i} variant="secondary" className="text-xs">
                {vs}
              </Badge>
            ))}
          </div>
        </Card>
      )}
    </div>

    {/* Keywords */}
    {content.keywords?.length > 0 && (
      <div className="mt-8">
        <h3 className="flex items-center gap-2 font-semibold text-foreground mb-3">
          <Tag className="h-4 w-4 text-primary" />
          Related keywords
        </h3>
        <div className="flex flex-wrap gap-2">
          {content.keywords.map((kw, i) => (
            <Link
              key={i}
              to={`/marketplace?search=${encodeURIComponent(kw)}`}
              className="inline-block"
            >
              <Badge variant="outline" className="hover:bg-accent cursor-pointer text-xs">
                {kw}
              </Badge>
            </Link>
          ))}
        </div>
      </div>
    )}

    {/* Why download from us */}
    <Separator className="my-8" />
    <div className="mt-2">
      <h3 className="flex items-center gap-2 font-semibold text-foreground mb-3">
        <Shield className="h-4 w-4 text-primary" />
        Why download from VisuStock?
      </h3>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm text-muted-foreground">
        <div className="flex items-start gap-2">
          <span className="text-primary font-bold">✓</span>
          Curated selection of free and premium assets
        </div>
        <div className="flex items-start gap-2">
          <span className="text-primary font-bold">✓</span>
          Faster browsing with smart search and filters
        </div>
        <div className="flex items-start gap-2">
          <span className="text-primary font-bold">✓</span>
          Optimized formats for web and print
        </div>
        <div className="flex items-start gap-2">
          <span className="text-primary font-bold">✓</span>
          Premium alternatives from independent creators
        </div>
      </div>
    </div>

    {/* Dynamic internal links */}
    {content.internal_links && (
      <div className="mt-8">
        {content.internal_links.related_searches?.length > 0 && (
          <>
            <h3 className="text-sm font-semibold text-foreground mb-2">Related searches</h3>
            <div className="flex flex-wrap gap-2 mb-4">
              {content.internal_links.related_searches.map((link, i) => (
                <Link key={i} to={link.url} className="text-xs text-primary hover:underline">
                  {link.label}
                </Link>
              ))}
            </div>
          </>
        )}
        {content.internal_links.category_links?.length > 0 && (
          <div className="flex flex-wrap gap-3">
            {content.internal_links.category_links.map((link, i) => (
              <Link key={i} to={link.url} className="text-sm text-primary hover:underline">
                {link.label}
              </Link>
            ))}
          </div>
        )}
      </div>
    )}
  </>
);
