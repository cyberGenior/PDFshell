import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const buttonVariants = cva(
  'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-full text-sm font-medium transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--background)] disabled:pointer-events-none disabled:opacity-50 active:scale-[0.97] [&_svg]:size-4 [&_svg]:shrink-0',
  {
    variants: {
      variant: {
        // Solid near-black CTA, echoing the landing reference.
        default:
          'bg-[var(--primary)] text-[var(--primary-foreground)] hover:opacity-90 shadow-sm',
        // Blue→indigo brand gradient for special emphasis.
        brand:
          'gradient-brand text-white shadow-md shadow-[color-mix(in_oklch,var(--brand)_28%,transparent)] hover:brightness-110',
        outline:
          'border border-[var(--border)] bg-[var(--surface)] text-[var(--foreground)] hover:bg-[var(--surface-2)]',
        ghost: 'text-[var(--foreground)] hover:bg-[var(--surface-2)]',
        secondary: 'bg-[var(--surface-2)] text-[var(--foreground)] hover:brightness-95',
      },
      size: {
        default: 'h-10 px-5 py-2',
        sm: 'h-9 px-4 text-[13px]',
        lg: 'h-11 px-6 text-base',
        icon: 'size-10',
        'icon-sm': 'size-9',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, ...props }, ref) => (
    <button ref={ref} className={cn(buttonVariants({ variant, size }), className)} {...props} />
  ),
);
Button.displayName = 'Button';

export { Button, buttonVariants };
