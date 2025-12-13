import { describe, it, expect, beforeEach } from 'vitest';
import {
  useABTestStore,
  generateId,
  createEmptyVariant,
  createEmptyTest,
} from '@/stores/ab-test-store';

describe('A/B Test Store', () => {
  beforeEach(() => {
    useABTestStore.getState().resetCurrentTest();
    // Clear all tests
    useABTestStore.setState({ tests: [] });
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

  describe('createEmptyVariant', () => {
    it('should create variant with default values', () => {
      const variant = createEmptyVariant('Test Variant');
      expect(variant.name).toBe('Test Variant');
      expect(variant.sent).toBe(0);
      expect(variant.opened).toBe(0);
      expect(variant.clicked).toBe(0);
      expect(variant.converted).toBe(0);
      expect(variant.id).toBeTruthy();
    });
  });

  describe('createEmptyTest', () => {
    it('should create test with default values', () => {
      const test = createEmptyTest('campaign-1');
      expect(test.campaignId).toBe('campaign-1');
      expect(test.name).toBe('A/B Test');
      expect(test.testType).toBe('subject');
      expect(test.variants).toHaveLength(2);
      expect(test.sampleSize).toBe(20);
      expect(test.winnerCriteria).toBe('openRate');
      expect(test.testDuration).toBe(4);
      expect(test.autoSelectWinner).toBe(true);
      expect(test.status).toBe('draft');
      expect(test.winnerId).toBeNull();
    });
  });

  describe('Test Creation', () => {
    it('should create new test', () => {
      useABTestStore.getState().createTest('campaign-123');
      const { currentTest } = useABTestStore.getState();

      expect(currentTest).not.toBeNull();
      expect(currentTest?.campaignId).toBe('campaign-123');
      expect(currentTest?.variants).toHaveLength(2);
    });

    it('should update test', () => {
      useABTestStore.getState().createTest('campaign-123');
      useABTestStore.getState().updateTest({ name: 'My Custom Test' });

      const { currentTest } = useABTestStore.getState();
      expect(currentTest?.name).toBe('My Custom Test');
    });

    it('should reset current test', () => {
      useABTestStore.getState().createTest('campaign-123');
      expect(useABTestStore.getState().currentTest).not.toBeNull();

      useABTestStore.getState().resetCurrentTest();
      expect(useABTestStore.getState().currentTest).toBeNull();
    });
  });

  describe('Variant Management', () => {
    beforeEach(() => {
      useABTestStore.getState().createTest('campaign-123');
    });

    it('should add variant', () => {
      useABTestStore.getState().addVariant({ name: 'Variant C' });
      const { currentTest } = useABTestStore.getState();

      expect(currentTest?.variants).toHaveLength(3);
      expect(currentTest?.variants[2].name).toBe('Variant C');
    });

    it('should update variant', () => {
      const { currentTest } = useABTestStore.getState();
      const variantId = currentTest!.variants[0].id;

      useABTestStore.getState().updateVariant(variantId, {
        subject: 'New Subject Line',
      });

      const updated = useABTestStore.getState().currentTest;
      expect(updated?.variants[0].subject).toBe('New Subject Line');
    });

    it('should remove variant', () => {
      useABTestStore.getState().addVariant({ name: 'Variant C' });
      const { currentTest } = useABTestStore.getState();
      expect(currentTest?.variants).toHaveLength(3);

      const variantToRemove = currentTest!.variants[2].id;
      useABTestStore.getState().removeVariant(variantToRemove);

      expect(useABTestStore.getState().currentTest?.variants).toHaveLength(2);
    });

    it('should not remove variant if only 2 remain', () => {
      const { currentTest } = useABTestStore.getState();
      expect(currentTest?.variants).toHaveLength(2);

      const variantId = currentTest!.variants[0].id;
      useABTestStore.getState().removeVariant(variantId);

      // Should still have 2 variants
      expect(useABTestStore.getState().currentTest?.variants).toHaveLength(2);
    });
  });

  describe('Test Settings', () => {
    beforeEach(() => {
      useABTestStore.getState().createTest('campaign-123');
    });

    it('should set winner criteria', () => {
      useABTestStore.getState().setWinnerCriteria('clickRate');
      expect(useABTestStore.getState().currentTest?.winnerCriteria).toBe('clickRate');
    });

    it('should set sample size within bounds', () => {
      useABTestStore.getState().setSampleSize(30);
      expect(useABTestStore.getState().currentTest?.sampleSize).toBe(30);

      useABTestStore.getState().setSampleSize(3);
      expect(useABTestStore.getState().currentTest?.sampleSize).toBe(5); // Min bound

      useABTestStore.getState().setSampleSize(150);
      expect(useABTestStore.getState().currentTest?.sampleSize).toBe(100); // Max bound
    });

    it('should set test duration within bounds', () => {
      useABTestStore.getState().setTestDuration(12);
      expect(useABTestStore.getState().currentTest?.testDuration).toBe(12);

      useABTestStore.getState().setTestDuration(0);
      expect(useABTestStore.getState().currentTest?.testDuration).toBe(1); // Min bound

      useABTestStore.getState().setTestDuration(200);
      expect(useABTestStore.getState().currentTest?.testDuration).toBe(168); // Max bound (1 week)
    });

    it('should toggle auto select winner', () => {
      expect(useABTestStore.getState().currentTest?.autoSelectWinner).toBe(true);

      useABTestStore.getState().setAutoSelectWinner(false);
      expect(useABTestStore.getState().currentTest?.autoSelectWinner).toBe(false);
    });
  });

  describe('Test Status', () => {
    beforeEach(() => {
      useABTestStore.getState().createTest('campaign-123');
    });

    it('should start test', () => {
      useABTestStore.getState().startTest();
      const { currentTest } = useABTestStore.getState();

      expect(currentTest?.status).toBe('running');
      expect(currentTest?.startedAt).not.toBeNull();
    });

    it('should cancel test', () => {
      useABTestStore.getState().startTest();
      useABTestStore.getState().cancelTest();

      expect(useABTestStore.getState().currentTest?.status).toBe('cancelled');
    });

    it('should select winner', () => {
      const { currentTest } = useABTestStore.getState();
      const winnerId = currentTest!.variants[0].id;

      useABTestStore.getState().selectWinner(winnerId);
      const updated = useABTestStore.getState().currentTest;

      expect(updated?.winnerId).toBe(winnerId);
      expect(updated?.status).toBe('completed');
      expect(updated?.completedAt).not.toBeNull();
    });
  });

  describe('Test Persistence', () => {
    it('should save and load test', () => {
      useABTestStore.getState().createTest('campaign-123');
      useABTestStore.getState().updateTest({ name: 'Saved Test' });
      useABTestStore.getState().saveTest();

      const testId = useABTestStore.getState().currentTest!.id;

      // Reset current test
      useABTestStore.getState().resetCurrentTest();
      expect(useABTestStore.getState().currentTest).toBeNull();

      // Load saved test
      useABTestStore.getState().loadTest(testId);
      expect(useABTestStore.getState().currentTest?.name).toBe('Saved Test');
    });

    it('should delete test', () => {
      useABTestStore.getState().createTest('campaign-123');
      useABTestStore.getState().saveTest();
      const testId = useABTestStore.getState().currentTest!.id;

      expect(useABTestStore.getState().tests).toHaveLength(1);

      useABTestStore.getState().deleteTest(testId);
      expect(useABTestStore.getState().tests).toHaveLength(0);
    });
  });

  describe('Analytics', () => {
    beforeEach(() => {
      useABTestStore.getState().createTest('campaign-123');
    });

    it('should calculate winner based on criteria', () => {
      const { currentTest } = useABTestStore.getState();
      const variantA = currentTest!.variants[0].id;
      const variantB = currentTest!.variants[1].id;

      // Update variant stats
      useABTestStore.getState().updateVariant(variantA, {
        sent: 100,
        opened: 30,
        clicked: 10,
        converted: 5,
      });
      useABTestStore.getState().updateVariant(variantB, {
        sent: 100,
        opened: 40, // Higher open rate
        clicked: 8,
        converted: 4,
      });

      const winner = useABTestStore.getState().calculateWinner();
      expect(winner?.id).toBe(variantB); // Higher open rate wins

      // Change criteria to click rate
      useABTestStore.getState().setWinnerCriteria('clickRate');
      const newWinner = useABTestStore.getState().calculateWinner();
      expect(newWinner?.id).toBe(variantA); // Higher click rate wins
    });

    it('should get variant stats', () => {
      const { currentTest } = useABTestStore.getState();
      const variantId = currentTest!.variants[0].id;

      useABTestStore.getState().updateVariant(variantId, {
        sent: 100,
        opened: 25,
        clicked: 10,
        converted: 5,
      });

      const stats = useABTestStore.getState().getVariantStats(variantId);
      expect(stats?.openRate).toBe(25);
      expect(stats?.clickRate).toBe(10);
      expect(stats?.conversionRate).toBe(5);
    });

    it('should return zero stats for no sends', () => {
      const { currentTest } = useABTestStore.getState();
      const variantId = currentTest!.variants[0].id;

      const stats = useABTestStore.getState().getVariantStats(variantId);
      expect(stats?.openRate).toBe(0);
      expect(stats?.clickRate).toBe(0);
      expect(stats?.conversionRate).toBe(0);
    });
  });
});
