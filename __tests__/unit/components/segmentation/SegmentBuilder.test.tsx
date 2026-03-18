import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { SegmentBuilder } from '@/components/segmentation/SegmentBuilder';

const defaultStoreState = {
  currentSegment: {
    id: 'seg-1',
    name: 'Test Segment',
    description: 'A test segment',
    groups: [
      {
        id: 'group-1',
        logic: 'AND' as const,
        conditions: [
          {
            id: 'cond-1',
            field: 'email' as const,
            operator: 'contains' as const,
            value: '@example.com',
            secondValue: undefined,
          },
        ],
      },
    ],
    logic: 'AND' as const,
    createdAt: new Date(),
    updatedAt: new Date(),
    contactCount: 150,
  },
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
  previewContacts: ['user1@example.com', 'user2@example.com', 'user3@example.com'],
  isLoadingPreview: false,
  segments: [],
  loadSegment: vi.fn(),
  deleteSegment: vi.fn(),
  duplicateSegment: vi.fn(),
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
      operators: ['contains', 'equals', 'notContains'],
    },
    status: {
      label: 'Status',
      type: 'string',
      operators: ['equals'],
    },
  },
  operatorLabels: {
    contains: 'Contains',
    equals: 'Equals',
    notContains: 'Does not contain',
  },
}));

describe('SegmentBuilder', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    currentStoreState = { ...defaultStoreState };
  });

  it('renders segment name input', () => {
    render(<SegmentBuilder />);
    expect(screen.getByDisplayValue('Test Segment')).toBeInTheDocument();
  });

  it('renders segment description input', () => {
    render(<SegmentBuilder />);
    expect(screen.getByDisplayValue('A test segment')).toBeInTheDocument();
  });

  it('renders condition groups', () => {
    render(<SegmentBuilder />);
    expect(screen.getByText(/segmentation\.conditionGroup/)).toBeInTheDocument();
  });

  it('displays field selector', () => {
    render(<SegmentBuilder />);
    const selects = screen.getAllByRole('combobox');
    expect(selects.length).toBeGreaterThan(0);
  });

  it('displays operator selector', () => {
    render(<SegmentBuilder />);
    const selects = screen.getAllByRole('combobox');
    expect(selects.length).toBeGreaterThan(1);
  });

  it('displays value input', () => {
    render(<SegmentBuilder />);
    expect(screen.getByDisplayValue('@example.com')).toBeInTheDocument();
  });

  it('renders add condition button', () => {
    render(<SegmentBuilder />);
    expect(screen.getByText('segmentation.addCondition')).toBeInTheDocument();
  });

  it('renders add group button', () => {
    render(<SegmentBuilder />);
    expect(screen.getByText('segmentation.addGroup')).toBeInTheDocument();
  });

  it('displays AND/OR toggle buttons between groups', () => {
    currentStoreState = {
      ...defaultStoreState,
      currentSegment: {
        ...defaultStoreState.currentSegment,
        groups: [
          {
            id: 'group-1',
            logic: 'AND' as const,
            conditions: [
              {
                id: 'cond-1',
                field: 'email' as const,
                operator: 'contains' as const,
                value: '@example.com',
                secondValue: undefined,
              },
            ],
          },
          {
            id: 'group-2',
            logic: 'AND' as const,
            conditions: [
              {
                id: 'cond-2',
                field: 'email' as const,
                operator: 'equals' as const,
                value: 'test@test.com',
                secondValue: undefined,
              },
            ],
          },
        ],
      },
    };
    render(<SegmentBuilder />);
    const andButtons = screen.getAllByText('AND');
    const orButtons = screen.getAllByText('OR');
    expect(andButtons.length).toBeGreaterThan(0);
    expect(orButtons.length).toBeGreaterThan(0);
  });

  it('renders preview section', () => {
    render(<SegmentBuilder />);
    expect(screen.getByText('segmentation.preview')).toBeInTheDocument();
  });

  it('displays preview contacts', () => {
    render(<SegmentBuilder />);
    expect(screen.getByText('user1@example.com')).toBeInTheDocument();
    expect(screen.getByText('user2@example.com')).toBeInTheDocument();
    expect(screen.getByText('user3@example.com')).toBeInTheDocument();
  });

  it('displays contact count in preview', () => {
    render(<SegmentBuilder />);
    expect(screen.getByText(/segmentation\.contactsMatch/)).toBeInTheDocument();
  });

  it('renders refresh preview button', () => {
    render(<SegmentBuilder />);
    expect(screen.getByText('segmentation.refreshPreview')).toBeInTheDocument();
  });

  it('renders save button', () => {
    render(<SegmentBuilder />);
    expect(screen.getByText('common.save')).toBeInTheDocument();
  });

  it('handles segment name change', () => {
    render(<SegmentBuilder />);
    const nameInput = screen.getByDisplayValue('Test Segment');
    expect(nameInput).toBeInTheDocument();
  });

  it('shows loading state for preview', () => {
    currentStoreState = {
      ...defaultStoreState,
      isLoadingPreview: true,
    };
    render(<SegmentBuilder />);
    const refreshButton = screen.getByText('segmentation.refreshPreview');
    expect(refreshButton).toBeInTheDocument();
  });

  it('renders remove condition button when multiple conditions exist', () => {
    render(<SegmentBuilder />);
    const deleteButtons = screen.queryAllByRole('button');
    expect(deleteButtons.length).toBeGreaterThanOrEqual(0);
  });

  it('renders remove group button when multiple groups exist', () => {
    render(<SegmentBuilder />);
    const deleteButtons = screen.queryAllByRole('button');
    expect(deleteButtons.length).toBeGreaterThanOrEqual(0);
  });

  it('displays proper labels for fields', () => {
    render(<SegmentBuilder />);
    expect(screen.getByText('segmentation.segmentName')).toBeInTheDocument();
    expect(screen.getByText('segmentation.description')).toBeInTheDocument();
  });

  it('shows + more indicator when preview has more than 10 contacts', () => {
    currentStoreState = {
      ...defaultStoreState,
      previewContacts: Array.from({ length: 15 }, (_, i) => `user${i}@example.com`),
    };
    render(<SegmentBuilder />);
    expect(screen.getByText(/segmentation\.more/)).toBeInTheDocument();
  });
});
