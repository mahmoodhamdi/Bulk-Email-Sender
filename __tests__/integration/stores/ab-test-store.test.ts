import { describe, it, expect, beforeEach } from 'vitest';
import {
  useABTestStore,
  createEmptyVariant,
  createEmptyTest,
  generateId,
  type ABTest,
  type ABVariant,
} from '@/stores/ab-test-store';

describe('A/B Test Store Integration', () => {
  beforeEach(() => {
    useABTestStore.setState({ tests: [], currentTest: null });
  });

  describe('Full A/B Test Lifecycle', () => {
    it('should handle complete A/B test workflow', () => {
      // Create a new test
      useABTestStore.getState().createTest('campaign-123');
      let currentTest = useABTestStore.getState().currentTest;
      expect(currentTest).not.toBeNull();
      expect(currentTest!.campaignId).toBe('campaign-123');

      // Update test settings
      useABTestStore.getState().updateTest({
        name: 'Subject Line Test',
        testType: 'subject',
      });

      useABTestStore.getState().setSampleSize(25);
      useABTestStore.getState().setWinnerCriteria('openRate');
      useABTestStore.getState().setTestDuration(4);
      useABTestStore.getState().setAutoSelectWinner(true);

      // Add a third variant
      useABTestStore.getState().addVariant({ name: 'Variant C' });
      expect(useABTestStore.getState().currentTest!.variants).toHaveLength(3);

      // Update variants with subject content
      const variants = useABTestStore.getState().currentTest!.variants;
      useABTestStore.getState().updateVariant(variants[0].id, {
        name: 'Control - Original Subject',
        subject: 'Check out our latest deals!',
      });
      useABTestStore.getState().updateVariant(variants[1].id, {
        name: 'Variant A - Urgency',
        subject: 'Last chance! 24 hours left to save',
      });
      useABTestStore.getState().updateVariant(variants[2].id, {
        name: 'Variant B - Personalization',
        subject: '{{firstName}}, we have something special for you',
      });

      // Save the test
      useABTestStore.getState().saveTest();
      expect(useABTestStore.getState().tests).toHaveLength(1);

      const savedTest = useABTestStore.getState().tests[0];
      expect(savedTest.name).toBe('Subject Line Test');
      expect(savedTest.testType).toBe('subject');
      expect(savedTest.variants).toHaveLength(3);
      expect(savedTest.sampleSize).toBe(25);
    });

    it('should handle running and completing a test', () => {
      // Create and save test
      useABTestStore.getState().createTest('campaign-456');
      useABTestStore.getState().updateTest({ name: 'Content Test' });
      useABTestStore.getState().saveTest();

      // Start the test
      useABTestStore.getState().startTest();
      expect(useABTestStore.getState().currentTest!.status).toBe('running');
      expect(useABTestStore.getState().currentTest!.startedAt).not.toBeNull();

      // Simulate results coming in
      const variant0 = useABTestStore.getState().currentTest!.variants[0];
      const variant1 = useABTestStore.getState().currentTest!.variants[1];

      useABTestStore.getState().updateVariant(variant0.id, {
        sent: 1000,
        opened: 245,
        clicked: 98,
        converted: 24,
      });

      useABTestStore.getState().updateVariant(variant1.id, {
        sent: 1000,
        opened: 320,
        clicked: 150,
        converted: 38,
      });

      // Select winner
      useABTestStore.getState().selectWinner(variant1.id);
      const completedTest = useABTestStore.getState().currentTest!;
      expect(completedTest.status).toBe('completed');
      expect(completedTest.winnerId).toBe(variant1.id);
      expect(completedTest.completedAt).not.toBeNull();
    });

    it('should handle test cancellation', () => {
      useABTestStore.getState().createTest('campaign-789');
      useABTestStore.getState().saveTest();

      useABTestStore.getState().startTest();
      expect(useABTestStore.getState().currentTest!.status).toBe('running');

      useABTestStore.getState().cancelTest();
      expect(useABTestStore.getState().currentTest!.status).toBe('cancelled');
    });
  });

  describe('Variant Management', () => {
    beforeEach(() => {
      useABTestStore.getState().createTest('campaign-test');
    });

    it('should create empty variant with correct structure', () => {
      const variant = createEmptyVariant('Test Variant');
      expect(variant.id).toBeDefined();
      expect(variant.name).toBe('Test Variant');
      expect(variant.sent).toBe(0);
      expect(variant.opened).toBe(0);
      expect(variant.clicked).toBe(0);
      expect(variant.converted).toBe(0);
    });

    it('should handle multiple variant additions', () => {
      // Start with 2 default variants
      expect(useABTestStore.getState().currentTest!.variants).toHaveLength(2);

      // Add more variants
      for (let i = 0; i < 3; i++) {
        useABTestStore.getState().addVariant({ name: `Variant ${i + 3}` });
      }

      expect(useABTestStore.getState().currentTest!.variants).toHaveLength(5);
    });

    it('should remove variant correctly', () => {
      useABTestStore.getState().addVariant({ name: 'Extra Variant' });
      const variants = useABTestStore.getState().currentTest!.variants;
      expect(variants).toHaveLength(3);

      const variantToRemove = variants[2].id;
      useABTestStore.getState().removeVariant(variantToRemove);

      const remaining = useABTestStore.getState().currentTest!.variants;
      expect(remaining).toHaveLength(2);
      expect(remaining.find((v) => v.id === variantToRemove)).toBeUndefined();
    });

    it('should not remove variant if only 2 remain', () => {
      const variants = useABTestStore.getState().currentTest!.variants;
      expect(variants).toHaveLength(2);

      useABTestStore.getState().removeVariant(variants[0].id);
      expect(useABTestStore.getState().currentTest!.variants).toHaveLength(2);
    });

    it('should calculate variant stats correctly', () => {
      const variantId = useABTestStore.getState().currentTest!.variants[0].id;

      useABTestStore.getState().updateVariant(variantId, {
        sent: 1000,
        opened: 300,
        clicked: 150,
        converted: 30,
      });

      const stats = useABTestStore.getState().getVariantStats(variantId);
      expect(stats).not.toBeNull();
      // Open rate = 300/1000 * 100 = 30%
      expect(stats!.openRate).toBe(30);
      // Click rate = 150/1000 * 100 = 15%
      expect(stats!.clickRate).toBe(15);
      // Conversion rate = 30/1000 * 100 = 3%
      expect(stats!.conversionRate).toBe(3);
    });
  });

  describe('Test Types', () => {
    it('should support subject line testing', () => {
      useABTestStore.getState().createTest('campaign-1');
      useABTestStore.getState().updateTest({ testType: 'subject' });

      const variants = useABTestStore.getState().currentTest!.variants;
      useABTestStore.getState().updateVariant(variants[0].id, { subject: 'Subject A' });
      useABTestStore.getState().updateVariant(variants[1].id, { subject: 'Subject B' });

      expect(useABTestStore.getState().currentTest!.testType).toBe('subject');
    });

    it('should support content testing', () => {
      useABTestStore.getState().createTest('campaign-2');
      useABTestStore.getState().updateTest({ testType: 'content' });

      const variants = useABTestStore.getState().currentTest!.variants;
      useABTestStore.getState().updateVariant(variants[0].id, { content: '<h1>Template A</h1>' });
      useABTestStore.getState().updateVariant(variants[1].id, { content: '<h1>Template B</h1>' });

      expect(useABTestStore.getState().currentTest!.testType).toBe('content');
    });

    it('should support from name testing', () => {
      useABTestStore.getState().createTest('campaign-3');
      useABTestStore.getState().updateTest({ testType: 'fromName' });

      const variants = useABTestStore.getState().currentTest!.variants;
      useABTestStore.getState().updateVariant(variants[0].id, { fromName: 'Company Name' });
      useABTestStore.getState().updateVariant(variants[1].id, { fromName: 'John from Company' });

      expect(useABTestStore.getState().currentTest!.testType).toBe('fromName');
    });

    it('should support send time testing', () => {
      useABTestStore.getState().createTest('campaign-4');
      useABTestStore.getState().updateTest({ testType: 'sendTime' });

      const variants = useABTestStore.getState().currentTest!.variants;
      useABTestStore.getState().updateVariant(variants[0].id, { sendTime: new Date('2025-01-15T09:00:00') });
      useABTestStore.getState().updateVariant(variants[1].id, { sendTime: new Date('2025-01-15T14:00:00') });

      expect(useABTestStore.getState().currentTest!.testType).toBe('sendTime');
    });
  });

  describe('Winner Criteria', () => {
    it('should use open rate as winner criteria', () => {
      useABTestStore.getState().createTest('campaign-win');
      useABTestStore.getState().setWinnerCriteria('openRate');
      useABTestStore.getState().saveTest();

      expect(useABTestStore.getState().tests[0].winnerCriteria).toBe('openRate');
    });

    it('should use click rate as winner criteria', () => {
      useABTestStore.getState().createTest('campaign-win');
      useABTestStore.getState().setWinnerCriteria('clickRate');
      useABTestStore.getState().saveTest();

      expect(useABTestStore.getState().tests[0].winnerCriteria).toBe('clickRate');
    });

    it('should use conversion rate as winner criteria', () => {
      useABTestStore.getState().createTest('campaign-win');
      useABTestStore.getState().setWinnerCriteria('conversionRate');
      useABTestStore.getState().saveTest();

      expect(useABTestStore.getState().tests[0].winnerCriteria).toBe('conversionRate');
    });

    it('should calculate winner based on criteria', () => {
      useABTestStore.getState().createTest('campaign-calc');
      useABTestStore.getState().setWinnerCriteria('openRate');

      const variants = useABTestStore.getState().currentTest!.variants;

      // Variant A: 20% open rate
      useABTestStore.getState().updateVariant(variants[0].id, {
        sent: 1000,
        opened: 200,
        clicked: 50,
        converted: 10,
      });

      // Variant B: 30% open rate (should win)
      useABTestStore.getState().updateVariant(variants[1].id, {
        sent: 1000,
        opened: 300,
        clicked: 75,
        converted: 15,
      });

      const winner = useABTestStore.getState().calculateWinner();
      expect(winner).not.toBeNull();
      expect(winner!.id).toBe(variants[1].id);
    });
  });

  describe('Test Loading and Management', () => {
    it('should load existing test', () => {
      // Create and save test
      useABTestStore.getState().createTest('campaign-load');
      useABTestStore.getState().updateTest({ name: 'Test to Load' });
      useABTestStore.getState().saveTest();
      const testId = useABTestStore.getState().currentTest!.id;

      // Reset current test
      useABTestStore.getState().resetCurrentTest();
      expect(useABTestStore.getState().currentTest).toBeNull();

      // Load test
      useABTestStore.getState().loadTest(testId);
      expect(useABTestStore.getState().currentTest).not.toBeNull();
      expect(useABTestStore.getState().currentTest!.name).toBe('Test to Load');
    });

    it('should delete test', () => {
      // Create multiple tests
      useABTestStore.getState().createTest('campaign-1');
      useABTestStore.getState().updateTest({ name: 'Test 1' });
      useABTestStore.getState().saveTest();

      useABTestStore.getState().createTest('campaign-2');
      useABTestStore.getState().updateTest({ name: 'Test 2' });
      useABTestStore.getState().saveTest();

      expect(useABTestStore.getState().tests).toHaveLength(2);

      const testToDelete = useABTestStore.getState().tests[0].id;
      useABTestStore.getState().deleteTest(testToDelete);

      expect(useABTestStore.getState().tests).toHaveLength(1);
      expect(useABTestStore.getState().tests[0].name).toBe('Test 2');
    });

    it('should update test in tests array after saving', () => {
      useABTestStore.getState().createTest('campaign-update');
      useABTestStore.getState().updateTest({ name: 'Original Name' });
      useABTestStore.getState().saveTest();

      expect(useABTestStore.getState().tests[0].name).toBe('Original Name');

      useABTestStore.getState().updateTest({ name: 'Updated Name' });
      useABTestStore.getState().saveTest();

      expect(useABTestStore.getState().tests).toHaveLength(1);
      expect(useABTestStore.getState().tests[0].name).toBe('Updated Name');
    });
  });

  describe('Configuration Limits', () => {
    beforeEach(() => {
      useABTestStore.getState().createTest('campaign-config');
    });

    it('should enforce sample size limits', () => {
      useABTestStore.getState().setSampleSize(3); // Below min
      expect(useABTestStore.getState().currentTest!.sampleSize).toBe(5);

      useABTestStore.getState().setSampleSize(150); // Above max
      expect(useABTestStore.getState().currentTest!.sampleSize).toBe(100);

      useABTestStore.getState().setSampleSize(50); // Valid
      expect(useABTestStore.getState().currentTest!.sampleSize).toBe(50);
    });

    it('should enforce test duration limits', () => {
      useABTestStore.getState().setTestDuration(0); // Below min
      expect(useABTestStore.getState().currentTest!.testDuration).toBe(1);

      useABTestStore.getState().setTestDuration(200); // Above max (168 hours = 1 week)
      expect(useABTestStore.getState().currentTest!.testDuration).toBe(168);

      useABTestStore.getState().setTestDuration(24); // Valid
      expect(useABTestStore.getState().currentTest!.testDuration).toBe(24);
    });
  });

  describe('Edge Cases', () => {
    it('should handle operations when no current test', () => {
      useABTestStore.getState().resetCurrentTest();

      // These should not throw
      useABTestStore.getState().updateTest({ name: 'Test' });
      useABTestStore.getState().addVariant({ name: 'Variant' });
      useABTestStore.getState().removeVariant('any-id');
      useABTestStore.getState().updateVariant('any-id', { name: 'Test' });
      useABTestStore.getState().setSampleSize(30);
      useABTestStore.getState().setTestDuration(4);
      useABTestStore.getState().setWinnerCriteria('clickRate');
      useABTestStore.getState().startTest();
      useABTestStore.getState().cancelTest();
      useABTestStore.getState().selectWinner('any-id');
      useABTestStore.getState().saveTest();

      expect(useABTestStore.getState().tests).toHaveLength(0);
    });

    it('should handle loading non-existent test', () => {
      useABTestStore.getState().createTest('campaign-1');
      useABTestStore.getState().saveTest();

      useABTestStore.getState().loadTest('non-existent-id');
      // Should not change current test if not found
      expect(useABTestStore.getState().currentTest).not.toBeNull();
    });

    it('should handle getVariantStats when no current test', () => {
      useABTestStore.getState().resetCurrentTest();
      const stats = useABTestStore.getState().getVariantStats('any-id');
      expect(stats).toBeNull();
    });

    it('should handle getVariantStats for non-existent variant', () => {
      useABTestStore.getState().createTest('campaign-1');
      const stats = useABTestStore.getState().getVariantStats('non-existent-id');
      expect(stats).toEqual({ openRate: 0, clickRate: 0, conversionRate: 0 });
    });

    it('should handle calculateWinner when no current test', () => {
      useABTestStore.getState().resetCurrentTest();
      const winner = useABTestStore.getState().calculateWinner();
      expect(winner).toBeNull();
    });

    it('should generate unique ids', () => {
      const ids = new Set<string>();
      for (let i = 0; i < 100; i++) {
        ids.add(generateId());
      }
      expect(ids.size).toBe(100);
    });
  });

  describe('Complete Test with Auto-Winner', () => {
    it('should auto-select winner on complete', () => {
      useABTestStore.getState().createTest('campaign-auto');
      useABTestStore.getState().setAutoSelectWinner(true);
      useABTestStore.getState().setWinnerCriteria('clickRate');

      const variants = useABTestStore.getState().currentTest!.variants;

      // Variant A: 5% click rate
      useABTestStore.getState().updateVariant(variants[0].id, {
        sent: 1000,
        opened: 300,
        clicked: 50,
        converted: 10,
      });

      // Variant B: 15% click rate (should win)
      useABTestStore.getState().updateVariant(variants[1].id, {
        sent: 1000,
        opened: 400,
        clicked: 150,
        converted: 30,
      });

      useABTestStore.getState().completeTest();

      expect(useABTestStore.getState().currentTest!.status).toBe('completed');
      expect(useABTestStore.getState().currentTest!.winnerId).toBe(variants[1].id);
    });
  });

  describe('Helper Functions', () => {
    it('should create empty test with correct defaults', () => {
      const test = createEmptyTest('campaign-123');
      expect(test.id).toBeDefined();
      expect(test.campaignId).toBe('campaign-123');
      expect(test.name).toBe('A/B Test');
      expect(test.testType).toBe('subject');
      expect(test.variants).toHaveLength(2);
      expect(test.sampleSize).toBe(20);
      expect(test.winnerCriteria).toBe('openRate');
      expect(test.testDuration).toBe(4);
      expect(test.autoSelectWinner).toBe(true);
      expect(test.status).toBe('draft');
      expect(test.winnerId).toBeNull();
      expect(test.startedAt).toBeNull();
      expect(test.completedAt).toBeNull();
    });
  });
});
