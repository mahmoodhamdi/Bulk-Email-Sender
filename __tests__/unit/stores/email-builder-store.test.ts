import { describe, it, expect, beforeEach } from 'vitest';
import { useEmailBuilderStore, createDefaultBlock, generateId } from '@/stores/email-builder-store';

describe('Email Builder Store', () => {
  beforeEach(() => {
    // Reset store before each test
    useEmailBuilderStore.getState().resetTemplate();
  });

  describe('generateId', () => {
    it('should generate unique ids', () => {
      const id1 = generateId();
      const id2 = generateId();
      expect(id1).not.toBe(id2);
    });

    it('should generate ids of expected length', () => {
      const id = generateId();
      expect(id.length).toBe(12);
    });
  });

  describe('createDefaultBlock', () => {
    it('should create text block with default values', () => {
      const block = createDefaultBlock('text');
      expect(block.type).toBe('text');
      expect(block.content).toBe('<p>Enter your text here...</p>');
      expect(block.id).toBeTruthy();
      expect(block.styles).toBeDefined();
    });

    it('should create heading block with default values', () => {
      const block = createDefaultBlock('heading');
      expect(block.type).toBe('heading');
      expect(block.content).toBe('Heading');
      expect(block.level).toBe(2);
    });

    it('should create image block with default values', () => {
      const block = createDefaultBlock('image');
      expect(block.type).toBe('image');
      expect(block.src).toBe('');
      expect(block.alt).toBe('Image');
      expect(block.width).toBe('100%');
    });

    it('should create button block with default values', () => {
      const block = createDefaultBlock('button');
      expect(block.type).toBe('button');
      expect(block.text).toBe('Click Here');
      expect(block.link).toBe('#');
      expect(block.buttonColor).toBe('#3b82f6');
      expect(block.textColor).toBe('#ffffff');
    });

    it('should create divider block with default values', () => {
      const block = createDefaultBlock('divider');
      expect(block.type).toBe('divider');
      expect(block.color).toBe('#e5e7eb');
      expect(block.thickness).toBe('1px');
      expect(block.width).toBe('100%');
    });

    it('should create spacer block with default values', () => {
      const block = createDefaultBlock('spacer');
      expect(block.type).toBe('spacer');
      expect(block.height).toBe('20px');
    });

    it('should create columns block with default values', () => {
      const block = createDefaultBlock('columns');
      expect(block.type).toBe('columns');
      expect(block.columns).toHaveLength(2);
      expect(block.columnCount).toBe(2);
    });

    it('should create social block with default values', () => {
      const block = createDefaultBlock('social');
      expect(block.type).toBe('social');
      expect(block.networks).toHaveLength(3);
      expect(block.iconSize).toBe('32px');
    });

    it('should create video block with default values', () => {
      const block = createDefaultBlock('video');
      expect(block.type).toBe('video');
      expect(block.thumbnailUrl).toBe('');
      expect(block.videoUrl).toBe('');
    });

    it('should create html block with default values', () => {
      const block = createDefaultBlock('html');
      expect(block.type).toBe('html');
      expect(block.content).toBe('<!-- Custom HTML -->');
    });
  });

  describe('Template Management', () => {
    it('should have initial template state', () => {
      const state = useEmailBuilderStore.getState();
      expect(state.template.name).toBe('Untitled Template');
      expect(state.template.blocks).toHaveLength(0);
      expect(state.template.globalStyles.backgroundColor).toBe('#f3f4f6');
    });

    it('should set template', () => {
      const newTemplate = {
        id: 'test-id',
        name: 'Test Template',
        subject: 'Test Subject',
        previewText: 'Preview',
        blocks: [],
        globalStyles: {
          backgroundColor: '#ffffff',
          contentWidth: '500px',
          fontFamily: 'Helvetica, sans-serif',
        },
      };

      useEmailBuilderStore.getState().setTemplate(newTemplate);
      const state = useEmailBuilderStore.getState();
      expect(state.template.name).toBe('Test Template');
      expect(state.template.globalStyles.backgroundColor).toBe('#ffffff');
    });

    it('should reset template to initial state', () => {
      const block = createDefaultBlock('text');
      useEmailBuilderStore.getState().addBlock(block);

      expect(useEmailBuilderStore.getState().template.blocks).toHaveLength(1);

      useEmailBuilderStore.getState().resetTemplate();
      expect(useEmailBuilderStore.getState().template.blocks).toHaveLength(0);
    });
  });

  describe('Block Operations', () => {
    it('should add block to the end', () => {
      const block = createDefaultBlock('text');
      useEmailBuilderStore.getState().addBlock(block);

      const state = useEmailBuilderStore.getState();
      expect(state.template.blocks).toHaveLength(1);
      expect(state.template.blocks[0].type).toBe('text');
      expect(state.selectedBlockId).toBe(block.id);
    });

    it('should add block at specific index', () => {
      const block1 = createDefaultBlock('text');
      const block2 = createDefaultBlock('button');
      const block3 = createDefaultBlock('image');

      useEmailBuilderStore.getState().addBlock(block1);
      useEmailBuilderStore.getState().addBlock(block2);
      useEmailBuilderStore.getState().addBlock(block3, 1);

      const state = useEmailBuilderStore.getState();
      expect(state.template.blocks).toHaveLength(3);
      expect(state.template.blocks[1].type).toBe('image');
    });

    it('should update block', () => {
      const block = createDefaultBlock('text');
      useEmailBuilderStore.getState().addBlock(block);
      useEmailBuilderStore.getState().updateBlock(block.id, { content: 'Updated content' });

      const state = useEmailBuilderStore.getState();
      expect((state.template.blocks[0] as any).content).toBe('Updated content');
    });

    it('should remove block', () => {
      const block1 = createDefaultBlock('text');
      const block2 = createDefaultBlock('button');

      useEmailBuilderStore.getState().addBlock(block1);
      useEmailBuilderStore.getState().addBlock(block2);
      useEmailBuilderStore.getState().removeBlock(block1.id);

      const state = useEmailBuilderStore.getState();
      expect(state.template.blocks).toHaveLength(1);
      expect(state.template.blocks[0].type).toBe('button');
    });

    it('should clear selection when removing selected block', () => {
      const block = createDefaultBlock('text');
      useEmailBuilderStore.getState().addBlock(block);

      expect(useEmailBuilderStore.getState().selectedBlockId).toBe(block.id);

      useEmailBuilderStore.getState().removeBlock(block.id);
      expect(useEmailBuilderStore.getState().selectedBlockId).toBeNull();
    });

    it('should move block', () => {
      const block1 = createDefaultBlock('text');
      const block2 = createDefaultBlock('button');
      const block3 = createDefaultBlock('image');

      useEmailBuilderStore.getState().addBlock(block1);
      useEmailBuilderStore.getState().addBlock(block2);
      useEmailBuilderStore.getState().addBlock(block3);

      useEmailBuilderStore.getState().moveBlock(0, 2);

      const state = useEmailBuilderStore.getState();
      expect(state.template.blocks[0].type).toBe('button');
      expect(state.template.blocks[1].type).toBe('image');
      expect(state.template.blocks[2].type).toBe('text');
    });

    it('should duplicate block', () => {
      const block = createDefaultBlock('text');
      useEmailBuilderStore.getState().addBlock(block);
      useEmailBuilderStore.getState().duplicateBlock(block.id);

      const state = useEmailBuilderStore.getState();
      expect(state.template.blocks).toHaveLength(2);
      expect(state.template.blocks[0].id).not.toBe(state.template.blocks[1].id);
      expect((state.template.blocks[0] as any).content).toBe((state.template.blocks[1] as any).content);
    });
  });

  describe('UI State', () => {
    it('should select block', () => {
      const block = createDefaultBlock('text');
      useEmailBuilderStore.getState().addBlock(block);
      useEmailBuilderStore.getState().selectBlock(null);

      expect(useEmailBuilderStore.getState().selectedBlockId).toBeNull();

      useEmailBuilderStore.getState().selectBlock(block.id);
      expect(useEmailBuilderStore.getState().selectedBlockId).toBe(block.id);
    });

    it('should set dragged block type', () => {
      useEmailBuilderStore.getState().setDraggedBlockType('button');
      expect(useEmailBuilderStore.getState().draggedBlockType).toBe('button');

      useEmailBuilderStore.getState().setDraggedBlockType(null);
      expect(useEmailBuilderStore.getState().draggedBlockType).toBeNull();
    });

    it('should set dragging state', () => {
      useEmailBuilderStore.getState().setIsDragging(true);
      expect(useEmailBuilderStore.getState().isDragging).toBe(true);

      useEmailBuilderStore.getState().setIsDragging(false);
      expect(useEmailBuilderStore.getState().isDragging).toBe(false);
    });

    it('should set preview mode', () => {
      expect(useEmailBuilderStore.getState().previewMode).toBe('desktop');

      useEmailBuilderStore.getState().setPreviewMode('mobile');
      expect(useEmailBuilderStore.getState().previewMode).toBe('mobile');
    });
  });

  describe('Global Styles', () => {
    it('should update global styles', () => {
      useEmailBuilderStore.getState().updateGlobalStyles({
        backgroundColor: '#000000',
        contentWidth: '800px',
      });

      const state = useEmailBuilderStore.getState();
      expect(state.template.globalStyles.backgroundColor).toBe('#000000');
      expect(state.template.globalStyles.contentWidth).toBe('800px');
      expect(state.template.globalStyles.fontFamily).toBe('Arial, sans-serif');
    });
  });

  describe('HTML Generation', () => {
    it('should generate basic HTML structure', () => {
      const html = useEmailBuilderStore.getState().generateHtml();

      expect(html).toContain('<!DOCTYPE html>');
      expect(html).toContain('<html>');
      expect(html).toContain('<head>');
      expect(html).toContain('<body');
      expect(html).toContain('</html>');
    });

    it('should include global styles in HTML', () => {
      useEmailBuilderStore.getState().updateGlobalStyles({
        backgroundColor: '#ff0000',
        fontFamily: 'Georgia, serif',
      });

      const html = useEmailBuilderStore.getState().generateHtml();

      expect(html).toContain('background-color: #ff0000');
      expect(html).toContain('font-family: Georgia, serif');
    });

    it('should render text block in HTML', () => {
      const block = createDefaultBlock('text');
      useEmailBuilderStore.getState().addBlock(block);
      useEmailBuilderStore.getState().updateBlock(block.id, { content: '<p>Test content</p>' });

      const html = useEmailBuilderStore.getState().generateHtml();
      expect(html).toContain('<p>Test content</p>');
    });

    it('should render heading block in HTML', () => {
      const block = createDefaultBlock('heading');
      useEmailBuilderStore.getState().addBlock(block);
      useEmailBuilderStore.getState().updateBlock(block.id, { content: 'My Heading', level: 1 });

      const html = useEmailBuilderStore.getState().generateHtml();
      expect(html).toContain('<h1');
      expect(html).toContain('My Heading');
    });

    it('should render button block in HTML', () => {
      const block = createDefaultBlock('button');
      useEmailBuilderStore.getState().addBlock(block);
      useEmailBuilderStore.getState().updateBlock(block.id, {
        text: 'Click Me',
        link: 'https://example.com',
        buttonColor: '#ff0000'
      });

      const html = useEmailBuilderStore.getState().generateHtml();
      expect(html).toContain('Click Me');
      expect(html).toContain('https://example.com');
      expect(html).toContain('#ff0000');
    });

    it('should render image block in HTML', () => {
      const block = createDefaultBlock('image');
      useEmailBuilderStore.getState().addBlock(block);
      useEmailBuilderStore.getState().updateBlock(block.id, {
        src: 'https://example.com/image.jpg',
        alt: 'Test Image'
      });

      const html = useEmailBuilderStore.getState().generateHtml();
      expect(html).toContain('src="https://example.com/image.jpg"');
      expect(html).toContain('alt="Test Image"');
    });

    it('should render divider block in HTML', () => {
      const block = createDefaultBlock('divider');
      useEmailBuilderStore.getState().addBlock(block);

      const html = useEmailBuilderStore.getState().generateHtml();
      expect(html).toContain('<hr');
    });

    it('should render spacer block in HTML', () => {
      const block = createDefaultBlock('spacer');
      useEmailBuilderStore.getState().addBlock(block);
      useEmailBuilderStore.getState().updateBlock(block.id, { height: '50px' });

      const html = useEmailBuilderStore.getState().generateHtml();
      expect(html).toContain('height: 50px');
    });

    it('should render html block content directly', () => {
      const block = createDefaultBlock('html');
      useEmailBuilderStore.getState().addBlock(block);
      useEmailBuilderStore.getState().updateBlock(block.id, {
        content: '<custom-element>Custom HTML</custom-element>'
      });

      const html = useEmailBuilderStore.getState().generateHtml();
      expect(html).toContain('<custom-element>Custom HTML</custom-element>');
    });
  });
});
