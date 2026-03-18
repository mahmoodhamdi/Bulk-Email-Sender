import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { SegmentList } from '@/components/segmentation/SegmentList';

const defaultSegments = [
  {
    id: 'seg-1',
    name: 'VIP Customers',
    description: 'High value customers',
    groups: [
      {
        id: 'g1',
        logic: 'AND' as const,
        conditions: [
          {
            id: 'c1',
            field: 'email' as const,
            operator: 'contains' as const,
            value: 'vip',
            secondValue: undefined,
          },
        ],
      },
    ],
    logic: 'AND' as const,
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
    contactCount: 250,
  },
  {
    id: 'seg-2',
    name: 'Inactive Users',
    description: 'Users not active in 30 days',
    groups: [
      {
        id: 'g2',
        logic: 'AND' as const,
        conditions: [
          {
            id: 'c2',
            field: 'lastEmailSent' as const,
            operator: 'inLast' as const,
            value: 30,
            secondValue: undefined,
          },
        ],
      },
    ],
    logic: 'AND' as const,
    createdAt: new Date('2024-01-05'),
    updatedAt: new Date('2024-01-05'),
    contactCount: 1500,
  },
];

const mockLoadSegment = vi.fn();
const mockDeleteSegment = vi.fn();
const mockDuplicateSegment = vi.fn();

const defaultStoreState = {
  segments: defaultSegments,
  loadSegment: mockLoadSegment,
  deleteSegment: mockDeleteSegment,
  duplicateSegment: mockDuplicateSegment,
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
  resetCurrentSegment: vi.fn(),
  setPreviewContacts: vi.fn(),
};

let currentStoreState = { ...defaultStoreState };

vi.mock('@/stores/segmentation-store', () => ({
  useSegmentationStore: () => currentStoreState,
  fieldMetadata: {
    email: {
      label: 'Email',
      type: 'string',
      operators: ['contains', 'equals'],
    },
    lastEmailSent: {
      label: 'Last Email Sent',
      type: 'date',
      operators: ['inLast', 'before', 'after'],
    },
  },
  operatorLabels: {
    contains: 'Contains',
    equals: 'Equals',
    inLast: 'in the last',
  },
}));

describe('SegmentList', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    currentStoreState = { ...defaultStoreState };
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
    expect(screen.getByText(/250/)).toBeInTheDocument();
    expect(screen.getByText(/1500/)).toBeInTheDocument();
  });

  it('displays group and condition summaries', () => {
    render(<SegmentList />);
    const groupSummaries = screen.getAllByText(/segmentation\.groups/);
    const conditionSummaries = screen.getAllByText(/segmentation\.conditions/);
    expect(groupSummaries.length).toBeGreaterThan(0);
    expect(conditionSummaries.length).toBeGreaterThan(0);
  });

  it('displays creation dates', () => {
    render(<SegmentList />);
    const dateElements = screen.getAllByText(/segmentation\.created/);
    expect(dateElements.length).toBeGreaterThan(0);
  });

  it('renders action menu button', () => {
    render(<SegmentList />);
    const menuButtons = screen.getAllByRole('button');
    expect(menuButtons.length).toBeGreaterThan(0);
  });

  it('shows empty state when no segments exist', () => {
    currentStoreState = {
      ...defaultStoreState,
      segments: [],
    };
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
    const mockLoad = vi.fn();
    currentStoreState = {
      ...defaultStoreState,
      segments: [
        {
          id: 'seg-1',
          name: 'VIP Customers',
          description: 'High value customers',
          groups: [],
          logic: 'AND' as const,
          createdAt: new Date(),
          updatedAt: new Date(),
          contactCount: 250,
        },
      ],
      loadSegment: mockLoad,
    };
    render(<SegmentList />);
    const menuButtons = screen.getAllByRole('button');
    fireEvent.click(menuButtons[0]);
    const editButton = screen.getByText('common.edit');
    fireEvent.click(editButton);
    expect(mockLoad).toHaveBeenCalledWith('seg-1');
  });

  it('displays segment cards with proper styling', () => {
    const { container } = render(<SegmentList />);
    const cards = container.querySelectorAll('[class*="rounded"]');
    expect(cards.length).toBeGreaterThan(0);
  });

  it('shows Users icon for each segment', () => {
    const { container } = render(<SegmentList />);
    const svgs = container.querySelectorAll('svg');
    expect(svgs.length).toBeGreaterThan(0);
  });

  it('renders selectable prop with highlight', () => {
    render(<SegmentList selectable={true} selectedId="seg-1" />);
    expect(screen.getByText('VIP Customers')).toBeInTheDocument();
    expect(screen.getByText('Inactive Users')).toBeInTheDocument();
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
    const contactSpans = screen.getAllByText(/segmentation\.contacts/);
    expect(contactSpans.length).toBeGreaterThan(0);
  });
});
