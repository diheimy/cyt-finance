import { cva, type VariantProps } from 'class-variance-authority';
import type { ButtonHTMLAttributes } from 'react';
import { cn } from '@/lib/cn';

const button = cva(
  'inline-flex items-center justify-center gap-2 rounded-lg text-sm font-semibold transition disabled:opacity-50',
  {
    variants: {
      variant: {
        primary: 'bg-accent text-white hover:opacity-90',
        outline: 'border border-border text-text hover:bg-surface-2',
        ghost: 'text-muted hover:text-text hover:bg-surface-2',
        danger: 'bg-negative text-white hover:opacity-90'
      },
      size: { sm: 'px-3 py-1.5', md: 'px-4 py-2' }
    },
    defaultVariants: { variant: 'primary', size: 'md' }
  }
);

type Props = ButtonHTMLAttributes<HTMLButtonElement> & VariantProps<typeof button>;

export function Button({ className, variant, size, ...rest }: Props) {
  return <button className={cn(button({ variant, size }), className)} {...rest} />;
}
