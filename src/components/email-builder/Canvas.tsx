'use client';

import { useEmailBuilderStore, createDefaultBlock, type BlockType } from '@/stores/email-builder-store';
import { BlockRenderer } from './BlockRenderer';
import { cn } from '@/lib/utils';
import { Monitor, Smartphone, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';

export function Canvas() {
  const {
    template,
    previewMode,
    setPreviewMode,
    isDragging,
    draggedBlockType,
    addBlock,
    selectBlock,
  } = useEmailBuilderStore();

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy';
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const blockType = e.dataTransfer.getData('blockType');
    if (blockType) {
      const block = createDefaultBlock(blockType as BlockType);
      addBlock(block);
    }
  };

  const handleCanvasClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      selectBlock(null);
    }
  };

  return (
    <div className="flex-1 flex flex-col bg-muted/30">
      {/* Toolbar */}
      <div className="flex items-center justify-between border-b bg-background px-4 py-2">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium">Preview:</span>
          <Button
            size="sm"
            variant={previewMode === 'desktop' ? 'default' : 'outline'}
            onClick={() => setPreviewMode('desktop')}
          >
            <Monitor className="mr-1 h-4 w-4" />
            Desktop
          </Button>
          <Button
            size="sm"
            variant={previewMode === 'mobile' ? 'default' : 'outline'}
            onClick={() => setPreviewMode('mobile')}
          >
            <Smartphone className="mr-1 h-4 w-4" />
            Mobile
          </Button>
        </div>
        <div className="text-sm text-muted-foreground">
          {template.blocks.length} blocks
        </div>
      </div>

      {/* Canvas Area */}
      <div
        className="flex-1 overflow-auto p-8"
        onClick={handleCanvasClick}
      >
        <div
          className={cn(
            'mx-auto bg-white shadow-lg transition-all duration-300',
            previewMode === 'desktop' ? 'w-[600px]' : 'w-[375px]'
          )}
          style={{
            backgroundColor: template.globalStyles.backgroundColor,
            fontFamily: template.globalStyles.fontFamily,
          }}
        >
          {/* Email Content */}
          <div
            className="mx-auto bg-white min-h-[400px]"
            style={{ maxWidth: template.globalStyles.contentWidth }}
            onDragOver={handleDragOver}
            onDrop={handleDrop}
          >
            {template.blocks.length === 0 ? (
              <div
                className={cn(
                  'flex flex-col items-center justify-center p-12 text-center',
                  'border-2 border-dashed rounded-lg m-4',
                  isDragging
                    ? 'border-primary bg-primary/5'
                    : 'border-muted-foreground/30'
                )}
              >
                <Plus className="h-12 w-12 text-muted-foreground/50 mb-4" />
                <p className="text-lg font-medium text-muted-foreground">
                  {isDragging
                    ? 'Drop block here'
                    : 'Drag blocks here to build your email'}
                </p>
                <p className="text-sm text-muted-foreground/70 mt-2">
                  Or click on a block in the sidebar to add it
                </p>
              </div>
            ) : (
              <div className="p-4 space-y-2">
                {template.blocks.map((block, index) => (
                  <BlockRenderer
                    key={block.id}
                    block={block}
                    index={index}
                  />
                ))}

                {/* Drop Zone at Bottom */}
                {isDragging && (
                  <div
                    onDragOver={handleDragOver}
                    onDrop={handleDrop}
                    className="flex items-center justify-center p-8 border-2 border-dashed border-primary bg-primary/5 rounded-lg"
                  >
                    <span className="text-primary">Drop here to add at end</span>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
