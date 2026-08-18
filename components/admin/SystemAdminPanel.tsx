'use client';

import { useCallback, useEffect, useState } from 'react';
import { RefreshCw } from 'lucide-react';
import { apiFetch } from '@/lib/api';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
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
import { SystemCompaniesPanel } from './SystemCompaniesPanel';
import { SystemTeamsPanel } from './SystemTeamsPanel';
import { SystemUsersPanel } from './SystemUsersPanel';
import type { SystemCompanyRow } from './system-types';

interface CompletedSubmissionRow {
  id: number;
  user_id: number;
  questionnaire_id: number;
  reports_compiled_at: string | null;
  completed_at: string;
}

interface TriggerResult {
  trigger: string;
  status: 'ok' | 'partial' | 'error';
  message: string;
  compiled?: number;
  failed?: number;
  submission_id?: number;
  errors?: Array<{ submission_id: number; error: string }>;
}

export function SystemAdminPanel() {
  const [companies, setCompanies] = useState<SystemCompanyRow[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const [completedSubmissions, setCompletedSubmissions] = useState<CompletedSubmissionRow[] | null>(
    null,
  );
  const [operationsLoading, setOperationsLoading] = useState(true);
  const [recompileAllRunning, setRecompileAllRunning] = useState(false);
  const [recompileOneRunning, setRecompileOneRunning] = useState(false);
  const [submissionIdInput, setSubmissionIdInput] = useState('');

  const loadCompanies = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const companiesRes = await apiFetch<SystemCompanyRow[]>('/system/companies');
      setCompanies(companiesRes);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load system data');
    } finally {
      setLoading(false);
    }
  }, []);

  const loadOperations = useCallback(async () => {
    setOperationsLoading(true);
    try {
      const rows = await apiFetch<CompletedSubmissionRow[]>('/system/triggers/completed-submissions');
      setCompletedSubmissions(rows);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load manual trigger data');
    } finally {
      setOperationsLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadCompanies();
  }, [loadCompanies]);

  useEffect(() => {
    void loadOperations();
  }, [loadOperations]);

  async function runTrigger(
    label: string,
    request: () => Promise<TriggerResult>,
    setRunning: (running: boolean) => void,
  ) {
    setError(null);
    setNotice(null);
    setRunning(true);
    try {
      const result = await request();
      setNotice(result.message);
      if (label === 'recompile') {
        await loadOperations();
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : `Failed to run ${label}`);
    } finally {
      setRunning(false);
    }
  }

  async function recompileAll() {
    await runTrigger(
      'recompile',
      () => apiFetch<TriggerResult>('/system/triggers/recompile-reports', { method: 'POST' }),
      setRecompileAllRunning,
    );
  }

  async function recompileOne() {
    const submissionId = Number(submissionIdInput.trim());
    if (!Number.isInteger(submissionId) || submissionId <= 0) {
      setError('Enter a valid submission ID');
      return;
    }

    await runTrigger(
      'recompile',
      () =>
        apiFetch<TriggerResult>(`/system/triggers/recompile-reports/${submissionId}`, {
          method: 'POST',
        }),
      setRecompileOneRunning,
    );
  }

  return (
    <div className="space-y-4">
      {error && (
        <Alert variant="destructive">
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {notice && (
        <Alert>
          <AlertTitle>Done</AlertTitle>
          <AlertDescription>{notice}</AlertDescription>
        </Alert>
      )}

      <Tabs defaultValue="companies">
        <TabsList>
          <TabsTrigger value="companies">Companies</TabsTrigger>
          <TabsTrigger value="teams">Teams</TabsTrigger>
          <TabsTrigger value="users">Users</TabsTrigger>
          <TabsTrigger value="operations">Manual triggers</TabsTrigger>
        </TabsList>

        <TabsContent value="companies">
          <SystemCompaniesPanel
            companies={companies}
            loading={loading}
            onReload={() => void loadCompanies()}
          />
        </TabsContent>

        <TabsContent value="teams">
          <SystemTeamsPanel companies={companies} />
        </TabsContent>

        <TabsContent value="users">
          <SystemUsersPanel companies={companies} />
        </TabsContent>

        <TabsContent value="operations">
          <div className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Recompile reports</CardTitle>
                <CardDescription>
                  Re-run the report compiler for completed submissions. Use after scoring or catalog
                  changes, or to refresh cached report documents.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                  <div className="space-y-1">
                    <p className="text-sm font-medium">Recompile all completed submissions</p>
                    <p className="text-sm text-muted-foreground">
                      {operationsLoading
                        ? 'Loading submission count…'
                        : `${completedSubmissions?.length ?? 0} completed submission${(completedSubmissions?.length ?? 0) === 1 ? '' : 's'} will be processed.`}
                    </p>
                  </div>
                  <Button
                    onClick={() => void recompileAll()}
                    disabled={
                      recompileAllRunning ||
                      operationsLoading ||
                      (completedSubmissions?.length ?? 0) === 0
                    }
                  >
                    <RefreshCw className={recompileAllRunning ? 'animate-spin' : undefined} />
                    {recompileAllRunning ? 'Recompiling…' : 'Recompile all reports'}
                  </Button>
                </div>

                <div className="flex flex-col gap-3 border-t pt-6 sm:flex-row sm:items-end">
                  <div className="grid w-full max-w-xs gap-2">
                    <Label htmlFor="submission-id">Recompile one submission</Label>
                    <Input
                      id="submission-id"
                      inputMode="numeric"
                      placeholder="Submission ID"
                      value={submissionIdInput}
                      onChange={(e) => setSubmissionIdInput(e.target.value)}
                    />
                  </div>
                  <Button
                    variant="outline"
                    onClick={() => void recompileOne()}
                    disabled={recompileOneRunning || !submissionIdInput.trim()}
                  >
                    <RefreshCw className={recompileOneRunning ? 'animate-spin' : undefined} />
                    {recompileOneRunning ? 'Recompiling…' : 'Recompile submission'}
                  </Button>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Completed submissions</CardTitle>
                <CardDescription>
                  Submissions eligible for manual report recompilation.
                </CardDescription>
              </CardHeader>
              <CardContent className="p-0">
                {operationsLoading ? (
                  <div className="space-y-2 p-6">
                    <Skeleton className="h-8 w-full" />
                    <Skeleton className="h-8 w-full" />
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Submission</TableHead>
                        <TableHead>User</TableHead>
                        <TableHead>Completed</TableHead>
                        <TableHead>Last compiled</TableHead>
                        <TableHead className="text-right">Action</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {(completedSubmissions ?? []).map((submission) => (
                        <TableRow key={submission.id}>
                          <TableCell>#{submission.id}</TableCell>
                          <TableCell>{submission.user_id}</TableCell>
                          <TableCell>{formatDateTime(submission.completed_at)}</TableCell>
                          <TableCell>
                            {submission.reports_compiled_at
                              ? formatDateTime(submission.reports_compiled_at)
                              : '—'}
                          </TableCell>
                          <TableCell className="text-right">
                            <Button
                              variant="ghost"
                              size="sm"
                              disabled={recompileOneRunning}
                              onClick={() => {
                                void runTrigger(
                                  'recompile',
                                  () =>
                                    apiFetch<TriggerResult>(
                                      `/system/triggers/recompile-reports/${submission.id}`,
                                      { method: 'POST' },
                                    ),
                                  setRecompileOneRunning,
                                );
                              }}
                            >
                              Recompile
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                      {(completedSubmissions ?? []).length === 0 && (
                        <TableRow>
                          <TableCell colSpan={5} className="py-8 text-center text-muted-foreground">
                            No completed submissions yet.
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function formatDateTime(value: string): string {
  return new Date(value).toLocaleString();
}
