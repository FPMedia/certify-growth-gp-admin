'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { apiFetch } from '@/lib/api';
import { FEEDBACK_TOKEN_HINT, RECOMPILE_HINT } from '@/lib/admin/content-fields';
import { ContentFieldEditor } from '@/components/admin/ContentFieldEditor';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { cn } from '@/lib/utils';

interface ElementRow {
  id: number;
  name: string;
  group: number | null;
  order: number;
  questionnaireId: number | null;
  shortDescription: string | null;
  paragraph: string | null;
  paragraph2: string | null;
  teamParagraph: string | null;
  ceoQuestionLabel: string | null;
  ceoQuestionLabel2: string | null;
}

interface QuestionRow {
  id: number;
  label: string;
  concept: string | null;
  elementId: number | null;
  order: number;
  weighting: number | string;
  isNegative: boolean;
}

type EditTarget =
  | { kind: 'element'; row: ElementRow }
  | { kind: 'question'; row: QuestionRow; elementName: string };

interface ElementsQuestionsPanelProps {
  questionnaireId: number;
  questionnaireName?: string;
  searchQuery?: string;
}

function stripHtml(value: string): string {
  return value.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
}

export function ElementsQuestionsPanel({
  questionnaireId,
  questionnaireName,
  searchQuery = '',
}: ElementsQuestionsPanelProps) {
  const [elements, setElements] = useState<ElementRow[]>([]);
  const [questions, setQuestions] = useState<QuestionRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [editing, setEditing] = useState<EditTarget | null>(null);
  const [form, setForm] = useState<Record<string, string | boolean>>({});
  const [saving, setSaving] = useState(false);
  const [expandedGroups, setExpandedGroups] = useState<Record<number, boolean>>({
    1: true,
    2: true,
    3: true,
  });

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [elRows, qRows] = await Promise.all([
        apiFetch<ElementRow[]>('/admin/elements'),
        apiFetch<QuestionRow[]>('/admin/questions'),
      ]);
      setElements(elRows.filter((e) => e.questionnaireId === questionnaireId));
      setQuestions(qRows);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load elements');
    } finally {
      setLoading(false);
    }
  }, [questionnaireId]);

  useEffect(() => {
    void load();
  }, [load]);

  const questionsByElement = useMemo(() => {
    const map = new Map<number, QuestionRow[]>();
    for (const q of questions) {
      if (q.elementId == null) continue;
      const list = map.get(q.elementId) ?? [];
      list.push(q);
      map.set(q.elementId, list);
    }
    for (const list of map.values()) {
      list.sort((a, b) => a.order - b.order);
    }
    return map;
  }, [questions]);

  const q = searchQuery.trim().toLowerCase();

  const grouped = useMemo(() => {
    const byGroup = new Map<number, ElementRow[]>();
    for (const el of elements) {
      const group = el.group ?? 0;
      if (q) {
        const elMatch =
          el.name.toLowerCase().includes(q) ||
          stripHtml(el.paragraph ?? '').toLowerCase().includes(q) ||
          stripHtml(el.shortDescription ?? '').toLowerCase().includes(q);
        const qs = questionsByElement.get(el.id) ?? [];
        const qMatch = qs.some(
          (question) =>
            stripHtml(question.label).toLowerCase().includes(q) ||
            stripHtml(question.concept ?? '').toLowerCase().includes(q),
        );
        if (!elMatch && !qMatch) continue;
      }
      const list = byGroup.get(group) ?? [];
      list.push(el);
      byGroup.set(group, list);
    }
    for (const list of byGroup.values()) {
      list.sort((a, b) => a.order - b.order);
    }
    return [...byGroup.entries()].sort(([a], [b]) => a - b);
  }, [elements, q, questionsByElement]);

  function openElement(row: ElementRow) {
    setEditing({ kind: 'element', row });
    setForm({
      name: row.name,
      shortDescription: row.shortDescription ?? '',
      paragraph: row.paragraph ?? '',
      paragraph2: row.paragraph2 ?? '',
      teamParagraph: row.teamParagraph ?? '',
      ceoQuestionLabel: row.ceoQuestionLabel ?? '',
      ceoQuestionLabel2: row.ceoQuestionLabel2 ?? '',
      order: String(row.order),
      group: String(row.group ?? 1),
    });
    setNotice(null);
  }

  function openQuestion(row: QuestionRow, elementName: string) {
    setEditing({ kind: 'question', row, elementName });
    setForm({
      label: row.label,
      concept: row.concept ?? '',
      order: String(row.order),
      weighting: String(row.weighting),
      isNegative: row.isNegative,
    });
    setNotice(null);
  }

  async function save() {
    if (!editing) return;
    setSaving(true);
    setError(null);
    setNotice(null);
    try {
      if (editing.kind === 'element') {
        await apiFetch(`/admin/elements/${editing.row.id}`, {
          method: 'PATCH',
          body: JSON.stringify({
            name: form.name,
            shortDescription: form.shortDescription || null,
            paragraph: form.paragraph || null,
            paragraph2: form.paragraph2 || null,
            teamParagraph: form.teamParagraph || null,
            ceoQuestionLabel: form.ceoQuestionLabel || null,
            ceoQuestionLabel2: form.ceoQuestionLabel2 || null,
            order: Number(form.order),
            group: Number(form.group),
          }),
        });
      } else {
        await apiFetch(`/admin/questions/${editing.row.id}`, {
          method: 'PATCH',
          body: JSON.stringify({
            label: form.label,
            concept: form.concept || null,
            order: Number(form.order),
            weighting: Number(form.weighting),
            isNegative: Boolean(form.isNegative),
          }),
        });
      }
      setNotice(`Saved. ${RECOMPILE_HINT}`);
      setEditing(null);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Save failed');
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>Elements & questions</CardTitle>
          <CardDescription>
            Edit the text people see in the questionnaire and in report detail cards
            {questionnaireName ? (
              <>
                {' '}
                for <strong>{questionnaireName}</strong>
              </>
            ) : null}
            .
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {error && !editing && (
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
            <Skeleton className="h-48 w-full" />
          ) : grouped.length === 0 ? (
            <p className="text-sm text-muted-foreground">No elements match.</p>
          ) : (
            grouped.map(([groupId, els]) => (
              <div key={groupId} className="rounded-lg border">
                <button
                  type="button"
                  className="flex w-full items-center justify-between px-4 py-3 text-left text-sm font-medium"
                  onClick={() =>
                    setExpandedGroups((s) => ({ ...s, [groupId]: !s[groupId] }))
                  }
                >
                  <span>Group {groupId}</span>
                  <span className="text-muted-foreground">{els.length} elements</span>
                </button>
                {expandedGroups[groupId] !== false && (
                  <ul className="space-y-2 border-t px-4 py-3">
                    {els.map((el) => {
                      const qs = questionsByElement.get(el.id) ?? [];
                      return (
                        <li key={el.id} className="space-y-1">
                          <button
                            type="button"
                            className={cn(
                              'w-full rounded-md px-2 py-1.5 text-left text-sm hover:bg-muted',
                            )}
                            onClick={() => openElement(el)}
                          >
                            <span className="font-medium">{el.name}</span>
                            <span className="ml-2 text-xs text-muted-foreground">
                              Edit element copy
                            </span>
                          </button>
                          <ul className="ml-4 space-y-1 border-l pl-3">
                            {qs.map((question) => (
                              <li key={question.id}>
                                <button
                                  type="button"
                                  className="w-full rounded-md px-2 py-1 text-left text-sm text-muted-foreground hover:bg-muted hover:text-foreground"
                                  onClick={() => openQuestion(question, el.name)}
                                >
                                  {stripHtml(question.label) || `Question ${question.id}`}
                                </button>
                              </li>
                            ))}
                          </ul>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </div>
            ))
          )}
        </CardContent>
      </Card>

      <Sheet open={Boolean(editing)} onOpenChange={(open) => !open && setEditing(null)}>
        <SheetContent className="w-full overflow-y-auto sm:max-w-xl">
          <SheetHeader>
            <SheetTitle>
              {editing?.kind === 'element'
                ? `Edit element: ${editing.row.name}`
                : editing?.kind === 'question'
                  ? `Edit question`
                  : 'Edit'}
            </SheetTitle>
            <SheetDescription>
              {editing?.kind === 'question'
                ? `Under element “${editing.elementName}”.`
                : 'Changes apply to the live questionnaire and new reports.'}
            </SheetDescription>
          </SheetHeader>

          {error && (
            <Alert variant="destructive" className="mt-4">
              <AlertTitle>Error</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <div className="mt-4 space-y-4">
            {editing?.kind === 'element' && (
              <>
                <ContentFieldEditor
                  field={{
                    key: 'name',
                    label: 'Element name',
                    kind: 'text',
                    where: 'Questionnaire part headings and report metric cards',
                  }}
                  value={String(form.name ?? '')}
                  onChange={(v) => setForm((f) => ({ ...f, name: v }))}
                />
                <ContentFieldEditor
                  field={{
                    key: 'shortDescription',
                    label: 'Short description',
                    kind: 'rich',
                    where: 'Brief blurb associated with this element in reports',
                  }}
                  value={String(form.shortDescription ?? '')}
                  onChange={(v) => setForm((f) => ({ ...f, shortDescription: v }))}
                />
                <ContentFieldEditor
                  field={{
                    key: 'paragraph',
                    label: 'Paragraph',
                    kind: 'rich',
                    where: 'Main narrative for this element in reports',
                  }}
                  value={String(form.paragraph ?? '')}
                  onChange={(v) => setForm((f) => ({ ...f, paragraph: v }))}
                  extraHint={FEEDBACK_TOKEN_HINT}
                />
                <ContentFieldEditor
                  field={{
                    key: 'teamParagraph',
                    label: 'Team paragraph',
                    kind: 'rich',
                    where: 'Team-context copy shown on report metric cards',
                  }}
                  value={String(form.teamParagraph ?? '')}
                  onChange={(v) => setForm((f) => ({ ...f, teamParagraph: v }))}
                />
                <ContentFieldEditor
                  field={{
                    key: 'paragraph2',
                    label: 'Paragraph 2',
                    kind: 'rich',
                    where: 'Stored in the catalog',
                  }}
                  value={String(form.paragraph2 ?? '')}
                  onChange={(v) => setForm((f) => ({ ...f, paragraph2: v }))}
                  extraHint="Not currently shown in the live app UI."
                />
                <ContentFieldEditor
                  field={{
                    key: 'ceoQuestionLabel',
                    label: 'CEO question label',
                    kind: 'rich',
                    where: 'Stored in the catalog',
                  }}
                  value={String(form.ceoQuestionLabel ?? '')}
                  onChange={(v) => setForm((f) => ({ ...f, ceoQuestionLabel: v }))}
                  extraHint="Not currently shown in the live app UI."
                />
                <ContentFieldEditor
                  field={{
                    key: 'ceoQuestionLabel2',
                    label: 'CEO question label 2',
                    kind: 'rich',
                    where: 'Stored in the catalog',
                  }}
                  value={String(form.ceoQuestionLabel2 ?? '')}
                  onChange={(v) => setForm((f) => ({ ...f, ceoQuestionLabel2: v }))}
                  extraHint="Not currently shown in the live app UI."
                />
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label htmlFor="el-group">Group (1–3)</Label>
                    <Input
                      id="el-group"
                      type="number"
                      value={String(form.group ?? '')}
                      onChange={(e) => setForm((f) => ({ ...f, group: e.target.value }))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="el-order">Order</Label>
                    <Input
                      id="el-order"
                      type="number"
                      value={String(form.order ?? '')}
                      onChange={(e) => setForm((f) => ({ ...f, order: e.target.value }))}
                    />
                  </div>
                </div>
              </>
            )}

            {editing?.kind === 'question' && (
              <>
                <ContentFieldEditor
                  field={{
                    key: 'label',
                    label: 'Question label',
                    kind: 'rich',
                    where: 'Prompt shown in the questionnaire wizard',
                  }}
                  value={String(form.label ?? '')}
                  onChange={(v) => setForm((f) => ({ ...f, label: v }))}
                />
                <ContentFieldEditor
                  field={{
                    key: 'concept',
                    label: 'Concept',
                    kind: 'rich',
                    where: 'Supporting concept text used in scoring / reports',
                  }}
                  value={String(form.concept ?? '')}
                  onChange={(v) => setForm((f) => ({ ...f, concept: v }))}
                />
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label htmlFor="q-order">Order</Label>
                    <Input
                      id="q-order"
                      type="number"
                      value={String(form.order ?? '')}
                      onChange={(e) => setForm((f) => ({ ...f, order: e.target.value }))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="q-weight">Weighting</Label>
                    <Input
                      id="q-weight"
                      type="number"
                      step="0.001"
                      value={String(form.weighting ?? '')}
                      onChange={(e) => setForm((f) => ({ ...f, weighting: e.target.value }))}
                    />
                  </div>
                </div>
                <label className="flex items-center gap-2 text-sm">
                  <Checkbox
                    checked={Boolean(form.isNegative)}
                    onCheckedChange={(checked) =>
                      setForm((f) => ({ ...f, isNegative: checked === true }))
                    }
                  />
                  Negative question (reverses Likert values)
                </label>
              </>
            )}
          </div>

          <SheetFooter className="mt-6">
            <Button variant="outline" onClick={() => setEditing(null)}>
              Cancel
            </Button>
            <Button onClick={() => void save()} disabled={saving}>
              {saving ? 'Saving…' : 'Save'}
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>
    </>
  );
}
