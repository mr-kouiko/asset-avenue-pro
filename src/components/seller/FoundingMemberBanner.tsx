import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Sparkles, Users, Zap } from "lucide-react";

interface FoundingMemberBannerProps {
  spotsRemaining: number;
  totalSpots: number;
  isLoading?: boolean;
}

export const FoundingMemberBanner = ({ 
  spotsRemaining, 
  totalSpots, 
  isLoading 
}: FoundingMemberBannerProps) => {
  const spotsTaken = totalSpots - spotsRemaining;
  const progressPercentage = (spotsTaken / totalSpots) * 100;
  const isFreeOffer = spotsRemaining > 0;

  if (isLoading) {
    return (
      <div className="relative overflow-hidden rounded-xl bg-gradient-to-r from-primary/20 via-accent/20 to-primary/20 p-6 animate-pulse">
        <div className="h-24" />
      </div>
    );
  }

  if (!isFreeOffer) {
    return null;
  }

  return (
    <div className="relative overflow-hidden rounded-xl bg-gradient-to-r from-emerald-500/10 via-teal-500/10 to-cyan-500/10 border-2 border-emerald-500/30 p-6 mb-8">
      {/* Animated background sparkles */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute top-2 left-10 animate-pulse">
          <Sparkles className="h-4 w-4 text-emerald-400/40" />
        </div>
        <div className="absolute top-4 right-20 animate-pulse delay-300">
          <Sparkles className="h-3 w-3 text-teal-400/40" />
        </div>
        <div className="absolute bottom-3 left-1/3 animate-pulse delay-500">
          <Sparkles className="h-5 w-5 text-cyan-400/40" />
        </div>
      </div>

      <div className="relative z-10">
        {/* Header with badges */}
        <div className="flex flex-wrap items-center gap-3 mb-4">
          <Badge className="bg-emerald-500 text-white border-0 text-sm px-3 py-1 animate-pulse">
            <Zap className="h-3 w-3 mr-1" />
            LIMITED OFFER
          </Badge>
          <Badge variant="outline" className="border-emerald-500/50 text-emerald-600 dark:text-emerald-400">
            <Users className="h-3 w-3 mr-1" />
            Founding Creator Program
          </Badge>
        </div>

        {/* Main headline */}
        <h3 className="text-2xl md:text-3xl font-bold mb-2">
          <span className="text-foreground">Join our first </span>
          <span className="bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-500 bg-clip-text text-transparent">
            100 Founding Creators
          </span>
          <span className="text-foreground"> for </span>
          <span className="bg-gradient-to-r from-emerald-400 to-teal-400 bg-clip-text text-transparent font-extrabold">
            $0!
          </span>
        </h3>

        {/* Spots remaining counter */}
        <div className="flex items-center gap-4 mt-4">
          <div className="flex-1 max-w-md">
            <div className="flex justify-between text-sm mb-2">
              <span className="text-muted-foreground">
                {spotsTaken} creators joined
              </span>
              <span className="font-bold text-emerald-600 dark:text-emerald-400">
                {spotsRemaining} spots remaining
              </span>
            </div>
            <div className="relative">
              <Progress 
                value={progressPercentage} 
                className="h-3 bg-muted/50"
              />
              <div 
                className="absolute inset-0 h-3 rounded-full bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-500 transition-all duration-500"
                style={{ width: `${progressPercentage}%` }}
              />
            </div>
          </div>
          
          {/* Urgency indicator */}
          {spotsRemaining <= 20 && (
            <Badge className="bg-orange-500 text-white border-0 animate-bounce">
              {spotsRemaining <= 10 ? "Almost Gone!" : "Filling Fast!"}
            </Badge>
          )}
        </div>

        {/* Value proposition */}
        <p className="text-sm text-muted-foreground mt-4">
          🎉 Save €15 and become a founding creator with exclusive early-adopter benefits!
        </p>
      </div>
    </div>
  );
};
