import { Heart, Gift, Sun, Leaf, Snowflake, Sparkles, ShoppingBag, GraduationCap, Music, Moon, Star, Flame, PartyPopper, Calendar, TreePine, Egg, Ghost, Briefcase } from "lucide-react";
import { LucideIcon } from "lucide-react";

export interface CalendarEvent {
  id: string;
  name: string;
  date: Date;
  endDate?: Date; // For events that span multiple days
  icon: LucideIcon;
  searchQuery: string;
  description: string;
  gradient: string; // Tailwind gradient classes
  category: 'holiday' | 'season' | 'marketing' | 'cultural';
}

// Calendar events for 2025-2026
export const calendarEvents: CalendarEvent[] = [
  // Q1 2025
  {
    id: 'valentines-day-2025',
    name: "Valentine's Day",
    date: new Date('2025-02-14'),
    icon: Heart,
    searchQuery: 'valentine love heart romantic',
    description: 'Love & romance themed content',
    gradient: 'from-pink-500 to-rose-500',
    category: 'holiday'
  },
  {
    id: 'chinese-new-year-2025',
    name: 'Chinese New Year',
    date: new Date('2025-01-29'),
    icon: Sparkles,
    searchQuery: 'chinese new year lunar dragon celebration',
    description: 'Year of the Snake celebrations',
    gradient: 'from-red-500 to-amber-500',
    category: 'cultural'
  },
  {
    id: 'spring-2025',
    name: 'Spring Season',
    date: new Date('2025-03-20'),
    endDate: new Date('2025-06-20'),
    icon: Sun,
    searchQuery: 'spring flowers bloom nature fresh',
    description: 'Fresh spring imagery & nature',
    gradient: 'from-green-400 to-emerald-500',
    category: 'season'
  },
  {
    id: 'easter-2025',
    name: 'Easter',
    date: new Date('2025-04-20'),
    icon: Egg,
    searchQuery: 'easter eggs bunny spring celebration',
    description: 'Easter celebrations & spring joy',
    gradient: 'from-violet-400 to-purple-500',
    category: 'holiday'
  },
  {
    id: 'mothers-day-2025',
    name: "Mother's Day",
    date: new Date('2025-05-11'),
    icon: Heart,
    searchQuery: 'mother mom family love flowers',
    description: 'Celebrate mothers everywhere',
    gradient: 'from-pink-400 to-fuchsia-500',
    category: 'holiday'
  },
  // Q2-Q3 2025
  {
    id: 'summer-2025',
    name: 'Summer Season',
    date: new Date('2025-06-21'),
    endDate: new Date('2025-09-22'),
    icon: Sun,
    searchQuery: 'summer beach vacation sun travel',
    description: 'Summer vibes & vacation content',
    gradient: 'from-amber-400 to-orange-500',
    category: 'season'
  },
  {
    id: 'fathers-day-2025',
    name: "Father's Day",
    date: new Date('2025-06-15'),
    icon: Gift,
    searchQuery: 'father dad family love gift',
    description: 'Celebrate fathers everywhere',
    gradient: 'from-blue-500 to-indigo-500',
    category: 'holiday'
  },
  {
    id: 'back-to-school-2025',
    name: 'Back to School',
    date: new Date('2025-08-15'),
    endDate: new Date('2025-09-15'),
    icon: GraduationCap,
    searchQuery: 'school education student learning books',
    description: 'Education & learning content',
    gradient: 'from-blue-400 to-cyan-500',
    category: 'marketing'
  },
  // Q4 2025
  {
    id: 'autumn-2025',
    name: 'Autumn Season',
    date: new Date('2025-09-23'),
    endDate: new Date('2025-12-20'),
    icon: Leaf,
    searchQuery: 'autumn fall leaves orange harvest',
    description: 'Fall colors & harvest themes',
    gradient: 'from-orange-500 to-red-500',
    category: 'season'
  },
  {
    id: 'halloween-2025',
    name: 'Halloween',
    date: new Date('2025-10-31'),
    icon: Ghost,
    searchQuery: 'halloween spooky scary pumpkin costume',
    description: 'Spooky & fun Halloween content',
    gradient: 'from-orange-500 to-purple-600',
    category: 'holiday'
  },
  {
    id: 'black-friday-2025',
    name: 'Black Friday',
    date: new Date('2025-11-28'),
    icon: ShoppingBag,
    searchQuery: 'sale shopping discount black friday deals',
    description: 'Shopping & sales promotions',
    gradient: 'from-gray-800 to-gray-900',
    category: 'marketing'
  },
  {
    id: 'cyber-monday-2025',
    name: 'Cyber Monday',
    date: new Date('2025-12-01'),
    icon: Sparkles,
    searchQuery: 'cyber monday online shopping tech deals',
    description: 'Online shopping & tech deals',
    gradient: 'from-cyan-500 to-blue-600',
    category: 'marketing'
  },
  {
    id: 'christmas-2025',
    name: 'Christmas',
    date: new Date('2025-12-25'),
    icon: TreePine,
    searchQuery: 'christmas holiday winter gift celebration',
    description: 'Holiday cheer & celebrations',
    gradient: 'from-red-500 to-green-600',
    category: 'holiday'
  },
  {
    id: 'new-year-2026',
    name: 'New Year 2026',
    date: new Date('2026-01-01'),
    icon: PartyPopper,
    searchQuery: 'new year celebration party fireworks',
    description: 'Ring in the new year',
    gradient: 'from-violet-500 to-purple-600',
    category: 'holiday'
  },
  // Winter 2025-2026
  {
    id: 'winter-2025',
    name: 'Winter Season',
    date: new Date('2025-12-21'),
    endDate: new Date('2026-03-19'),
    icon: Snowflake,
    searchQuery: 'winter snow cold christmas cozy',
    description: 'Winter wonderland & cozy vibes',
    gradient: 'from-blue-300 to-cyan-400',
    category: 'season'
  },
  // 2026 Events
  {
    id: 'valentines-day-2026',
    name: "Valentine's Day 2026",
    date: new Date('2026-02-14'),
    icon: Heart,
    searchQuery: 'valentine love heart romantic',
    description: 'Love & romance themed content',
    gradient: 'from-pink-500 to-rose-500',
    category: 'holiday'
  },
  {
    id: 'ramadan-2026',
    name: 'Ramadan',
    date: new Date('2026-02-17'),
    endDate: new Date('2026-03-18'),
    icon: Moon,
    searchQuery: 'ramadan islamic moon prayer',
    description: 'Holy month of Ramadan',
    gradient: 'from-emerald-500 to-teal-600',
    category: 'cultural'
  },
  {
    id: 'diwali-2025',
    name: 'Diwali',
    date: new Date('2025-10-20'),
    icon: Flame,
    searchQuery: 'diwali lights festival hindu celebration',
    description: 'Festival of lights',
    gradient: 'from-amber-500 to-orange-600',
    category: 'cultural'
  },
  {
    id: 'pride-month-2025',
    name: 'Pride Month',
    date: new Date('2025-06-01'),
    endDate: new Date('2025-06-30'),
    icon: Star,
    searchQuery: 'pride rainbow lgbtq celebration diversity',
    description: 'Celebrate diversity & inclusion',
    gradient: 'from-red-500 via-yellow-500 to-blue-500',
    category: 'cultural'
  },
  {
    id: 'tax-season-2025',
    name: 'Tax Season',
    date: new Date('2025-01-01'),
    endDate: new Date('2025-04-15'),
    icon: Briefcase,
    searchQuery: 'tax finance business accounting money',
    description: 'Finance & business content',
    gradient: 'from-slate-500 to-slate-700',
    category: 'marketing'
  },
];

/**
 * Get upcoming events sorted by date, filtering out past events
 * @param limit Maximum number of events to return
 */
export function getUpcomingEvents(limit: number = 8): CalendarEvent[] {
  const now = new Date();
  now.setHours(0, 0, 0, 0); // Start of today
  
  return calendarEvents
    .filter(event => {
      // Include if the event date is in the future, or if it's an ongoing event
      const eventEnd = event.endDate || event.date;
      return eventEnd >= now;
    })
    .sort((a, b) => a.date.getTime() - b.date.getTime())
    .slice(0, limit);
}

/**
 * Calculate days until an event
 */
export function getDaysUntil(date: Date): number {
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const eventDate = new Date(date);
  eventDate.setHours(0, 0, 0, 0);
  
  const diffTime = eventDate.getTime() - now.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  
  return diffDays;
}

/**
 * Format days until display text
 */
export function formatDaysUntil(event: CalendarEvent): string {
  const days = getDaysUntil(event.date);
  
  if (days < 0) {
    // Check if it's an ongoing event
    if (event.endDate && getDaysUntil(event.endDate) >= 0) {
      return 'Now';
    }
    return 'Past';
  }
  
  if (days === 0) return 'Today';
  if (days === 1) return 'Tomorrow';
  if (days <= 7) return `${days} days`;
  if (days <= 14) return `${Math.ceil(days / 7)} week${days > 7 ? 's' : ''}`;
  if (days <= 30) return `${Math.ceil(days / 7)} weeks`;
  
  return `${Math.floor(days / 30)} month${days >= 60 ? 's' : ''}`;
}
