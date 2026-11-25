import type { CSSProperties, ReactNode } from 'react';
import { usePopover } from '../../hooks/usePopover';

/** A floating panel with the app's standard close / focus behaviour. */
export function Popover({ onClose, label, className, style, children }: {
  onClose: () => void;
  label: string;
  className?: string;
  style?: CSSProperties;
  children: ReactNode;
}) {
  const ref = usePopover<HTMLDivElement>(onClose);
  return (
    <div ref={ref} role="dialog" aria-label={label} className={className} style={style}>
      {children}
    </div>
  );
}
