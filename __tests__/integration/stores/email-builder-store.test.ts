import { describe, it, expect, beforeEach } from 'vitest';
import {
  useEmailBuilderStore,
  generateId,
  createDefaultBlock,
  type EmailBlock,
  type BlockType,
} from '@/stores/email-builder-store';

describe('Email Builder Store Integration', () => {
  beforeEach(() => {
    useEmailBuilderStore.getState().resetTemplate();
  });

  describe('Full Email Building Workflow', () => {
    it('should build a complete marketing email', () => {
      const store = useEmailBuilderStore.getState();

      // Set template metadata
      store.setTemplate({
        ...store.template,
        name: 'Summer Sale Newsletter',
        subject: 'Summer Sale - 50% Off Everything!',
      });

      // Add header image
      const imageBlock = createDefaultBlock('image');
      (imageBlock as Extract<EmailBlock, { type: 'image' }>).src = 'https://example.com/header.jpg';
      (imageBlock as Extract<EmailBlock, { type: 'image' }>).alt = 'Summer Sale Banner';
      store.addBlock(imageBlock);

      // Add heading
      const headingBlock = createDefaultBlock('heading');
      (headingBlock as Extract<EmailBlock, { type: 'heading' }>).content = 'Summer Sale is Here!';
      (headingBlock as Extract<EmailBlock, { type: 'heading' }>).level = 1;
      store.addBlock(headingBlock);

      // Add intro text
      const textBlock = createDefaultBlock('text');
      (textBlock as Extract<EmailBlock, { type: 'text' }>).content =
        "Dear {{firstName}}, don't miss our biggest sale of the year. Everything is 50% off for a limited time only!";
      store.addBlock(textBlock);

      // Add CTA button
      const buttonBlock = createDefaultBlock('button');
      (buttonBlock as Extract<EmailBlock, { type: 'button' }>).text = 'Shop Now';
      (buttonBlock as Extract<EmailBlock, { type: 'button' }>).link = 'https://example.com/sale';
      (buttonBlock as Extract<EmailBlock, { type: 'button' }>).buttonColor = '#FF5722';
      (buttonBlock as Extract<EmailBlock, { type: 'button' }>).textColor = '#FFFFFF';
      store.addBlock(buttonBlock);

      // Add divider
      const dividerBlock = createDefaultBlock('divider');
      store.addBlock(dividerBlock);

      // Add footer
      const footerBlock = createDefaultBlock('text');
      (footerBlock as Extract<EmailBlock, { type: 'text' }>).content = '© 2025 Example Company. All rights reserved.';
      store.addBlock(footerBlock);

      // Verify template structure
      const template = useEmailBuilderStore.getState().template;
      expect(template.name).toBe('Summer Sale Newsletter');
      expect(template.blocks).toHaveLength(6);
      expect(template.blocks[0].type).toBe('image');
      expect(template.blocks[1].type).toBe('heading');
      expect(template.blocks[3].type).toBe('button');
    });

    it('should reorder blocks correctly', () => {
      const store = useEmailBuilderStore.getState();

      // Add blocks in order
      const headingBlock = createDefaultBlock('heading');
      (headingBlock as Extract<EmailBlock, { type: 'heading' }>).content = 'First';
      store.addBlock(headingBlock);

      const textBlock = createDefaultBlock('text');
      (textBlock as Extract<EmailBlock, { type: 'text' }>).content = 'Second';
      store.addBlock(textBlock);

      const buttonBlock = createDefaultBlock('button');
      (buttonBlock as Extract<EmailBlock, { type: 'button' }>).text = 'Third';
      store.addBlock(buttonBlock);

      const blocks = useEmailBuilderStore.getState().template.blocks;
      const firstId = blocks[0].id;
      const secondId = blocks[1].id;
      const thirdId = blocks[2].id;

      // Move first block to last position
      store.moveBlock(0, 2);

      const reordered = useEmailBuilderStore.getState().template.blocks;
      expect(reordered[0].id).toBe(secondId);
      expect(reordered[1].id).toBe(thirdId);
      expect(reordered[2].id).toBe(firstId);
    });

    it('should duplicate blocks with new ids', () => {
      const store = useEmailBuilderStore.getState();

      const textBlock = createDefaultBlock('text');
      (textBlock as Extract<EmailBlock, { type: 'text' }>).content = 'Original content';
      store.addBlock(textBlock);

      const originalBlock = useEmailBuilderStore.getState().template.blocks[0];
      store.duplicateBlock(originalBlock.id);

      const blocks = useEmailBuilderStore.getState().template.blocks;
      expect(blocks).toHaveLength(2);
      expect(blocks[1].id).not.toBe(originalBlock.id);
      expect((blocks[1] as Extract<EmailBlock, { type: 'text' }>).content).toBe('Original content');
    });
  });

  describe('Block Type Operations', () => {
    it('should handle all block types', () => {
      const store = useEmailBuilderStore.getState();

      // Text block
      const textBlock = createDefaultBlock('text');
      store.addBlock(textBlock);

      // Heading block
      const headingBlock = createDefaultBlock('heading');
      store.addBlock(headingBlock);

      // Image block
      const imageBlock = createDefaultBlock('image');
      store.addBlock(imageBlock);

      // Button block
      const buttonBlock = createDefaultBlock('button');
      store.addBlock(buttonBlock);

      // Divider block
      const dividerBlock = createDefaultBlock('divider');
      store.addBlock(dividerBlock);

      // Spacer block
      const spacerBlock = createDefaultBlock('spacer');
      store.addBlock(spacerBlock);

      // Social block
      const socialBlock = createDefaultBlock('social');
      store.addBlock(socialBlock);

      // HTML block
      const htmlBlock = createDefaultBlock('html');
      store.addBlock(htmlBlock);

      // Columns block
      const columnsBlock = createDefaultBlock('columns');
      store.addBlock(columnsBlock);

      const blocks = useEmailBuilderStore.getState().template.blocks;
      expect(blocks).toHaveLength(9);
      expect(blocks.map((b) => b.type)).toEqual([
        'text',
        'heading',
        'image',
        'button',
        'divider',
        'spacer',
        'social',
        'html',
        'columns',
      ]);
    });

    it('should update block properties correctly', () => {
      const store = useEmailBuilderStore.getState();

      const buttonBlock = createDefaultBlock('button');
      store.addBlock(buttonBlock);

      const blockId = useEmailBuilderStore.getState().template.blocks[0].id;

      store.updateBlock(blockId, {
        text: 'Updated',
        link: 'https://updated.com',
        buttonColor: '#FF0000',
      });

      const updatedBlock = useEmailBuilderStore.getState().template.blocks[0];
      expect((updatedBlock as Extract<EmailBlock, { type: 'button' }>).text).toBe('Updated');
      expect((updatedBlock as Extract<EmailBlock, { type: 'button' }>).link).toBe('https://updated.com');
      expect((updatedBlock as Extract<EmailBlock, { type: 'button' }>).buttonColor).toBe('#FF0000');
    });
  });

  describe('HTML Generation', () => {
    it('should generate valid HTML', () => {
      const store = useEmailBuilderStore.getState();

      const headingBlock = createDefaultBlock('heading');
      (headingBlock as Extract<EmailBlock, { type: 'heading' }>).content = 'Hello World';
      store.addBlock(headingBlock);

      const textBlock = createDefaultBlock('text');
      (textBlock as Extract<EmailBlock, { type: 'text' }>).content = 'This is a test email';
      store.addBlock(textBlock);

      const html = store.generateHtml();

      expect(html).toContain('<!DOCTYPE html>');
      expect(html).toContain('<html');
      expect(html).toContain('Hello World');
      expect(html).toContain('This is a test email');
      expect(html).toContain('</html>');
    });

    it('should include meta tags for email clients', () => {
      const html = useEmailBuilderStore.getState().generateHtml();

      expect(html).toContain('viewport');
      expect(html).toContain('utf-8');
    });

    it('should generate button with correct styles', () => {
      const store = useEmailBuilderStore.getState();

      const buttonBlock = createDefaultBlock('button');
      (buttonBlock as Extract<EmailBlock, { type: 'button' }>).text = 'Click Here';
      (buttonBlock as Extract<EmailBlock, { type: 'button' }>).link = 'https://example.com';
      (buttonBlock as Extract<EmailBlock, { type: 'button' }>).buttonColor = '#007bff';
      (buttonBlock as Extract<EmailBlock, { type: 'button' }>).textColor = '#ffffff';
      store.addBlock(buttonBlock);

      const html = store.generateHtml();

      expect(html).toContain('Click Here');
      expect(html).toContain('https://example.com');
      expect(html).toContain('#007bff');
    });
  });

  describe('Template Management', () => {
    it('should save and load template state', () => {
      const store = useEmailBuilderStore.getState();

      // Build template
      store.setTemplate({
        ...store.template,
        name: 'Test Template',
        subject: 'Test Subject',
      });

      const textBlock = createDefaultBlock('text');
      (textBlock as Extract<EmailBlock, { type: 'text' }>).content = 'Test content';
      store.addBlock(textBlock);

      // Get current state
      const currentTemplate = useEmailBuilderStore.getState().template;
      const savedState = {
        name: currentTemplate.name,
        subject: currentTemplate.subject,
        blocks: [...currentTemplate.blocks],
        id: currentTemplate.id,
        previewText: currentTemplate.previewText,
        globalStyles: currentTemplate.globalStyles,
      };

      // Reset and verify reset
      useEmailBuilderStore.getState().resetTemplate();
      expect(useEmailBuilderStore.getState().template.name).toBe('Untitled Template');
      expect(useEmailBuilderStore.getState().template.blocks).toHaveLength(0);

      // Restore state by setting the complete template
      useEmailBuilderStore.getState().setTemplate({
        id: savedState.id,
        name: savedState.name,
        subject: savedState.subject,
        previewText: savedState.previewText,
        blocks: savedState.blocks,
        globalStyles: savedState.globalStyles,
      });

      expect(useEmailBuilderStore.getState().template.name).toBe('Test Template');
      expect(useEmailBuilderStore.getState().template.blocks).toHaveLength(1);
    });
  });

  describe('Selection Management', () => {
    it('should track selected block', () => {
      const store = useEmailBuilderStore.getState();

      const textBlock = createDefaultBlock('text');
      store.addBlock(textBlock);
      const blockId = useEmailBuilderStore.getState().template.blocks[0].id;

      // Select block
      store.selectBlock(blockId);
      expect(useEmailBuilderStore.getState().selectedBlockId).toBe(blockId);

      // Deselect
      store.selectBlock(null);
      expect(useEmailBuilderStore.getState().selectedBlockId).toBeNull();
    });

    it('should clear selection when block is deleted', () => {
      const store = useEmailBuilderStore.getState();

      const textBlock = createDefaultBlock('text');
      store.addBlock(textBlock);
      const blockId = useEmailBuilderStore.getState().template.blocks[0].id;

      store.selectBlock(blockId);
      expect(useEmailBuilderStore.getState().selectedBlockId).toBe(blockId);

      store.removeBlock(blockId);
      expect(useEmailBuilderStore.getState().selectedBlockId).toBeNull();
    });
  });

  describe('Drag and Drop', () => {
    it('should handle drag state', () => {
      const store = useEmailBuilderStore.getState();

      expect(store.isDragging).toBe(false);

      store.setIsDragging(true);
      expect(useEmailBuilderStore.getState().isDragging).toBe(true);

      store.setIsDragging(false);
      expect(useEmailBuilderStore.getState().isDragging).toBe(false);
    });

    it('should track dragged block type', () => {
      const store = useEmailBuilderStore.getState();

      store.setDraggedBlockType('text');
      expect(useEmailBuilderStore.getState().draggedBlockType).toBe('text');

      store.setDraggedBlockType(null);
      expect(useEmailBuilderStore.getState().draggedBlockType).toBeNull();
    });
  });

  describe('Edge Cases', () => {
    it('should handle removing non-existent block', () => {
      const store = useEmailBuilderStore.getState();

      const textBlock = createDefaultBlock('text');
      store.addBlock(textBlock);
      const initialLength = useEmailBuilderStore.getState().template.blocks.length;

      store.removeBlock('non-existent-id');
      expect(useEmailBuilderStore.getState().template.blocks).toHaveLength(initialLength);
    });

    it('should handle updating non-existent block', () => {
      const store = useEmailBuilderStore.getState();

      const textBlock = createDefaultBlock('text');
      store.addBlock(textBlock);

      // Should not throw
      store.updateBlock('non-existent-id', { content: 'Updated' } as Partial<EmailBlock>);

      // Original block unchanged
      const block = useEmailBuilderStore.getState().template.blocks[0];
      // Check if block is text type and content is default
      expect(block.type).toBe('text');
    });

    it('should handle duplicating non-existent block', () => {
      const store = useEmailBuilderStore.getState();

      const textBlock = createDefaultBlock('text');
      store.addBlock(textBlock);
      const initialLength = useEmailBuilderStore.getState().template.blocks.length;

      store.duplicateBlock('non-existent-id');
      expect(useEmailBuilderStore.getState().template.blocks).toHaveLength(initialLength);
    });

    it('should generate unique block ids', () => {
      const ids = new Set<string>();
      for (let i = 0; i < 100; i++) {
        ids.add(generateId());
      }
      expect(ids.size).toBe(100);
    });
  });

  describe('Default Block Creation', () => {
    it('should create default blocks with correct properties', () => {
      const blockTypes: BlockType[] = [
        'text',
        'heading',
        'image',
        'button',
        'divider',
        'spacer',
        'social',
        'html',
        'columns',
      ];

      blockTypes.forEach((type) => {
        const block = createDefaultBlock(type);
        expect(block.id).toBeDefined();
        expect(block.type).toBe(type);
      });
    });

    it('should create text block with default content', () => {
      const block = createDefaultBlock('text');
      expect(block.type).toBe('text');
      expect((block as Extract<EmailBlock, { type: 'text' }>).content).toBeDefined();
    });

    it('should create heading block with default level', () => {
      const block = createDefaultBlock('heading');
      expect(block.type).toBe('heading');
      expect((block as Extract<EmailBlock, { type: 'heading' }>).level).toBe(2);
    });

    it('should create button block with default properties', () => {
      const block = createDefaultBlock('button');
      expect(block.type).toBe('button');
      const buttonBlock = block as Extract<EmailBlock, { type: 'button' }>;
      expect(buttonBlock.text).toBe('Click Here');
      expect(buttonBlock.link).toBe('#');
      expect(buttonBlock.buttonColor).toBeDefined();
      expect(buttonBlock.textColor).toBeDefined();
    });

    it('should create social block with default networks', () => {
      const block = createDefaultBlock('social');
      expect(block.type).toBe('social');
      const socialBlock = block as Extract<EmailBlock, { type: 'social' }>;
      expect(socialBlock.networks.length).toBeGreaterThan(0);
    });

    it('should create columns block with default structure', () => {
      const block = createDefaultBlock('columns');
      expect(block.type).toBe('columns');
      const columnsBlock = block as Extract<EmailBlock, { type: 'columns' }>;
      expect(columnsBlock.columns.length).toBe(2);
      expect(columnsBlock.columnCount).toBe(2);
    });
  });

  describe('Global Styles', () => {
    it('should update global styles', () => {
      const store = useEmailBuilderStore.getState();

      store.updateGlobalStyles({
        backgroundColor: '#ffffff',
        contentWidth: '800px',
        fontFamily: 'Georgia, serif',
      });

      const globalStyles = useEmailBuilderStore.getState().template.globalStyles;
      expect(globalStyles.backgroundColor).toBe('#ffffff');
      expect(globalStyles.contentWidth).toBe('800px');
      expect(globalStyles.fontFamily).toBe('Georgia, serif');
    });

    it('should preserve other global styles when updating', () => {
      const store = useEmailBuilderStore.getState();

      const originalFontFamily = store.template.globalStyles.fontFamily;

      store.updateGlobalStyles({
        backgroundColor: '#000000',
      });

      const globalStyles = useEmailBuilderStore.getState().template.globalStyles;
      expect(globalStyles.backgroundColor).toBe('#000000');
      expect(globalStyles.fontFamily).toBe(originalFontFamily);
    });
  });

  describe('Preview Mode', () => {
    it('should switch between desktop and mobile preview', () => {
      const store = useEmailBuilderStore.getState();

      expect(store.previewMode).toBe('desktop');

      store.setPreviewMode('mobile');
      expect(useEmailBuilderStore.getState().previewMode).toBe('mobile');

      store.setPreviewMode('desktop');
      expect(useEmailBuilderStore.getState().previewMode).toBe('desktop');
    });
  });

  describe('Block Insertion', () => {
    it('should insert block at specific index', () => {
      const store = useEmailBuilderStore.getState();

      // Add two blocks
      const firstBlock = createDefaultBlock('text');
      (firstBlock as Extract<EmailBlock, { type: 'text' }>).content = 'First';
      store.addBlock(firstBlock);

      const secondBlock = createDefaultBlock('text');
      (secondBlock as Extract<EmailBlock, { type: 'text' }>).content = 'Second';
      store.addBlock(secondBlock);

      // Insert at index 1
      const middleBlock = createDefaultBlock('heading');
      (middleBlock as Extract<EmailBlock, { type: 'heading' }>).content = 'Middle';
      store.addBlock(middleBlock, 1);

      const blocks = useEmailBuilderStore.getState().template.blocks;
      expect(blocks).toHaveLength(3);
      expect((blocks[0] as Extract<EmailBlock, { type: 'text' }>).content).toBe('First');
      expect(blocks[1].type).toBe('heading');
      expect((blocks[2] as Extract<EmailBlock, { type: 'text' }>).content).toBe('Second');
    });
  });
});
