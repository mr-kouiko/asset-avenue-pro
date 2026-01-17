import { memo } from 'react';
import { Link } from 'react-router-dom';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { ArrowRight } from 'lucide-react';
import { getUpcomingEvents, formatDaysUntil, getDaysUntil } from '@/data/calendarCurations';

interface CalendarCurationsProps {
  limit?: number;
}

export const CalendarCurations = memo(({ limit = 8 }: CalendarCurationsProps) => {
  const events = getUpcomingEvents(limit);

  if (events.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">No upcoming events at this time.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Discover content for upcoming events, holidays, and marketing moments
      </p>
      
      {/* Horizontal scrollable container */}
      <div className="relative">
        <div className="flex gap-4 overflow-x-auto pb-4 scrollbar-hide snap-x snap-mandatory">
          {events.map((event) => {
            const daysUntil = getDaysUntil(event.date);
            const isUrgent = daysUntil >= 0 && daysUntil <= 14;
            const isNow = daysUntil < 0 && event.endDate && getDaysUntil(event.endDate) >= 0;
            const Icon = event.icon;

            return (
              <Link
                key={event.id}
                to={`/en/marketplace?search=${encodeURIComponent(event.searchQuery)}`}
                className="flex-shrink-0 snap-start"
              >
                <Card 
                  className={`
                    relative w-[280px] h-[160px] overflow-hidden transition-all duration-300 
                    hover:shadow-lg hover:scale-[1.02] cursor-pointer group
                    border-0
                  `}
                >
                  {/* Gradient background */}
                  <div className={`absolute inset-0 bg-gradient-to-br ${event.gradient} opacity-90`} />
                  
                  {/* Subtle pattern overlay */}
                  <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(255,255,255,0.2),transparent_50%)]" />
                  
                  {/* Content */}
                  <div className="relative h-full p-4 flex flex-col justify-between text-white">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-2">
                        <div className="p-2 bg-white/20 rounded-lg backdrop-blur-sm">
                          <Icon className="h-5 w-5" />
                        </div>
                        {(isUrgent || isNow) && (
                          <Badge 
                            variant="secondary" 
                            className={`
                              text-[10px] font-bold border-0
                              ${isNow ? 'bg-white text-gray-900' : 'bg-white/90 text-gray-900'}
                            `}
                          >
                            {formatDaysUntil(event)}
                          </Badge>
                        )}
                      </div>
                      
                      <ArrowRight className="h-4 w-4 opacity-0 group-hover:opacity-100 transition-opacity" />
                    </div>
                    
                    <div>
                      <h3 className="font-bold text-lg leading-tight mb-1">
                        {event.name}
                      </h3>
                      <p className="text-sm text-white/80 line-clamp-2">
                        {event.description}
                      </p>
                      
                      {/* Date display for non-urgent events */}
                      {!isUrgent && !isNow && (
                        <p className="text-xs text-white/60 mt-1">
                          {event.date.toLocaleDateString('en-US', { 
                            month: 'short', 
                            day: 'numeric' 
                          })}
                          {event.endDate && ` - ${event.endDate.toLocaleDateString('en-US', { 
                            month: 'short', 
                            day: 'numeric' 
                          })}`}
                        </p>
                      )}
                    </div>
                  </div>
                </Card>
              </Link>
            );
          })}
        </div>
        
        {/* Fade indicators for scroll */}
        <div className="absolute right-0 top-0 bottom-4 w-16 bg-gradient-to-l from-background to-transparent pointer-events-none" />
      </div>
      
      {/* Category filter chips */}
      <div className="flex flex-wrap gap-2 pt-2">
        <Badge variant="outline" className="text-xs cursor-pointer hover:bg-muted">
          All Events
        </Badge>
        <Badge variant="outline" className="text-xs cursor-pointer hover:bg-muted">
          Holidays
        </Badge>
        <Badge variant="outline" className="text-xs cursor-pointer hover:bg-muted">
          Seasons
        </Badge>
        <Badge variant="outline" className="text-xs cursor-pointer hover:bg-muted">
          Marketing
        </Badge>
        <Badge variant="outline" className="text-xs cursor-pointer hover:bg-muted">
          Cultural
        </Badge>
      </div>
    </div>
  );
});

CalendarCurations.displayName = 'CalendarCurations';
