import { useState, type ReactNode } from 'react';
import { X, type LucideIcon } from 'lucide-react';

interface MapOverlayPanelProps {
  title: string;
  subtitle?: string;
  icon: LucideIcon;
  position: string;
  tone?: 'light' | 'dark';
  widthClass?: string;
  maxHeightClass?: string;
  defaultOpen?: boolean;
  children: ReactNode;
}

export default function MapOverlayPanel({
  title,
  subtitle,
  icon: Icon,
  position,
  tone = 'light',
  widthClass = 'w-56',
  maxHeightClass = 'max-h-[400px]',
  defaultOpen = true,
  children,
}: MapOverlayPanelProps) {
  const [open, setOpen] = useState(defaultOpen);
  const dark = tone === 'dark';

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className={`absolute ${position} z-[401] flex items-center gap-1.5 px-3 py-2 rounded-xl shadow-lg backdrop-blur-md text-xs font-semibold transition-all hover:-translate-y-0.5 animate-[mapPanelIn_0.2s_ease-out] ${
          dark
            ? 'bg-slate-800/90 border border-slate-700 text-slate-200 hover:bg-slate-700'
            : 'bg-white/90 border border-white/60 text-slate-700 hover:bg-white'
        }`}
        aria-label={`Show ${title}`}
      >
        <Icon className="w-3.5 h-3.5" />
        {title}
      </button>
    );
  }

  return (
    <div className={`absolute ${position} z-[401] ${widthClass} ${maxHeightClass} flex flex-col animate-[mapPanelIn_0.2s_ease-out]`}>
      <div
        className={`rounded-xl shadow-lg backdrop-blur-md overflow-hidden flex flex-col ${maxHeightClass} ${
          dark ? 'bg-slate-800/90 border border-slate-700' : 'bg-white/90 border border-white/60'
        }`}
      >
        <div className={`pl-3.5 pr-2 py-2.5 border-b flex items-start justify-between gap-2 flex-shrink-0 ${dark ? 'border-slate-700' : 'border-slate-200/60'}`}>
          <div className="min-w-0">
            <div className={`text-[10px] font-bold uppercase tracking-wider ${dark ? 'text-slate-400' : 'text-slate-500'}`}>{title}</div>
            {subtitle && <div className={`text-xs truncate ${dark ? 'text-slate-500' : 'text-slate-400'}`}>{subtitle}</div>}
          </div>
          <button
            onClick={() => setOpen(false)}
            className={`w-6 h-6 rounded-md flex items-center justify-center flex-shrink-0 transition-colors ${
              dark ? 'text-slate-400 hover:text-white hover:bg-slate-700' : 'text-slate-400 hover:text-slate-700 hover:bg-slate-100'
            }`}
            aria-label={`Hide ${title}`}
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
        <div className="overflow-y-auto">{children}</div>
      </div>
    </div>
  );
}
