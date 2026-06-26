import type { ReactNode } from 'react';
import { Dialog } from '@/components/ui/dialog';

interface Props {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
}

export function Modal({ open, onClose, title, children }: Props) {
  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (!o) onClose();
      }}
      title={title}
    >
      {children}
    </Dialog>
  );
}
