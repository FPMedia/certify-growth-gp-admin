'use client';

import { useCallback, useEffect, useState } from 'react';
import { apiFetch } from '@/lib/api';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { RichTextEditor } from '@/components/ui/rich-text-editor';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';

interface QuestionnaireListItem {
  id: number;
  name: string;
}

interface QuestionnaireRecord {
  id: number;
  name: string;
  introParagraph: string;
}

export function QuestionnaireIntroPanel() {
  const [options, setOptions] = useState<QuestionnaireListItem[]>([]);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [intro, setIntro] = useState('');
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const loadList = useCallback(async () => {
    const rows = await apiFetch<QuestionnaireListItem[]>('/admin/questionnaires');
    setOptions(rows);
    setSelectedId((current) => current ?? rows[0]?.id ?? null);
    return rows;
  }, []);

  const loadRecord = useCallback(async (id: number) => {
    setLoading(true);
    setError(null);
    try {
      const record = await apiFetch<QuestionnaireRecord>(`/admin/questionnaires/${id}`);
      setIntro(record.introParagraph);
      setName(record.name);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load questionnaire intro');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadList().catch((e: Error) => {
      setError(e.message);
      setLoading(false);
    });
  }, [loadList]);

  useEffect(() => {
    if (selectedId == null) return;
    void loadRecord(selectedId);
  }, [loadRecord, selectedId]);

  async function save() {
    if (selectedId == null) return;
    setSaving(true);
    setError(null);
    setNotice(null);
    try {
      await apiFetch(`/admin/questionnaires/${selectedId}`, {
        method: 'PATCH',
        body: JSON.stringify({ introParagraph: intro }),
      });
      setNotice('Questionnaire intro saved.');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Save failed');
    } finally {
      setSaving(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Questionnaire intro</CardTitle>
        <CardDescription>
          {name ? (
            <>
              Shown at the top of the questionnaire landing card for <strong>{name}</strong>. Format
              headings, lists, and emphasis visually.
            </>
          ) : (
            'Shown at the top of the questionnaire landing page. Format headings, lists, and emphasis visually.'
          )}
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
        {options.length > 1 && (
          <div className="space-y-2">
            <Label htmlFor="questionnaire-select">Questionnaire</Label>
            <Select
              value={selectedId != null ? String(selectedId) : undefined}
              onValueChange={(value) => setSelectedId(Number(value))}
            >
              <SelectTrigger id="questionnaire-select" className="max-w-sm">
                <SelectValue placeholder="Select a questionnaire" />
              </SelectTrigger>
              <SelectContent>
                {options.map((option) => (
                  <SelectItem key={option.id} value={String(option.id)}>
                    {option.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}
        {loading ? (
          <Skeleton className="h-64 w-full rounded-md" />
        ) : (
          <RichTextEditor
            value={intro}
            onChange={setIntro}
            placeholder="Questionnaire intro copy…"
            minHeightClassName="min-h-[280px]"
          />
        )}
      </CardContent>
      <CardFooter>
        <Button type="button" onClick={() => void save()} disabled={loading || saving || selectedId == null}>
          {saving ? 'Saving…' : 'Save intro'}
        </Button>
      </CardFooter>
    </Card>
  );
}
