import {
  AlarmClock, Bell, Bike, BookOpen, Brain, Calculator, CalendarDays, ClipboardCheck, Code,
  Dumbbell, Flag, Globe, GraduationCap, Heart, Languages, Lightbulb, ListTodo, Microscope,
  Music, NotebookPen, Palette, Puzzle, Sparkles, Star, Target, Trophy, Volleyball,
  type LucideIcon,
} from 'lucide-react'

/** Иконки, доступные для секций. Ключ хранится в данных. */
export const SECTION_ICONS: Record<string, LucideIcon> = {
  notebook: NotebookPen,
  book: BookOpen,
  tasks: ListTodo,
  check: ClipboardCheck,
  cap: GraduationCap,
  calendar: CalendarDays,
  alarm: AlarmClock,
  bell: Bell,
  star: Star,
  flag: Flag,
  target: Target,
  trophy: Trophy,
  dumbbell: Dumbbell,
  ball: Volleyball,
  bike: Bike,
  music: Music,
  palette: Palette,
  code: Code,
  microscope: Microscope,
  calculator: Calculator,
  languages: Languages,
  globe: Globe,
  brain: Brain,
  puzzle: Puzzle,
  bulb: Lightbulb,
  sparkles: Sparkles,
  heart: Heart,
}

export const sectionIcon = (key: string): LucideIcon => SECTION_ICONS[key] ?? Sparkles
