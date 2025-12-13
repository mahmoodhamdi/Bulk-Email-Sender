import { describe, it, expect, beforeEach } from 'vitest';
import {
  useSegmentationStore,
  generateId,
  createDefaultCondition,
  createDefaultGroup,
  createDefaultSegment,
  fieldMetadata,
  operatorLabels,
} from '@/stores/segmentation-store';

describe('Segmentation Store', () => {
  beforeEach(() => {
    useSegmentationStore.getState().resetCurrentSegment();
    useSegmentationStore.setState({ segments: [] });
  });

  describe('generateId', () => {
    it('should generate unique ids', () => {
      const id1 = generateId();
      const id2 = generateId();
      expect(id1).not.toBe(id2);
    });

    it('should generate ids of expected length', () => {
      const id = generateId();
      expect(id.length).toBe(7);
    });
  });

  describe('createDefaultCondition', () => {
    it('should create condition with default values', () => {
      const condition = createDefaultCondition();
      expect(condition.field).toBe('email');
      expect(condition.operator).toBe('contains');
      expect(condition.value).toBe('');
      expect(condition.id).toBeTruthy();
    });
  });

  describe('createDefaultGroup', () => {
    it('should create group with default values', () => {
      const group = createDefaultGroup();
      expect(group.logic).toBe('AND');
      expect(group.conditions).toHaveLength(1);
      expect(group.id).toBeTruthy();
    });
  });

  describe('createDefaultSegment', () => {
    it('should create segment with default values', () => {
      const segment = createDefaultSegment();
      expect(segment.name).toBe('New Segment');
      expect(segment.description).toBe('');
      expect(segment.logic).toBe('AND');
      expect(segment.groups).toHaveLength(1);
      expect(segment.contactCount).toBe(0);
      expect(segment.id).toBeTruthy();
    });
  });

  describe('fieldMetadata', () => {
    it('should have metadata for all fields', () => {
      expect(Object.keys(fieldMetadata).length).toBeGreaterThan(0);
      expect(fieldMetadata.email).toBeDefined();
      expect(fieldMetadata.email.label).toBe('Email');
      expect(fieldMetadata.email.type).toBe('string');
      expect(fieldMetadata.email.operators.length).toBeGreaterThan(0);
    });

    it('should have operators for date fields', () => {
      expect(fieldMetadata.createdAt.type).toBe('date');
      expect(fieldMetadata.createdAt.operators).toContain('before');
      expect(fieldMetadata.createdAt.operators).toContain('after');
      expect(fieldMetadata.createdAt.operators).toContain('inLast');
    });

    it('should have operators for percentage fields', () => {
      expect(fieldMetadata.openRate.type).toBe('percentage');
      expect(fieldMetadata.openRate.operators).toContain('greaterThan');
      expect(fieldMetadata.openRate.operators).toContain('lessThan');
    });
  });

  describe('operatorLabels', () => {
    it('should have labels for all operators', () => {
      expect(operatorLabels.equals).toBe('equals');
      expect(operatorLabels.contains).toBe('contains');
      expect(operatorLabels.greaterThan).toBe('is greater than');
      expect(operatorLabels.inLast).toBe('in the last');
    });
  });

  describe('Segment Creation', () => {
    it('should create new segment', () => {
      useSegmentationStore.getState().createSegment();
      const { currentSegment } = useSegmentationStore.getState();

      expect(currentSegment).not.toBeNull();
      expect(currentSegment?.name).toBe('New Segment');
      expect(currentSegment?.groups).toHaveLength(1);
    });

    it('should update segment', () => {
      useSegmentationStore.getState().createSegment();
      useSegmentationStore.getState().updateSegment({ name: 'My Custom Segment' });

      const { currentSegment } = useSegmentationStore.getState();
      expect(currentSegment?.name).toBe('My Custom Segment');
    });

    it('should reset current segment', () => {
      useSegmentationStore.getState().createSegment();
      expect(useSegmentationStore.getState().currentSegment).not.toBeNull();

      useSegmentationStore.getState().resetCurrentSegment();
      expect(useSegmentationStore.getState().currentSegment).toBeNull();
    });
  });

  describe('Group Management', () => {
    beforeEach(() => {
      useSegmentationStore.getState().createSegment();
    });

    it('should add group', () => {
      useSegmentationStore.getState().addGroup();
      const { currentSegment } = useSegmentationStore.getState();

      expect(currentSegment?.groups).toHaveLength(2);
    });

    it('should update group', () => {
      const { currentSegment } = useSegmentationStore.getState();
      const groupId = currentSegment!.groups[0].id;

      useSegmentationStore.getState().updateGroup(groupId, { logic: 'OR' });

      const updated = useSegmentationStore.getState().currentSegment;
      expect(updated?.groups[0].logic).toBe('OR');
    });

    it('should remove group', () => {
      useSegmentationStore.getState().addGroup();
      const { currentSegment } = useSegmentationStore.getState();
      expect(currentSegment?.groups).toHaveLength(2);

      const groupToRemove = currentSegment!.groups[1].id;
      useSegmentationStore.getState().removeGroup(groupToRemove);

      expect(useSegmentationStore.getState().currentSegment?.groups).toHaveLength(1);
    });

    it('should not remove last group', () => {
      const { currentSegment } = useSegmentationStore.getState();
      expect(currentSegment?.groups).toHaveLength(1);

      const groupId = currentSegment!.groups[0].id;
      useSegmentationStore.getState().removeGroup(groupId);

      expect(useSegmentationStore.getState().currentSegment?.groups).toHaveLength(1);
    });

    it('should set group logic', () => {
      const { currentSegment } = useSegmentationStore.getState();
      const groupId = currentSegment!.groups[0].id;

      useSegmentationStore.getState().setGroupLogic(groupId, 'OR');
      expect(useSegmentationStore.getState().currentSegment?.groups[0].logic).toBe('OR');
    });
  });

  describe('Condition Management', () => {
    beforeEach(() => {
      useSegmentationStore.getState().createSegment();
    });

    it('should add condition to group', () => {
      const { currentSegment } = useSegmentationStore.getState();
      const groupId = currentSegment!.groups[0].id;

      useSegmentationStore.getState().addCondition(groupId);

      const updated = useSegmentationStore.getState().currentSegment;
      expect(updated?.groups[0].conditions).toHaveLength(2);
    });

    it('should update condition', () => {
      const { currentSegment } = useSegmentationStore.getState();
      const groupId = currentSegment!.groups[0].id;
      const conditionId = currentSegment!.groups[0].conditions[0].id;

      useSegmentationStore.getState().updateCondition(groupId, conditionId, {
        field: 'firstName',
        operator: 'equals',
        value: 'John',
      });

      const updated = useSegmentationStore.getState().currentSegment;
      expect(updated?.groups[0].conditions[0].field).toBe('firstName');
      expect(updated?.groups[0].conditions[0].operator).toBe('equals');
      expect(updated?.groups[0].conditions[0].value).toBe('John');
    });

    it('should remove condition from group', () => {
      const { currentSegment } = useSegmentationStore.getState();
      const groupId = currentSegment!.groups[0].id;

      useSegmentationStore.getState().addCondition(groupId);
      expect(useSegmentationStore.getState().currentSegment?.groups[0].conditions).toHaveLength(2);

      const conditionToRemove = useSegmentationStore.getState().currentSegment!.groups[0].conditions[1].id;
      useSegmentationStore.getState().removeCondition(groupId, conditionToRemove);

      expect(useSegmentationStore.getState().currentSegment?.groups[0].conditions).toHaveLength(1);
    });

    it('should not remove last condition in group', () => {
      const { currentSegment } = useSegmentationStore.getState();
      const groupId = currentSegment!.groups[0].id;
      const conditionId = currentSegment!.groups[0].conditions[0].id;

      useSegmentationStore.getState().removeCondition(groupId, conditionId);

      expect(useSegmentationStore.getState().currentSegment?.groups[0].conditions).toHaveLength(1);
    });
  });

  describe('Segment Logic', () => {
    beforeEach(() => {
      useSegmentationStore.getState().createSegment();
    });

    it('should set segment logic', () => {
      expect(useSegmentationStore.getState().currentSegment?.logic).toBe('AND');

      useSegmentationStore.getState().setSegmentLogic('OR');
      expect(useSegmentationStore.getState().currentSegment?.logic).toBe('OR');
    });
  });

  describe('Segment Persistence', () => {
    it('should save and load segment', () => {
      useSegmentationStore.getState().createSegment();
      useSegmentationStore.getState().updateSegment({ name: 'Saved Segment' });
      useSegmentationStore.getState().saveSegment();

      const segmentId = useSegmentationStore.getState().currentSegment!.id;

      // Reset current segment
      useSegmentationStore.getState().resetCurrentSegment();
      expect(useSegmentationStore.getState().currentSegment).toBeNull();

      // Load saved segment
      useSegmentationStore.getState().loadSegment(segmentId);
      expect(useSegmentationStore.getState().currentSegment?.name).toBe('Saved Segment');
    });

    it('should delete segment', () => {
      useSegmentationStore.getState().createSegment();
      useSegmentationStore.getState().saveSegment();
      const segmentId = useSegmentationStore.getState().currentSegment!.id;

      expect(useSegmentationStore.getState().segments).toHaveLength(1);

      useSegmentationStore.getState().deleteSegment(segmentId);
      expect(useSegmentationStore.getState().segments).toHaveLength(0);
    });

    it('should duplicate segment', () => {
      useSegmentationStore.getState().createSegment();
      useSegmentationStore.getState().updateSegment({ name: 'Original Segment' });
      useSegmentationStore.getState().saveSegment();

      const segmentId = useSegmentationStore.getState().currentSegment!.id;
      useSegmentationStore.getState().duplicateSegment(segmentId);

      expect(useSegmentationStore.getState().segments).toHaveLength(2);
      expect(useSegmentationStore.getState().currentSegment?.name).toBe('Original Segment (Copy)');
    });
  });

  describe('Preview', () => {
    beforeEach(() => {
      useSegmentationStore.getState().createSegment();
    });

    it('should set preview contacts', () => {
      const contacts = ['test1@example.com', 'test2@example.com'];
      useSegmentationStore.getState().setPreviewContacts(contacts);

      expect(useSegmentationStore.getState().previewContacts).toEqual(contacts);
    });

    it('should refresh preview', async () => {
      useSegmentationStore.getState().refreshPreview();
      expect(useSegmentationStore.getState().isLoadingPreview).toBe(true);

      // Wait for simulated API call
      await new Promise((resolve) => setTimeout(resolve, 600));

      expect(useSegmentationStore.getState().isLoadingPreview).toBe(false);
      expect(useSegmentationStore.getState().previewContacts.length).toBeGreaterThan(0);
    });
  });
});
