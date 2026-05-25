import type { SVGProps } from 'react';

type Props = SVGProps<SVGSVGElement> & { className?: string };

function Icon({ children, className, ...rest }: Props) {
  return <svg xmlns="http://www.w3.org/2000/svg" width={24} height={24} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true" {...rest}>{children}</svg>;
}

export function MapPinIcon(props: Props) { return <Icon {...props}><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z" /><circle cx="12" cy="10" r="3" /></Icon>; }

export function AwardIcon(props: Props) { return <Icon {...props}><circle cx="12" cy="8" r="6" /><path d="M15.477 12.89 17 22l-5-3-5 3 1.523-9.11" /></Icon>; }

export function ClipboardListIcon(props: Props) { return <Icon {...props}><rect width="8" height="14" x="8" y="4" rx="2" ry="2" /><line x1="11" y1="10" x2="13" y2="10" /><line x1="11" y1="14" x2="16" y2="14" /><line x1="11" y1="18" x2="13" y2="18" /><path d="M10 4V2h4v2" /></Icon>; }

export function PlusCircleIcon(props: Props) { return <Icon {...props}><circle cx="12" cy="12" r="10" /><path d="M8 12h8" /><path d="M12 8v8" /></Icon>; }

export function LogOutIcon(props: Props) { return <Icon {...props}><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" /><polyline points="16 17 21 12 16 7" /><line x1="21" y1="12" x2="9" y2="12" /></Icon>; }

export function LogInIcon(props: Props) { return <Icon {...props}><path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4" /><polyline points="10 17 15 12 10 7" /><line x1="15" y1="12" x2="3" y2="12" /></Icon>; }

export function SunIcon(props: Props) { return <Icon {...props}><circle cx="12" cy="12" r="4" /><path d="M12 2v2" /><path d="M12 20v2" /><path d="m4.93 4.93 1.41 1.41" /><path d="m17.66 17.66 1.41 1.41" /><path d="M2 12h2" /><path d="M20 12h2" /><path d="m6.34 17.66-1.41 1.41" /><path d="m19.07 4.93-1.41 1.41" /></Icon>; }

export function MoonIcon(props: Props) { return <Icon {...props}><path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z" /></Icon>; }

export function MenuIcon(props: Props) { return <Icon {...props}><line x1="4" y1="6" x2="20" y2="6" /><line x1="4" y1="12" x2="20" y2="12" /><line x1="4" y1="18" x2="20" y2="18" /></Icon>; }

export function XIcon(props: Props) { return <Icon {...props}><path d="M18 6 6 18" /><path d="m6 6 12 12" /></Icon>; }

export function LayoutDashboardIcon(props: Props) { return <Icon {...props}><rect width="7" height="9" x="3" y="3" rx="1" /><rect width="7" height="5" x="14" y="3" rx="1" /><rect width="7" height="9" x="14" y="12" rx="1" /><rect width="7" height="5" x="3" y="16" rx="1" /></Icon>; }

export function UserCircleIcon(props: Props) { return <Icon {...props}><circle cx="12" cy="12" r="10" /><circle cx="12" cy="10" r="3" /><path d="M7 20.662V19a3 3 0 0 1 3-3h4a3 3 0 0 1 3 3v1.662" /></Icon>; }
