import { Heart, Gift, Sun, Leaf, Snowflake, Sparkles, ShoppingBag, GraduationCap, Music, Moon, Star, Flame, PartyPopper, Calendar, TreePine, Egg, Ghost, Briefcase, Globe, Flag, Users, Clover, Trophy } from "lucide-react";
import { LucideIcon } from "lucide-react";

// Import calendar images
import blackHistoryMonthImg from "@/assets/calendar/black-history-month.jpg";
import valentinesDayImg from "@/assets/calendar/valentines-day.jpg";
import ramadanImg from "@/assets/calendar/ramadan.jpg";
import carnivalImg from "@/assets/calendar/carnival.jpg";
import chineseNewYearImg from "@/assets/calendar/chinese-new-year.jpg";
import easterImg from "@/assets/calendar/easter.jpg";
import mothersDayImg from "@/assets/calendar/mothers-day.jpg";
import fathersDayImg from "@/assets/calendar/fathers-day.jpg";
import prideMonthImg from "@/assets/calendar/pride-month.jpg";
import summerImg from "@/assets/calendar/summer.jpg";
import backToSchoolImg from "@/assets/calendar/back-to-school.jpg";
import halloweenImg from "@/assets/calendar/halloween.jpg";
import diwaliImg from "@/assets/calendar/diwali.jpg";
import blackFridayImg from "@/assets/calendar/black-friday.jpg";
import thanksgivingImg from "@/assets/calendar/thanksgiving.jpg";
import christmasImg from "@/assets/calendar/christmas.jpg";
import newYearImg from "@/assets/calendar/new-year.jpg";
import springImg from "@/assets/calendar/spring.jpg";
import autumnImg from "@/assets/calendar/autumn.jpg";
import winterImg from "@/assets/calendar/winter.jpg";
import stPatricksDayImg from "@/assets/calendar/st-patricks-day.jpg";
import womensDayImg from "@/assets/calendar/womens-day.jpg";
import earthDayImg from "@/assets/calendar/earth-day.jpg";
import memorialDayImg from "@/assets/calendar/memorial-day.jpg";
import cyberMondayImg from "@/assets/calendar/cyber-monday.jpg";
import independenceDayImg from "@/assets/calendar/independence-day.jpg";
import laborDayImg from "@/assets/calendar/labor-day.jpg";
import superBowlImg from "@/assets/calendar/super-bowl.jpg";

export interface CalendarEvent {
  id: string;
  name: string;
  date: Date;
  endDate?: Date;
  icon: LucideIcon;
  searchQuery: string;
  description: string;
  gradient: string;
  category: 'holiday' | 'season' | 'marketing' | 'cultural' | 'sports';
  image: string;
  month: number; // 1-12
}

// Calendar events for 2025-2026 with images
export const calendarEvents: CalendarEvent[] = [
  // January 2025
  {
    id: 'new-year-2025',
    name: 'New Year 2025',
    date: new Date('2025-01-01'),
    icon: PartyPopper,
    searchQuery: 'new year celebration party fireworks',
    description: 'Ring in the new year with style',
    gradient: 'from-violet-500 to-purple-600',
    category: 'holiday',
    image: newYearImg,
    month: 1
  },
  {
    id: 'chinese-new-year-2025',
    name: 'Chinese New Year',
    date: new Date('2025-01-29'),
    icon: Sparkles,
    searchQuery: 'chinese new year lunar dragon celebration',
    description: 'Year of the Snake celebrations',
    gradient: 'from-red-500 to-amber-500',
    category: 'cultural',
    image: chineseNewYearImg,
    month: 1
  },
  // February 2025
  {
    id: 'super-bowl-2025',
    name: 'Super Bowl',
    date: new Date('2025-02-09'),
    icon: Trophy,
    searchQuery: 'super bowl football sports championship',
    description: 'The big game celebrations',
    gradient: 'from-blue-600 to-red-500',
    category: 'sports',
    image: superBowlImg,
    month: 2
  },
  {
    id: 'black-history-month-2025',
    name: 'Black History Month',
    date: new Date('2025-02-01'),
    endDate: new Date('2025-02-28'),
    icon: Users,
    searchQuery: 'black history month african american culture heritage',
    description: 'Celebrating African American heritage',
    gradient: 'from-amber-600 to-orange-700',
    category: 'cultural',
    image: blackHistoryMonthImg,
    month: 2
  },
  {
    id: 'valentines-day-2025',
    name: "Valentine's Day",
    date: new Date('2025-02-14'),
    icon: Heart,
    searchQuery: 'valentine love heart romantic',
    description: 'Love & romance themed content',
    gradient: 'from-pink-500 to-rose-500',
    category: 'holiday',
    image: valentinesDayImg,
    month: 2
  },
  {
    id: 'carnival-2025',
    name: 'Carnival / Mardi Gras',
    date: new Date('2025-03-04'),
    icon: PartyPopper,
    searchQuery: 'carnival mardi gras masquerade parade festive',
    description: 'Colorful carnival celebrations',
    gradient: 'from-purple-500 to-yellow-500',
    category: 'cultural',
    image: carnivalImg,
    month: 2
  },
  // March 2025
  {
    id: 'ramadan-2025',
    name: 'Ramadan',
    date: new Date('2025-02-28'),
    endDate: new Date('2025-03-30'),
    icon: Moon,
    searchQuery: 'ramadan islamic moon prayer lantern',
    description: 'Holy month of Ramadan',
    gradient: 'from-emerald-500 to-teal-600',
    category: 'cultural',
    image: ramadanImg,
    month: 3
  },
  {
    id: 'womens-day-2025',
    name: "Int'l Women's Day",
    date: new Date('2025-03-08'),
    icon: Heart,
    searchQuery: 'womens day empowerment female strength',
    description: 'Celebrating women worldwide',
    gradient: 'from-purple-500 to-pink-500',
    category: 'cultural',
    image: womensDayImg,
    month: 3
  },
  {
    id: 'st-patricks-day-2025',
    name: "St. Patrick's Day",
    date: new Date('2025-03-17'),
    icon: Clover,
    searchQuery: 'st patricks day irish shamrock green lucky',
    description: 'Irish celebration & luck',
    gradient: 'from-green-500 to-emerald-600',
    category: 'holiday',
    image: stPatricksDayImg,
    month: 3
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
    category: 'season',
    image: springImg,
    month: 3
  },
  // April 2025
  {
    id: 'earth-day-2025',
    name: 'Earth Day',
    date: new Date('2025-04-22'),
    icon: Globe,
    searchQuery: 'earth day environment nature sustainability green',
    description: 'Environmental awareness',
    gradient: 'from-green-500 to-blue-500',
    category: 'cultural',
    image: earthDayImg,
    month: 4
  },
  {
    id: 'easter-2025',
    name: 'Easter',
    date: new Date('2025-04-20'),
    icon: Egg,
    searchQuery: 'easter eggs bunny spring celebration',
    description: 'Easter celebrations & spring joy',
    gradient: 'from-violet-400 to-purple-500',
    category: 'holiday',
    image: easterImg,
    month: 4
  },
  // May 2025
  {
    id: 'mothers-day-2025',
    name: "Mother's Day",
    date: new Date('2025-05-11'),
    icon: Heart,
    searchQuery: 'mother mom family love flowers',
    description: 'Celebrate mothers everywhere',
    gradient: 'from-pink-400 to-fuchsia-500',
    category: 'holiday',
    image: mothersDayImg,
    month: 5
  },
  {
    id: 'memorial-day-2025',
    name: 'Memorial Day',
    date: new Date('2025-05-26'),
    icon: Flag,
    searchQuery: 'memorial day patriotic american flag tribute',
    description: 'Honoring those who served',
    gradient: 'from-red-500 to-blue-600',
    category: 'holiday',
    image: memorialDayImg,
    month: 5
  },
  // June 2025
  {
    id: 'pride-month-2025',
    name: 'Pride Month',
    date: new Date('2025-06-01'),
    endDate: new Date('2025-06-30'),
    icon: Star,
    searchQuery: 'pride rainbow lgbtq celebration diversity',
    description: 'Celebrate diversity & inclusion',
    gradient: 'from-red-500 via-yellow-500 to-blue-500',
    category: 'cultural',
    image: prideMonthImg,
    month: 6
  },
  {
    id: 'fathers-day-2025',
    name: "Father's Day",
    date: new Date('2025-06-15'),
    icon: Gift,
    searchQuery: 'father dad family love gift',
    description: 'Celebrate fathers everywhere',
    gradient: 'from-blue-500 to-indigo-500',
    category: 'holiday',
    image: fathersDayImg,
    month: 6
  },
  {
    id: 'summer-2025',
    name: 'Summer Season',
    date: new Date('2025-06-21'),
    endDate: new Date('2025-09-22'),
    icon: Sun,
    searchQuery: 'summer beach vacation sun travel',
    description: 'Summer vibes & vacation content',
    gradient: 'from-amber-400 to-orange-500',
    category: 'season',
    image: summerImg,
    month: 6
  },
  // July 2025
  {
    id: 'independence-day-2025',
    name: 'Independence Day',
    date: new Date('2025-07-04'),
    icon: Flag,
    searchQuery: 'fourth july independence day fireworks patriotic',
    description: '4th of July celebrations',
    gradient: 'from-red-500 to-blue-600',
    category: 'holiday',
    image: independenceDayImg,
    month: 7
  },
  // August 2025
  {
    id: 'back-to-school-2025',
    name: 'Back to School',
    date: new Date('2025-08-15'),
    endDate: new Date('2025-09-15'),
    icon: GraduationCap,
    searchQuery: 'school education student learning books',
    description: 'Education & learning content',
    gradient: 'from-blue-400 to-cyan-500',
    category: 'marketing',
    image: backToSchoolImg,
    month: 8
  },
  // September 2025
  {
    id: 'labor-day-2025',
    name: 'Labor Day',
    date: new Date('2025-09-01'),
    icon: Briefcase,
    searchQuery: 'labor day workers american end summer',
    description: 'Honoring American workers',
    gradient: 'from-blue-500 to-red-500',
    category: 'holiday',
    image: laborDayImg,
    month: 9
  },
  {
    id: 'autumn-2025',
    name: 'Autumn Season',
    date: new Date('2025-09-23'),
    endDate: new Date('2025-12-20'),
    icon: Leaf,
    searchQuery: 'autumn fall leaves orange harvest',
    description: 'Fall colors & harvest themes',
    gradient: 'from-orange-500 to-red-500',
    category: 'season',
    image: autumnImg,
    month: 9
  },
  // October 2025
  {
    id: 'diwali-2025',
    name: 'Diwali',
    date: new Date('2025-10-20'),
    icon: Flame,
    searchQuery: 'diwali lights festival hindu celebration',
    description: 'Festival of lights',
    gradient: 'from-amber-500 to-orange-600',
    category: 'cultural',
    image: diwaliImg,
    month: 10
  },
  {
    id: 'halloween-2025',
    name: 'Halloween',
    date: new Date('2025-10-31'),
    icon: Ghost,
    searchQuery: 'halloween spooky scary pumpkin costume',
    description: 'Spooky & fun Halloween content',
    gradient: 'from-orange-500 to-purple-600',
    category: 'holiday',
    image: halloweenImg,
    month: 10
  },
  // November 2025
  {
    id: 'thanksgiving-2025',
    name: 'Thanksgiving',
    date: new Date('2025-11-27'),
    icon: Leaf,
    searchQuery: 'thanksgiving harvest turkey family dinner autumn',
    description: 'Gratitude & family celebrations',
    gradient: 'from-amber-500 to-orange-600',
    category: 'holiday',
    image: thanksgivingImg,
    month: 11
  },
  {
    id: 'black-friday-2025',
    name: 'Black Friday',
    date: new Date('2025-11-28'),
    icon: ShoppingBag,
    searchQuery: 'sale shopping discount black friday deals',
    description: 'Shopping & sales promotions',
    gradient: 'from-gray-800 to-gray-900',
    category: 'marketing',
    image: blackFridayImg,
    month: 11
  },
  // December 2025
  {
    id: 'cyber-monday-2025',
    name: 'Cyber Monday',
    date: new Date('2025-12-01'),
    icon: Sparkles,
    searchQuery: 'cyber monday online shopping tech deals',
    description: 'Online shopping & tech deals',
    gradient: 'from-cyan-500 to-blue-600',
    category: 'marketing',
    image: cyberMondayImg,
    month: 12
  },
  {
    id: 'winter-2025',
    name: 'Winter Season',
    date: new Date('2025-12-21'),
    endDate: new Date('2026-03-19'),
    icon: Snowflake,
    searchQuery: 'winter snow cold christmas cozy',
    description: 'Winter wonderland & cozy vibes',
    gradient: 'from-blue-300 to-cyan-400',
    category: 'season',
    image: winterImg,
    month: 12
  },
  {
    id: 'christmas-2025',
    name: 'Christmas',
    date: new Date('2025-12-25'),
    icon: TreePine,
    searchQuery: 'christmas holiday winter gift celebration',
    description: 'Holiday cheer & celebrations',
    gradient: 'from-red-500 to-green-600',
    category: 'holiday',
    image: christmasImg,
    month: 12
  },
  {
    id: 'new-year-2026',
    name: 'New Year 2026',
    date: new Date('2026-01-01'),
    icon: PartyPopper,
    searchQuery: 'new year celebration party fireworks',
    description: 'Ring in the new year',
    gradient: 'from-violet-500 to-purple-600',
    category: 'holiday',
    image: newYearImg,
    month: 1
  },
];

// Month names for navigation
export const monthNames = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
];

export const fullMonthNames = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

/**
 * Get events for a specific month
 */
export function getEventsByMonth(month: number): CalendarEvent[] {
  return calendarEvents.filter(event => event.month === month);
}

/**
 * Get upcoming events sorted by date, filtering out past events
 */
export function getUpcomingEvents(limit: number = 8): CalendarEvent[] {
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  
  return calendarEvents
    .filter(event => {
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

/**
 * Get current month (1-12)
 */
export function getCurrentMonth(): number {
  return new Date().getMonth() + 1;
}
