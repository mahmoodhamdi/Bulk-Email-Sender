'use client';

import { useTranslations } from 'next-intl';
import {
  Type,
  Heading,
  Image,
  MousePointerClick,
  Minus,
  MoveVertical,
  Columns,
  Share2,
  Play,
  Code,
  GripVertical,
} from 'lucide-react';
import { useEmailBuilderStore, type BlockType, createDefaultBlock } from '@/stores/email-builder-store';
import { cn } from '@/lib/utils';

interface BlockItem {
  type: BlockType;
  icon: React.ElementType;
  label: string;
}

const BLOCKS: BlockItem[] = [
  { type: 'text', icon: Type, label: 'Text' },
  { type: 'heading', icon: Heading, label: 'Heading' },
  { type: 'image', icon: Image, label: 'Image' },
  { type: 'button', icon: MousePointerClick, label: 'Button' },
  { type: 'divider', icon: Minus, label: 'Divider' },
  { type: 'spacer', icon: MoveVertical, label: 'Spacer' },
  { type: 'columns', icon: Columns, label: 'Columns' },
  { type: 'social', icon: Share2, label: 'Social' },
  { type: 'video', icon: Play, label: 'Video' },
  { type: 'html', icon: Code, label: 'HTML' },
];

export function BlockPalette() {
  const t = useTranslations();
  const { addBlock, setDraggedBlockType, setIsDragging } = useEmailBuilderStore();

  const handleDragStart = (e: React.DragEvent, type: BlockType) => {
    e.dataTransfer.setData('blockType', type);
    setDraggedBlockType(type);
    setIsDragging(true);
  };

  const handleDragEnd = () => {
    setDraggedBlockType(null);
    setIsDragging(false);
  };

  const handleClick = (type: BlockType) => {
    const block = createDefaultBlock(type);
    addBlock(block);
  };

  return (
    <div className="w-64 border-r bg-card p-4">
      <h3 className="mb-4 font-semibold">Blocks</h3>
      <div className="grid grid-cols-2 gap-2">
        {BLOCKS.map((block) => (
          <button
            key={block.type}
            draggable
            onDragStart={(e) => handleDragStart(e, block.type)}
            onDragEnd={handleDragEnd}
            onClick={() => handleClick(block.type)}
            className={cn(
              'flex flex-col items-center gap-2 rounded-lg border p-3',
              'cursor-grab bg-background transition-colors',
              'hover:border-primary hover:bg-primary/5',
              'active:cursor-grabbing'
            )}
          >
            <block.icon className="h-5 w-5 text-muted-foreground" />
            <span className="text-xs">{block.label}</span>
          </button>
        ))}
      </div>

      {/* Instructions */}
      <div className="mt-6 rounded-lg bg-muted p-3 text-xs text-muted-foreground">
        <p className="flex items-center gap-1">
          <GripVertical className="h-3 w-3" />
          Drag blocks to canvas or click to add
        </p>
      </div>
    </div>
  );
}
