import React, { ReactNode, HTMLAttributes } from 'react';
import clsx from 'clsx';

type CardProps = HTMLAttributes<HTMLDivElement> & {
  children: ReactNode;
  className?: string;
  padding?: 'sm' | 'md' | 'lg';
  hover?: boolean;
  clickable?: boolean;
};

export default function Card({
  children,
  className,
  padding = 'md',
  hover = false,
  clickable = false,
  ...rest
}: CardProps) {
  return (
    <div
      className={clsx(
        // base
        'rounded-2xl border bg-white shadow-sm transition',

        // padding
        {
          'p-3': padding === 'sm',
          'p-4': padding === 'md',
          'p-6': padding === 'lg',
        },

        // hover effect
        hover && 'hover:shadow-md',

        // clickable
        clickable &&
          'cursor-pointer active:scale-[0.99] hover:shadow-md',

        className
      )}
      {...rest}
    >
      {children}
    </div>
  );
}