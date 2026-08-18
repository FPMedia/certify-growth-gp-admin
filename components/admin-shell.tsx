'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { createContext, useContext, useEffect } from 'react';
import { ExternalLink, LogIn, LogOut, ShieldAlert } from 'lucide-react';
import { isAdminRole, useAuth } from '@/lib/auth';
import { BrandLogo } from '@/components/brand-logo';
import { Button } from '@/components/ui/button';
import { Card, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';

const DEV_AUTH = process.env.NEXT_PUBLIC_DEV_AUTH === 'true';

const WebUrlContext = createContext<string | undefined>(undefined);

export function useWebUrl(): string | undefined {
  return useContext(WebUrlContext);
}

export function AdminShell({
  children,
  webUrl,
}: {
  children: React.ReactNode;
  webUrl?: string;
}) {
  return (
    <WebUrlContext.Provider value={webUrl}>
      <AdminShellInner>{children}</AdminShellInner>
    </WebUrlContext.Provider>
  );
}

function AdminShellInner({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, loading, error, signOutUser } = useAuth();
  const webUrl = useWebUrl();
  const isLoginRoute = pathname === '/login';

  useEffect(() => {
    if (!loading && !user && !isLoginRoute) {
      router.replace('/login');
    }
  }, [loading, user, isLoginRoute, router]);

  if (isLoginRoute) {
    return <>{children}</>;
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <header className="border-b bg-card/80 backdrop-blur">
          <div className="mx-auto flex h-14 max-w-6xl items-center gap-4 px-4">
            <Skeleton className="h-8 w-36 rounded-md" />
          </div>
        </header>
        <main className="mx-auto max-w-6xl space-y-4 p-6">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-40 w-full rounded-xl" />
        </main>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background p-6">
        <div className="w-full max-w-md space-y-4 rounded-xl border bg-card p-6 shadow-sm">
          <BrandLogo height={36} href={null} />
          <p className="text-sm text-muted-foreground">Sign in with an admin account to continue.</p>
          {error && <p className="text-sm text-destructive">{error}</p>}
          <Button asChild className="w-full">
            <Link href="/login">
              <LogIn className="h-4 w-4" />
              Go to login
            </Link>
          </Button>
        </div>
      </div>
    );
  }

  if (!isAdminRole(user.role)) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background p-6">
        <Card className="max-w-md">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <ShieldAlert className="h-5 w-5 text-muted-foreground" />
              Admin access required
            </CardTitle>
            <CardDescription>
              Your account ({user.email}) does not have permission to access the admin console.
            </CardDescription>
          </CardHeader>
          <div className="flex flex-col gap-2 px-6 pb-6">
            {webUrl && (
              <Button asChild variant="outline">
                <a href={webUrl}>
                  <ExternalLink className="h-4 w-4" />
                  Go to main app
                </a>
              </Button>
            )}
            {!DEV_AUTH && (
              <Button variant="ghost" onClick={() => void signOutUser()}>
                <LogOut className="h-4 w-4" />
                Sign out
              </Button>
            )}
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="z-40 border-b bg-card/80 backdrop-blur supports-[backdrop-filter]:bg-card/60">
        <div className="mx-auto flex h-14 max-w-6xl items-center gap-6 px-4">
          <BrandLogo height={32} href="/" priority />

          <div className="flex flex-1 items-center gap-2">
            <span className="text-sm font-medium text-muted-foreground">Admin console</span>
          </div>

          <div className="flex items-center gap-3">
            {user.role === 'SUPER_ADMIN' && (
              <Badge variant="secondary" className="hidden sm:inline-flex">
                System Admin
              </Badge>
            )}
            {user.role === 'CONTENT_MANAGER' && (
              <Badge variant="secondary" className="hidden sm:inline-flex">
                Content Manager
              </Badge>
            )}
            {webUrl && (
              <Button asChild variant="outline" size="sm">
                <a href={webUrl}>
                  <ExternalLink className="h-4 w-4" />
                  <span className="hidden sm:inline">Main app</span>
                </a>
              </Button>
            )}
            <Separator orientation="vertical" className="h-6" />
            <div className="text-right">
              <p className="text-sm font-medium leading-none">{user.name}</p>
              <p className="text-xs text-muted-foreground">{user.email}</p>
            </div>
            {!DEV_AUTH && (
              <Button variant="ghost" size="icon" onClick={() => void signOutUser()} title="Sign out">
                <LogOut className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl p-6">{children}</main>
    </div>
  );
}
