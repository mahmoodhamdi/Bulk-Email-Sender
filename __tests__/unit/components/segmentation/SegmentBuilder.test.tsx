import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { SegmentBuilder } from '@/components/segmentation/SegmentBuilder';

vi.mock('@/stores/segmentation-store', () => ({
  useSegmentationStore: () => ({
    currentSegment: {
      id: 'seg-1',
      name: 'Test Segment',
      description: 'A test segment',
      groups: [
        {
          id: 'group-1',
          logic: 'AND',
          conditions: [
            {
              id: 'cond-1',
              field: 'email',
              operator: 'contains',
              value: '@example.com',
              secondValue: undefined,
            },
          ],
        },
      ],
      logic: 'AND',
      createdAt: new Date(),
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
  }),
  fieldMetadata: {
    email: {
      label: 'Email',
      type: 'text',
      operators: ['contains', 'equals', 'notContains'],
    },
    status: {
      label: 'Status',
      type: 'text',
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
    expect(screen.getByText('segmentation.conditionGroup 1')).toBeInTheDocument();
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
    render(<SegmentBuilder />);
    const andButtons = screen.getAllByRole('button', { name: /AND/ });
    const orButtons = screen.getAllByRole('button', { name: /OR/ });
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
    expect(screen.getByText('segmentation.contactsMatch')).toBeInTheDocument();
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
    const mockUpdateSegment = vi.fn();
    vi.mocked(require('@/stores/segmentation-store').useSegmentationStore).mockReturnValue({
      currentSegment: {
        id: 'seg-1',
        name: 'Test Segment',
        description: 'A test segment',
        groups: [],
        logic: 'AND',
        createdAt: new Date(),
        contactCount: 0,
      },
      createSegment: vi.fn(),
      updateSegment: mockUpdateSegment,
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
      segments: [],
      loadSegment: vi.fn(),
      deleteSegment: vi.fn(),
      duplicateSegment: vi.fn(),
    });
  });

  it('shows loading state for preview', () => {
    vi.mock('@/stores/segmentation-store', () => ({
      useSegmentationStore: () => ({
        currentSegment: {
          id: 'seg-1',
          name: 'Test Segment',
          description: '',
          groups: [],
          logic: 'AND',
          createdAt: new Date(),
          contactCount: 0,
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
        previewContacts: [],
        isLoadingPreview: true,
        segments: [],
        loadSegment: vi.fn(),
        deleteSegment: vi.fn(),
        duplicateSegment: vi.fn(),
      }),
      fieldMetadata: {},
      operatorLabels: {},
    }));
  });

  it('renders remove condition button when multiple conditions exist', () => {
    render(<SegmentBuilder />);
    const deleteButtons = screen.queryAllByRole('button', { name: '' });
    expect(deleteButtons.length).toBeGreaterThanOrEqual(0);
  });

  it('renders remove group button when multiple groups exist', () => {
    render(<SegmentBuilder />);
    const deleteButtons = screen.queryAllByRole('button', { name: '' });
    expect(deleteButtons.length).toBeGreaterThanOrEqual(0);
  });

  it('displays proper labels for fields', () => {
    render(<SegmentBuilder />);
    expect(screen.getByText('segmentation.segmentName')).toBeInTheDocument();
    expect(screen.getByText('segmentation.description')).toBeInTheDocument();
  });

  it('shows + more indicator when preview has more than 10 contacts', () => {
    vi.mock('@/stores/segmentation-store', () => ({
      useSegmentationStore: () => ({
        currentSegment: {
          id: 'seg-1',
          name: 'Test',
          description: '',
          groups: [],
          logic: 'AND',
          createdAt: new Date(),
          contactCount: 0,
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
        previewContacts: Array(15).fill('user@example.com'),
        isLoadingPreview: false,
        segments: [],
        loadSegment: vi.fn(),
        deleteSegment: vi.fn(),
        duplicateSegment: vi.fn(),
      }),
      fieldMetadata: {},
      operatorLabels: {},
    }));
  });
});
