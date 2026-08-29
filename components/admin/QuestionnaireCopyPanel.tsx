'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { apiFetch } from '@/lib/api';
import {
  SECTION_COPY_FIELDS,
  RECOMPILE_HINT,
  type ContentSection,
} from '@/lib/admin/content-fields';
import { ContentFieldEditor } from '@/components/admin/ContentFieldEditor';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

type QuestionnaireRecord = Record<string, unknown> & {
  id: number;
  name: string;
};

interface QuestionnaireCopyPanelProps {
  questionnaireId: number;
  section: Extract<ContentSection, 'landing' | 'personal' | 'team' | 'leader' | 'company'>;
  sectionLabel: string;
  sectionDescription: string;
  highlightKey?: string | null;
}

export function QuestionnaireCopyPanel({
  questionnaireId,
  section,
  sectionLabel,
  sectionDescription,
  highlightKey,
}: QuestionnaireCopyPanelProps) {
  const fields = SECTION_COPY_FIELDS[section] ?? [];
  const [record, setRecord] = useState<QuestionnaireRecord | null>(null);
  const [form, setForm] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const load = useCallback(async () => {
    const sectionFields = SECTION_COPY_FIELDS[section] ?? [];
    setLoading(true);
    setError(null);
    try {
      const data = await apiFetch<QuestionnaireRecord>(`/admin/questionnaires/${questionnaireId}`);
      setRecord(data);
      const next: Record<string, string> = {};
      for (const field of sectionFields) {
        const raw = data[field.key];
        next[field.key] = raw == null ? '' : String(raw);
      }
      setForm(next);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load copy');
    } finally {
      setLoading(false);
    }
  }, [questionnaireId, section]);

  useEffect(() => {
    void load();
  }, [load]);

  const dirty = useMemo(() => {
    if (!record) return false;
    return fields.some((field) => {
      const original = record[field.key] == null ? '' : String(record[field.key]);
      return (form[field.key] ?? '') !== original;
    });
  }, [fields, form, record]);

  async function save() {
    setSaving(true);
    setError(null);
    setNotice(null);
    try {
      const body: Record<string, string> = {};
      for (const field of fields) {
        body[field.key] = form[field.key] ?? '';
      }
      const updated = await apiFetch<QuestionnaireRecord>(`/admin/questionnaires/${questionnaireId}`, {
        method: 'PATCH',
        body: JSON.stringify(body),
      });
      setRecord(updated);
      setNotice(`Saved. ${RECOMPILE_HINT}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Save failed');
    } finally {
      setSaving(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{sectionLabel}</CardTitle>
        <CardDescription>
          {sectionDescription}
          {record?.name ? (
            <>
              {' '}
              for <strong>{record.name}</strong>
            </>
          ) : null}
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
          <div className="space-y-3">
            <Skeleton className="h-32 w-full" />
            <Skeleton className="h-32 w-full" />
          </div>
        ) : (
          fields.map((field) => (
            <div
              key={field.key}
              id={`field-${field.key}`}
              className={highlightKey === field.key ? 'ring-2 ring-primary rounded-lg' : undefined}
            >
              <ContentFieldEditor
                field={field}
                value={form[field.key] ?? ''}
                onChange={(value) => setForm((f) => ({ ...f, [field.key]: value }))}
                disabled={saving}
                extraHint={field.extraHint}
              />
            </div>
          ))
        )}
      </CardContent>
      <CardFooter className="justify-between gap-3">
        <p className="text-xs text-muted-foreground">{RECOMPILE_HINT}</p>
        <Button type="button" onClick={() => void save()} disabled={loading || saving || !dirty}>
          {saving ? 'Saving…' : 'Save changes'}
        </Button>
      </CardFooter>
    </Card>
  );
}
