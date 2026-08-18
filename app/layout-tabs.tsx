'use client';

import { usePathname, useSearchParams } from 'next/navigation';
import { Suspense } from 'react';
import { ContextNav, type ContextNavItem } from '@/components/context-nav';
import { useAuth } from '@/lib/auth';

const ADMIN_TABS = [
  { id: 'system', label: 'Companies & users' },
  { id: 'catalog', label: 'Catalog' },
] as const;

function AdminTabsContent({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const activeTab = searchParams.get('tab') ?? 'system';
  const { user } = useAuth();
  const isSystemAdmin = user?.role === 'SUPER_ADMIN';
  const visibleTabs = isSystemAdmin ? ADMIN_TABS : ADMIN_TABS.filter((t) => t.id === 'catalog');

  const items: ContextNavItem[] = visibleTabs.map((tab) => ({
    href: `/?tab=${tab.id}`,
    label: tab.label,
    active: pathname === '/' && activeTab === tab.id,
  }));

  return (
    <div className="space-y-6">
      <ContextNav items={items} />
      {children}
    </div>
  );
}

export function AdminTabsLayout({ children }: { children: React.ReactNode }) {
  return (
    <Suspense fallback={<div className="space-y-6">{children}</div>}>
      <AdminTabsContent>{children}</AdminTabsContent>
    </Suspense>
  );
}
