'use client';

import { useCallback, useEffect, useState } from 'react';
import { apiFetch } from '@/lib/api';
import { QUESTIONNAIRE_ID } from '@/lib/questionnaire';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { RichTextEditor } from '@/components/ui/rich-text-editor';
import { Skeleton } from '@/components/ui/skeleton';

interface QuestionnaireRecord {
  id: number;
  name: string;
  introParagraph: string;
}

export function QuestionnaireIntroPanel() {
  const [intro, setIntro] = useState('');
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const record = await apiFetch<QuestionnaireRecord>(`/admin/questionnaires/${QUESTIONNAIRE_ID}`);
      setIntro(record.introParagraph);
      setName(record.name);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load questionnaire intro');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function save() {
    setSaving(true);
    setError(null);
    setNotice(null);
    try {
      await apiFetch(`/admin/questionnaires/${QUESTIONNAIRE_ID}`, {
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
              Shown at the top of the questionnaire landing page for <strong>{name}</strong>. Format
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
        <Button type="button" onClick={() => void save()} disabled={loading || saving}>
          {saving ? 'Saving…' : 'Save intro'}
        </Button>
      </CardFooter>
    </Card>
  );
}
