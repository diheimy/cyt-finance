import type { ReactNode } from 'react';
import { cn } from '@/lib/cn';

const tones = {
  positive: 'bg-positive/15 text-positive',
  negative: 'bg-negative/15 text-negative',
  warn: 'bg-warn/15 text-warn',
  neutral: 'bg-surface-2 text-muted'
} as const;

export function Badge({
  tone = 'neutral',
  children
}: {
  tone?: keyof typeof tones;
  children: ReactNode;
}) {
  return (
    <span className={cn('rounded-full px-2 py-0.5 text-xs font-medium', tones[tone])}>
      {children}
    </span>
  );
}
