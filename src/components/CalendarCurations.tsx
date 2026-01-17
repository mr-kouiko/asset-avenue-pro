import { memo, useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Calendar, ArrowRight } from 'lucide-react';
import { 
  getUpcomingEvents, 
  getEventsByMonth, 
  formatDaysUntil, 
  getDaysUntil,
  monthNames,
  fullMonthNames,
  getCurrentMonth,
  CalendarEvent
} from '@/data/calendarCurations';
import { cn } from '@/lib/utils';

interface CalendarCurationsProps {
  limit?: number;
}

// Event Card with Image
const EventCard = memo(({ event }: { event: CalendarEvent }) => {
  const daysUntil = getDaysUntil(event.date);
  const isUrgent = daysUntil >= 0 && daysUntil <= 14;
  const isNow = daysUntil < 0 && event.endDate && getDaysUntil(event.endDate) >= 0;
  
  return (
    <Link
      to={`/en/marketplace?search=${encodeURIComponent(event.searchQuery)}`}
      className="flex-shrink-0 snap-start group"
    >
      <Card className="relative w-[200px] overflow-hidden border-0 shadow-md hover:shadow-xl transition-all duration-300 hover:scale-[1.02]">
        {/* Image */}
        <div className="aspect-[4/3] relative overflow-hidden">
          <img 
            src={event.image} 
            alt={event.name}
            className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-110"
          />
          {/* Gradient overlay */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
          
          {/* Badge */}
          {(isUrgent || isNow) && (
            <Badge 
              className={cn(
                "absolute top-2 right-2 text-[10px] font-bold border-0",
                isNow 
                  ? "bg-green-500 text-white" 
                  : "bg-primary text-primary-foreground"
              )}
            >
              {formatDaysUntil(event)}
            </Badge>
          )}
          
          {/* Arrow on hover */}
          <div className="absolute top-2 left-2 p-1.5 bg-white/20 rounded-full backdrop-blur-sm opacity-0 group-hover:opacity-100 transition-opacity">
            <ArrowRight className="h-3 w-3 text-white" />
          </div>
        </div>
        
        {/* Content */}
        <div className="p-3">
          <h3 className="font-semibold text-sm line-clamp-1 text-foreground">
            {event.name}
          </h3>
          <div className="flex items-center gap-1 mt-1 text-muted-foreground">
            <Calendar className="h-3 w-3" />
            <span className="text-xs">
              {event.date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
            </span>
          </div>
        </div>
      </Card>
    </Link>
  );
});

EventCard.displayName = 'EventCard';

// Month Navigation
const MonthNav = memo(({ 
  selectedMonth, 
  onMonthSelect,
  currentMonth 
}: { 
  selectedMonth: number; 
  onMonthSelect: (month: number) => void;
  currentMonth: number;
}) => {
  return (
    <div className="flex items-center justify-center gap-1 flex-wrap border-y py-3 mb-6">
      {monthNames.map((name, index) => {
        const month = index + 1;
        const isSelected = month === selectedMonth;
        const isCurrent = month === currentMonth;
        
        return (
          <button
            key={name}
            onClick={() => onMonthSelect(month)}
            className={cn(
              "px-3 py-1.5 text-sm font-medium rounded-full transition-all relative",
              isSelected 
                ? "bg-primary text-primary-foreground" 
                : "text-muted-foreground hover:text-foreground hover:bg-muted"
            )}
          >
            {name}
            {isCurrent && !isSelected && (
              <span className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-primary rounded-full" />
            )}
          </button>
        );
      })}
    </div>
  );
});

MonthNav.displayName = 'MonthNav';

export const CalendarCurations = memo(({ limit = 8 }: CalendarCurationsProps) => {
  const currentMonth = getCurrentMonth();
  const [selectedMonth, setSelectedMonth] = useState(currentMonth);
  
  const upcomingEvents = useMemo(() => getUpcomingEvents(6), []);
  const monthEvents = useMemo(() => getEventsByMonth(selectedMonth), [selectedMonth]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center space-y-2">
        <h2 className="text-2xl md:text-3xl font-bold text-foreground">
          Get ready for the holidays with our thematic curations
        </h2>
        <p className="text-muted-foreground">
          Find your inspiration for any occasion with our curated royalty-free content.
        </p>
      </div>
      
      {/* Upcoming Events Section */}
      <div className="bg-card rounded-xl p-6 border">
        <h3 className="font-semibold text-lg mb-4 text-foreground">Upcoming events</h3>
        
        <div className="relative">
          <div className="flex gap-4 overflow-x-auto pb-4 scrollbar-hide snap-x snap-mandatory">
            {upcomingEvents.map((event) => (
              <EventCard key={event.id} event={event} />
            ))}
          </div>
          
          {/* Fade indicator */}
          <div className="absolute right-0 top-0 bottom-4 w-12 bg-gradient-to-l from-card to-transparent pointer-events-none" />
        </div>
      </div>
      
      {/* Month Navigation */}
      <MonthNav 
        selectedMonth={selectedMonth} 
        onMonthSelect={setSelectedMonth}
        currentMonth={currentMonth}
      />
      
      {/* Monthly Events Grid */}
      <div>
        <h3 className="font-semibold text-xl mb-4 text-foreground">
          {fullMonthNames[selectedMonth - 1]}
        </h3>
        
        {monthEvents.length > 0 ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
            {monthEvents.map((event) => (
              <Link
                key={event.id}
                to={`/en/marketplace?search=${encodeURIComponent(event.searchQuery)}`}
                className="group"
              >
                <Card className="overflow-hidden border-0 shadow-md hover:shadow-xl transition-all duration-300 hover:scale-[1.02]">
                  <div className="aspect-[4/3] relative overflow-hidden">
                    <img 
                      src={event.image} 
                      alt={event.name}
                      className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-110"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
                    
                    {/* Event Icon */}
                    <div className="absolute bottom-2 left-2 p-1.5 bg-white/20 rounded-lg backdrop-blur-sm">
                      <event.icon className="h-4 w-4 text-white" />
                    </div>
                  </div>
                  
                  <div className="p-3">
                    <h4 className="font-medium text-sm line-clamp-1 text-foreground">
                      {event.name}
                    </h4>
                    <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">
                      {event.description}
                    </p>
                    <div className="flex items-center gap-1 mt-2 text-muted-foreground">
                      <Calendar className="h-3 w-3" />
                      <span className="text-xs">
                        {event.date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                        {event.endDate && ` - ${event.endDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`}
                      </span>
                    </div>
                  </div>
                </Card>
              </Link>
            ))}
          </div>
        ) : (
          <div className="text-center py-12 bg-muted/30 rounded-xl">
            <Calendar className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
            <p className="text-muted-foreground">No events in {fullMonthNames[selectedMonth - 1]}</p>
            <p className="text-sm text-muted-foreground mt-1">Check other months for upcoming events</p>
          </div>
        )}
      </div>

      {/* Category Filters */}
      <div className="flex flex-wrap gap-2 pt-4 justify-center">
        {['All Events', 'Holidays', 'Seasons', 'Marketing', 'Cultural', 'Sports'].map((category) => (
          <Badge 
            key={category}
            variant="outline" 
            className="text-xs cursor-pointer hover:bg-primary hover:text-primary-foreground transition-colors"
          >
            {category}
          </Badge>
        ))}
      </div>
    </div>
  );
});

CalendarCurations.displayName = 'CalendarCurations';
