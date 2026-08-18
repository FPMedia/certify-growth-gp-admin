'use client';

import Link from 'next/link';
import { cn } from '@/lib/utils';

export interface ContextNavItem {
  href: string;
  label: string;
  active?: boolean;
}

interface ContextNavProps {
  items: ContextNavItem[];
  className?: string;
}

export function ContextNav({ items, className }: ContextNavProps) {
  if (items.length === 0) return null;

  return (
    <nav
      aria-label="Section navigation"
      className={cn(
        'sticky top-0 z-30 -mx-6 border-b bg-card/95 px-6 backdrop-blur supports-[backdrop-filter]:bg-card/80',
        className,
      )}
    >
      <div className="flex flex-wrap items-center gap-1 py-2">
        {items.map((item) => (
          <Link
            key={`${item.href}-${item.label}`}
            href={item.href}
            className={cn(
              'inline-flex items-center rounded-md px-3 py-1.5 text-sm font-medium transition-colors',
              item.active
                ? 'bg-accent text-accent-foreground'
                : 'text-muted-foreground hover:bg-muted hover:text-foreground',
            )}
            aria-current={item.active ? 'page' : undefined}
          >
            {item.label}
          </Link>
        ))}
      </div>
    </nav>
  );
}
