'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { FileText, Layers, MessageSquare, Plus, Search, SlidersHorizontal, Trash2 } from 'lucide-react';
import { apiFetch } from '@/lib/api';
import { PageHeader } from '@/components/page-header';
import { QuestionnaireIntroPanel } from '@/components/admin/QuestionnaireIntroPanel';
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
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { RichTextEditor } from '@/components/ui/rich-text-editor';

type AdminTab = 'intro' | 'elements' | 'questions' | 'feedback' | 'matrices';
type CrudTab = Exclude<AdminTab, 'intro'>;

interface ElementRow {
  id: number;
  name: string;
  group: number;
  order: number;
  questionnaireId: number;
}

interface QuestionRow {
  id: number;
  label: string;
  elementId: number;
  order: number;
  weighting: number;
  isNegative: boolean;
}

interface FeedbackRow {
  id: number;
  scoreMin: number;
  scoreMax: number;
  level: string;
  verb: string;
  adjective: string;
  focus: string;
}

interface MatrixRow {
  id: number;
  scoreMin: number;
  scoreMax: number;
  wtg2: number;
  wtg3: number;
  wtg4: number;
}

type Row = ElementRow | QuestionRow | FeedbackRow | MatrixRow;

const tabConfig: Record<
  CrudTab,
  { label: string; icon: typeof Layers; endpoint: string; searchKeys: string[] }
> = {
  elements: {
    label: 'Elements',
    icon: Layers,
    endpoint: '/admin/elements',
    searchKeys: ['name', 'id', 'group', 'order'],
  },
  questions: {
    label: 'Questions',
    icon: MessageSquare,
    endpoint: '/admin/questions',
    searchKeys: ['label', 'id', 'elementId'],
  },
  feedback: {
    label: 'Feedback',
    icon: MessageSquare,
    endpoint: '/admin/feedback',
    searchKeys: ['level', 'verb', 'adjective', 'focus'],
  },
  matrices: {
    label: 'Weighting',
    icon: SlidersHorizontal,
    endpoint: '/admin/group-weightings-matrices',
    searchKeys: ['id', 'scoreMin', 'scoreMax'],
  },
};

function stripHtml(value: string): string {
  return value.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
}

function formatCell(value: unknown) {
  if (typeof value === 'boolean') return value ? 'Yes' : 'No';
  if (value === null || value === undefined) return '—';
  const text = String(value);
  if (text.includes('<') && text.includes('>')) {
    return stripHtml(text) || '—';
  }
  return text;
}

export function AdminDashboard() {
  const [tab, setTab] = useState<AdminTab>('intro');
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Row | null>(null);
  const [form, setForm] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  const crudTab: CrudTab | null = tab === 'intro' ? null : tab;
  const config = crudTab ? tabConfig[crudTab] : null;

  const load = useCallback(async () => {
    if (!config) return;
    setLoading(true);
    setError(null);
    try {
      const data = await apiFetch<Row[]>(config.endpoint);
      setRows(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load data');
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [config]);

  useEffect(() => {
    if (tab === 'intro') {
      setLoading(false);
      setRows([]);
      return;
    }
    void load();
  }, [load, tab]);

  const filtered = useMemo(() => {
    if (!config) return rows;
    const q = search.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((row) =>
      config.searchKeys.some((key) => formatCell(row[key as keyof Row]).toLowerCase().includes(q)),
    );
  }, [rows, search, config]);

  const columns = useMemo(() => {
    if (rows.length === 0) return ['id'];
    return Object.keys(rows[0]).filter((k) => k !== 'options');
  }, [rows]);

  function openCreate() {
    setEditing(null);
    setForm({});
    setDialogOpen(true);
  }

  function openEdit(row: Row) {
    setEditing(row);
    const initial: Record<string, string> = {};
    for (const [k, v] of Object.entries(row)) {
      if (k !== 'id') initial[k] = String(v);
    }
    setForm(initial);
    setDialogOpen(true);
  }

  async function save() {
    if (!config || !crudTab) return;
    setSaving(true);
    setError(null);
    try {
      const htmlKeys = new Set([
        'label',
        'name',
        'level',
        'verb',
        'adjective',
        'focus',
        'concept',
        'shortDescription',
        'paragraph',
        'paragraph2',
        'teamParagraph',
      ]);
      // Only send fields the catalog update/create DTOs accept. Parent FKs
      // (elementId, questionnaireId) are create-only on PATCH.
      const body: Record<string, unknown> = {};
      for (const field of getFormFields(crudTab)) {
        if (editing && field.createOnly) continue;
        const v = form[field.key];
        if (v === undefined || v === '') continue;
        if (v === 'true' || v === 'false') body[field.key] = v === 'true';
        else if (!htmlKeys.has(field.key) && !Number.isNaN(Number(v))) {
          body[field.key] = Number(v);
        } else {
          body[field.key] = v;
        }
      }

      if (editing) {
        await apiFetch(`${config.endpoint}/${editing.id}`, {
          method: 'PATCH',
          body: JSON.stringify(body),
        });
      } else {
        if (tab === 'elements' && !body.questionnaireId) {
          setError('Questionnaire ID is required when creating an element.');
          return;
        }
        await apiFetch(config.endpoint, {
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
    if (!config) return;
    if (!confirm('Delete this record?')) return;
    setError(null);
    try {
      await apiFetch(`${config.endpoint}/${id}`, { method: 'DELETE' });
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Delete failed');
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader title="Catalog admin" description="Manage questionnaire copy, structure, feedback bands, and weighting matrices.">
        {config && (
          <Button size="sm" onClick={openCreate}>
            <Plus className="h-4 w-4" />
            Add {config.label.slice(0, -1)}
          </Button>
        )}
      </PageHeader>

      {error && (
        <Alert variant="destructive">
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <Tabs value={tab} onValueChange={(v) => setTab(v as AdminTab)}>
        <TabsList>
          <TabsTrigger value="intro">
            <FileText className="mr-1.5 h-4 w-4" />
            Intro
          </TabsTrigger>
          {(Object.keys(tabConfig) as CrudTab[]).map((key) => (
            <TabsTrigger key={key} value={key}>
              {tabConfig[key].label}
            </TabsTrigger>
          ))}
        </TabsList>

        <TabsContent value="intro">
          <QuestionnaireIntroPanel />
        </TabsContent>

        {(Object.keys(tabConfig) as CrudTab[]).map((key) => (
          <TabsContent key={key} value={key}>
            <Card>
              <CardHeader className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <CardTitle>{tabConfig[key].label}</CardTitle>
                  <CardDescription>{filtered.length} records</CardDescription>
                </div>
                <div className="relative w-full sm:w-64">
                  <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    className="pl-8"
                    placeholder="Search…"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                  />
                </div>
              </CardHeader>
              <CardContent className="p-0">
                {loading ? (
                  <div className="space-y-2 p-6">
                    <Skeleton className="h-8 w-full" />
                    <Skeleton className="h-8 w-full" />
                    <Skeleton className="h-8 w-full" />
                  </div>
                ) : filtered.length === 0 ? (
                  <p className="p-6 text-sm text-muted-foreground">No records found.</p>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        {columns.map((col) => (
                          <TableHead key={col} className="capitalize">
                            {col.replace(/([A-Z])/g, ' $1').trim()}
                          </TableHead>
                        ))}
                        <TableHead className="w-[120px]">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filtered.map((row) => (
                        <TableRow key={row.id}>
                          {columns.map((col) => (
                            <TableCell key={col} className="max-w-[240px] truncate">
                              {formatCell(row[col as keyof Row])}
                            </TableCell>
                          ))}
                          <TableCell>
                            <div className="flex gap-1">
                              <Button variant="ghost" size="sm" onClick={() => openEdit(row)}>
                                Edit
                              </Button>
                              <Button variant="ghost" size="sm" onClick={() => remove(row.id)}>
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
            </Card>
          </TabsContent>
        ))}
      </Tabs>

      {crudTab && config && (
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>{editing ? 'Edit' : 'Create'} {config.label.slice(0, -1)}</DialogTitle>
            <DialogDescription>Changes are saved to the catalog service immediately.</DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-2">
            {getFormFields(crudTab).map((field) => {
              const readOnly = Boolean(editing && field.createOnly);
              return (
              <div key={field.key} className="space-y-2">
                <Label htmlFor={field.key}>
                  {field.label}
                  {readOnly ? ' (fixed on edit)' : ''}
                </Label>
                {field.multiline ? (
                  <RichTextEditor
                    value={form[field.key] ?? ''}
                    onChange={(html) => setForm((f) => ({ ...f, [field.key]: html }))}
                    placeholder={field.label}
                    minHeightClassName="min-h-[140px]"
                    disabled={readOnly}
                  />
                ) : (
                  <Input
                    id={field.key}
                    type={field.type ?? 'text'}
                    value={form[field.key] ?? ''}
                    onChange={(e) => setForm((f) => ({ ...f, [field.key]: e.target.value }))}
                    placeholder={field.placeholder}
                    disabled={readOnly}
                  />
                )}
              </div>
              );
            })}
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
      )}
    </div>
  );
}

type FormField = {
  key: string;
  label: string;
  type?: string;
  multiline?: boolean;
  placeholder?: string;
  /** Present on create only; catalog PATCH DTOs reject these keys. */
  createOnly?: boolean;
};

function getFormFields(tab: CrudTab): FormField[] {
  switch (tab) {
    case 'elements':
      return [
        { key: 'name', label: 'Name' },
        { key: 'group', label: 'Group (1–3)', type: 'number' },
        { key: 'order', label: 'Order', type: 'number' },
        {
          key: 'questionnaireId',
          label: 'Questionnaire ID',
          type: 'number',
          placeholder: '1 or 2',
          createOnly: true,
        },
        { key: 'shortDescription', label: 'Short description', multiline: true },
        { key: 'paragraph', label: 'Paragraph', multiline: true },
        { key: 'paragraph2', label: 'Paragraph 2', multiline: true },
        { key: 'teamParagraph', label: 'Team paragraph', multiline: true },
      ];
    case 'questions':
      return [
        { key: 'label', label: 'Label', multiline: true },
        { key: 'elementId', label: 'Element ID', type: 'number', createOnly: true },
        { key: 'order', label: 'Order', type: 'number' },
        { key: 'weighting', label: 'Weighting', type: 'number' },
        { key: 'isNegative', label: 'Is negative (true/false)' },
        { key: 'concept', label: 'Concept', multiline: true },
      ];
    case 'feedback':
      return [
        { key: 'scoreMin', label: 'Score min', type: 'number' },
        { key: 'scoreMax', label: 'Score max', type: 'number' },
        { key: 'level', label: 'Level' },
        { key: 'verb', label: 'Verb' },
        { key: 'adjective', label: 'Adjective' },
        { key: 'focus', label: 'Focus' },
      ];
    case 'matrices':
      return [
        { key: 'scoreMin', label: 'Score min', type: 'number' },
        { key: 'scoreMax', label: 'Score max', type: 'number' },
        { key: 'wtg2', label: 'Weight group 2', type: 'number' },
        { key: 'wtg3', label: 'Weight group 3', type: 'number' },
        { key: 'wtg4', label: 'Weight group 4', type: 'number' },
      ];
  }
}
