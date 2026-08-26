'use client';

import { ShieldAlert } from 'lucide-react';
import { useSearchParams } from 'next/navigation';
import { useAuth } from '@/lib/auth';
import { ContentDashboard } from '@/components/admin/ContentDashboard';
import { SystemAdminPanel } from '@/components/admin/SystemAdminPanel';
import { Card, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent } from '@/components/ui/tabs';
import { PageHeader } from '@/components/page-header';
import { AdminTabsLayout } from './layout-tabs';

export default function AdminPage() {
  const { user } = useAuth();
  const searchParams = useSearchParams();
  const activeTab = searchParams.get('tab') ?? 'content';

  const isSystemAdmin = user?.role === 'SUPER_ADMIN';
  const canManageCatalog = user?.role === 'SUPER_ADMIN' || user?.role === 'CONTENT_MANAGER';

  if (!canManageCatalog) {
    return (
      <Card className="max-w-md">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <ShieldAlert className="h-5 w-5 text-muted-foreground" />
            Admin access required
          </CardTitle>
          <CardDescription>Your account does not have permission to manage the platform.</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  const effectiveTab = isSystemAdmin ? activeTab : 'content';

  return (
    <AdminTabsLayout>
      <div className="space-y-6">
        <PageHeader
          title={effectiveTab === 'system' ? 'Companies & users' : 'Content'}
          description={
            effectiveTab === 'system'
              ? 'Manage companies, teams, and users across the platform.'
              : 'Edit questionnaire and report copy organised by where it appears. Already-compiled reports keep previous wording until recompiled.'
          }
        />
        <Tabs value={effectiveTab}>
          {isSystemAdmin && (
            <TabsContent value="system">
              <SystemAdminPanel />
            </TabsContent>
          )}
          <TabsContent value="content">
            <ContentDashboard />
          </TabsContent>
          {/* Legacy ?tab=catalog redirects visually to content */}
          <TabsContent value="catalog">
            <ContentDashboard />
          </TabsContent>
        </Tabs>
      </div>
    </AdminTabsLayout>
  );
}
