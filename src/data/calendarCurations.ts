import {
  Heart, Gift, Sun, Leaf, Snowflake, Sparkles, ShoppingBag, GraduationCap,
  Moon, Star, Flame, PartyPopper, Calendar, TreePine, Egg, Ghost, Briefcase,
  Globe, Flag, Users, Clover, Trophy, Music, Beer, Skull, HandHeart, Baby,
  Cake, Utensils, Award, Rocket, Bike
} from "lucide-react";
import { LucideIcon } from "lucide-react";

// Calendar images
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
  themeId: string;
  description: string;
  gradient: string;
  category: 'holiday' | 'season' | 'marketing' | 'cultural' | 'sports';
  image: string;
  month: number;
}

// ---------------------------------------------------------------------------
// Recurrence helpers — every event is generated year-by-year so the calendar
// never needs manual updates.
// ---------------------------------------------------------------------------

type Recurrence =
  | { type: 'fixed'; month: number; day: number; endMonth?: number; endDay?: number; endYearOffset?: number }
  | { type: 'nth-weekday'; month: number; weekday: number; n: number; durationDays?: number; offsetDays?: number }
  | { type: 'last-weekday'; month: number; weekday: number; durationDays?: number }
  | { type: 'lookup'; dates: Record<number, { start: string; end?: string }> };

interface RecurringDef {
  id: string;
  name: string;
  icon: LucideIcon;
  searchQuery: string;
  themeId: string;
  description: string;
  gradient: string;
  category: CalendarEvent['category'];
  image: string;
  recurrence: Recurrence;
  /** For weekday-relative events like Black Friday: base id + day offset */
  relativeTo?: { defId: string; offsetDays: number };
}

function nthWeekdayOfMonth(year: number, month: number, weekday: number, n: number): Date {
  const first = new Date(year, month - 1, 1);
  const offset = (weekday - first.getDay() + 7) % 7;
  return new Date(year, month - 1, 1 + offset + (n - 1) * 7);
}

function lastWeekdayOfMonth(year: number, month: number, weekday: number): Date {
  const last = new Date(year, month, 0);
  const offset = (last.getDay() - weekday + 7) % 7;
  return new Date(year, month - 1, last.getDate() - offset);
}

function addDays(d: Date, n: number): Date {
  const copy = new Date(d);
  copy.setDate(copy.getDate() + n);
  return copy;
}

function parseYMD(s: string): Date {
  const [y, m, d] = s.split('-').map(Number);
  return new Date(y, m - 1, d);
}

// ---------------------------------------------------------------------------
// Lookup tables for lunar / computed holidays (2025-2032).
// ---------------------------------------------------------------------------

const chineseNewYearDates: Record<number, string> = {
  2025: '2025-01-29', 2026: '2026-02-17', 2027: '2027-02-06', 2028: '2028-01-26',
  2029: '2029-02-13', 2030: '2030-02-03', 2031: '2031-01-23', 2032: '2032-02-11',
};

const easterDates: Record<number, string> = {
  2025: '2025-04-20', 2026: '2026-04-05', 2027: '2027-03-28', 2028: '2028-04-16',
  2029: '2029-04-01', 2030: '2030-04-21', 2031: '2031-04-13', 2032: '2032-03-28',
};

const ramadanDates: Record<number, { start: string; end: string }> = {
  2025: { start: '2025-02-28', end: '2025-03-30' },
  2026: { start: '2026-02-17', end: '2026-03-19' },
  2027: { start: '2027-02-06', end: '2027-03-07' },
  2028: { start: '2028-01-27', end: '2028-02-25' },
  2029: { start: '2029-01-15', end: '2029-02-13' },
  2030: { start: '2030-01-05', end: '2030-02-03' },
  2031: { start: '2031-12-25', end: '2032-01-23' },
  2032: { start: '2032-12-14', end: '2033-01-12' },
};

const eidAlFitrDates: Record<number, string> = {
  2025: '2025-03-30', 2026: '2026-03-20', 2027: '2027-03-08', 2028: '2028-02-26',
  2029: '2029-02-14', 2030: '2030-02-04', 2031: '2031-01-24', 2032: '2032-01-14',
};

const eidAlAdhaDates: Record<number, string> = {
  2025: '2025-06-06', 2026: '2026-05-27', 2027: '2027-05-16', 2028: '2028-05-05',
  2029: '2029-04-24', 2030: '2030-04-13', 2031: '2031-04-02', 2032: '2032-03-22',
};

const diwaliDates: Record<number, string> = {
  2025: '2025-10-20', 2026: '2026-11-08', 2027: '2027-10-29', 2028: '2028-10-17',
  2029: '2029-11-05', 2030: '2030-10-26', 2031: '2031-11-14', 2032: '2032-11-02',
};

const roshHashanahDates: Record<number, string> = {
  2025: '2025-09-23', 2026: '2026-09-12', 2027: '2027-10-02', 2028: '2028-09-21',
  2029: '2029-09-10', 2030: '2030-09-28', 2031: '2031-09-18', 2032: '2032-09-06',
};

const yomKippurDates: Record<number, string> = {
  2025: '2025-10-02', 2026: '2026-09-21', 2027: '2027-10-11', 2028: '2028-09-30',
  2029: '2029-09-19', 2030: '2030-10-07', 2031: '2031-09-27', 2032: '2032-09-15',
};

const hanukkahDates: Record<number, { start: string; end: string }> = {
  2025: { start: '2025-12-14', end: '2025-12-22' },
  2026: { start: '2026-12-04', end: '2026-12-12' },
  2027: { start: '2027-12-24', end: '2028-01-01' },
  2028: { start: '2028-12-12', end: '2028-12-20' },
  2029: { start: '2029-12-01', end: '2029-12-09' },
  2030: { start: '2030-12-20', end: '2030-12-28' },
  2031: { start: '2031-12-09', end: '2031-12-17' },
  2032: { start: '2032-11-27', end: '2032-12-05' },
};

const passoverDates: Record<number, { start: string; end: string }> = {
  2025: { start: '2025-04-12', end: '2025-04-20' },
  2026: { start: '2026-04-01', end: '2026-04-09' },
  2027: { start: '2027-04-21', end: '2027-04-29' },
  2028: { start: '2028-04-10', end: '2028-04-18' },
  2029: { start: '2029-03-30', end: '2029-04-07' },
  2030: { start: '2030-04-17', end: '2030-04-25' },
  2031: { start: '2031-04-07', end: '2031-04-15' },
  2032: { start: '2032-03-26', end: '2032-04-03' },
};

const carnivalDates: Record<number, string> = {
  // Mardi Gras / Fat Tuesday (day before Ash Wednesday)
  2025: '2025-03-04', 2026: '2026-02-17', 2027: '2027-02-09', 2028: '2028-02-29',
  2029: '2029-02-13', 2030: '2030-03-05', 2031: '2031-02-25', 2032: '2032-02-10',
};

// ---------------------------------------------------------------------------
// Recurring event definitions
// ---------------------------------------------------------------------------

const recurringDefs: RecurringDef[] = [
  // JANUARY
  { id: 'new-year', name: 'New Year', icon: PartyPopper, searchQuery: 'new year celebration party fireworks', themeId: 'new year',
    description: 'Ring in the new year with style', gradient: 'from-violet-500 to-purple-600', category: 'holiday', image: newYearImg,
    recurrence: { type: 'fixed', month: 1, day: 1 } },
  { id: 'mlk-day', name: 'MLK Jr. Day', icon: Users, searchQuery: 'martin luther king civil rights equality', themeId: 'mlk',
    description: 'Civil rights & equality', gradient: 'from-amber-600 to-red-600', category: 'cultural', image: blackHistoryMonthImg,
    recurrence: { type: 'nth-weekday', month: 1, weekday: 1, n: 3 } },
  { id: 'chinese-new-year', name: 'Chinese New Year', icon: Sparkles, searchQuery: 'chinese new year lunar dragon celebration', themeId: 'chinese new year',
    description: 'Lunar new year celebrations', gradient: 'from-red-500 to-amber-500', category: 'cultural', image: chineseNewYearImg,
    recurrence: { type: 'lookup', dates: Object.fromEntries(Object.entries(chineseNewYearDates).map(([y, d]) => [y, { start: d }])) } },
  { id: 'australia-day', name: 'Australia Day', icon: Flag, searchQuery: 'australia day national holiday', themeId: 'australia day',
    description: 'National day of Australia', gradient: 'from-blue-500 to-red-500', category: 'holiday', image: independenceDayImg,
    recurrence: { type: 'fixed', month: 1, day: 26 } },

  // FEBRUARY
  { id: 'groundhog-day', name: 'Groundhog Day', icon: Sun, searchQuery: 'groundhog day winter spring prediction', themeId: 'groundhog',
    description: 'Winter or spring?', gradient: 'from-slate-500 to-blue-500', category: 'cultural', image: winterImg,
    recurrence: { type: 'fixed', month: 2, day: 2 } },
  { id: 'super-bowl', name: 'Super Bowl Sunday', icon: Trophy, searchQuery: 'super bowl football sports championship', themeId: 'super bowl',
    description: 'The big game', gradient: 'from-blue-600 to-red-500', category: 'sports', image: superBowlImg,
    recurrence: { type: 'nth-weekday', month: 2, weekday: 0, n: 2 } },
  { id: 'black-history-month', name: 'Black History Month', icon: Users, searchQuery: 'black history month african american heritage', themeId: 'black history',
    description: 'Celebrating Black heritage', gradient: 'from-amber-600 to-orange-700', category: 'cultural', image: blackHistoryMonthImg,
    recurrence: { type: 'fixed', month: 2, day: 1, endMonth: 2, endDay: 28 } },
  { id: 'valentines-day', name: "Valentine's Day", icon: Heart, searchQuery: 'valentine love heart romantic couple', themeId: 'valentine',
    description: 'Love & romance', gradient: 'from-pink-500 to-rose-500', category: 'holiday', image: valentinesDayImg,
    recurrence: { type: 'fixed', month: 2, day: 14 } },
  { id: 'presidents-day', name: "Presidents' Day", icon: Flag, searchQuery: 'presidents day patriotic american flag', themeId: 'presidents day',
    description: 'US Presidents honored', gradient: 'from-blue-600 to-red-600', category: 'holiday', image: independenceDayImg,
    recurrence: { type: 'nth-weekday', month: 2, weekday: 1, n: 3 } },
  { id: 'carnival', name: 'Carnival / Mardi Gras', icon: PartyPopper, searchQuery: 'carnival mardi gras masquerade parade festive', themeId: 'carnival',
    description: 'Colorful carnival celebrations', gradient: 'from-purple-500 to-yellow-500', category: 'cultural', image: carnivalImg,
    recurrence: { type: 'lookup', dates: Object.fromEntries(Object.entries(carnivalDates).map(([y, d]) => [y, { start: d }])) } },

  // MARCH
  { id: 'ramadan', name: 'Ramadan', icon: Moon, searchQuery: 'ramadan islamic mosque prayer lantern', themeId: 'ramadan',
    description: 'Holy month of Ramadan', gradient: 'from-emerald-500 to-teal-600', category: 'cultural', image: ramadanImg,
    recurrence: { type: 'lookup', dates: ramadanDates } },
  { id: 'womens-day', name: "Int'l Women's Day", icon: Heart, searchQuery: 'womens day empowerment female strength', themeId: 'womens day',
    description: 'Celebrating women worldwide', gradient: 'from-purple-500 to-pink-500', category: 'cultural', image: womensDayImg,
    recurrence: { type: 'fixed', month: 3, day: 8 } },
  { id: 'pi-day', name: 'Pi Day', icon: Cake, searchQuery: 'pi day math science education', themeId: 'pi day',
    description: 'Math, science & pie', gradient: 'from-blue-500 to-cyan-500', category: 'cultural', image: backToSchoolImg,
    recurrence: { type: 'fixed', month: 3, day: 14 } },
  { id: 'st-patricks-day', name: "St. Patrick's Day", icon: Clover, searchQuery: 'st patricks day irish shamrock green lucky', themeId: 'st patrick',
    description: 'Irish celebration & luck', gradient: 'from-green-500 to-emerald-600', category: 'holiday', image: stPatricksDayImg,
    recurrence: { type: 'fixed', month: 3, day: 17 } },
  { id: 'spring', name: 'Spring Season', icon: Sun, searchQuery: 'spring flowers bloom nature fresh', themeId: 'spring',
    description: 'Fresh spring imagery', gradient: 'from-green-400 to-emerald-500', category: 'season', image: springImg,
    recurrence: { type: 'fixed', month: 3, day: 20, endMonth: 6, endDay: 20 } },
  { id: 'world-water-day', name: 'World Water Day', icon: Globe, searchQuery: 'water conservation environment blue', themeId: 'water day',
    description: 'Global water awareness', gradient: 'from-blue-400 to-cyan-500', category: 'cultural', image: earthDayImg,
    recurrence: { type: 'fixed', month: 3, day: 22 } },

  // APRIL
  { id: 'april-fools', name: "April Fools' Day", icon: PartyPopper, searchQuery: 'april fools prank humor funny', themeId: 'april fools',
    description: 'Pranks & humor', gradient: 'from-yellow-400 to-orange-500', category: 'cultural', image: carnivalImg,
    recurrence: { type: 'fixed', month: 4, day: 1 } },
  { id: 'easter', name: 'Easter Sunday', icon: Egg, searchQuery: 'easter eggs bunny spring celebration', themeId: 'easter',
    description: 'Easter & spring joy', gradient: 'from-violet-400 to-purple-500', category: 'holiday', image: easterImg,
    recurrence: { type: 'lookup', dates: Object.fromEntries(Object.entries(easterDates).map(([y, d]) => [y, { start: d }])) } },
  { id: 'passover', name: 'Passover', icon: Star, searchQuery: 'passover jewish seder pesach tradition', themeId: 'passover',
    description: 'Jewish festival of freedom', gradient: 'from-indigo-500 to-blue-600', category: 'cultural', image: ramadanImg,
    recurrence: { type: 'lookup', dates: passoverDates } },
  { id: 'earth-day', name: 'Earth Day', icon: Globe, searchQuery: 'earth day environment nature sustainability green', themeId: 'earth day',
    description: 'Environmental awareness', gradient: 'from-green-500 to-blue-500', category: 'cultural', image: earthDayImg,
    recurrence: { type: 'fixed', month: 4, day: 22 } },
  { id: 'arbor-day', name: 'Arbor Day', icon: TreePine, searchQuery: 'arbor day tree planting nature forest', themeId: 'arbor day',
    description: 'Plant a tree', gradient: 'from-green-600 to-lime-500', category: 'cultural', image: earthDayImg,
    recurrence: { type: 'nth-weekday', month: 4, weekday: 5, n: 4 } },
  { id: 'eid-al-fitr', name: 'Eid al-Fitr', icon: Moon, searchQuery: 'eid al fitr celebration muslim family', themeId: 'eid',
    description: 'End of Ramadan celebration', gradient: 'from-emerald-500 to-teal-500', category: 'cultural', image: ramadanImg,
    recurrence: { type: 'lookup', dates: Object.fromEntries(Object.entries(eidAlFitrDates).map(([y, d]) => [y, { start: d }])) } },

  // MAY
  { id: 'may-day', name: 'May Day / Labour Day', icon: Briefcase, searchQuery: 'may day international workers labour', themeId: 'may day',
    description: 'International Workers Day', gradient: 'from-red-500 to-orange-500', category: 'holiday', image: laborDayImg,
    recurrence: { type: 'fixed', month: 5, day: 1 } },
  { id: 'cinco-de-mayo', name: 'Cinco de Mayo', icon: PartyPopper, searchQuery: 'cinco de mayo mexican fiesta celebration', themeId: 'cinco de mayo',
    description: 'Mexican heritage & fiesta', gradient: 'from-green-500 to-red-500', category: 'cultural', image: carnivalImg,
    recurrence: { type: 'fixed', month: 5, day: 5 } },
  { id: 'mothers-day', name: "Mother's Day", icon: Heart, searchQuery: 'mother mom family love flowers', themeId: 'mother',
    description: 'Celebrate mothers everywhere', gradient: 'from-pink-400 to-fuchsia-500', category: 'holiday', image: mothersDayImg,
    recurrence: { type: 'nth-weekday', month: 5, weekday: 0, n: 2 } },
  { id: 'nurses-day', name: 'International Nurses Day', icon: HandHeart, searchQuery: 'nurses healthcare medical hospital', themeId: 'nurses day',
    description: 'Honoring nurses worldwide', gradient: 'from-cyan-400 to-blue-500', category: 'cultural', image: mothersDayImg,
    recurrence: { type: 'fixed', month: 5, day: 12 } },
  { id: 'memorial-day', name: 'Memorial Day', icon: Flag, searchQuery: 'memorial day patriotic american flag tribute', themeId: 'memorial day',
    description: 'Honoring those who served', gradient: 'from-red-500 to-blue-600', category: 'holiday', image: memorialDayImg,
    recurrence: { type: 'last-weekday', month: 5, weekday: 1 } },

  // JUNE
  { id: 'pride-month', name: 'Pride Month', icon: Star, searchQuery: 'pride rainbow lgbtq celebration diversity', themeId: 'pride',
    description: 'Celebrate diversity & inclusion', gradient: 'from-red-500 via-yellow-500 to-blue-500', category: 'cultural', image: prideMonthImg,
    recurrence: { type: 'fixed', month: 6, day: 1, endMonth: 6, endDay: 30 } },
  { id: 'world-oceans-day', name: 'World Oceans Day', icon: Globe, searchQuery: 'ocean sea marine blue nature', themeId: 'oceans day',
    description: 'Protect our oceans', gradient: 'from-blue-500 to-cyan-600', category: 'cultural', image: earthDayImg,
    recurrence: { type: 'fixed', month: 6, day: 8 } },
  { id: 'fathers-day', name: "Father's Day", icon: Gift, searchQuery: 'father dad family love gift', themeId: 'father',
    description: 'Celebrate fathers everywhere', gradient: 'from-blue-500 to-indigo-500', category: 'holiday', image: fathersDayImg,
    recurrence: { type: 'nth-weekday', month: 6, weekday: 0, n: 3 } },
  { id: 'juneteenth', name: 'Juneteenth', icon: Users, searchQuery: 'juneteenth freedom african american heritage', themeId: 'juneteenth',
    description: 'Freedom day celebration', gradient: 'from-red-600 to-green-600', category: 'cultural', image: blackHistoryMonthImg,
    recurrence: { type: 'fixed', month: 6, day: 19 } },
  { id: 'summer', name: 'Summer Season', icon: Sun, searchQuery: 'summer beach vacation sun travel', themeId: 'summer',
    description: 'Summer vibes & vacation', gradient: 'from-amber-400 to-orange-500', category: 'season', image: summerImg,
    recurrence: { type: 'fixed', month: 6, day: 21, endMonth: 9, endDay: 22 } },
  { id: 'eid-al-adha', name: 'Eid al-Adha', icon: Moon, searchQuery: 'eid al adha muslim celebration family', themeId: 'eid al adha',
    description: 'Festival of Sacrifice', gradient: 'from-teal-500 to-emerald-600', category: 'cultural', image: ramadanImg,
    recurrence: { type: 'lookup', dates: Object.fromEntries(Object.entries(eidAlAdhaDates).map(([y, d]) => [y, { start: d }])) } },

  // JULY
  { id: 'canada-day', name: 'Canada Day', icon: Flag, searchQuery: 'canada day maple leaf national', themeId: 'canada day',
    description: 'National day of Canada', gradient: 'from-red-500 to-red-700', category: 'holiday', image: independenceDayImg,
    recurrence: { type: 'fixed', month: 7, day: 1 } },
  { id: 'independence-day', name: 'Independence Day (US)', icon: Flag, searchQuery: 'fourth july independence day fireworks patriotic', themeId: 'independence day',
    description: '4th of July celebrations', gradient: 'from-red-500 to-blue-600', category: 'holiday', image: independenceDayImg,
    recurrence: { type: 'fixed', month: 7, day: 4 } },
  { id: 'bastille-day', name: 'Bastille Day', icon: Flag, searchQuery: 'bastille day france french national', themeId: 'bastille day',
    description: 'French national day', gradient: 'from-blue-600 to-red-500', category: 'holiday', image: independenceDayImg,
    recurrence: { type: 'fixed', month: 7, day: 14 } },
  { id: 'international-friendship-day', name: 'Friendship Day', icon: HandHeart, searchQuery: 'friendship friends together bond', themeId: 'friendship',
    description: 'Celebrate friendships', gradient: 'from-pink-400 to-orange-400', category: 'cultural', image: prideMonthImg,
    recurrence: { type: 'fixed', month: 7, day: 30 } },

  // AUGUST
  { id: 'international-cat-day', name: 'International Cat Day', icon: Star, searchQuery: 'cats pets animals feline', themeId: 'cat day',
    description: 'For cat lovers', gradient: 'from-orange-400 to-pink-500', category: 'cultural', image: summerImg,
    recurrence: { type: 'fixed', month: 8, day: 8 } },
  { id: 'international-youth-day', name: 'International Youth Day', icon: Users, searchQuery: 'youth young people future generation', themeId: 'youth day',
    description: 'Empowering young people', gradient: 'from-cyan-400 to-purple-500', category: 'cultural', image: backToSchoolImg,
    recurrence: { type: 'fixed', month: 8, day: 12 } },
  { id: 'international-dog-day', name: 'International Dog Day', icon: Heart, searchQuery: 'dogs pets animals canine', themeId: 'dog day',
    description: 'For dog lovers', gradient: 'from-amber-400 to-orange-500', category: 'cultural', image: summerImg,
    recurrence: { type: 'fixed', month: 8, day: 26 } },
  { id: 'back-to-school', name: 'Back to School', icon: GraduationCap, searchQuery: 'school education student learning books', themeId: 'back to school',
    description: 'Education & learning', gradient: 'from-blue-400 to-cyan-500', category: 'marketing', image: backToSchoolImg,
    recurrence: { type: 'fixed', month: 8, day: 15, endMonth: 9, endDay: 15 } },

  // SEPTEMBER
  { id: 'labor-day', name: 'Labor Day (US)', icon: Briefcase, searchQuery: 'labor day workers american end summer', themeId: 'labor day',
    description: 'Honoring American workers', gradient: 'from-blue-500 to-red-500', category: 'holiday', image: laborDayImg,
    recurrence: { type: 'nth-weekday', month: 9, weekday: 1, n: 1 } },
  { id: 'patriot-day', name: 'Patriot Day', icon: Flag, searchQuery: 'patriot day remembrance american tribute', themeId: 'patriot day',
    description: '9/11 remembrance', gradient: 'from-blue-700 to-red-700', category: 'holiday', image: memorialDayImg,
    recurrence: { type: 'fixed', month: 9, day: 11 } },
  { id: 'hispanic-heritage-month', name: 'Hispanic Heritage Month', icon: Users, searchQuery: 'hispanic latino heritage culture celebration', themeId: 'hispanic heritage',
    description: 'Latino & Hispanic culture', gradient: 'from-red-500 to-yellow-500', category: 'cultural', image: carnivalImg,
    recurrence: { type: 'fixed', month: 9, day: 15, endMonth: 10, endDay: 15 } },
  { id: 'oktoberfest', name: 'Oktoberfest', icon: Beer, searchQuery: 'oktoberfest beer bavarian germany festival', themeId: 'oktoberfest',
    description: 'Bavarian beer festival', gradient: 'from-amber-500 to-orange-600', category: 'cultural', image: carnivalImg,
    recurrence: { type: 'fixed', month: 9, day: 20, endMonth: 10, endDay: 5 } },
  { id: 'autumn', name: 'Autumn Season', icon: Leaf, searchQuery: 'autumn fall leaves orange harvest', themeId: 'autumn',
    description: 'Fall colors & harvest', gradient: 'from-orange-500 to-red-500', category: 'season', image: autumnImg,
    recurrence: { type: 'fixed', month: 9, day: 23, endMonth: 12, endDay: 20 } },
  { id: 'rosh-hashanah', name: 'Rosh Hashanah', icon: Star, searchQuery: 'rosh hashanah jewish new year celebration', themeId: 'rosh hashanah',
    description: 'Jewish New Year', gradient: 'from-amber-500 to-yellow-600', category: 'cultural', image: newYearImg,
    recurrence: { type: 'lookup', dates: Object.fromEntries(Object.entries(roshHashanahDates).map(([y, d]) => [y, { start: d }])) } },

  // OCTOBER
  { id: 'yom-kippur', name: 'Yom Kippur', icon: Star, searchQuery: 'yom kippur jewish day atonement fasting', themeId: 'yom kippur',
    description: 'Day of Atonement', gradient: 'from-slate-500 to-blue-700', category: 'cultural', image: ramadanImg,
    recurrence: { type: 'lookup', dates: Object.fromEntries(Object.entries(yomKippurDates).map(([y, d]) => [y, { start: d }])) } },
  { id: 'world-mental-health-day', name: 'World Mental Health Day', icon: HandHeart, searchQuery: 'mental health wellness self care mindfulness', themeId: 'mental health',
    description: 'Mental wellness awareness', gradient: 'from-teal-400 to-purple-500', category: 'cultural', image: springImg,
    recurrence: { type: 'fixed', month: 10, day: 10 } },
  { id: 'indigenous-peoples-day', name: 'Indigenous Peoples Day', icon: Users, searchQuery: 'indigenous native american heritage culture', themeId: 'indigenous',
    description: 'Native heritage recognition', gradient: 'from-amber-600 to-red-700', category: 'cultural', image: blackHistoryMonthImg,
    recurrence: { type: 'nth-weekday', month: 10, weekday: 1, n: 2 } },
  { id: 'diwali', name: 'Diwali', icon: Flame, searchQuery: 'diwali lights festival hindu celebration', themeId: 'diwali',
    description: 'Festival of lights', gradient: 'from-amber-500 to-orange-600', category: 'cultural', image: diwaliImg,
    recurrence: { type: 'lookup', dates: Object.fromEntries(Object.entries(diwaliDates).map(([y, d]) => [y, { start: d }])) } },
  { id: 'united-nations-day', name: 'United Nations Day', icon: Globe, searchQuery: 'united nations global peace world', themeId: 'un day',
    description: 'Global cooperation', gradient: 'from-sky-500 to-blue-600', category: 'cultural', image: earthDayImg,
    recurrence: { type: 'fixed', month: 10, day: 24 } },
  { id: 'halloween', name: 'Halloween', icon: Ghost, searchQuery: 'halloween spooky scary pumpkin costume', themeId: 'halloween',
    description: 'Spooky Halloween content', gradient: 'from-orange-500 to-purple-600', category: 'holiday', image: halloweenImg,
    recurrence: { type: 'fixed', month: 10, day: 31 } },

  // NOVEMBER
  { id: 'day-of-the-dead', name: 'Día de los Muertos', icon: Skull, searchQuery: 'day of the dead mexican skull altar', themeId: 'day of the dead',
    description: 'Mexican day of the dead', gradient: 'from-orange-500 to-pink-600', category: 'cultural', image: halloweenImg,
    recurrence: { type: 'fixed', month: 11, day: 1, endMonth: 11, endDay: 2 } },
  { id: 'guy-fawkes', name: 'Bonfire Night', icon: Flame, searchQuery: 'bonfire night fireworks british guy fawkes', themeId: 'bonfire',
    description: 'Fireworks & bonfires (UK)', gradient: 'from-orange-500 to-red-700', category: 'cultural', image: independenceDayImg,
    recurrence: { type: 'fixed', month: 11, day: 5 } },
  { id: 'diabetes-day', name: 'World Diabetes Day', icon: HandHeart, searchQuery: 'diabetes health awareness medical', themeId: 'diabetes day',
    description: 'Health awareness', gradient: 'from-blue-500 to-indigo-600', category: 'cultural', image: springImg,
    recurrence: { type: 'fixed', month: 11, day: 14 } },
  { id: 'veterans-day', name: 'Veterans Day', icon: Flag, searchQuery: 'veterans military service tribute american', themeId: 'veterans day',
    description: 'Honoring veterans', gradient: 'from-blue-700 to-red-700', category: 'holiday', image: memorialDayImg,
    recurrence: { type: 'fixed', month: 11, day: 11 } },
  { id: 'thanksgiving', name: 'Thanksgiving', icon: Utensils, searchQuery: 'thanksgiving harvest turkey family dinner autumn', themeId: 'thanksgiving',
    description: 'Gratitude & family', gradient: 'from-amber-500 to-orange-600', category: 'holiday', image: thanksgivingImg,
    recurrence: { type: 'nth-weekday', month: 11, weekday: 4, n: 4 } },
  { id: 'black-friday', name: 'Black Friday', icon: ShoppingBag, searchQuery: 'sale shopping discount black friday deals', themeId: 'black friday',
    description: 'Shopping & sales', gradient: 'from-gray-800 to-gray-900', category: 'marketing', image: blackFridayImg,
    recurrence: { type: 'nth-weekday', month: 11, weekday: 4, n: 4, offsetDays: 1 } },
  { id: 'small-business-saturday', name: 'Small Business Saturday', icon: ShoppingBag, searchQuery: 'small business shop local support', themeId: 'small business',
    description: 'Support local shops', gradient: 'from-emerald-500 to-teal-600', category: 'marketing', image: blackFridayImg,
    recurrence: { type: 'nth-weekday', month: 11, weekday: 4, n: 4, offsetDays: 2 } },
  { id: 'cyber-monday', name: 'Cyber Monday', icon: Sparkles, searchQuery: 'cyber monday online shopping tech deals', themeId: 'cyber monday',
    description: 'Online shopping & tech deals', gradient: 'from-cyan-500 to-blue-600', category: 'marketing', image: cyberMondayImg,
    recurrence: { type: 'nth-weekday', month: 11, weekday: 4, n: 4, offsetDays: 4 } },
  { id: 'giving-tuesday', name: 'Giving Tuesday', icon: Gift, searchQuery: 'giving tuesday charity donate generosity', themeId: 'giving tuesday',
    description: 'Global day of generosity', gradient: 'from-pink-500 to-red-500', category: 'marketing', image: thanksgivingImg,
    recurrence: { type: 'nth-weekday', month: 11, weekday: 4, n: 4, offsetDays: 5 } },

  // DECEMBER
  { id: 'world-aids-day', name: 'World AIDS Day', icon: HandHeart, searchQuery: 'aids awareness red ribbon health', themeId: 'aids day',
    description: 'HIV/AIDS awareness', gradient: 'from-red-500 to-red-700', category: 'cultural', image: springImg,
    recurrence: { type: 'fixed', month: 12, day: 1 } },
  { id: 'hanukkah', name: 'Hanukkah', icon: Star, searchQuery: 'hanukkah jewish menorah festival lights', themeId: 'hanukkah',
    description: 'Jewish festival of lights', gradient: 'from-blue-500 to-indigo-600', category: 'cultural', image: christmasImg,
    recurrence: { type: 'lookup', dates: hanukkahDates } },
  { id: 'human-rights-day', name: 'Human Rights Day', icon: Globe, searchQuery: 'human rights equality freedom justice', themeId: 'human rights',
    description: 'Universal human rights', gradient: 'from-blue-600 to-purple-600', category: 'cultural', image: earthDayImg,
    recurrence: { type: 'fixed', month: 12, day: 10 } },
  { id: 'winter', name: 'Winter Season', icon: Snowflake, searchQuery: 'winter snow cold christmas cozy', themeId: 'winter',
    description: 'Winter wonderland & cozy vibes', gradient: 'from-blue-300 to-cyan-400', category: 'season', image: winterImg,
    recurrence: { type: 'fixed', month: 12, day: 21, endMonth: 3, endDay: 19, endYearOffset: 1 } },
  { id: 'christmas-eve', name: 'Christmas Eve', icon: TreePine, searchQuery: 'christmas eve holiday family cozy', themeId: 'christmas eve',
    description: 'The night before Christmas', gradient: 'from-red-600 to-green-700', category: 'holiday', image: christmasImg,
    recurrence: { type: 'fixed', month: 12, day: 24 } },
  { id: 'christmas', name: 'Christmas Day', icon: TreePine, searchQuery: 'christmas holiday winter gift celebration', themeId: 'christmas',
    description: 'Holiday cheer & celebrations', gradient: 'from-red-500 to-green-600', category: 'holiday', image: christmasImg,
    recurrence: { type: 'fixed', month: 12, day: 25 } },
  { id: 'boxing-day', name: 'Boxing Day', icon: Gift, searchQuery: 'boxing day sale shopping post christmas', themeId: 'boxing day',
    description: 'Post-Christmas sales', gradient: 'from-emerald-500 to-red-500', category: 'marketing', image: blackFridayImg,
    recurrence: { type: 'fixed', month: 12, day: 26 } },
  { id: 'kwanzaa', name: 'Kwanzaa', icon: Flame, searchQuery: 'kwanzaa african american heritage candles', themeId: 'kwanzaa',
    description: 'African-American heritage', gradient: 'from-red-600 to-green-600', category: 'cultural', image: blackHistoryMonthImg,
    recurrence: { type: 'fixed', month: 12, day: 26, endMonth: 1, endDay: 1, endYearOffset: 1 } },
  { id: 'new-years-eve', name: "New Year's Eve", icon: PartyPopper, searchQuery: 'new years eve party countdown fireworks', themeId: 'new years eve',
    description: 'Countdown to the new year', gradient: 'from-violet-600 to-fuchsia-500', category: 'holiday', image: newYearImg,
    recurrence: { type: 'fixed', month: 12, day: 31 } },

  // MAJOR SPORTS (annual)
  { id: 'wimbledon', name: 'Wimbledon', icon: Trophy, searchQuery: 'wimbledon tennis grand slam sport', themeId: 'wimbledon',
    description: 'Tennis Grand Slam', gradient: 'from-green-600 to-purple-700', category: 'sports', image: superBowlImg,
    recurrence: { type: 'fixed', month: 6, day: 30, endMonth: 7, endDay: 13 } },
  { id: 'tour-de-france', name: 'Tour de France', icon: Bike, searchQuery: 'tour de france cycling bike race', themeId: 'tour de france',
    description: 'Iconic cycling race', gradient: 'from-yellow-400 to-yellow-600', category: 'sports', image: summerImg,
    recurrence: { type: 'fixed', month: 7, day: 5, endMonth: 7, endDay: 27 } },
  { id: 'us-open-tennis', name: 'US Open Tennis', icon: Trophy, searchQuery: 'us open tennis grand slam new york', themeId: 'us open',
    description: 'Tennis Grand Slam', gradient: 'from-blue-600 to-cyan-500', category: 'sports', image: superBowlImg,
    recurrence: { type: 'fixed', month: 8, day: 25, endMonth: 9, endDay: 8 } },
  { id: 'world-series', name: 'World Series', icon: Trophy, searchQuery: 'baseball world series mlb championship', themeId: 'world series',
    description: 'MLB championship', gradient: 'from-blue-700 to-red-600', category: 'sports', image: superBowlImg,
    recurrence: { type: 'fixed', month: 10, day: 20, endMonth: 11, endDay: 2 } },

  // ONE-OFF MAJOR SPORTS (upcoming years)
  { id: 'winter-olympics-2026', name: 'Winter Olympics Milano', icon: Award, searchQuery: 'winter olympics snow sports competition', themeId: 'winter olympics',
    description: 'Milano Cortina 2026', gradient: 'from-sky-400 to-blue-600', category: 'sports', image: winterImg,
    recurrence: { type: 'lookup', dates: { 2026: { start: '2026-02-06', end: '2026-02-22' } } } },
  { id: 'fifa-world-cup-2026', name: 'FIFA World Cup', icon: Trophy, searchQuery: 'fifa world cup soccer football championship', themeId: 'world cup',
    description: 'Soccer world championship', gradient: 'from-green-600 to-red-600', category: 'sports', image: superBowlImg,
    recurrence: { type: 'lookup', dates: { 2026: { start: '2026-06-11', end: '2026-07-19' } } } },
  { id: 'summer-olympics-2028', name: 'Summer Olympics LA', icon: Award, searchQuery: 'summer olympics athletics sports competition', themeId: 'summer olympics',
    description: 'Los Angeles 2028', gradient: 'from-amber-400 to-red-500', category: 'sports', image: summerImg,
    recurrence: { type: 'lookup', dates: { 2028: { start: '2028-07-14', end: '2028-07-30' } } } },
];

// ---------------------------------------------------------------------------
// Generate concrete CalendarEvent instances for a rolling multi-year window.
// ---------------------------------------------------------------------------

function occurrenceFor(def: RecurringDef, year: number): { start: Date; end?: Date } | null {
  const r = def.recurrence;
  switch (r.type) {
    case 'fixed': {
      const start = new Date(year, r.month - 1, r.day);
      let end: Date | undefined;
      if (r.endMonth && r.endDay) {
        const endYear = year + (r.endYearOffset ?? 0);
        end = new Date(endYear, r.endMonth - 1, r.endDay);
      }
      return { start, end };
    }
    case 'nth-weekday': {
      let start = nthWeekdayOfMonth(year, r.month, r.weekday, r.n);
      if (r.offsetDays) start = addDays(start, r.offsetDays);
      const end = r.durationDays ? addDays(start, r.durationDays) : undefined;
      return { start, end };
    }
    case 'last-weekday': {
      const start = lastWeekdayOfMonth(year, r.month, r.weekday);
      const end = r.durationDays ? addDays(start, r.durationDays) : undefined;
      return { start, end };
    }
    case 'lookup': {
      const entry = r.dates[year];
      if (!entry) return null;
      return {
        start: parseYMD(entry.start),
        end: entry.end ? parseYMD(entry.end) : undefined,
      };
    }
  }
}

function toCalendarEvent(def: RecurringDef, occ: { start: Date; end?: Date }, year: number): CalendarEvent {
  return {
    id: `${def.id}-${year}`,
    name: def.name,
    date: occ.start,
    endDate: occ.end,
    icon: def.icon,
    searchQuery: def.searchQuery,
    themeId: def.themeId,
    description: def.description,
    gradient: def.gradient,
    category: def.category,
    image: def.image,
    month: occ.start.getMonth() + 1,
  };
}

const CURRENT_YEAR = new Date().getFullYear();
const YEAR_WINDOW = [CURRENT_YEAR - 1, CURRENT_YEAR, CURRENT_YEAR + 1, CURRENT_YEAR + 2, CURRENT_YEAR + 3];

// Full multi-year expansion (exported for advanced use)
export const calendarEvents: CalendarEvent[] = YEAR_WINDOW.flatMap((year) =>
  recurringDefs
    .map((def) => {
      const occ = occurrenceFor(def, year);
      return occ ? toCalendarEvent(def, occ, year) : null;
    })
    .filter((e): e is CalendarEvent => e !== null)
);

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export const monthNames = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
];

export const fullMonthNames = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

function startOfToday(): Date {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

/** Next upcoming (or currently-active) occurrence for each recurring definition. */
function nextOccurrencePerDef(): CalendarEvent[] {
  const today = startOfToday();
  const results: CalendarEvent[] = [];
  for (const def of recurringDefs) {
    for (const year of YEAR_WINDOW) {
      const occ = occurrenceFor(def, year);
      if (!occ) continue;
      const end = occ.end ?? occ.start;
      if (end >= today) {
        results.push(toCalendarEvent(def, occ, year));
        break;
      }
    }
  }
  return results;
}

/** Events happening in a given calendar month (1-12), using next occurrence per event. */
export function getEventsByMonth(month: number): CalendarEvent[] {
  return nextOccurrencePerDef()
    .filter((event) => {
      const startMonth = event.date.getMonth() + 1;
      const endMonth = event.endDate ? event.endDate.getMonth() + 1 : startMonth;
      // Handles year-wrap ranges (e.g. Winter: Dec -> Mar)
      if (endMonth >= startMonth) {
        return month >= startMonth && month <= endMonth;
      }
      return month >= startMonth || month <= endMonth;
    })
    .sort((a, b) => a.date.getTime() - b.date.getTime());
}

/** Upcoming events sorted by date, filtering out past events. */
export function getUpcomingEvents(limit: number = 8): CalendarEvent[] {
  const today = startOfToday();
  return nextOccurrencePerDef()
    .filter((event) => {
      const end = event.endDate ?? event.date;
      return end >= today;
    })
    .sort((a, b) => a.date.getTime() - b.date.getTime())
    .slice(0, limit);
}

export function getDaysUntil(date: Date): number {
  const now = startOfToday();
  const eventDate = new Date(date);
  eventDate.setHours(0, 0, 0, 0);
  const diffTime = eventDate.getTime() - now.getTime();
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
}

export function formatDaysUntil(event: CalendarEvent): string {
  const days = getDaysUntil(event.date);
  if (days < 0) {
    if (event.endDate && getDaysUntil(event.endDate) >= 0) return 'Now';
    return 'Past';
  }
  if (days === 0) return 'Today';
  if (days === 1) return 'Tomorrow';
  if (days <= 7) return `${days} days`;
  if (days <= 14) return `${Math.ceil(days / 7)} week${days > 7 ? 's' : ''}`;
  if (days <= 30) return `${Math.ceil(days / 7)} weeks`;
  return `${Math.floor(days / 30)} month${days >= 60 ? 's' : ''}`;
}

export function getCurrentMonth(): number {
  return new Date().getMonth() + 1;
}
