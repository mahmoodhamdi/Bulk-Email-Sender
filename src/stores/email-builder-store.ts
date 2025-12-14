import { create } from 'zustand';
import { generateShortId } from '@/lib/crypto';

export type BlockType =
  | 'text'
  | 'heading'
  | 'image'
  | 'button'
  | 'divider'
  | 'spacer'
  | 'columns'
  | 'social'
  | 'video'
  | 'html';

export interface BlockStyles {
  backgroundColor?: string;
  padding?: string;
  margin?: string;
  borderRadius?: string;
  textAlign?: 'left' | 'center' | 'right';
  color?: string;
  fontSize?: string;
  fontWeight?: string;
}

export interface BaseBlock {
  id: string;
  type: BlockType;
  styles: BlockStyles;
}

export interface TextBlock extends BaseBlock {
  type: 'text';
  content: string;
}

export interface HeadingBlock extends BaseBlock {
  type: 'heading';
  content: string;
  level: 1 | 2 | 3 | 4;
}

export interface ImageBlock extends BaseBlock {
  type: 'image';
  src: string;
  alt: string;
  width: string;
  link?: string;
}

export interface ButtonBlock extends BaseBlock {
  type: 'button';
  text: string;
  link: string;
  buttonColor: string;
  textColor: string;
  borderRadius: string;
}

export interface DividerBlock extends BaseBlock {
  type: 'divider';
  color: string;
  thickness: string;
  width: string;
}

export interface SpacerBlock extends BaseBlock {
  type: 'spacer';
  height: string;
}

export interface ColumnsBlock extends BaseBlock {
  type: 'columns';
  columns: EmailBlock[][];
  columnCount: 2 | 3 | 4;
}

export interface SocialBlock extends BaseBlock {
  type: 'social';
  networks: {
    type: 'facebook' | 'twitter' | 'instagram' | 'linkedin' | 'youtube';
    url: string;
  }[];
  iconSize: string;
}

export interface VideoBlock extends BaseBlock {
  type: 'video';
  thumbnailUrl: string;
  videoUrl: string;
}

export interface HtmlBlock extends BaseBlock {
  type: 'html';
  content: string;
}

export type EmailBlock =
  | TextBlock
  | HeadingBlock
  | ImageBlock
  | ButtonBlock
  | DividerBlock
  | SpacerBlock
  | ColumnsBlock
  | SocialBlock
  | VideoBlock
  | HtmlBlock;

export interface EmailTemplate {
  id: string;
  name: string;
  subject: string;
  previewText: string;
  blocks: EmailBlock[];
  globalStyles: {
    backgroundColor: string;
    contentWidth: string;
    fontFamily: string;
  };
}

interface EmailBuilderStore {
  // Template
  template: EmailTemplate;

  // UI State
  selectedBlockId: string | null;
  draggedBlockType: BlockType | null;
  isDragging: boolean;
  previewMode: 'desktop' | 'mobile';

  // Actions
  setTemplate: (template: EmailTemplate) => void;
  addBlock: (block: EmailBlock, index?: number) => void;
  updateBlock: (id: string, updates: Partial<EmailBlock>) => void;
  removeBlock: (id: string) => void;
  moveBlock: (fromIndex: number, toIndex: number) => void;
  duplicateBlock: (id: string) => void;
  selectBlock: (id: string | null) => void;
  setDraggedBlockType: (type: BlockType | null) => void;
  setIsDragging: (isDragging: boolean) => void;
  setPreviewMode: (mode: 'desktop' | 'mobile') => void;
  updateGlobalStyles: (styles: Partial<EmailTemplate['globalStyles']>) => void;
  generateHtml: () => string;
  resetTemplate: () => void;
}

const generateId = () => generateShortId(12);

const createDefaultBlock = (type: BlockType): EmailBlock => {
  const baseStyles: BlockStyles = {
    padding: '10px',
    margin: '0',
  };

  switch (type) {
    case 'text':
      return {
        id: generateId(),
        type: 'text',
        content: '<p>Enter your text here...</p>',
        styles: { ...baseStyles },
      };
    case 'heading':
      return {
        id: generateId(),
        type: 'heading',
        content: 'Heading',
        level: 2,
        styles: { ...baseStyles, fontWeight: 'bold' },
      };
    case 'image':
      return {
        id: generateId(),
        type: 'image',
        src: '',
        alt: 'Image',
        width: '100%',
        styles: { ...baseStyles, textAlign: 'center' },
      };
    case 'button':
      return {
        id: generateId(),
        type: 'button',
        text: 'Click Here',
        link: '#',
        buttonColor: '#3b82f6',
        textColor: '#ffffff',
        borderRadius: '4px',
        styles: { ...baseStyles, textAlign: 'center' },
      };
    case 'divider':
      return {
        id: generateId(),
        type: 'divider',
        color: '#e5e7eb',
        thickness: '1px',
        width: '100%',
        styles: { ...baseStyles },
      };
    case 'spacer':
      return {
        id: generateId(),
        type: 'spacer',
        height: '20px',
        styles: {},
      };
    case 'columns':
      return {
        id: generateId(),
        type: 'columns',
        columns: [[], []],
        columnCount: 2,
        styles: { ...baseStyles },
      };
    case 'social':
      return {
        id: generateId(),
        type: 'social',
        networks: [
          { type: 'facebook', url: '#' },
          { type: 'twitter', url: '#' },
          { type: 'instagram', url: '#' },
        ],
        iconSize: '32px',
        styles: { ...baseStyles, textAlign: 'center' },
      };
    case 'video':
      return {
        id: generateId(),
        type: 'video',
        thumbnailUrl: '',
        videoUrl: '',
        styles: { ...baseStyles, textAlign: 'center' },
      };
    case 'html':
      return {
        id: generateId(),
        type: 'html',
        content: '<!-- Custom HTML -->',
        styles: {},
      };
    default:
      return {
        id: generateId(),
        type: 'text',
        content: '',
        styles: baseStyles,
      } as TextBlock;
  }
};

const initialTemplate: EmailTemplate = {
  id: generateId(),
  name: 'Untitled Template',
  subject: '',
  previewText: '',
  blocks: [],
  globalStyles: {
    backgroundColor: '#f3f4f6',
    contentWidth: '600px',
    fontFamily: 'Arial, sans-serif',
  },
};

export const useEmailBuilderStore = create<EmailBuilderStore>((set, get) => ({
  template: initialTemplate,
  selectedBlockId: null,
  draggedBlockType: null,
  isDragging: false,
  previewMode: 'desktop',

  setTemplate: (template) => set({ template }),

  addBlock: (block, index) => {
    set((state) => {
      const blocks = [...state.template.blocks];
      if (index !== undefined) {
        blocks.splice(index, 0, block);
      } else {
        blocks.push(block);
      }
      return {
        template: { ...state.template, blocks },
        selectedBlockId: block.id,
      };
    });
  },

  updateBlock: (id, updates) => {
    set((state) => ({
      template: {
        ...state.template,
        blocks: state.template.blocks.map((block) =>
          block.id === id ? ({ ...block, ...updates } as EmailBlock) : block
        ),
      },
    }));
  },

  removeBlock: (id) => {
    set((state) => ({
      template: {
        ...state.template,
        blocks: state.template.blocks.filter((block) => block.id !== id),
      },
      selectedBlockId: state.selectedBlockId === id ? null : state.selectedBlockId,
    }));
  },

  moveBlock: (fromIndex, toIndex) => {
    set((state) => {
      const blocks = [...state.template.blocks];
      const [removed] = blocks.splice(fromIndex, 1);
      blocks.splice(toIndex, 0, removed);
      return { template: { ...state.template, blocks } };
    });
  },

  duplicateBlock: (id) => {
    const { template, addBlock } = get();
    const blockIndex = template.blocks.findIndex((b) => b.id === id);
    if (blockIndex !== -1) {
      const block = template.blocks[blockIndex];
      const newBlock = { ...block, id: generateId() };
      addBlock(newBlock as EmailBlock, blockIndex + 1);
    }
  },

  selectBlock: (id) => set({ selectedBlockId: id }),

  setDraggedBlockType: (type) => set({ draggedBlockType: type }),

  setIsDragging: (isDragging) => set({ isDragging }),

  setPreviewMode: (mode) => set({ previewMode: mode }),

  updateGlobalStyles: (styles) => {
    set((state) => ({
      template: {
        ...state.template,
        globalStyles: { ...state.template.globalStyles, ...styles },
      },
    }));
  },

  generateHtml: () => {
    const { template } = get();
    const { globalStyles, blocks } = template;

    const renderBlock = (block: EmailBlock): string => {
      const styleString = Object.entries(block.styles || {})
        .map(([key, value]) => `${key.replace(/([A-Z])/g, '-$1').toLowerCase()}: ${value}`)
        .join('; ');

      switch (block.type) {
        case 'text':
          return `<div style="${styleString}">${block.content}</div>`;
        case 'heading':
          return `<h${block.level} style="${styleString}">${block.content}</h${block.level}>`;
        case 'image':
          const imgHtml = `<img src="${block.src}" alt="${block.alt}" width="${block.width}" style="max-width: 100%; height: auto;" />`;
          return block.link
            ? `<div style="${styleString}"><a href="${block.link}">${imgHtml}</a></div>`
            : `<div style="${styleString}">${imgHtml}</div>`;
        case 'button':
          return `<div style="${styleString}">
            <a href="${block.link}" style="display: inline-block; padding: 12px 24px; background-color: ${block.buttonColor}; color: ${block.textColor}; text-decoration: none; border-radius: ${block.borderRadius}; font-weight: bold;">${block.text}</a>
          </div>`;
        case 'divider':
          return `<div style="${styleString}"><hr style="border: none; border-top: ${block.thickness} solid ${block.color}; width: ${block.width}; margin: 10px auto;" /></div>`;
        case 'spacer':
          return `<div style="height: ${block.height};"></div>`;
        case 'social':
          const icons = block.networks.map(n =>
            `<a href="${n.url}" style="display: inline-block; margin: 0 5px;"><img src="https://cdn.jsdelivr.net/npm/simple-icons@v9/icons/${n.type}.svg" width="${block.iconSize}" height="${block.iconSize}" alt="${n.type}" /></a>`
          ).join('');
          return `<div style="${styleString}">${icons}</div>`;
        case 'html':
          return block.content;
        default:
          return '';
      }
    };

    const bodyContent = blocks.map(renderBlock).join('\n');

    return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${template.subject}</title>
</head>
<body style="margin: 0; padding: 0; background-color: ${globalStyles.backgroundColor}; font-family: ${globalStyles.fontFamily};">
  <div style="max-width: ${globalStyles.contentWidth}; margin: 0 auto; background-color: #ffffff;">
    ${bodyContent}
  </div>
</body>
</html>`;
  },

  resetTemplate: () => set({ template: initialTemplate, selectedBlockId: null }),
}));

export { createDefaultBlock, generateId };
