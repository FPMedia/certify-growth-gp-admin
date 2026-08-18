'use client';

import { useEffect, useRef, type ReactNode } from 'react';
import Link from '@tiptap/extension-link';
import Placeholder from '@tiptap/extension-placeholder';
import { EditorContent, useEditor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { TextAlign } from '@/components/ui/text-align-extension';
import './rich-text-editor.css';

export interface RichTextEditorProps {
  value: string;
  onChange: (html: string) => void;
  placeholder?: string;
  className?: string;
  minHeightClassName?: string;
  disabled?: boolean;
}

function normalizeHtml(value: string): string {
  const trimmed = value.trim();
  return trimmed ? trimmed : '<p></p>';
}

function ToolbarButton({
  pressed,
  disabled,
  onClick,
  children,
}: {
  pressed?: boolean;
  disabled?: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      className={cn('h-8', pressed && 'bg-muted')}
      onClick={onClick}
      disabled={disabled}
      aria-pressed={pressed}
    >
      {children}
    </Button>
  );
}

export function RichTextEditor({
  value,
  onChange,
  placeholder = 'Write…',
  className,
  minHeightClassName = 'min-h-[120px]',
  disabled,
}: RichTextEditorProps) {
  const lastEmitted = useRef(value);

  const editor = useEditor({
    immediatelyRender: false,
    editable: !disabled,
    extensions: [
      StarterKit.configure({
        heading: { levels: [1, 2, 3, 4] },
      }),
      TextAlign,
      Link.configure({
        openOnClick: false,
        autolink: true,
        linkOnPaste: true,
      }),
      Placeholder.configure({ placeholder }),
    ],
    content: normalizeHtml(value),
    editorProps: {
      attributes: {
        class: minHeightClassName,
      },
    },
    onUpdate: ({ editor }) => {
      const html = editor.getHTML();
      lastEmitted.current = html;
      onChange(html);
    },
  });

  useEffect(() => {
    if (!editor) return;
    editor.setEditable(!disabled);
  }, [editor, disabled]);

  useEffect(() => {
    if (!editor) return;
    if (value === lastEmitted.current) return;
    lastEmitted.current = value;
    editor.commands.setContent(normalizeHtml(value), { emitUpdate: false });
  }, [editor, value]);

  if (!editor) {
    return (
      <div className={cn('rich-text-editor rounded-md border bg-background', className)}>
        <div className={cn('px-3 py-2 text-sm text-muted-foreground', minHeightClassName)}>
          Loading editor…
        </div>
      </div>
    );
  }

  return (
    <div className={cn('rich-text-editor rounded-md border bg-background', disabled && 'opacity-60', className)}>
      <div className="flex flex-wrap gap-1 border-b bg-muted/30 p-1">
        <ToolbarButton
          pressed={editor.isActive('bold')}
          disabled={!editor.can().chain().focus().toggleBold().run()}
          onClick={() => editor.chain().focus().toggleBold().run()}
        >
          Bold
        </ToolbarButton>
        <ToolbarButton
          pressed={editor.isActive('italic')}
          disabled={!editor.can().chain().focus().toggleItalic().run()}
          onClick={() => editor.chain().focus().toggleItalic().run()}
        >
          Italic
        </ToolbarButton>
        <ToolbarButton
          pressed={editor.isActive('heading', { level: 1 })}
          onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
        >
          H1
        </ToolbarButton>
        <ToolbarButton
          pressed={editor.isActive('heading', { level: 2 })}
          onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
        >
          H2
        </ToolbarButton>
        <ToolbarButton
          pressed={editor.isActive('heading', { level: 3 })}
          onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
        >
          H3
        </ToolbarButton>
        <ToolbarButton
          pressed={editor.isActive('bulletList')}
          onClick={() => editor.chain().focus().toggleBulletList().run()}
        >
          Bullets
        </ToolbarButton>
        <ToolbarButton
          pressed={editor.isActive('orderedList')}
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
        >
          Numbered
        </ToolbarButton>
        <ToolbarButton
          pressed={editor.isActive('blockquote')}
          onClick={() => editor.chain().focus().toggleBlockquote().run()}
        >
          Quote
        </ToolbarButton>
        <ToolbarButton
          pressed={editor.isActive({ textAlign: 'left' })}
          onClick={() => editor.chain().focus().setTextAlign('left').run()}
        >
          Left
        </ToolbarButton>
        <ToolbarButton
          pressed={editor.isActive({ textAlign: 'center' })}
          onClick={() => editor.chain().focus().setTextAlign('center').run()}
        >
          Center
        </ToolbarButton>
        <ToolbarButton
          pressed={editor.isActive('link')}
          onClick={() => {
            const url = window.prompt('Link URL');
            if (!url) return;
            editor.chain().focus().extendMarkRange('link').setLink({ href: url }).run();
          }}
        >
          Link
        </ToolbarButton>
        <ToolbarButton
          disabled={!editor.isActive('link')}
          onClick={() => editor.chain().focus().unsetLink().run()}
        >
          Unlink
        </ToolbarButton>
      </div>

      <EditorContent editor={editor} />
    </div>
  );
}
