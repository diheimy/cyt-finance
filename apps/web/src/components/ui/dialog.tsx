import { useEffect, type ReactNode } from 'react';

export function Dialog({
  open,
  onOpenChange,
  title,
  children
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  title?: string;
  children: ReactNode;
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onOpenChange(false);
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, onOpenChange]);

  if (!open) return null;
  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={title}
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 p-0 md:items-center md:p-4"
      onClick={() => onOpenChange(false)}
    >
      <div
        className="w-full overflow-y-auto rounded-t-2xl border border-border bg-surface p-6 max-h-[90vh] md:max-w-md md:rounded-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {title && <h2 className="mb-4 font-display text-xl text-text">{title}</h2>}
        {children}
      </div>
    </div>
  );
}
