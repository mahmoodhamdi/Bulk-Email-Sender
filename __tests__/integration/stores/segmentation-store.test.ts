import { describe, it, expect, beforeEach } from 'vitest';
import {
  useSegmentationStore,
  createDefaultSegment,
  createDefaultGroup,
  createDefaultCondition,
  fieldMetadata,
  generateId,
  type Segment,
} from '@/stores/segmentation-store';

describe('Segmentation Store Integration', () => {
  beforeEach(() => {
    useSegmentationStore.setState({
      currentSegment: null,
      segments: [],
      previewContacts: [],
      isLoadingPreview: false,
    });
  });

  describe('Full Segment Lifecycle', () => {
    it('should handle complete segment CRUD workflow', () => {
      // Create a new segment
      useSegmentationStore.getState().createSegment();
      expect(useSegmentationStore.getState().currentSegment).not.toBeNull();

      // Update segment details
      useSegmentationStore.getState().updateSegment({
        name: 'High Value Customers',
        description: 'Customers with high open rates and engagement',
      });

      // Add multiple groups with conditions
      const segment = useSegmentationStore.getState().currentSegment!;
      const firstGroupId = segment.groups[0].id;

      // Update first condition
      useSegmentationStore.getState().updateCondition(
        firstGroupId,
        segment.groups[0].conditions[0].id,
        { field: 'openRate', operator: 'greaterThan', value: 50 }
      );

      // Add second condition to first group
      useSegmentationStore.getState().addCondition(firstGroupId);
      const updatedSegment = useSegmentationStore.getState().currentSegment!;
      const secondConditionId = updatedSegment.groups[0].conditions[1].id;
      useSegmentationStore.getState().updateCondition(
        firstGroupId,
        secondConditionId,
        { field: 'clickRate', operator: 'greaterThan', value: 25 }
      );

      // Add a second group
      useSegmentationStore.getState().addGroup();
      const withSecondGroup = useSegmentationStore.getState().currentSegment!;
      const secondGroupId = withSecondGroup.groups[1].id;
      useSegmentationStore.getState().updateGroup(secondGroupId, { logic: 'OR' });

      // Add conditions to second group
      useSegmentationStore.getState().updateCondition(
        secondGroupId,
        withSecondGroup.groups[1].conditions[0].id,
        { field: 'tags', operator: 'includes', value: 'premium' }
      );

      // Set segment logic
      useSegmentationStore.getState().setSegmentLogic('OR');

      // Save the segment
      useSegmentationStore.getState().saveSegment();
      const finalSegment = useSegmentationStore.getState().currentSegment!;

      // Verify saved segment
      expect(useSegmentationStore.getState().segments).toHaveLength(1);
      const savedSegment = useSegmentationStore.getState().segments[0];
      expect(savedSegment.name).toBe('High Value Customers');
      expect(savedSegment.description).toBe('Customers with high open rates and engagement');
      expect(savedSegment.groups).toHaveLength(2);
      expect(savedSegment.logic).toBe('OR');

      // Duplicate segment
      useSegmentationStore.getState().duplicateSegment(finalSegment.id);
      expect(useSegmentationStore.getState().segments).toHaveLength(2);
      const duplicated = useSegmentationStore.getState().currentSegment!;
      expect(duplicated.name).toBe('High Value Customers (Copy)');
      expect(duplicated.id).not.toBe(finalSegment.id);

      // Delete original segment
      useSegmentationStore.getState().deleteSegment(finalSegment.id);
      expect(useSegmentationStore.getState().segments).toHaveLength(1);
    });

    it('should handle segment editing workflow', () => {
      // Create and save initial segment
      useSegmentationStore.getState().createSegment();
      useSegmentationStore.getState().updateSegment({ name: 'Initial Name' });
      useSegmentationStore.getState().saveSegment();
      const segmentId = useSegmentationStore.getState().currentSegment!.id;

      // Reset and reload
      useSegmentationStore.getState().resetCurrentSegment();
      expect(useSegmentationStore.getState().currentSegment).toBeNull();

      // Load and edit
      useSegmentationStore.getState().loadSegment(segmentId);
      expect(useSegmentationStore.getState().currentSegment?.name).toBe('Initial Name');

      // Modify segment
      useSegmentationStore.getState().updateSegment({ name: 'Updated Name' });
      useSegmentationStore.getState().saveSegment();

      // Verify changes persisted
      const savedSegments = useSegmentationStore.getState().segments;
      expect(savedSegments[0].name).toBe('Updated Name');
    });
  });

  describe('Complex Condition Scenarios', () => {
    beforeEach(() => {
      useSegmentationStore.getState().createSegment();
    });

    it('should handle all field types and operators', () => {
      const segment = useSegmentationStore.getState().currentSegment!;
      const groupId = segment.groups[0].id;
      const conditionId = segment.groups[0].conditions[0].id;

      // Test string field
      useSegmentationStore.getState().updateCondition(groupId, conditionId, {
        field: 'email',
        operator: 'contains',
        value: '@example.com',
      });
      expect(useSegmentationStore.getState().currentSegment!.groups[0].conditions[0].field).toBe('email');

      // Test number field
      useSegmentationStore.getState().updateCondition(groupId, conditionId, {
        field: 'totalEmailsSent',
        operator: 'between',
        value: 10,
        secondValue: 100,
      });
      const numberCondition = useSegmentationStore.getState().currentSegment!.groups[0].conditions[0];
      expect(numberCondition.secondValue).toBe(100);

      // Test date field
      useSegmentationStore.getState().updateCondition(groupId, conditionId, {
        field: 'lastEmailOpened',
        operator: 'inLast',
        value: '30',
      });
      expect(useSegmentationStore.getState().currentSegment!.groups[0].conditions[0].operator).toBe('inLast');

      // Test percentage field
      useSegmentationStore.getState().updateCondition(groupId, conditionId, {
        field: 'openRate',
        operator: 'lessThan',
        value: 20,
      });
      expect(fieldMetadata.openRate.type).toBe('percentage');

      // Test array field
      useSegmentationStore.getState().updateCondition(groupId, conditionId, {
        field: 'tags',
        operator: 'isEmpty',
        value: '',
      });
      expect(fieldMetadata.tags.type).toBe('array');
    });

    it('should handle nested group operations', () => {
      // Add 3 groups
      useSegmentationStore.getState().addGroup();
      useSegmentationStore.getState().addGroup();
      expect(useSegmentationStore.getState().currentSegment!.groups).toHaveLength(3);

      const groups = useSegmentationStore.getState().currentSegment!.groups;

      // Set different logic for each group
      useSegmentationStore.getState().setGroupLogic(groups[0].id, 'AND');
      useSegmentationStore.getState().setGroupLogic(groups[1].id, 'OR');
      useSegmentationStore.getState().setGroupLogic(groups[2].id, 'AND');

      // Add multiple conditions to each group
      for (const group of groups) {
        useSegmentationStore.getState().addCondition(group.id);
        useSegmentationStore.getState().addCondition(group.id);
      }

      const finalSegment = useSegmentationStore.getState().currentSegment!;
      expect(finalSegment.groups[0].conditions).toHaveLength(3);
      expect(finalSegment.groups[1].conditions).toHaveLength(3);
      expect(finalSegment.groups[2].conditions).toHaveLength(3);

      // Remove middle group
      useSegmentationStore.getState().removeGroup(groups[1].id);
      expect(useSegmentationStore.getState().currentSegment!.groups).toHaveLength(2);
    });

    it('should handle condition updates without affecting other conditions', () => {
      const segment = useSegmentationStore.getState().currentSegment!;
      const groupId = segment.groups[0].id;

      // Add multiple conditions
      useSegmentationStore.getState().addCondition(groupId);
      useSegmentationStore.getState().addCondition(groupId);

      let conditions = useSegmentationStore.getState().currentSegment!.groups[0].conditions;

      // Update each condition differently
      useSegmentationStore.getState().updateCondition(groupId, conditions[0].id, {
        field: 'email',
        operator: 'equals',
        value: 'test@example.com',
      });
      useSegmentationStore.getState().updateCondition(groupId, conditions[1].id, {
        field: 'firstName',
        operator: 'startsWith',
        value: 'John',
      });
      useSegmentationStore.getState().updateCondition(groupId, conditions[2].id, {
        field: 'openRate',
        operator: 'greaterThan',
        value: 50,
      });

      // Verify each condition is correct
      conditions = useSegmentationStore.getState().currentSegment!.groups[0].conditions;
      expect(conditions[0].field).toBe('email');
      expect(conditions[1].field).toBe('firstName');
      expect(conditions[2].field).toBe('openRate');
      expect(conditions[0].value).toBe('test@example.com');
      expect(conditions[1].value).toBe('John');
      expect(conditions[2].value).toBe(50);
    });
  });

  describe('Preview Functionality', () => {
    beforeEach(() => {
      useSegmentationStore.getState().createSegment();
    });

    it('should manage preview contacts state', () => {
      const contacts = ['user1@example.com', 'user2@example.com', 'user3@example.com'];
      useSegmentationStore.getState().setPreviewContacts(contacts);

      expect(useSegmentationStore.getState().previewContacts).toEqual(contacts);
      expect(useSegmentationStore.getState().previewContacts).toHaveLength(3);
    });

    it('should refresh preview and set loading state', async () => {
      expect(useSegmentationStore.getState().isLoadingPreview).toBe(false);

      useSegmentationStore.getState().refreshPreview();
      expect(useSegmentationStore.getState().isLoadingPreview).toBe(true);

      // Wait for simulated API call
      await new Promise((resolve) => setTimeout(resolve, 600));

      expect(useSegmentationStore.getState().isLoadingPreview).toBe(false);
      expect(useSegmentationStore.getState().previewContacts.length).toBeGreaterThan(0);
    });
  });

  describe('State Persistence', () => {
    it('should maintain state consistency across operations', () => {
      // Create multiple segments
      for (let i = 0; i < 5; i++) {
        useSegmentationStore.getState().createSegment();
        useSegmentationStore.getState().updateSegment({ name: `Segment ${i + 1}` });
        useSegmentationStore.getState().saveSegment();
      }

      expect(useSegmentationStore.getState().segments).toHaveLength(5);

      // Delete some segments
      const segments = useSegmentationStore.getState().segments;
      useSegmentationStore.getState().deleteSegment(segments[1].id);
      useSegmentationStore.getState().deleteSegment(segments[3].id);

      expect(useSegmentationStore.getState().segments).toHaveLength(3);

      // Verify remaining segments
      const remaining = useSegmentationStore.getState().segments;
      expect(remaining.map((s) => s.name)).toEqual(['Segment 1', 'Segment 3', 'Segment 5']);
    });

    it('should handle duplicate segment naming correctly', () => {
      useSegmentationStore.getState().createSegment();
      useSegmentationStore.getState().updateSegment({ name: 'Original' });
      useSegmentationStore.getState().saveSegment();

      const originalId = useSegmentationStore.getState().currentSegment!.id;

      // Duplicate multiple times
      useSegmentationStore.getState().duplicateSegment(originalId);
      const firstCopyId = useSegmentationStore.getState().currentSegment!.id;
      expect(useSegmentationStore.getState().currentSegment!.name).toBe('Original (Copy)');

      useSegmentationStore.getState().saveSegment();
      useSegmentationStore.getState().duplicateSegment(firstCopyId);
      expect(useSegmentationStore.getState().currentSegment!.name).toBe('Original (Copy) (Copy)');

      expect(useSegmentationStore.getState().segments).toHaveLength(3);
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty segment gracefully', () => {
      useSegmentationStore.getState().createSegment();
      useSegmentationStore.getState().saveSegment();

      const segment = useSegmentationStore.getState().segments[0];
      expect(segment.name).toBe('New Segment');
      expect(segment.groups).toHaveLength(1);
      expect(segment.groups[0].conditions).toHaveLength(1);
    });

    it('should prevent removing last group', () => {
      useSegmentationStore.getState().createSegment();
      const groupId = useSegmentationStore.getState().currentSegment!.groups[0].id;

      // Attempt to remove last group
      useSegmentationStore.getState().removeGroup(groupId);
      expect(useSegmentationStore.getState().currentSegment!.groups).toHaveLength(1);
    });

    it('should prevent removing last condition in group', () => {
      useSegmentationStore.getState().createSegment();
      const segment = useSegmentationStore.getState().currentSegment!;
      const groupId = segment.groups[0].id;
      const conditionId = segment.groups[0].conditions[0].id;

      // Attempt to remove last condition
      useSegmentationStore.getState().removeCondition(groupId, conditionId);
      expect(useSegmentationStore.getState().currentSegment!.groups[0].conditions).toHaveLength(1);
    });

    it('should handle loading non-existent segment', () => {
      useSegmentationStore.getState().createSegment();
      useSegmentationStore.getState().saveSegment();
      const currentSegment = useSegmentationStore.getState().currentSegment;

      // Try to load non-existent segment
      useSegmentationStore.getState().loadSegment('non-existent-id');

      // Current segment should remain unchanged
      expect(useSegmentationStore.getState().currentSegment).toEqual(currentSegment);
    });

    it('should handle deleting non-existent segment', () => {
      useSegmentationStore.getState().createSegment();
      useSegmentationStore.getState().saveSegment();

      const initialCount = useSegmentationStore.getState().segments.length;

      // Try to delete non-existent segment
      useSegmentationStore.getState().deleteSegment('non-existent-id');

      // Segment count should remain unchanged
      expect(useSegmentationStore.getState().segments).toHaveLength(initialCount);
    });

    it('should handle updateSegment when no current segment', () => {
      // Ensure no current segment
      useSegmentationStore.getState().resetCurrentSegment();
      expect(useSegmentationStore.getState().currentSegment).toBeNull();

      // Attempt to update
      useSegmentationStore.getState().updateSegment({ name: 'Test' });

      // Should not throw, state should remain null
      expect(useSegmentationStore.getState().currentSegment).toBeNull();
    });

    it('should handle operations on groups when no current segment', () => {
      useSegmentationStore.getState().resetCurrentSegment();

      // These should not throw
      useSegmentationStore.getState().addGroup();
      useSegmentationStore.getState().updateGroup('any-id', { logic: 'OR' });
      useSegmentationStore.getState().removeGroup('any-id');
      useSegmentationStore.getState().setGroupLogic('any-id', 'OR');
      useSegmentationStore.getState().addCondition('any-id');
      useSegmentationStore.getState().updateCondition('any-id', 'any-id', { value: 'test' });
      useSegmentationStore.getState().removeCondition('any-id', 'any-id');
      useSegmentationStore.getState().setSegmentLogic('OR');

      expect(useSegmentationStore.getState().currentSegment).toBeNull();
    });
  });

  describe('Field Metadata Validation', () => {
    it('should have correct operators for each field type', () => {
      // String fields should have string operators
      expect(fieldMetadata.email.operators).toContain('equals');
      expect(fieldMetadata.email.operators).toContain('contains');
      expect(fieldMetadata.firstName.operators).toContain('startsWith');

      // Number fields should have numeric operators
      expect(fieldMetadata.totalEmailsSent.operators).toContain('greaterThan');
      expect(fieldMetadata.totalEmailsSent.operators).toContain('lessThan');
      expect(fieldMetadata.totalEmailsSent.operators).toContain('between');

      // Date fields should have date operators
      expect(fieldMetadata.createdAt.operators).toContain('before');
      expect(fieldMetadata.createdAt.operators).toContain('after');
      expect(fieldMetadata.createdAt.operators).toContain('inLast');

      // Percentage fields should have comparison operators
      expect(fieldMetadata.openRate.operators).toContain('equals');
      expect(fieldMetadata.openRate.operators).toContain('greaterThan');

      // Array fields should have array operators
      expect(fieldMetadata.tags.operators).toContain('includes');
      expect(fieldMetadata.tags.operators).toContain('excludes');
      expect(fieldMetadata.tags.operators).toContain('isEmpty');
      expect(fieldMetadata.tags.operators).toContain('isNotEmpty');
    });

    it('should have labels for all fields', () => {
      Object.entries(fieldMetadata).forEach(([key, metadata]) => {
        expect(metadata.label).toBeDefined();
        expect(metadata.label.length).toBeGreaterThan(0);
        expect(metadata.type).toBeDefined();
        expect(metadata.operators.length).toBeGreaterThan(0);
      });
    });
  });

  describe('Helper Functions', () => {
    it('should generate unique IDs', () => {
      const ids = new Set<string>();
      for (let i = 0; i < 100; i++) {
        ids.add(generateId());
      }
      expect(ids.size).toBe(100);
    });

    it('should create default condition with correct structure', () => {
      const condition = createDefaultCondition();
      expect(condition.id).toBeDefined();
      expect(condition.field).toBe('email');
      expect(condition.operator).toBe('contains');
      expect(condition.value).toBe('');
    });

    it('should create default group with correct structure', () => {
      const group = createDefaultGroup();
      expect(group.id).toBeDefined();
      expect(group.logic).toBe('AND');
      expect(group.conditions).toHaveLength(1);
    });

    it('should create default segment with correct structure', () => {
      const segment = createDefaultSegment();
      expect(segment.id).toBeDefined();
      expect(segment.name).toBe('New Segment');
      expect(segment.description).toBe('');
      expect(segment.logic).toBe('AND');
      expect(segment.groups).toHaveLength(1);
      expect(segment.contactCount).toBe(0);
    });
  });
});
