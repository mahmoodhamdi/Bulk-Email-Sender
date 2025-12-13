'use client';

import { useEmailBuilderStore, type EmailBlock } from '@/stores/email-builder-store';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Palette, Settings, AlignLeft, AlignCenter, AlignRight } from 'lucide-react';
import { cn } from '@/lib/utils';

export function PropertiesPanel() {
  const { template, selectedBlockId, updateBlock, updateGlobalStyles } =
    useEmailBuilderStore();

  const selectedBlock = template.blocks.find((b) => b.id === selectedBlockId);

  if (!selectedBlock) {
    return (
      <div className="w-72 border-l bg-card p-4">
        <h3 className="mb-4 font-semibold">Properties</h3>

        {/* Global Styles */}
        <Card>
          <CardHeader className="py-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <Settings className="h-4 w-4" />
              Global Styles
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label className="text-xs">Background Color</Label>
              <div className="flex gap-2">
                <Input
                  type="color"
                  value={template.globalStyles.backgroundColor}
                  onChange={(e) =>
                    updateGlobalStyles({ backgroundColor: e.target.value })
                  }
                  className="h-8 w-12 p-1"
                />
                <Input
                  value={template.globalStyles.backgroundColor}
                  onChange={(e) =>
                    updateGlobalStyles({ backgroundColor: e.target.value })
                  }
                  className="h-8"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-xs">Content Width</Label>
              <Input
                value={template.globalStyles.contentWidth}
                onChange={(e) =>
                  updateGlobalStyles({ contentWidth: e.target.value })
                }
                placeholder="600px"
              />
            </div>

            <div className="space-y-2">
              <Label className="text-xs">Font Family</Label>
              <select
                value={template.globalStyles.fontFamily}
                onChange={(e) =>
                  updateGlobalStyles({ fontFamily: e.target.value })
                }
                className="w-full rounded-md border bg-background px-3 py-2 text-sm"
              >
                <option value="Arial, sans-serif">Arial</option>
                <option value="Helvetica, sans-serif">Helvetica</option>
                <option value="Georgia, serif">Georgia</option>
                <option value="Times New Roman, serif">Times New Roman</option>
                <option value="Verdana, sans-serif">Verdana</option>
                <option value="Tahoma, sans-serif">Tahoma</option>
              </select>
            </div>
          </CardContent>
        </Card>

        <p className="mt-4 text-sm text-muted-foreground text-center">
          Select a block to edit its properties
        </p>
      </div>
    );
  }

  const handleUpdate = (updates: Partial<EmailBlock>) => {
    updateBlock(selectedBlock.id, updates);
  };

  const handleStyleUpdate = (styleUpdates: Partial<EmailBlock['styles']>) => {
    updateBlock(selectedBlock.id, {
      styles: { ...selectedBlock.styles, ...styleUpdates },
    });
  };

  return (
    <div className="w-72 border-l bg-card overflow-y-auto">
      <div className="p-4">
        <h3 className="mb-4 font-semibold capitalize">
          {selectedBlock.type} Properties
        </h3>

        {/* Block-specific properties */}
        <div className="space-y-4">
          {/* Text Block */}
          {selectedBlock.type === 'text' && (
            <div className="space-y-2">
              <Label className="text-xs">Content</Label>
              <textarea
                value={selectedBlock.content}
                onChange={(e) => handleUpdate({ content: e.target.value })}
                className="min-h-[120px] w-full rounded-md border bg-background px-3 py-2 text-sm"
                placeholder="Enter text or HTML..."
              />
            </div>
          )}

          {/* Heading Block */}
          {selectedBlock.type === 'heading' && (
            <>
              <div className="space-y-2">
                <Label className="text-xs">Heading Text</Label>
                <Input
                  value={selectedBlock.content}
                  onChange={(e) => handleUpdate({ content: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label className="text-xs">Level</Label>
                <div className="flex gap-1">
                  {[1, 2, 3, 4].map((level) => (
                    <Button
                      key={level}
                      size="sm"
                      variant={selectedBlock.level === level ? 'default' : 'outline'}
                      onClick={() => handleUpdate({ level: level as 1 | 2 | 3 | 4 })}
                    >
                      H{level}
                    </Button>
                  ))}
                </div>
              </div>
            </>
          )}

          {/* Image Block */}
          {selectedBlock.type === 'image' && (
            <>
              <div className="space-y-2">
                <Label className="text-xs">Image URL</Label>
                <Input
                  value={selectedBlock.src}
                  onChange={(e) => handleUpdate({ src: e.target.value })}
                  placeholder="https://example.com/image.jpg"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-xs">Alt Text</Label>
                <Input
                  value={selectedBlock.alt}
                  onChange={(e) => handleUpdate({ alt: e.target.value })}
                  placeholder="Image description"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-xs">Width</Label>
                <Input
                  value={selectedBlock.width}
                  onChange={(e) => handleUpdate({ width: e.target.value })}
                  placeholder="100%"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-xs">Link URL (optional)</Label>
                <Input
                  value={selectedBlock.link || ''}
                  onChange={(e) => handleUpdate({ link: e.target.value })}
                  placeholder="https://example.com"
                />
              </div>
            </>
          )}

          {/* Button Block */}
          {selectedBlock.type === 'button' && (
            <>
              <div className="space-y-2">
                <Label className="text-xs">Button Text</Label>
                <Input
                  value={selectedBlock.text}
                  onChange={(e) => handleUpdate({ text: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label className="text-xs">Link URL</Label>
                <Input
                  value={selectedBlock.link}
                  onChange={(e) => handleUpdate({ link: e.target.value })}
                  placeholder="https://example.com"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-xs">Button Color</Label>
                <div className="flex gap-2">
                  <Input
                    type="color"
                    value={selectedBlock.buttonColor}
                    onChange={(e) => handleUpdate({ buttonColor: e.target.value })}
                    className="h-8 w-12 p-1"
                  />
                  <Input
                    value={selectedBlock.buttonColor}
                    onChange={(e) => handleUpdate({ buttonColor: e.target.value })}
                    className="h-8"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label className="text-xs">Text Color</Label>
                <div className="flex gap-2">
                  <Input
                    type="color"
                    value={selectedBlock.textColor}
                    onChange={(e) => handleUpdate({ textColor: e.target.value })}
                    className="h-8 w-12 p-1"
                  />
                  <Input
                    value={selectedBlock.textColor}
                    onChange={(e) => handleUpdate({ textColor: e.target.value })}
                    className="h-8"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label className="text-xs">Border Radius</Label>
                <Input
                  value={selectedBlock.borderRadius}
                  onChange={(e) => handleUpdate({ borderRadius: e.target.value })}
                  placeholder="4px"
                />
              </div>
            </>
          )}

          {/* Divider Block */}
          {selectedBlock.type === 'divider' && (
            <>
              <div className="space-y-2">
                <Label className="text-xs">Color</Label>
                <div className="flex gap-2">
                  <Input
                    type="color"
                    value={selectedBlock.color}
                    onChange={(e) => handleUpdate({ color: e.target.value })}
                    className="h-8 w-12 p-1"
                  />
                  <Input
                    value={selectedBlock.color}
                    onChange={(e) => handleUpdate({ color: e.target.value })}
                    className="h-8"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label className="text-xs">Thickness</Label>
                <Input
                  value={selectedBlock.thickness}
                  onChange={(e) => handleUpdate({ thickness: e.target.value })}
                  placeholder="1px"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-xs">Width</Label>
                <Input
                  value={selectedBlock.width}
                  onChange={(e) => handleUpdate({ width: e.target.value })}
                  placeholder="100%"
                />
              </div>
            </>
          )}

          {/* Spacer Block */}
          {selectedBlock.type === 'spacer' && (
            <div className="space-y-2">
              <Label className="text-xs">Height</Label>
              <Input
                value={selectedBlock.height}
                onChange={(e) => handleUpdate({ height: e.target.value })}
                placeholder="20px"
              />
            </div>
          )}

          {/* HTML Block */}
          {selectedBlock.type === 'html' && (
            <div className="space-y-2">
              <Label className="text-xs">Custom HTML</Label>
              <textarea
                value={selectedBlock.content}
                onChange={(e) => handleUpdate({ content: e.target.value })}
                className="min-h-[200px] w-full rounded-md border bg-background px-3 py-2 text-sm font-mono"
                placeholder="<div>Your HTML here</div>"
              />
            </div>
          )}

          {/* Common Style Options */}
          <div className="border-t pt-4 mt-4">
            <h4 className="text-sm font-medium mb-3 flex items-center gap-2">
              <Palette className="h-4 w-4" />
              Styles
            </h4>

            <div className="space-y-3">
              <div className="space-y-2">
                <Label className="text-xs">Text Align</Label>
                <div className="flex gap-1">
                  <Button
                    size="sm"
                    variant={selectedBlock.styles.textAlign === 'left' ? 'default' : 'outline'}
                    onClick={() => handleStyleUpdate({ textAlign: 'left' })}
                  >
                    <AlignLeft className="h-4 w-4" />
                  </Button>
                  <Button
                    size="sm"
                    variant={selectedBlock.styles.textAlign === 'center' ? 'default' : 'outline'}
                    onClick={() => handleStyleUpdate({ textAlign: 'center' })}
                  >
                    <AlignCenter className="h-4 w-4" />
                  </Button>
                  <Button
                    size="sm"
                    variant={selectedBlock.styles.textAlign === 'right' ? 'default' : 'outline'}
                    onClick={() => handleStyleUpdate({ textAlign: 'right' })}
                  >
                    <AlignRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-xs">Background Color</Label>
                <div className="flex gap-2">
                  <Input
                    type="color"
                    value={selectedBlock.styles.backgroundColor || '#ffffff'}
                    onChange={(e) =>
                      handleStyleUpdate({ backgroundColor: e.target.value })
                    }
                    className="h-8 w-12 p-1"
                  />
                  <Input
                    value={selectedBlock.styles.backgroundColor || ''}
                    onChange={(e) =>
                      handleStyleUpdate({ backgroundColor: e.target.value })
                    }
                    className="h-8"
                    placeholder="transparent"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-xs">Padding</Label>
                <Input
                  value={selectedBlock.styles.padding || ''}
                  onChange={(e) => handleStyleUpdate({ padding: e.target.value })}
                  placeholder="10px"
                />
              </div>

              <div className="space-y-2">
                <Label className="text-xs">Margin</Label>
                <Input
                  value={selectedBlock.styles.margin || ''}
                  onChange={(e) => handleStyleUpdate({ margin: e.target.value })}
                  placeholder="0"
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
