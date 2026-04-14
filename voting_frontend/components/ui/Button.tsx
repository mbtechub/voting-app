'use client';

import clsx from 'clsx';
import { ButtonHTMLAttributes, ReactNode } from 'react';

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  children: ReactNode;
  variant?: 'primary' | 'outline' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
  className?: string;
};

export default function Button({
  children,
  variant = 'primary',
  size = 'md',
  loading = false,
  className,
  disabled,
  ...props
}: ButtonProps) {
  return (
    <button
      disabled={disabled || loading}
      className={clsx(
        // base
        'inline-flex items-center justify-center gap-2 rounded-xl font-medium transition select-none',
        'active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed',

        // sizes
        {
          'px-3 py-1.5 text-sm': size === 'sm',
          'px-4 py-2 text-sm': size === 'md',
          'px-5 py-3 text-base': size === 'lg',
        },

        // variants
        {
          'bg-black text-white hover:bg-gray-900': variant === 'primary',
          'border border-gray-300 bg-white hover:bg-gray-50': variant === 'outline',
          'bg-transparent hover:bg-gray-100': variant === 'ghost',
        },

        className
      )}
      {...props}
    >
      {/* ✅ FIXED SPINNER (only change) */}
      {loading && (
        <span
          className={clsx(
            'h-4 w-4 border-2 border-t-transparent rounded-full animate-spin',
            {
              'border-white/70': variant === 'primary',
              'border-gray-500/60': variant !== 'primary',
            }
          )}
        />
      )}

      {children}
    </button>
  );
}