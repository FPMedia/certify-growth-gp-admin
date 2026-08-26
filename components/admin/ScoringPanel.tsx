'use client';

import { useCallback, useEffect, useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { apiFetch } from '@/lib/api';
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

interface MatrixRow {
  id: number;
  scoreMin: number | string;
  scoreMax: number | string;
  wtg2: number | string;
  wtg3: number | string;
  wtg4: number | string;
}

const EMPTY_FORM = {
  scoreMin: '0',
  scoreMax: '0',
  wtg2: '0',
  wtg3: '0',
  wtg4: '0',
};

export function ScoringPanel() {
  const [rows, setRows] = useState<MatrixRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<MatrixRow | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await apiFetch<MatrixRow[]>('/admin/group-weightings-matrices');
      setRows(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load matrices');
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

  function openEdit(row: MatrixRow) {
    setEditing(row);
    setForm({
      scoreMin: String(row.scoreMin),
      scoreMax: String(row.scoreMax),
      wtg2: String(row.wtg2),
      wtg3: String(row.wtg3),
      wtg4: String(row.wtg4),
    });
    setDialogOpen(true);
  }

  async function save() {
    setSaving(true);
    setError(null);
    try {
      const body = {
        scoreMin: Number(form.scoreMin),
        scoreMax: Number(form.scoreMax),
        wtg2: Number(form.wtg2),
        wtg3: Number(form.wtg3),
        wtg4: Number(form.wtg4),
      };
      if (editing) {
        await apiFetch(`/admin/group-weightings-matrices/${editing.id}`, {
          method: 'PATCH',
          body: JSON.stringify(body),
        });
      } else {
        await apiFetch('/admin/group-weightings-matrices', {
          method: 'POST',
          body: JSON.stringify(body),
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

  async function remove(id: number) {
    if (!confirm('Delete this weighting row?')) return;
    try {
      await apiFetch(`/admin/group-weightings-matrices/${id}`, { method: 'DELETE' });
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Delete failed');
    }
  }

  return (
    <Card>
      <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <CardTitle>Scoring weightings</CardTitle>
          <CardDescription>
            Advanced numeric matrices shared by all questionnaires. Prefer the Content sections above
            for wording changes.
          </CardDescription>
        </div>
        <Button size="sm" variant="outline" onClick={openCreate}>
          <Plus className="h-4 w-4" />
          Add row
        </Button>
      </CardHeader>
      <CardContent className="p-0">
        {error && (
          <div className="px-6 pt-2">
            <Alert variant="destructive">
              <AlertTitle>Error</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
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
                <TableHead>Score min</TableHead>
                <TableHead>Score max</TableHead>
                <TableHead>Wtg 2</TableHead>
                <TableHead>Wtg 3</TableHead>
                <TableHead>Wtg 4</TableHead>
                <TableHead className="w-[120px]">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((row) => (
                <TableRow key={row.id}>
                  <TableCell>{row.scoreMin}</TableCell>
                  <TableCell>{row.scoreMax}</TableCell>
                  <TableCell>{row.wtg2}</TableCell>
                  <TableCell>{row.wtg3}</TableCell>
                  <TableCell>{row.wtg4}</TableCell>
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
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing ? 'Edit' : 'Add'} weighting row</DialogTitle>
            <DialogDescription>Numeric score-to-weight lookup for group calculations.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-3 py-2">
            {(
              [
                ['scoreMin', 'Score min'],
                ['scoreMax', 'Score max'],
                ['wtg2', 'Weight group 2'],
                ['wtg3', 'Weight group 3'],
                ['wtg4', 'Weight group 4'],
              ] as const
            ).map(([key, label]) => (
              <div key={key} className="space-y-2">
                <Label htmlFor={`mx-${key}`}>{label}</Label>
                <Input
                  id={`mx-${key}`}
                  type="number"
                  step="0.001"
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
