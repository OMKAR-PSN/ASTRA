import { House, ClipboardCheck, ChartNoAxesCombined, ShieldCheck, Send } from 'lucide-react-native';
import type { LucideIcon } from 'lucide-react-native';

export type NavItem = {
  href: '/' | '/check-in' | '/dashboard' | '/assessment' | '/delivery';
  routeName: 'index' | 'check-in' | 'dashboard' | 'assessment' | 'delivery';
  label: string;
  desktopLabel: string;
  Icon: LucideIcon;
};

export const navItems: NavItem[] = [
  { href: '/', routeName: 'index', label: 'Home', desktopLabel: 'Mission Overview', Icon: House },
  { href: '/check-in', routeName: 'check-in', label: 'Check-in', desktopLabel: 'Health Check-In', Icon: ClipboardCheck },
  { href: '/dashboard', routeName: 'dashboard', label: 'Trends', desktopLabel: 'Health Trends', Icon: ChartNoAxesCombined },
  { href: '/assessment', routeName: 'assessment', label: 'Assessment', desktopLabel: 'Assessment', Icon: ShieldCheck },
  { href: '/delivery', routeName: 'delivery', label: 'Reports', desktopLabel: 'Reports & Sync', Icon: Send },
];
