'use client';

import * as React from 'react';
import { useEmailBuilderStore, type EmailBlock } from '@/stores/email-builder-store';
import { cn } from '@/lib/utils';
import { GripVertical, Trash2, Copy } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface BlockRendererProps {
  block: EmailBlock;
  index: number;
}

export function BlockRenderer({ block, index }: BlockRendererProps) {
  const {
    selectedBlockId,
    selectBlock,
    removeBlock,
    duplicateBlock,
    moveBlock,
  } = useEmailBuilderStore();

  const isSelected = selectedBlockId === block.id;

  const handleDragStart = (e: React.DragEvent) => {
    e.dataTransfer.setData('blockIndex', index.toString());
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const fromIndex = parseInt(e.dataTransfer.getData('blockIndex'), 10);
    if (!isNaN(fromIndex) && fromIndex !== index) {
      moveBlock(fromIndex, index);
    }
  };

  const renderBlockContent = () => {
    const styles: React.CSSProperties = {
      backgroundColor: block.styles.backgroundColor,
      padding: block.styles.padding,
      margin: block.styles.margin,
      borderRadius: block.styles.borderRadius,
      textAlign: block.styles.textAlign,
      color: block.styles.color,
      fontSize: block.styles.fontSize,
      fontWeight: block.styles.fontWeight as React.CSSProperties['fontWeight'],
    };

    switch (block.type) {
      case 'text':
        return (
          <div
            style={styles}
            dangerouslySetInnerHTML={{ __html: block.content }}
          />
        );

      case 'heading':
        const HeadingTag = `h${block.level}` as 'h1' | 'h2' | 'h3' | 'h4';
        return React.createElement(
          HeadingTag,
          { style: styles, className: 'font-bold' },
          block.content
        );

      case 'image':
        return (
          <div style={styles}>
            {block.src ? (
              <img
                src={block.src}
                alt={block.alt}
                style={{ width: block.width, maxWidth: '100%', height: 'auto' }}
              />
            ) : (
              <div className="flex h-32 items-center justify-center rounded-lg border-2 border-dashed bg-muted">
                <span className="text-sm text-muted-foreground">
                  Click to add image URL
                </span>
              </div>
            )}
          </div>
        );

      case 'button':
        return (
          <div style={styles}>
            <a
              href={block.link}
              onClick={(e) => e.preventDefault()}
              style={{
                display: 'inline-block',
                padding: '12px 24px',
                backgroundColor: block.buttonColor,
                color: block.textColor,
                textDecoration: 'none',
                borderRadius: block.borderRadius,
                fontWeight: 'bold',
              }}
            >
              {block.text}
            </a>
          </div>
        );

      case 'divider':
        return (
          <div style={styles}>
            <hr
              style={{
                border: 'none',
                borderTop: `${block.thickness} solid ${block.color}`,
                width: block.width,
                margin: '10px auto',
              }}
            />
          </div>
        );

      case 'spacer':
        return (
          <div
            style={{ height: block.height }}
            className="bg-muted/30 border border-dashed"
          >
            <span className="flex h-full items-center justify-center text-xs text-muted-foreground">
              {block.height} spacer
            </span>
          </div>
        );

      case 'social':
        return (
          <div style={styles} className="flex justify-center gap-2">
            {block.networks.map((network, i) => (
              <div
                key={i}
                className="flex h-8 w-8 items-center justify-center rounded-full bg-muted"
                title={network.type}
              >
                {network.type[0].toUpperCase()}
              </div>
            ))}
          </div>
        );

      case 'video':
        return (
          <div style={styles}>
            {block.thumbnailUrl ? (
              <div className="relative">
                <img
                  src={block.thumbnailUrl}
                  alt="Video thumbnail"
                  className="w-full"
                />
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="rounded-full bg-black/50 p-4">
                    <span className="text-2xl text-white">▶</span>
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex h-32 items-center justify-center rounded-lg border-2 border-dashed bg-muted">
                <span className="text-sm text-muted-foreground">
                  Add video thumbnail URL
                </span>
              </div>
            )}
          </div>
        );

      case 'html':
        return (
          <div
            style={styles}
            className="rounded border bg-muted/30 p-2 font-mono text-xs"
          >
            <pre className="whitespace-pre-wrap">{block.content}</pre>
          </div>
        );

      default:
        return <div>Unknown block type</div>;
    }
  };

  return (
    <div
      draggable
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
      onClick={() => selectBlock(block.id)}
      className={cn(
        'group relative cursor-pointer rounded-lg border-2 transition-all',
        isSelected
          ? 'border-primary ring-2 ring-primary/20'
          : 'border-transparent hover:border-muted-foreground/30'
      )}
    >
      {/* Drag Handle & Actions */}
      <div
        className={cn(
          'absolute -left-10 top-1/2 -translate-y-1/2 flex flex-col gap-1',
          'opacity-0 group-hover:opacity-100 transition-opacity'
        )}
      >
        <div className="cursor-grab rounded bg-muted p-1 hover:bg-muted-foreground/20">
          <GripVertical className="h-4 w-4" />
        </div>
      </div>

      {/* Block Actions */}
      {isSelected && (
        <div className="absolute -right-2 -top-2 flex gap-1 rounded-lg bg-background p-1 shadow-lg border">
          <Button
            size="icon"
            variant="ghost"
            className="h-6 w-6"
            onClick={(e) => {
              e.stopPropagation();
              duplicateBlock(block.id);
            }}
          >
            <Copy className="h-3 w-3" />
          </Button>
          <Button
            size="icon"
            variant="ghost"
            className="h-6 w-6 text-red-500 hover:text-red-600"
            onClick={(e) => {
              e.stopPropagation();
              removeBlock(block.id);
            }}
          >
            <Trash2 className="h-3 w-3" />
          </Button>
        </div>
      )}

      {/* Block Content */}
      <div className="p-1">{renderBlockContent()}</div>
    </div>
  );
}
