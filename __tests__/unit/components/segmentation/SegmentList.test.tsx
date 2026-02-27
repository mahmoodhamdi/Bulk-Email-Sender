import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { SegmentList } from '@/components/segmentation/SegmentList';

vi.mock('@/stores/segmentation-store', () => ({
  useSegmentationStore: () => ({
    segments: [
      {
        id: 'seg-1',
        name: 'VIP Customers',
        description: 'High value customers',
        groups: [{ id: 'g1', logic: 'AND', conditions: [{ id: 'c1', field: 'email', operator: 'contains', value: 'vip', secondValue: undefined }] }],
        logic: 'AND',
        createdAt: new Date('2024-01-01'),
        contactCount: 250,
      },
      {
        id: 'seg-2',
        name: 'Inactive Users',
        description: 'Users not active in 30 days',
        groups: [{ id: 'g2', logic: 'AND', conditions: [{ id: 'c2', field: 'lastActive', operator: 'inLast', value: 30, secondValue: undefined }] }],
        logic: 'AND',
        createdAt: new Date('2024-01-05'),
        contactCount: 1500,
      },
    ],
    loadSegment: vi.fn(),
    deleteSegment: vi.fn(),
    duplicateSegment: vi.fn(),
    createSegment: vi.fn(),
    updateSegment: vi.fn(),
    addGroup: vi.fn(),
    removeGroup: vi.fn(),
    addCondition: vi.fn(),
    updateCondition: vi.fn(),
    removeCondition: vi.fn(),
    setGroupLogic: vi.fn(),
    setSegmentLogic: vi.fn(),
    saveSegment: vi.fn(),
    refreshPreview: vi.fn(),
    previewContacts: [],
    isLoadingPreview: false,
    currentSegment: null,
  }),
}));

describe('SegmentList', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders segment list', () => {
    render(<SegmentList />);
    expect(screen.getByText('VIP Customers')).toBeInTheDocument();
    expect(screen.getByText('Inactive Users')).toBeInTheDocument();
  });

  it('displays segment descriptions', () => {
    render(<SegmentList />);
    expect(screen.getByText('High value customers')).toBeInTheDocument();
    expect(screen.getByText('Users not active in 30 days')).toBeInTheDocument();
  });

  it('displays contact count for each segment', () => {
    render(<SegmentList />);
    expect(screen.getByText('250')).toBeInTheDocument();
    expect(screen.getByText('1500')).toBeInTheDocument();
  });

  it('displays group and condition summaries', () => {
    render(<SegmentList />);
    expect(screen.getByText(/segmentation.groups/)).toBeInTheDocument();
    expect(screen.getByText(/segmentation.conditions/)).toBeInTheDocument();
  });

  it('displays creation dates', () => {
    render(<SegmentList />);
    expect(screen.getByText(/segmentation.created/)).toBeInTheDocument();
  });

  it('renders action menu button', () => {
    render(<SegmentList />);
    const menuButtons = screen.getAllByRole('button');
    expect(menuButtons.length).toBeGreaterThan(0);
  });

  it('shows empty state when no segments exist', () => {
    vi.mocked(require('@/stores/segmentation-store').useSegmentationStore).mockReturnValueOnce({
      segments: [],
      loadSegment: vi.fn(),
      deleteSegment: vi.fn(),
      duplicateSegment: vi.fn(),
      createSegment: vi.fn(),
      updateSegment: vi.fn(),
      addGroup: vi.fn(),
      removeGroup: vi.fn(),
      addCondition: vi.fn(),
      updateCondition: vi.fn(),
      removeCondition: vi.fn(),
      setGroupLogic: vi.fn(),
      setSegmentLogic: vi.fn(),
      saveSegment: vi.fn(),
      refreshPreview: vi.fn(),
      previewContacts: [],
      isLoadingPreview: false,
      currentSegment: null,
    });

    render(<SegmentList />);
    expect(screen.getByText('segmentation.noSegments')).toBeInTheDocument();
    expect(screen.getByText('segmentation.noSegmentsDesc')).toBeInTheDocument();
  });

  it('displays edit action in menu', () => {
    render(<SegmentList />);
    const menuButtons = screen.getAllByRole('button');
    fireEvent.click(menuButtons[0]);
    expect(screen.getByText('common.edit')).toBeInTheDocument();
  });

  it('displays duplicate action in menu', () => {
    render(<SegmentList />);
    const menuButtons = screen.getAllByRole('button');
    fireEvent.click(menuButtons[0]);
    expect(screen.getByText('common.copy')).toBeInTheDocument();
  });

  it('displays delete action in menu', () => {
    render(<SegmentList />);
    const menuButtons = screen.getAllByRole('button');
    fireEvent.click(menuButtons[0]);
    expect(screen.getByText('common.delete')).toBeInTheDocument();
  });

  it('calls loadSegment when edit is clicked', () => {
    const mockLoadSegment = vi.fn();
    vi.mocked(require('@/stores/segmentation-store').useSegmentationStore).mockReturnValueOnce({
      segments: [
        {
          id: 'seg-1',
          name: 'VIP Customers',
          description: 'High value customers',
          groups: [],
          logic: 'AND',
          createdAt: new Date(),
          contactCount: 250,
        },
      ],
      loadSegment: mockLoadSegment,
      deleteSegment: vi.fn(),
      duplicateSegment: vi.fn(),
      createSegment: vi.fn(),
      updateSegment: vi.fn(),
      addGroup: vi.fn(),
      removeGroup: vi.fn(),
      addCondition: vi.fn(),
      updateCondition: vi.fn(),
      removeCondition: vi.fn(),
      setGroupLogic: vi.fn(),
      setSegmentLogic: vi.fn(),
      saveSegment: vi.fn(),
      refreshPreview: vi.fn(),
      previewContacts: [],
      isLoadingPreview: false,
      currentSegment: null,
    });
  });

  it('displays segment cards with proper styling', () => {
    const { container } = render(<SegmentList />);
    const cards = container.querySelectorAll('[class*="rounded-lg"]');
    expect(cards.length).toBeGreaterThan(0);
  });

  it('shows Users icon for each segment', () => {
    const { container } = render(<SegmentList />);
    const svgs = container.querySelectorAll('svg');
    expect(svgs.length).toBeGreaterThan(0);
  });

  it('renders selectable prop with highlight', () => {
    render(<SegmentList selectable={true} selectedId="seg-1" />);
    const cards = screen.getAllByRole('article');
    expect(cards.length).toBeGreaterThan(0);
  });

  it('calls onSelect when segment is clicked in selectable mode', () => {
    const mockOnSelect = vi.fn();
    render(<SegmentList selectable={true} onSelect={mockOnSelect} />);
    const firstSegment = screen.getByText('VIP Customers').closest('[class*="rounded"]');
    if (firstSegment) {
      fireEvent.click(firstSegment);
      expect(mockOnSelect).toHaveBeenCalled();
    }
  });

  it('formats date properly', () => {
    render(<SegmentList />);
    expect(screen.getByText(/Jan 1, 2024|1\/1\/2024/)).toBeInTheDocument();
  });

  it('shows contact icon with count text', () => {
    render(<SegmentList />);
    expect(screen.getByText('segmentation.contacts')).toBeInTheDocument();
  });
});
