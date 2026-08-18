'use client';

import { ShieldAlert } from 'lucide-react';
import { useSearchParams } from 'next/navigation';
import { useAuth } from '@/lib/auth';
import { AdminDashboard } from '@/components/admin/AdminDashboard';
import { SystemAdminPanel } from '@/components/admin/SystemAdminPanel';
import { Card, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent } from '@/components/ui/tabs';
import { PageHeader } from '@/components/page-header';
import { AdminTabsLayout } from './layout-tabs';

export default function AdminPage() {
  const { user } = useAuth();
  const searchParams = useSearchParams();
  const activeTab = searchParams.get('tab') ?? 'system';

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

  return (
    <AdminTabsLayout>
      <div className="space-y-6">
        <PageHeader
          title={isSystemAdmin ? 'System admin' : 'Catalog admin'}
          description={
            isSystemAdmin
              ? 'Manage the catalog, companies, and users across the platform.'
              : 'Manage questionnaire copy, elements, questions, feedback, and weighting matrices.'
          }
        />
        <Tabs value={isSystemAdmin ? activeTab : 'catalog'}>
          {isSystemAdmin && (
            <TabsContent value="system">
              <SystemAdminPanel />
            </TabsContent>
          )}
          <TabsContent value="catalog">
            <AdminDashboard />
          </TabsContent>
        </Tabs>
      </div>
    </AdminTabsLayout>
  );
}
