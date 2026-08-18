'use client';

import { useCallback, useEffect, useState } from 'react';
import { Pencil, Trash2 } from 'lucide-react';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Sheet, SheetContent, SheetFooter, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { STICKY_ACTIONS_CLASS } from '@/lib/admin/table-styles';
import type { SystemCompanyRow, SystemTeamRow, SystemUserRow, UserDeleteImpact } from './system-types';

interface SystemUsersPanelProps {
  companies: SystemCompanyRow[] | null;
}

const NO_COMPANY = 'none';
const NO_TEAM = 'none';

export function SystemUsersPanel({ companies }: SystemUsersPanelProps) {
  const [users, setUsers] = useState<SystemUserRow[] | null>(null);
  const [teams, setTeams] = useState<SystemTeamRow[]>([]);
  const [companyFilter, setCompanyFilter] = useState<string>('all');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busyUserId, setBusyUserId] = useState<number | null>(null);

  const [editOpen, setEditOpen] = useState(false);
  const [editing, setEditing] = useState<SystemUserRow | null>(null);
  const [editName, setEditName] = useState('');
  const [editCompanyId, setEditCompanyId] = useState('');
  const [editTeamId, setEditTeamId] = useState('');
  const [editTeams, setEditTeams] = useState<SystemTeamRow[]>([]);
  const [saving, setSaving] = useState(false);

  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<SystemUserRow | null>(null);
  const [deleteImpact, setDeleteImpact] = useState<UserDeleteImpact | null>(null);
  const [deleteConfirmEmail, setDeleteConfirmEmail] = useState('');
  const [deleting, setDeleting] = useState(false);
  const [impactLoading, setImpactLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const usersPath =
        companyFilter === 'all' ? '/system/users' : `/system/users?companyId=${companyFilter}`;
      const [usersRes, teamsRes] = await Promise.all([
        apiFetch<SystemUserRow[]>(usersPath),
        apiFetch<SystemTeamRow[]>(
          companyFilter === 'all' ? '/system/teams' : `/system/teams?companyId=${companyFilter}`,
        ),
      ]);
      setUsers(usersRes);
      setTeams(teamsRes);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load users');
    } finally {
      setLoading(false);
    }
  }, [companyFilter]);

  useEffect(() => {
    void load();
  }, [load, companies]);

  async function loadTeamsForCompany(companyId: string) {
    if (companyId === NO_COMPANY) {
      setEditTeams([]);
      return;
    }
    const rows = await apiFetch<SystemTeamRow[]>(`/system/teams?companyId=${companyId}`);
    setEditTeams(rows);
  }

  function openEdit(user: SystemUserRow) {
    setEditing(user);
    setEditName(user.name);
    setEditCompanyId(user.company_id !== null ? String(user.company_id) : NO_COMPANY);
    setEditTeamId(user.team_id !== null ? String(user.team_id) : NO_TEAM);
    setEditTeams([]);
    setEditOpen(true);
    if (user.company_id !== null) {
      void loadTeamsForCompany(String(user.company_id));
    }
  }

  async function onEditCompanyChange(value: string) {
    setEditCompanyId(value);
    setEditTeamId(NO_TEAM);
    await loadTeamsForCompany(value);
  }

  async function saveEdit() {
    if (!editing) return;
    setSaving(true);
    setError(null);
    try {
      const body: Record<string, unknown> = { name: editName.trim() };
      const originalCompany = editing.company_id !== null ? String(editing.company_id) : NO_COMPANY;
      if (editCompanyId !== originalCompany) {
        body.company_id = editCompanyId === NO_COMPANY ? null : Number(editCompanyId);
      }
      const originalTeam = editing.team_id !== null ? String(editing.team_id) : NO_TEAM;
      if (editTeamId !== originalTeam) {
        body.team_id = editTeamId === NO_TEAM ? null : Number(editTeamId);
      }
      await apiFetch(`/system/users/${editing.id}`, {
        method: 'PATCH',
        body: JSON.stringify(body),
      });
      setEditOpen(false);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Save failed');
    } finally {
      setSaving(false);
    }
  }

  async function updateRole(user: SystemUserRow, role: 'USER' | 'CONTENT_MANAGER' | 'COMPANY_ADMIN') {
    setBusyUserId(user.id);
    setError(null);
    try {
      await apiFetch(`/system/users/${user.id}/role`, {
        method: 'PATCH',
        body: JSON.stringify({ role }),
      });
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to update role');
    } finally {
      setBusyUserId(null);
    }
  }

  async function updateTeam(user: SystemUserRow, teamId: string) {
    if (user.company_id === null) return;
    setBusyUserId(user.id);
    setError(null);
    try {
      await apiFetch(`/system/users/${user.id}`, {
        method: 'PATCH',
        body: JSON.stringify({
          team_id: teamId === NO_TEAM ? null : Number(teamId),
        }),
      });
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to update team');
    } finally {
      setBusyUserId(null);
    }
  }

  async function openDelete(user: SystemUserRow) {
    setDeleteTarget(user);
    setDeleteConfirmEmail('');
    setDeleteImpact(null);
    setDeleteOpen(true);
    setImpactLoading(true);
    setError(null);
    try {
      const impact = await apiFetch<UserDeleteImpact>(`/system/users/${user.id}/delete-impact`);
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
      await apiFetch(`/system/users/${deleteTarget.id}`, { method: 'DELETE' });
      setDeleteOpen(false);
      setDeleteTarget(null);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Delete failed');
    } finally {
      setDeleting(false);
    }
  }

  const canConfirmDelete =
    deleteTarget !== null &&
    deleteConfirmEmail.trim().toLowerCase() === deleteTarget.email.toLowerCase() &&
    !impactLoading;

  function teamsForUser(user: SystemUserRow): SystemTeamRow[] {
    if (user.company_id === null) return [];
    return teams.filter((t) => t.company_id === user.company_id);
  }

  return (
    <Card>
      <CardHeader className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <CardTitle className="text-base">Users</CardTitle>
          <CardDescription>
            Manage user details, company assignments, teams, and roles.
          </CardDescription>
        </div>
        <Select value={companyFilter} onValueChange={setCompanyFilter}>
          <SelectTrigger className="w-full sm:w-56">
            <SelectValue placeholder="Filter by company" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All companies</SelectItem>
            {(companies ?? []).map((c) => (
              <SelectItem key={c.id} value={String(c.id)}>
                {c.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </CardHeader>
      <CardContent className="space-y-4">
        {error && (
          <Alert variant="destructive">
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {loading || !users ? (
          <div className="space-y-2">
            <Skeleton className="h-8 w-full" />
            <Skeleton className="h-8 w-full" />
          </div>
        ) : users.length === 0 ? (
          <p className="text-sm text-muted-foreground">No users yet.</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Company</TableHead>
                <TableHead>Team</TableHead>
                <TableHead>Role</TableHead>
                <TableHead className={`w-[100px] ${STICKY_ACTIONS_CLASS}`}>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.map((user) => {
                const isSuperAdmin = user.role === 'SUPER_ADMIN';
                const busy = busyUserId === user.id;
                const userTeams = teamsForUser(user);

                return (
                  <TableRow
                    key={user.id}
                    className={isSuperAdmin ? undefined : 'cursor-pointer'}
                    onClick={() => !isSuperAdmin && openEdit(user)}
                  >
                    <TableCell className="font-medium">{user.name}</TableCell>
                    <TableCell className="text-muted-foreground">{user.email}</TableCell>
                    <TableCell>{user.company_name ?? '—'}</TableCell>
                    <TableCell onClick={(e) => e.stopPropagation()}>
                      {isSuperAdmin || user.company_id === null ? (
                        <span className="text-sm text-muted-foreground">—</span>
                      ) : (
                        <Select
                          value={user.team_id !== null ? String(user.team_id) : NO_TEAM}
                          onValueChange={(v) => void updateTeam(user, v)}
                          disabled={busy}
                        >
                          <SelectTrigger className="h-8 w-40">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value={NO_TEAM}>No team</SelectItem>
                            {userTeams.map((team) => (
                              <SelectItem key={team.id} value={String(team.id)}>
                                {team.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      )}
                    </TableCell>
                    <TableCell onClick={(e) => e.stopPropagation()}>
                      {isSuperAdmin ? (
                        <span className="text-sm text-muted-foreground">System Admin</span>
                      ) : (
                        <Select
                          value={
                            user.role === 'COMPANY_ADMIN'
                              ? 'COMPANY_ADMIN'
                              : user.role === 'CONTENT_MANAGER'
                                ? 'CONTENT_MANAGER'
                                : 'USER'
                          }
                          onValueChange={(v) => void updateRole(user, v as 'USER' | 'CONTENT_MANAGER' | 'COMPANY_ADMIN')}
                          disabled={busy || user.company_id === null}
                        >
                          <SelectTrigger className="h-8 w-40">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="USER">Member</SelectItem>
                            <SelectItem value="CONTENT_MANAGER">Content Manager</SelectItem>
                            <SelectItem value="COMPANY_ADMIN">Company Admin</SelectItem>
                          </SelectContent>
                        </Select>
                      )}
                    </TableCell>
                    <TableCell className={STICKY_ACTIONS_CLASS} onClick={(e) => e.stopPropagation()}>
                      {!isSuperAdmin && (
                        <div className="flex gap-1">
                          <Button variant="ghost" size="sm" disabled={busy} onClick={() => openEdit(user)}>
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            disabled={busy}
                            onClick={() => void openDelete(user)}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </CardContent>

      <Sheet open={editOpen} onOpenChange={setEditOpen}>
        <SheetContent className="w-full sm:max-w-md">
          <SheetHeader>
            <SheetTitle>Edit user</SheetTitle>
          </SheetHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="user-name">Name</Label>
              <Input
                id="user-name"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Company</Label>
              <Select value={editCompanyId} onValueChange={(v) => void onEditCompanyChange(v)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={NO_COMPANY}>No company</SelectItem>
                  {(companies ?? []).map((c) => (
                    <SelectItem key={c.id} value={String(c.id)}>
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {editCompanyId !== NO_COMPANY && (
              <div className="space-y-2">
                <Label>Team</Label>
                <Select value={editTeamId} onValueChange={setEditTeamId}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={NO_TEAM}>No team</SelectItem>
                    {editTeams.map((team) => (
                      <SelectItem key={team.id} value={String(team.id)}>
                        {team.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>
          <SheetFooter>
            <Button variant="outline" onClick={() => setEditOpen(false)}>
              Cancel
            </Button>
            <Button onClick={() => void saveEdit()} disabled={saving || !editName.trim()}>
              {saving ? 'Saving…' : 'Save'}
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>

      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Delete user</DialogTitle>
            <DialogDescription>
              This permanently removes the user and all related data from the platform.
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
                    <li>{deleteImpact.submission_count} submission(s) and all reports</li>
                    <li>{deleteImpact.invite_count} invite(s) sent by this user</li>
                    <li>The platform user record and company links</li>
                    <li className="text-muted-foreground">
                      Firebase sign-in is shared across platforms and will not be deleted
                    </li>
                  </ul>
                </AlertDescription>
              </Alert>
              <div className="space-y-2">
                <Label htmlFor="delete-user-confirm">
                  Type <span className="font-semibold">{deleteTarget.email}</span> to confirm
                </Label>
                <Input
                  id="delete-user-confirm"
                  value={deleteConfirmEmail}
                  onChange={(e) => setDeleteConfirmEmail(e.target.value)}
                  placeholder={deleteTarget.email}
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
              {deleting ? 'Deleting…' : 'Delete user'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
