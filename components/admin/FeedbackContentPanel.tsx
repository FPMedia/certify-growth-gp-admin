'use client';

import { useCallback, useEffect, useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { apiFetch } from '@/lib/api';
import { RECOMPILE_HINT } from '@/lib/admin/content-fields';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

interface FeedbackRow {
  id: number;
  scoreMin: number | string;
  scoreMax: number | string;
  level: string;
  verb: string;
  adjective: string;
  focus: string;
}

const EMPTY_FORM = {
  scoreMin: '0',
  scoreMax: '0',
  level: '',
  verb: '',
  adjective: '',
  focus: '',
};

export function FeedbackContentPanel() {
  const [rows, setRows] = useState<FeedbackRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<FeedbackRow | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await apiFetch<FeedbackRow[]>('/admin/feedback');
      setRows(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load feedback');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  function openCreate() {
    setEditing(null);
    setForm(EMPTY_FORM);
    setDialogOpen(true);
  }

  function openEdit(row: FeedbackRow) {
    setEditing(row);
    setForm({
      scoreMin: String(row.scoreMin),
      scoreMax: String(row.scoreMax),
      level: row.level,
      verb: row.verb,
      adjective: row.adjective,
      focus: row.focus,
    });
    setDialogOpen(true);
  }

  async function save() {
    setSaving(true);
    setError(null);
    setNotice(null);
    try {
      const body = {
        scoreMin: Number(form.scoreMin),
        scoreMax: Number(form.scoreMax),
        level: form.level,
        verb: form.verb,
        adjective: form.adjective,
        focus: form.focus,
      };
      if (editing) {
        await apiFetch(`/admin/feedback/${editing.id}`, {
          method: 'PATCH',
          body: JSON.stringify(body),
        });
      } else {
        await apiFetch('/admin/feedback', {
          method: 'POST',
          body: JSON.stringify(body),
        });
      }
      setDialogOpen(false);
      setNotice(`Feedback phrases saved. ${RECOMPILE_HINT}`);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Save failed');
    } finally {
      setSaving(false);
    }
  }

  async function remove(id: number) {
    if (!confirm('Delete this feedback band?')) return;
    setError(null);
    try {
      await apiFetch(`/admin/feedback/${id}`, { method: 'DELETE' });
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Delete failed');
    }
  }

  return (
    <Card>
      <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <CardTitle>Feedback phrases</CardTitle>
          <CardDescription>
            Shared across all questionnaires. These words are substituted into element paragraphs
            as <code>**level**</code>, <code>**verb**</code>, <code>**adjective**</code>, and{' '}
            <code>**focus**</code> based on the score band.
          </CardDescription>
        </div>
        <Button size="sm" onClick={openCreate}>
          <Plus className="h-4 w-4" />
          Add band
        </Button>
      </CardHeader>
      <CardContent className="space-y-4 p-0 sm:p-0">
        {(error || notice) && (
          <div className="space-y-2 px-6 pt-2">
            {error && (
              <Alert variant="destructive">
                <AlertTitle>Error</AlertTitle>
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
            {notice && (
              <Alert>
                <AlertTitle>Saved</AlertTitle>
                <AlertDescription>{notice}</AlertDescription>
              </Alert>
            )}
          </div>
        )}
        {loading ? (
          <div className="p-6">
            <Skeleton className="h-32 w-full" />
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Score range</TableHead>
                <TableHead>Level</TableHead>
                <TableHead>Verb</TableHead>
                <TableHead>Adjective</TableHead>
                <TableHead>Focus</TableHead>
                <TableHead className="w-[120px]">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((row) => (
                <TableRow key={row.id}>
                  <TableCell className="whitespace-nowrap text-sm">
                    {row.scoreMin} – {row.scoreMax}
                  </TableCell>
                  <TableCell>{row.level}</TableCell>
                  <TableCell>{row.verb}</TableCell>
                  <TableCell>{row.adjective}</TableCell>
                  <TableCell className="max-w-[200px] truncate">{row.focus}</TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="sm" onClick={() => openEdit(row)}>
                        Edit
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => void remove(row.id)}>
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

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{editing ? 'Edit' : 'Add'} feedback band</DialogTitle>
            <DialogDescription>
              Phrases used when a score falls in this range. Where this appears: substituted into
              element report paragraphs.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-3 py-2">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="fb-min">Score min</Label>
                <Input
                  id="fb-min"
                  type="number"
                  step="0.01"
                  value={form.scoreMin}
                  onChange={(e) => setForm((f) => ({ ...f, scoreMin: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="fb-max">Score max</Label>
                <Input
                  id="fb-max"
                  type="number"
                  step="0.01"
                  value={form.scoreMax}
                  onChange={(e) => setForm((f) => ({ ...f, scoreMax: e.target.value }))}
                />
              </div>
            </div>
            {(['level', 'verb', 'adjective', 'focus'] as const).map((key) => (
              <div key={key} className="space-y-2">
                <Label htmlFor={`fb-${key}`} className="capitalize">
                  {key}
                </Label>
                <Input
                  id={`fb-${key}`}
                  value={form[key]}
                  onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))}
                />
              </div>
            ))}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={() => void save()} disabled={saving}>
              {saving ? 'Saving…' : 'Save'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
