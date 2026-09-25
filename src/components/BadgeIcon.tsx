import { Award, CalendarCheck, Flame, Footprints, GraduationCap, Layers, PenLine, type LucideProps } from "lucide-react";

const ICONS: Record<string, React.ComponentType<LucideProps>> = {
  award: Award,
  flame: Flame,
  certificate: GraduationCap,
  "calendar-check": CalendarCheck,
  "pen-line": PenLine,
  footprints: Footprints,
  layers: Layers,
};

export default function BadgeIcon({ icon, ...props }: { icon: string } & LucideProps) {
  const Icon = ICONS[icon] ?? Award;
  return <Icon {...props} />;
}
