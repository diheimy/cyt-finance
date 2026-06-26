import * as RD from '@radix-ui/react-dialog';
import type { ReactNode } from 'react';

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
  return (
    <RD.Root open={open} onOpenChange={onOpenChange}>
      <RD.Portal>
        <RD.Overlay className="fixed inset-0 z-50 bg-black/60" />
        <RD.Content className="fixed left-1/2 top-1/2 z-50 w-[92vw] max-w-md -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-2xl border border-border bg-surface p-6 max-h-[90vh]">
          {title && <RD.Title className="mb-4 font-display text-xl text-text">{title}</RD.Title>}
          {children}
        </RD.Content>
      </RD.Portal>
    </RD.Root>
  );
}
