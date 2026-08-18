'use client';

import { useCallback, useEffect, useState } from 'react';
import { Pencil, Plus, Trash2 } from 'lucide-react';
import { apiFetch } from '@/lib/api';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
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
import type { SystemCompanyRow, SystemTeamRow } from './system-types';

interface SystemTeamsPanelProps {
  companies: SystemCompanyRow[] | null;
}

export function SystemTeamsPanel({ companies }: SystemTeamsPanelProps) {
  const [teams, setTeams] = useState<SystemTeamRow[] | null>(null);
  const [companyFilter, setCompanyFilter] = useState<string>('all');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<SystemTeamRow | null>(null);
  const [name, setName] = useState('');
  const [companyId, setCompanyId] = useState('');
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const path =
        companyFilter === 'all' ? '/system/teams' : `/system/teams?companyId=${companyFilter}`;
      const rows = await apiFetch<SystemTeamRow[]>(path);
      setTeams(rows);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load teams');
    } finally {
      setLoading(false);
    }
  }, [companyFilter]);

  useEffect(() => {
    void load();
  }, [load, companies]);

  function openCreate() {
    setEditing(null);
    setName('');
    setCompanyId(companyFilter !== 'all' ? companyFilter : '');
    setDialogOpen(true);
  }

  function openEdit(team: SystemTeamRow) {
    setEditing(team);
    setName(team.name);
    setCompanyId(String(team.company_id));
    setDialogOpen(true);
  }

  async function save() {
    const targetCompanyId = Number(editing ? editing.company_id : companyId);
    if (!Number.isInteger(targetCompanyId) || targetCompanyId <= 0) {
      setError('Select a company');
      return;
    }

    setSaving(true);
    setError(null);
    try {
      if (editing) {
        await apiFetch(`/system/companies/${targetCompanyId}/teams/${editing.id}`, {
          method: 'PATCH',
          body: JSON.stringify({ name }),
        });
      } else {
        await apiFetch(`/system/companies/${targetCompanyId}/teams`, {
          method: 'POST',
          body: JSON.stringify({ name }),
        });
      }
      setDialogOpen(false);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Save failed');
    } finally {
      setSaving(false);
    }
  }

  async function remove(team: SystemTeamRow) {
    if (
      !confirm(
        `Delete team "${team.name}" from ${team.company_name}?\n\nTeams with members cannot be deleted.`,
      )
    ) {
      return;
    }
    setError(null);
    try {
      await apiFetch(`/system/companies/${team.company_id}/teams/${team.id}`, {
        method: 'DELETE',
      });
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Delete failed');
    }
  }

  return (
    <Card>
      <CardHeader className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <CardTitle className="text-base">Teams</CardTitle>
          <CardDescription>Manage teams across all companies.</CardDescription>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
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
          <Button size="sm" onClick={openCreate} disabled={!companies?.length}>
            <Plus className="h-4 w-4" />
            Add team
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {error && (
          <Alert variant="destructive">
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {loading || !teams ? (
          <div className="space-y-2">
            <Skeleton className="h-8 w-full" />
            <Skeleton className="h-8 w-full" />
          </div>
        ) : teams.length === 0 ? (
          <p className="text-sm text-muted-foreground">No teams yet.</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Company</TableHead>
                <TableHead>Members</TableHead>
                <TableHead className={`w-[120px] ${STICKY_ACTIONS_CLASS}`}>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {teams.map((team) => (
                <TableRow key={team.id} className="cursor-pointer" onClick={() => openEdit(team)}>
                  <TableCell className="font-medium">{team.name}</TableCell>
                  <TableCell>{team.company_name}</TableCell>
                  <TableCell>{team.member_count}</TableCell>
                  <TableCell className={STICKY_ACTIONS_CLASS} onClick={(e) => e.stopPropagation()}>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="sm" onClick={() => openEdit(team)}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => void remove(team)}>
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

      <Sheet open={dialogOpen} onOpenChange={setDialogOpen}>
        <SheetContent className="w-full sm:max-w-md">
          <SheetHeader>
            <SheetTitle>{editing ? 'Edit team' : 'Add team'}</SheetTitle>
          </SheetHeader>
          <div className="space-y-4 py-2">
            {!editing && (
              <div className="space-y-2">
                <Label>Company</Label>
                <Select value={companyId} onValueChange={setCompanyId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select company" />
                  </SelectTrigger>
                  <SelectContent>
                    {(companies ?? []).map((c) => (
                      <SelectItem key={c.id} value={String(c.id)}>
                        {c.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="team-name">Name</Label>
              <Input
                id="team-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Engineering"
              />
            </div>
          </div>
          <SheetFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => void save()}
              disabled={saving || !name.trim() || (!editing && !companyId)}
            >
              {saving ? 'Saving…' : 'Save'}
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>
    </Card>
  );
}
