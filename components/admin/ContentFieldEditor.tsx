'use client';

import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { RichTextEditor } from '@/components/ui/rich-text-editor';
import type { CopyFieldDef } from '@/lib/admin/content-fields';
import { INTERPOLATION_HELP } from '@/lib/admin/content-fields';

interface ContentFieldEditorProps {
  field: CopyFieldDef;
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  extraHint?: string;
}

export function ContentFieldEditor({
  field,
  value,
  onChange,
  disabled,
  extraHint,
}: ContentFieldEditorProps) {
  return (
    <div className="space-y-2 rounded-lg border bg-card p-4">
      <div className="space-y-1">
        <Label htmlFor={field.key} className="text-sm font-medium">
          {field.label}
          {field.required ? ' *' : ''}
        </Label>
        <p className="text-xs text-muted-foreground">Where this appears: {field.where}</p>
        {field.interpolates && (
          <p className="text-xs text-muted-foreground">{INTERPOLATION_HELP}</p>
        )}
        {extraHint && <p className="text-xs text-amber-700 dark:text-amber-400">{extraHint}</p>}
      </div>
      {field.kind === 'rich' ? (
        <RichTextEditor
          value={value}
          onChange={onChange}
          placeholder={field.label}
          minHeightClassName="min-h-[160px]"
          disabled={disabled}
        />
      ) : (
        <Input
          id={field.key}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={field.label}
          disabled={disabled}
        />
      )}
    </div>
  );
}
