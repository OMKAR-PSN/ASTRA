import { House, ClipboardCheck, LayoutDashboard, FileText, Send } from 'lucide-react-native';
import type { LucideIcon } from 'lucide-react-native';

export type NavItem = {
  href: '/' | '/check-in' | '/dashboard' | '/report' | '/delivery';
  routeName: 'index' | 'check-in' | 'dashboard' | 'report' | 'delivery';
  label: string;
  Icon: LucideIcon;
};

export const navItems: NavItem[] = [
  { href: '/', routeName: 'index', label: 'Home', Icon: House },
  { href: '/check-in', routeName: 'check-in', label: 'Check-in', Icon: ClipboardCheck },
  { href: '/dashboard', routeName: 'dashboard', label: 'Dashboard', Icon: LayoutDashboard },
  { href: '/report', routeName: 'report', label: 'Report', Icon: FileText },
  { href: '/delivery', routeName: 'delivery', label: 'Delivery', Icon: Send },
];
