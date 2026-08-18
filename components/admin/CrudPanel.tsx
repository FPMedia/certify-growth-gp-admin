'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { apiFetch } from '@/lib/api';
import type { AdminLookups, CrudConfig, FieldConfig, RowRecord } from '@/lib/admin/types';
import { STICKY_ACTIONS_CLASS } from '@/lib/admin/table-styles';
import { RichTextEditor } from '@/components/ui/rich-text-editor';
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from '@/components/ui/table';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetFooter,
} from '@/components/ui/sheet';

interface CrudPanelProps {
  config: CrudConfig;
  lookups: AdminLookups;
  onDataChange?: () => void;
}

type FormState = Record<string, string | number | boolean>;

function emptyForm(fields: FieldConfig[]): FormState {
  const form: FormState = {};
  for (const field of fields) {
    if (field.defaultValue !== undefined) {
      form[field.key] = field.defaultValue;
    } else if (field.type === 'boolean') {
      form[field.key] = false;
    } else if (field.type === 'number') {
      form[field.key] = '';
    } else {
      form[field.key] = '';
    }
  }
  return form;
}

function rowToForm(row: RowRecord, fields: FieldConfig[]): FormState {
  const form: FormState = {};
  for (const field of fields) {
    const raw = row[field.key];
    if (field.type === 'boolean') {
      form[field.key] = Boolean(raw);
    } else if (field.type === 'number') {
      form[field.key] = raw === null || raw === undefined ? '' : Number(raw);
    } else {
      form[field.key] = raw === null || raw === undefined ? '' : String(raw);
    }
  }
  return form;
}

function formToPayload(form: FormState, fields: FieldConfig[], isCreate: boolean): RowRecord {
  const payload: RowRecord = {};
  for (const field of fields) {
    if (!isCreate && field.createOnly) continue;
    const value = form[field.key];
    if (value === '' && !field.required && !isCreate) continue;
    if (value === '' && field.type !== 'text' && field.type !== 'textarea') continue;

    if (field.type === 'number') {
      payload[field.key] = value === '' ? undefined : Number(value);
    } else if (field.type === 'boolean') {
      payload[field.key] = Boolean(value);
    } else if (value === '' && !field.required) {
      payload[field.key] = null;
    } else {
      payload[field.key] = value;
    }
  }
  return payload;
}

function stripHtml(value: string): string {
  return value.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
}

function formatCell(value: unknown, field: FieldConfig): string {
  if (value === null || value === undefined) return '—';
  if (field.type === 'boolean') return value ? 'Yes' : 'No';
  if (typeof value === 'string') {
    const plain = field.type === 'textarea' ? stripHtml(value) : value;
    return plain.length > 60 ? `${plain.slice(0, 60)}…` : plain || '—';
  }
  return String(value);
}

export function CrudPanel({ config, lookups, onDataChange }: CrudPanelProps) {
  const [rows, setRows] = useState<RowRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [sheetOpen, setSheetOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState<FormState>(() => emptyForm(config.fields));
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const tableFields = useMemo(
    () => config.fields.filter((f) => f.inTable),
    [config.fields],
  );

  const sections = useMemo(() => {
    const map = new Map<string, FieldConfig[]>();
    for (const field of config.fields) {
      const section = field.section ?? 'General';
      if (!map.has(section)) map.set(section, []);
      map.get(section)!.push(field);
    }
    return [...map.entries()];
  }, [config.fields]);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await apiFetch<RowRecord[]>(config.listPath);
      setRows(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load');
    } finally {
      setLoading(false);
    }
  }, [config.listPath]);

  useEffect(() => {
    void load();
  }, [load]);

  const filtered = useMemo(() => {
    if (!search.trim()) return rows;
    const q = search.toLowerCase();
    return rows.filter((row) =>
      Object.values(row).some((v) => String(v ?? '').toLowerCase().includes(q)),
    );
  }, [rows, search]);

  function openCreate() {
    setEditingId(null);
    setForm(emptyForm(config.fields));
    setFormError(null);
    setSheetOpen(true);
  }

  async function openEdit(row: RowRecord) {
    const id = Number(row.id);
    setEditingId(id);
    setFormError(null);
    setSheetOpen(true);

    if (config.getPath) {
      try {
        const full = await apiFetch<RowRecord>(config.getPath(id));
        setForm(rowToForm(full, config.fields));
      } catch (e) {
        setForm(rowToForm(row, config.fields));
        setFormError(e instanceof Error ? e.message : 'Could not load full record');
      }
    } else {
      setForm(rowToForm(row, config.fields));
    }
  }

  function closeSheet() {
    setSheetOpen(false);
    setEditingId(null);
    setFormError(null);
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setFormError(null);
    try {
      const payload = formToPayload(form, config.fields, editingId === null);
      if (editingId === null) {
        await apiFetch(config.createPath, { method: 'POST', body: JSON.stringify(payload) });
      } else {
        await apiFetch(config.updatePath(editingId), {
          method: 'PATCH',
          body: JSON.stringify(payload),
        });
      }
      closeSheet();
      await load();
      onDataChange?.();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Save failed');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(row: RowRecord) {
    const id = Number(row.id);
    const label = String(row.name ?? row.label ?? row.level ?? id);
    if (!window.confirm(`Delete #${id} (${label})? This cannot be undone.`)) return;

    setError(null);
    try {
      await apiFetch(config.deletePath(id), { method: 'DELETE' });
      await load();
      onDataChange?.();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Delete failed');
    }
  }

  function resolveOptions(field: FieldConfig) {
    if (field.optionsKey === 'questionnaires') return lookups.questionnaires;
    if (field.optionsKey === 'elements') return lookups.elements;
    return [];
  }

  function renderField(field: FieldConfig) {
    const value = form[field.key];

    if (field.type === 'boolean') {
      return (
        <label className="admin-checkbox">
          <input
            type="checkbox"
            checked={Boolean(value)}
            onChange={(e) => setForm((prev) => ({ ...prev, [field.key]: e.target.checked }))}
          />
          {field.label}
        </label>
      );
    }

    if (field.type === 'select') {
      const options = resolveOptions(field);
      const readOnly = editingId !== null && field.createOnly;
      return (
        <label className="admin-field">
          <span>{field.label}{field.required && ' *'}</span>
          <select
            value={value === '' ? '' : String(value)}
            required={field.required && !readOnly}
            disabled={readOnly}
            onChange={(e) =>
              setForm((prev) => ({
                ...prev,
                [field.key]: e.target.value === '' ? '' : Number(e.target.value),
              }))
            }
          >
            <option value="">Select…</option>
            {options.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </label>
      );
    }

    if (field.type === 'textarea') {
      return (
        <label className="admin-field admin-field-full">
          <span>{field.label}{field.required && ' *'}</span>
          <RichTextEditor
            value={String(value ?? '')}
            onChange={(html) => setForm((prev) => ({ ...prev, [field.key]: html }))}
            placeholder={field.label}
            minHeightClassName="min-h-[110px]"
          />
        </label>
      );
    }

    return (
      <label className="admin-field">
        <span>{field.label}{field.required && ' *'}</span>
        <input
          type={field.type === 'number' ? 'number' : 'text'}
          step={field.type === 'number' ? 'any' : undefined}
          required={field.required}
          value={value === '' ? '' : String(value)}
          onChange={(e) =>
            setForm((prev) => ({
              ...prev,
              [field.key]:
                field.type === 'number'
                  ? e.target.value === ''
                    ? ''
                    : Number(e.target.value)
                  : e.target.value,
            }))
          }
        />
      </label>
    );
  }

  return (
    <div className="admin-panel">
      <header className="admin-panel-header">
        <div>
          <h2>{config.title}</h2>
          <p className="admin-muted">{config.description}</p>
        </div>
        <div className="admin-panel-actions">
          <input
            type="search"
            className="admin-search"
            placeholder="Search…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <button type="button" onClick={openCreate}>
            + Add {config.title.slice(0, -1)}
          </button>
        </div>
      </header>

      {error && <p className="admin-error">{error}</p>}

      <div className="admin-table-wrap card">
        {loading ? (
          <p className="admin-muted">Loading…</p>
        ) : filtered.length === 0 ? (
          <p className="admin-muted">No records found.</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>ID</TableHead>
                {tableFields.map((f) => (
                  <TableHead key={f.key}>{f.label}</TableHead>
                ))}
                <TableHead className={STICKY_ACTIONS_CLASS} aria-label="Actions" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((row) => (
                <TableRow
                  key={String(row.id)}
                  className="cursor-pointer"
                  onClick={() => void openEdit(row)}
                >
                  <TableCell>{String(row.id)}</TableCell>
                  {tableFields.map((f) => (
                    <TableCell key={f.key}>{formatCell(row[f.key], f)}</TableCell>
                  ))}
                  <TableCell className={STICKY_ACTIONS_CLASS}>
                    <div className="flex gap-2" onClick={(e) => e.stopPropagation()}>
                      <button type="button" className="secondary" onClick={() => void openEdit(row)}>
                        Edit
                      </button>
                      <button type="button" className="danger" onClick={() => void handleDelete(row)}>
                        Delete
                      </button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>

      <p className="admin-muted admin-count">
        {filtered.length} of {rows.length} record{rows.length === 1 ? '' : 's'}
      </p>

      <Sheet open={sheetOpen} onOpenChange={(open) => (open ? setSheetOpen(true) : closeSheet())}>
        <SheetContent className="w-full sm:max-w-xl">
          <SheetHeader>
            <SheetTitle>
              {editingId === null ? `New ${config.title.slice(0, -1)}` : `Edit #${editingId}`}
            </SheetTitle>
          </SheetHeader>

          {formError && <p className="admin-error">{formError}</p>}

          <form onSubmit={(e) => void handleSave(e)} className="admin-form">
            {sections.map(([section, fields]) => (
              <fieldset key={section} className="admin-fieldset">
                <legend>{section}</legend>
                <div className="admin-form-grid">
                  {fields.map((field) => (
                    <div key={field.key}>{renderField(field)}</div>
                  ))}
                </div>
              </fieldset>
            ))}

            <SheetFooter>
              <button type="button" className="secondary" onClick={closeSheet} disabled={saving}>
                Cancel
              </button>
              <button type="submit" disabled={saving}>
                {saving ? 'Saving…' : editingId === null ? 'Create' : 'Save changes'}
              </button>
            </SheetFooter>
          </form>
        </SheetContent>
      </Sheet>
    </div>
  );
}
