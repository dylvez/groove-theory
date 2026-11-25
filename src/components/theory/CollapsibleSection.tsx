import { useState, type ReactNode } from 'react';

interface CollapsibleSectionProps {
  title: string;
  defaultOpen?: boolean;
  children: ReactNode;
}

export function CollapsibleSection({ title, defaultOpen = false, children }: CollapsibleSectionProps) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div className="flex flex-col border-t border-border pt-2">
      <button
        onClick={() => setOpen(!open)}
        aria-expanded={open}
        className="flex items-center gap-2 py-1.5 cursor-pointer group"
      >
        <svg
          aria-hidden="true"
          className={`w-3 h-3 text-text-muted transition-transform ${open ? 'rotate-90' : ''}`}
          fill="currentColor"
          viewBox="0 0 20 20"
        >
          <path d="M6.293 4.293a1 1 0 011.414 0L14 10.586l-6.293 6.293a1 1 0 01-1.414-1.414L11.172 10.586 6.293 5.707a1 1 0 010-1.414z" />
        </svg>
        <span className="label-caps group-hover:text-text-secondary transition-colors">
          {title}
        </span>
      </button>
      {open && (
        <div className="pt-2">
          {children}
        </div>
      )}
    </div>
  );
}
