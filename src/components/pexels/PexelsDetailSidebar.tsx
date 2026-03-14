import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Download, ExternalLink, Camera, Video } from "lucide-react";
import type { PexelsItem } from "@/hooks/usePexelsSearch";

interface Props {
  item: PexelsItem;
  isVideo: boolean;
}

export const PexelsDetailSidebar = ({ item, isVideo }: Props) => (
  <aside className="space-y-6">
    {/* Badges */}
    <div>
      <div className="flex items-center gap-2 mb-3">
        <Badge className="bg-emerald-500 text-white font-bold">FREE</Badge>
        <Badge variant="secondary">Pexels</Badge>
        <Badge variant="outline" className="gap-1">
          {isVideo ? <Video className="h-3 w-3" /> : <Camera className="h-3 w-3" />}
          {isVideo ? 'Video' : 'Photo'}
        </Badge>
      </div>
      {item.alt && item.alt !== item.title && (
        <p className="text-sm text-muted-foreground">{item.alt}</p>
      )}
    </div>

    {/* Details */}
    <Card className="p-4 space-y-3">
      <div className="flex justify-between text-sm">
        <span className="text-muted-foreground">Dimensions</span>
        <span className="font-medium text-foreground">{item.width} × {item.height}</span>
      </div>
      {item.duration != null && (
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">Duration</span>
          <span className="font-medium text-foreground">
            {Math.floor(item.duration / 60)}:{(item.duration % 60).toString().padStart(2, '0')}
          </span>
        </div>
      )}
      <div className="flex justify-between text-sm">
        <span className="text-muted-foreground">License</span>
        <span className="font-medium text-foreground">Free to use</span>
      </div>
      <div className="flex justify-between text-sm">
        <span className="text-muted-foreground">Source</span>
        <span className="font-medium text-foreground">Pexels</span>
      </div>
      <div className="flex justify-between text-sm">
        <span className="text-muted-foreground">Photographer</span>
        <a
          href={item.photographerUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="font-medium text-primary hover:underline"
        >
          {item.photographer}
        </a>
      </div>
    </Card>

    {/* Actions */}
    <div className="space-y-3">
      <Button className="w-full gap-2" size="lg" asChild>
        <a href={item.originalUrl} target="_blank" rel="noopener noreferrer">
          <Download className="h-4 w-4" />
          Download Free
        </a>
      </Button>
      <Button variant="outline" className="w-full gap-2" asChild>
        <a href={item.pexelsUrl} target="_blank" rel="noopener noreferrer">
          <ExternalLink className="h-4 w-4" />
          View on Pexels
        </a>
      </Button>
    </div>
  </aside>
);
