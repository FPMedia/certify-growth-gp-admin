'use client';

import { useCallback, useEffect, useState } from 'react';
import { apiFetch } from '@/lib/api';
import { RECOMPILE_HINT } from '@/lib/admin/content-fields';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { Textarea } from '@/components/ui/textarea';

interface ReportGroupRow {
  id: number;
  questionnaireId: number;
  groupNumber: number;
  title: string;
  description: string;
}

interface ReportGroupsPanelProps {
  questionnaireId: number;
  questionnaireName?: string;
}

export function ReportGroupsPanel({ questionnaireId, questionnaireName }: ReportGroupsPanelProps) {
  const [rows, setRows] = useState<ReportGroupRow[]>([]);
  const [forms, setForms] = useState<Record<number, { title: string; description: string }>>({});
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await apiFetch<ReportGroupRow[]>(
        `/admin/questionnaires/${questionnaireId}/report-groups`,
      );
      setRows(data);
      const next: Record<number, { title: string; description: string }> = {};
      for (const row of data) {
        next[row.id] = { title: row.title, description: row.description };
      }
      setForms(next);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load report groups');
    } finally {
      setLoading(false);
    }
  }, [questionnaireId]);

  useEffect(() => {
    void load();
  }, [load]);

  async function save(id: number) {
    const form = forms[id];
    if (!form) return;
    setSavingId(id);
    setError(null);
    setNotice(null);
    try {
      await apiFetch(`/admin/report-groups/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(form),
      });
      setNotice(`Group saved. ${RECOMPILE_HINT}`);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Save failed');
    } finally {
      setSavingId(null);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Report groups</CardTitle>
        <CardDescription>
          Titles and short descriptions for the three capability groups
          {questionnaireName ? (
            <>
              {' '}
              on <strong>{questionnaireName}</strong>
            </>
          ) : null}
          . These appear as section headers in reports.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
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
        {loading ? (
          <Skeleton className="h-40 w-full" />
        ) : rows.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No report groups found for this questionnaire. Re-seed the catalog or create groups via
            migration.
          </p>
        ) : (
          rows.map((row) => {
            const form = forms[row.id] ?? { title: '', description: '' };
            const dirty = form.title !== row.title || form.description !== row.description;
            return (
              <div key={row.id} className="space-y-3 rounded-lg border p-4">
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Group {row.groupNumber}
                </p>
                <div className="space-y-2">
                  <Label htmlFor={`group-title-${row.id}`}>Title</Label>
                  <Input
                    id={`group-title-${row.id}`}
                    value={form.title}
                    onChange={(e) =>
                      setForms((f) => ({
                        ...f,
                        [row.id]: { ...form, title: e.target.value },
                      }))
                    }
                  />
                  <p className="text-xs text-muted-foreground">
                    Where this appears: Group header in reports (e.g. Adapt, Innovate, Execute)
                  </p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor={`group-desc-${row.id}`}>Description</Label>
                  <Textarea
                    id={`group-desc-${row.id}`}
                    value={form.description}
                    onChange={(e) =>
                      setForms((f) => ({
                        ...f,
                        [row.id]: { ...form, description: e.target.value },
                      }))
                    }
                    rows={3}
                  />
                </div>
                <Button
                  type="button"
                  size="sm"
                  disabled={!dirty || savingId === row.id}
                  onClick={() => void save(row.id)}
                >
                  {savingId === row.id ? 'Saving…' : 'Save group'}
                </Button>
              </div>
            );
          })
        )}
      </CardContent>
    </Card>
  );
}
