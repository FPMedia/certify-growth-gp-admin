'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { ArrowRight } from 'lucide-react';
import { useAuth } from '@/lib/auth';
import { useWebUrl } from '@/components/admin-shell';
import { BrandLogo } from '@/components/brand-logo';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

const DEV_AUTH = process.env.NEXT_PUBLIC_DEV_AUTH === 'true';

export default function LoginPage() {
  const router = useRouter();
  const { user, refresh, signIn, error, loading } = useAuth();
  const webUrl = useWebUrl();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (user) {
      router.replace('/');
    }
  }, [user, router]);

  async function handleSignIn() {
    setSubmitting(true);
    setFormError(null);
    try {
      await signIn(email, password);
    } catch (e) {
      setFormError(e instanceof Error ? e.message : 'Sign-in failed');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden p-6">
      <div className="absolute inset-0 tech-grid opacity-40" />
      <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-background to-background" />

      <Card className="relative z-10 w-full max-w-md border-primary/20 shadow-lg">
        <CardHeader className="space-y-4">
          <BrandLogo height={40} href={null} priority />
          <CardTitle className="text-2xl">Admin sign in</CardTitle>
          <CardDescription>
            Sign in with a platform admin account to manage the catalog and system settings.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {(formError ?? error) && (
            <Alert variant="destructive">
              <AlertTitle>Sign-in failed</AlertTitle>
              <AlertDescription>{formError ?? error}</AlertDescription>
            </Alert>
          )}

          {DEV_AUTH ? (
            <>
              <div className="rounded-lg border bg-muted/40 p-3 text-xs text-muted-foreground">
                Local dev uses gateway <code className="rounded bg-background px-1 py-0.5">SKIP_AUTH=true</code> and
                proxies API calls via <code className="rounded bg-background px-1 py-0.5">/api</code>.
              </div>
              <Button type="button" disabled={loading} onClick={() => void refresh()} className="w-full">
                {loading ? 'Connecting…' : 'Continue'}
                <ArrowRight className="h-4 w-4" />
              </Button>
            </>
          ) : (
            <>
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  autoComplete="email"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="current-password"
                />
              </div>
              <Button
                type="button"
                className="w-full"
                disabled={submitting || !email || !password}
                onClick={() => void handleSignIn()}
              >
                {submitting ? 'Signing in…' : 'Sign in'}
                <ArrowRight className="h-4 w-4" />
              </Button>
              {webUrl && (
                <p className="text-center text-sm text-muted-foreground">
                  Not an admin?{' '}
                  <a
                    href={webUrl}
                    className="font-medium text-foreground underline underline-offset-4"
                  >
                    Go to main app
                  </a>
                </p>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
