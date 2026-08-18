'use client';

import { useState } from 'react';
import { Pencil, Plus, Trash2 } from 'lucide-react';
import { apiFetch } from '@/lib/api';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Sheet, SheetContent, SheetFooter, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { STICKY_ACTIONS_CLASS } from '@/lib/admin/table-styles';
import type { CompanyDeleteImpact, SystemCompanyRow } from './system-types';

interface SystemCompaniesPanelProps {
  companies: SystemCompanyRow[] | null;
  loading: boolean;
  onReload: () => void;
}

export function SystemCompaniesPanel({ companies, loading, onReload }: SystemCompaniesPanelProps) {
  const [error, setError] = useState<string | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<SystemCompanyRow | null>(null);
  const [name, setName] = useState('');
  const [emailDomain, setEmailDomain] = useState('');
  const [saving, setSaving] = useState(false);

  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<SystemCompanyRow | null>(null);
  const [deleteImpact, setDeleteImpact] = useState<CompanyDeleteImpact | null>(null);
  const [deleteConfirmName, setDeleteConfirmName] = useState('');
  const [deleting, setDeleting] = useState(false);
  const [impactLoading, setImpactLoading] = useState(false);

  function openCreate() {
    setEditing(null);
    setName('');
    setEmailDomain('');
    setFormOpen(true);
  }

  function openEdit(company: SystemCompanyRow) {
    setEditing(company);
    setName(company.name);
    setEmailDomain('');
    setFormOpen(true);
  }

  async function save() {
    setSaving(true);
    setError(null);
    try {
      if (editing) {
        await apiFetch(`/system/companies/${editing.id}`, {
          method: 'PATCH',
          body: JSON.stringify({ name }),
        });
      } else {
        await apiFetch('/system/companies', {
          method: 'POST',
          body: JSON.stringify({
            name,
            ...(emailDomain.trim() ? { email_domain: emailDomain.trim() } : {}),
          }),
        });
      }
      setFormOpen(false);
      onReload();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Save failed');
    } finally {
      setSaving(false);
    }
  }

  async function openDelete(company: SystemCompanyRow) {
    setDeleteTarget(company);
    setDeleteConfirmName('');
    setDeleteImpact(null);
    setDeleteOpen(true);
    setImpactLoading(true);
    setError(null);
    try {
      const impact = await apiFetch<CompanyDeleteImpact>(
        `/system/companies/${company.id}/delete-impact`,
      );
      setDeleteImpact(impact);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load delete impact');
      setDeleteOpen(false);
    } finally {
      setImpactLoading(false);
    }
  }

  async function confirmDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    setError(null);
    try {
      await apiFetch(`/system/companies/${deleteTarget.id}`, { method: 'DELETE' });
      setDeleteOpen(false);
      setDeleteTarget(null);
      onReload();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Delete failed');
    } finally {
      setDeleting(false);
    }
  }

  const canConfirmDelete =
    deleteTarget !== null &&
    deleteConfirmName.trim() === deleteTarget.name &&
    !impactLoading;

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-4">
        <div>
          <CardTitle className="text-base">Companies</CardTitle>
          <CardDescription>Create, edit, and delete organizations on the platform.</CardDescription>
        </div>
        <Button size="sm" onClick={openCreate}>
          <Plus className="h-4 w-4" />
          Add company
        </Button>
      </CardHeader>
      <CardContent className="space-y-4">
        {error && (
          <Alert variant="destructive">
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {loading || !companies ? (
          <div className="space-y-2">
            <Skeleton className="h-8 w-full" />
            <Skeleton className="h-8 w-full" />
          </div>
        ) : companies.length === 0 ? (
          <p className="text-sm text-muted-foreground">No companies yet.</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Users</TableHead>
                <TableHead>Teams</TableHead>
                <TableHead>Email domains</TableHead>
                <TableHead className={`w-[120px] ${STICKY_ACTIONS_CLASS}`}>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {companies.map((company) => (
                <TableRow key={company.id} className="cursor-pointer" onClick={() => openEdit(company)}>
                  <TableCell className="font-medium">{company.name}</TableCell>
                  <TableCell>{company.user_count}</TableCell>
                  <TableCell>{company.team_count}</TableCell>
                  <TableCell className="text-muted-foreground">
                    {company.email_domains.join(', ') || '—'}
                  </TableCell>
                  <TableCell className={STICKY_ACTIONS_CLASS} onClick={(e) => e.stopPropagation()}>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="sm" onClick={() => openEdit(company)}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => void openDelete(company)}>
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>

      <Sheet open={formOpen} onOpenChange={setFormOpen}>
        <SheetContent className="w-full sm:max-w-md">
          <SheetHeader>
            <SheetTitle>{editing ? 'Edit company' : 'Add company'}</SheetTitle>
            {!editing && (
              <p className="text-sm text-muted-foreground">
                Optionally register a primary email domain for self-service onboarding.
              </p>
            )}
          </SheetHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="company-name">Name</Label>
              <Input
                id="company-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Acme Corp"
              />
            </div>
            {!editing && (
              <div className="space-y-2">
                <Label htmlFor="company-domain">Primary email domain (optional)</Label>
                <Input
                  id="company-domain"
                  value={emailDomain}
                  onChange={(e) => setEmailDomain(e.target.value)}
                  placeholder="acme.com"
                />
              </div>
            )}
          </div>
          <SheetFooter>
            <Button variant="outline" onClick={() => setFormOpen(false)}>
              Cancel
            </Button>
            <Button onClick={() => void save()} disabled={saving || !name.trim()}>
              {saving ? 'Saving…' : 'Save'}
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>

      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Delete company</DialogTitle>
            <DialogDescription>
              This permanently removes the company and all related data. Users will be detached but
              not deleted.
            </DialogDescription>
          </DialogHeader>

          {impactLoading ? (
            <div className="space-y-2 py-4">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-3/4" />
            </div>
          ) : deleteImpact && deleteTarget ? (
            <div className="space-y-4 py-2">
              <Alert variant="destructive">
                <AlertTitle>This action cannot be undone</AlertTitle>
                <AlertDescription>
                  Deleting <strong>{deleteImpact.name}</strong> will cascade and remove:
                  <ul className="mt-2 list-inside list-disc space-y-1">
                    <li>{deleteImpact.team_count} team(s)</li>
                    <li>{deleteImpact.domain_count} email domain(s)</li>
                    <li>{deleteImpact.invite_count} invite(s)</li>
                    <li>
                      {deleteImpact.user_count} user(s) will be detached (kept on the platform)
                    </li>
                  </ul>
                </AlertDescription>
              </Alert>
              <div className="space-y-2">
                <Label htmlFor="delete-confirm">
                  Type <span className="font-semibold">{deleteTarget.name}</span> to confirm
                </Label>
                <Input
                  id="delete-confirm"
                  value={deleteConfirmName}
                  onChange={(e) => setDeleteConfirmName(e.target.value)}
                  placeholder={deleteTarget.name}
                  autoComplete="off"
                />
              </div>
            </div>
          ) : null}

          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteOpen(false)} disabled={deleting}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => void confirmDelete()}
              disabled={!canConfirmDelete || deleting}
            >
              {deleting ? 'Deleting…' : 'Delete company'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
