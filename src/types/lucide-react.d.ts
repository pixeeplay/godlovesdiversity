declare module 'lucide-react' {
  import * as React from 'react';
  export interface LucideProps extends React.SVGProps<SVGSVGElement> {
    size?: number | string;
    color?: string;
    strokeWidth?: number | string;
    absoluteStrokeWidth?: boolean;
  }
  export type LucideIcon = React.FC<LucideProps>;
  const Icon: LucideIcon;
  export default Icon;

  // Common icons used across the app
  export const AlertCircle: LucideIcon;
  export const ArrowRight: LucideIcon;
  export const BarChart3: LucideIcon;
  export const BookOpen: LucideIcon;
  export const Camera: LucideIcon;
  export const Calendar: LucideIcon;
  export const ChevronLeft: LucideIcon;
  export const ChevronRight: LucideIcon;
  export const CheckCircle2: LucideIcon;
  export const Check: LucideIcon;
  export const Copy: LucideIcon;
  export const Download: LucideIcon;
  export const Eye: LucideIcon;
  export const EyeOff: LucideIcon;
  export const ExternalLink: LucideIcon;
  export const FileText: LucideIcon;
  export const Facebook: LucideIcon;
  export const Globe: LucideIcon;
  export const Handshake: LucideIcon;
  export const Heart: LucideIcon;
  export const Instagram: LucideIcon;
  export const Home: LucideIcon;
  export const Image: LucideIcon;
  export const ImageIcon: LucideIcon;
  export const KeyRound: LucideIcon;
  export const Languages: LucideIcon;
  export const Layers: LucideIcon;
  export const Library: LucideIcon;
  export const Link2: LucideIcon;
  export const LayoutDashboard: LucideIcon;
  export const Loader2: LucideIcon;
  export const LogOut: LucideIcon;
  export const Mail: LucideIcon;
  export const MapPin: LucideIcon;
  export const Menu: LucideIcon;
  export const Moon: LucideIcon;
  export const MessageCircle: LucideIcon;
  export const MessageSquare: LucideIcon;
  export const Pencil: LucideIcon;
  export const Plus: LucideIcon;
  export const Save: LucideIcon;
  export const ScanFace: LucideIcon;
  export const Search: LucideIcon;
  export const Send: LucideIcon;
  export const Settings: LucideIcon;
  export const ShieldAlert: LucideIcon;
  export const ShieldCheck: LucideIcon;
  export const Sparkles: LucideIcon;
  export const Sun: LucideIcon;
  export const Trash2: LucideIcon;
  export const Twitter: LucideIcon;
  export const Type: LucideIcon;
  export const UploadCloud: LucideIcon;
  export const Users: LucideIcon;
  export const Youtube: LucideIcon;
  export const Video: LucideIcon;
  export const Wand2: LucideIcon;
  export const X: LucideIcon;

  // Catch-all for any other icon names
  export const ALL_ICONS: { [k: string]: LucideIcon };
}
