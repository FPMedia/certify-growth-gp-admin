'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { Search } from 'lucide-react';
import { apiFetch } from '@/lib/api';
import {
  CONTENT_SECTIONS,
  SECTION_COPY_FIELDS,
  isContentSection,
  type ContentSection,
} from '@/lib/admin/content-fields';
import { QuestionnaireCopyPanel } from '@/components/admin/QuestionnaireCopyPanel';
import { ReportGroupsPanel } from '@/components/admin/ReportGroupsPanel';
import { ElementsQuestionsPanel } from '@/components/admin/ElementsQuestionsPanel';
import { FeedbackContentPanel } from '@/components/admin/FeedbackContentPanel';
import { ScoringPanel } from '@/components/admin/ScoringPanel';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

interface QuestionnaireListItem {
  id: number;
  name: string;
  updatedAt?: string;
}

function stripHtml(value: string): string {
  return value.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
}

export function ContentDashboard() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const questionnaireParam = searchParams.get('questionnaire');
  const sectionParam = searchParams.get('section');
  const fieldParam = searchParams.get('field');

  const [questionnaires, setQuestionnaires] = useState<QuestionnaireListItem[]>([]);
  const [loadingList, setLoadingList] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [searchHits, setSearchHits] = useState<
    Array<{ section: ContentSection; fieldKey?: string; label: string; snippet: string }>
  >([]);
  const [searching, setSearching] = useState(false);

  const selectedId = questionnaireParam ? Number(questionnaireParam) : null;
  const section: ContentSection = isContentSection(sectionParam) ? sectionParam : 'landing';

  const selected = questionnaires.find((q) => q.id === selectedId) ?? null;

  const setParams = useCallback(
    (next: { questionnaire?: number | null; section?: ContentSection; field?: string | null }) => {
      const params = new URLSearchParams(searchParams.toString());
      params.set('tab', 'content');
      if (next.questionnaire !== undefined) {
        if (next.questionnaire == null) params.delete('questionnaire');
        else params.set('questionnaire', String(next.questionnaire));
      }
      if (next.section) params.set('section', next.section);
      if (next.field !== undefined) {
        if (!next.field) params.delete('field');
        else params.set('field', next.field);
      }
      router.replace(`${pathname}?${params.toString()}`);
    },
    [pathname, router, searchParams],
  );

  useEffect(() => {
    void (async () => {
      setLoadingList(true);
      setError(null);
      try {
        const rows = await apiFetch<QuestionnaireListItem[]>('/admin/questionnaires');
        setQuestionnaires(rows);
        if (!questionnaireParam && rows[0]) {
          setParams({ questionnaire: rows[0].id, section: 'landing' });
        }
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Failed to load questionnaires');
      } finally {
        setLoadingList(false);
      }
    })();
    // Only on mount / when list needed
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function runSearch() {
    const q = search.trim().toLowerCase();
    if (!q || selectedId == null) {
      setSearchHits([]);
      return;
    }
    setSearching(true);
    setError(null);
    try {
      const [record, groups, elements, questions, feedback] = await Promise.all([
        apiFetch<Record<string, unknown>>(`/admin/questionnaires/${selectedId}`),
        apiFetch<Array<{ title: string; description: string; groupNumber: number }>>(
          `/admin/questionnaires/${selectedId}/report-groups`,
        ),
        apiFetch<
          Array<{
            id: number;
            name: string;
            questionnaireId: number | null;
            paragraph: string | null;
            shortDescription: string | null;
          }>
        >('/admin/elements'),
        apiFetch<Array<{ label: string; concept: string | null; elementId: number | null }>>(
          '/admin/questions',
        ),
        apiFetch<Array<{ level: string; verb: string; adjective: string; focus: string }>>(
          '/admin/feedback',
        ),
      ]);

      const hits: Array<{
        section: ContentSection;
        fieldKey?: string;
        label: string;
        snippet: string;
      }> = [];

      for (const sectionId of Object.keys(SECTION_COPY_FIELDS) as ContentSection[]) {
        const fields = SECTION_COPY_FIELDS[sectionId] ?? [];
        for (const field of fields) {
          const raw = record[field.key];
          const text = stripHtml(raw == null ? '' : String(raw)).toLowerCase();
          if (text.includes(q) || field.label.toLowerCase().includes(q)) {
            hits.push({
              section: sectionId,
              fieldKey: field.key,
              label: `${CONTENT_SECTIONS.find((s) => s.id === sectionId)?.label}: ${field.label}`,
              snippet: stripHtml(raw == null ? '' : String(raw)).slice(0, 120),
            });
          }
        }
      }

      for (const g of groups) {
        if (
          g.title.toLowerCase().includes(q) ||
          g.description.toLowerCase().includes(q)
        ) {
          hits.push({
            section: 'groups',
            label: `Report group ${g.groupNumber}: ${g.title}`,
            snippet: g.description.slice(0, 120),
          });
        }
      }

      const myElements = elements.filter((e) => e.questionnaireId === selectedId);
      const elementIds = new Set(myElements.map((e) => e.id));
      for (const el of myElements) {
        const blob = `${el.name} ${el.paragraph ?? ''} ${el.shortDescription ?? ''}`.toLowerCase();
        if (blob.includes(q)) {
          hits.push({
            section: 'elements',
            label: `Element: ${el.name}`,
            snippet: stripHtml(el.paragraph ?? el.shortDescription ?? '').slice(0, 120),
          });
        }
      }
      for (const question of questions) {
        if (question.elementId == null || !elementIds.has(question.elementId)) continue;
        const blob = `${question.label} ${question.concept ?? ''}`.toLowerCase();
        if (blob.includes(q)) {
          hits.push({
            section: 'elements',
            label: `Question: ${stripHtml(question.label).slice(0, 60)}`,
            snippet: stripHtml(question.concept ?? question.label).slice(0, 120),
          });
        }
      }

      for (const band of feedback) {
        const blob = `${band.level} ${band.verb} ${band.adjective} ${band.focus}`.toLowerCase();
        if (blob.includes(q)) {
          hits.push({
            section: 'feedback',
            label: `Feedback: ${band.level}`,
            snippet: `${band.verb} / ${band.adjective}`,
          });
        }
      }

      setSearchHits(hits.slice(0, 40));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Search failed');
    } finally {
      setSearching(false);
    }
  }

  const sectionMeta = useMemo(
    () => CONTENT_SECTIONS.find((s) => s.id === section)!,
    [section],
  );

  // Scroll to highlighted field after navigation
  useEffect(() => {
    if (!fieldParam) return;
    const el = document.getElementById(`field-${fieldParam}`);
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }, [fieldParam, section, selectedId]);

  if (loadingList) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-40 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {error && (
        <Alert variant="destructive">
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <div className="grid gap-3 sm:grid-cols-2">
        {questionnaires.map((q) => (
          <button
            key={q.id}
            type="button"
            onClick={() => setParams({ questionnaire: q.id, section: 'landing', field: null })}
            className={cn(
              'rounded-xl border bg-card p-4 text-left transition hover:border-primary/40',
              selectedId === q.id && 'border-primary ring-1 ring-primary',
            )}
          >
            <p className="font-medium">{q.name}</p>
            <p className="text-xs text-muted-foreground">Edit all copy for this questionnaire</p>
          </button>
        ))}
      </div>

      {selectedId != null && (
        <>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <div className="relative flex-1">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                className="pl-8"
                placeholder="Search copy in this questionnaire…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') void runSearch();
                }}
              />
            </div>
            <Button type="button" variant="secondary" onClick={() => void runSearch()} disabled={searching}>
              {searching ? 'Searching…' : 'Search'}
            </Button>
          </div>

          {searchHits.length > 0 && (
            <Card>
              <CardHeader className="py-3">
                <CardTitle className="text-base">Search results</CardTitle>
                <CardDescription>{searchHits.length} matches — click to open</CardDescription>
              </CardHeader>
              <ul className="divide-y border-t">
                {searchHits.map((hit, index) => (
                  <li key={`${hit.section}-${hit.fieldKey ?? hit.label}-${index}`}>
                    <button
                      type="button"
                      className="flex w-full flex-col gap-0.5 px-4 py-3 text-left hover:bg-muted/60"
                      onClick={() => {
                        setParams({
                          questionnaire: selectedId,
                          section: hit.section,
                          field: hit.fieldKey ?? null,
                        });
                        setSearchHits([]);
                      }}
                    >
                      <span className="text-sm font-medium">{hit.label}</span>
                      {hit.snippet && (
                        <span className="text-xs text-muted-foreground line-clamp-1">{hit.snippet}</span>
                      )}
                    </button>
                  </li>
                ))}
              </ul>
            </Card>
          )}

          <div className="flex flex-col gap-6 lg:flex-row">
            <nav className="shrink-0 lg:w-56">
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Where it appears
              </p>
              <ul className="space-y-1">
                {CONTENT_SECTIONS.map((item) => (
                  <li key={item.id}>
                    <button
                      type="button"
                      onClick={() =>
                        setParams({ questionnaire: selectedId, section: item.id, field: null })
                      }
                      className={cn(
                        'w-full rounded-md px-3 py-2 text-left text-sm hover:bg-muted',
                        section === item.id && 'bg-muted font-medium',
                      )}
                    >
                      {item.label}
                    </button>
                  </li>
                ))}
              </ul>
            </nav>

            <div className="min-w-0 flex-1">
              {(section === 'landing' ||
                section === 'personal' ||
                section === 'team' ||
                section === 'leader' ||
                section === 'company') && (
                <QuestionnaireCopyPanel
                  questionnaireId={selectedId}
                  section={section}
                  sectionLabel={sectionMeta.label}
                  sectionDescription={sectionMeta.description}
                  highlightKey={fieldParam}
                />
              )}
              {section === 'groups' && (
                <ReportGroupsPanel
                  questionnaireId={selectedId}
                  questionnaireName={selected?.name}
                />
              )}
              {section === 'elements' && (
                <ElementsQuestionsPanel
                  questionnaireId={selectedId}
                  questionnaireName={selected?.name}
                  searchQuery={search}
                />
              )}
              {section === 'feedback' && <FeedbackContentPanel />}
              {section === 'scoring' && <ScoringPanel />}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
