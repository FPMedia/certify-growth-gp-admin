import { Extension } from '@tiptap/core';

type Alignment = 'left' | 'center' | 'right';

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    textAlign: {
      setTextAlign: (alignment: Alignment) => ReturnType;
    };
  }
}

export const TextAlign = Extension.create({
  name: 'textAlign',

  addGlobalAttributes() {
    return [
      {
        types: ['heading', 'paragraph'],
        attributes: {
          textAlign: {
            default: null,
            parseHTML: (element) => {
              const align = element.style.textAlign;
              return align === 'left' || align === 'center' || align === 'right' ? align : null;
            },
            renderHTML: (attributes) => {
              if (!attributes.textAlign) return {};
              return { style: `text-align: ${attributes.textAlign}` };
            },
          },
        },
      },
    ];
  },

  addCommands() {
    return {
      setTextAlign:
        (alignment) =>
        ({ commands }) =>
          ['paragraph', 'heading'].some((type) =>
            commands.updateAttributes(type, { textAlign: alignment }),
          ),
    };
  },
});
