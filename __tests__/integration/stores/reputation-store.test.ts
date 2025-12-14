import { describe, it, expect, beforeEach, vi } from 'vitest';
import { useReputationStore } from '@/stores/reputation-store';

describe('Reputation Store Integration', () => {
  beforeEach(() => {
    useReputationStore.getState().reset();
    vi.clearAllMocks();
  });

  describe('Full Reputation Workflow', () => {
    it('should complete full reputation analysis workflow', async () => {
      const store = useReputationStore.getState();

      // Step 1: Load reputation data
      await store.loadReputationData();

      let state = useReputationStore.getState();
      expect(state.overallScore).toBeGreaterThan(0);
      expect(state.metrics.totalSent).toBeGreaterThan(0);

      // Step 2: Check blacklists
      await store.checkBlacklists();

      state = useReputationStore.getState();
      expect(state.blacklistStatus.length).toBeGreaterThan(0);

      // Step 3: Check domain health
      await store.checkDomainHealth();

      state = useReputationStore.getState();
      expect(state.domainHealth).not.toBeNull();
      expect(state.domainHealth?.spf).toBeDefined();

      // Step 4: Review recommendations
      expect(state.recommendations.length).toBeGreaterThan(0);

      // Step 5: Dismiss a recommendation
      const recId = state.recommendations[0].id;
      useReputationStore.getState().dismissRecommendation(recId);

      state = useReputationStore.getState();
      expect(state.recommendations.find((r) => r.id === recId)?.dismissed).toBe(true);
    });

    it('should handle bounce management workflow', async () => {
      const store = useReputationStore.getState();
      await store.loadReputationData();

      let state = useReputationStore.getState();
      const initialBounceCount = state.bounces.total;

      // Step 1: Filter bounces by type
      store.setBounceFilter({ type: 'hard' });
      let filtered = store.getFilteredBounces();
      expect(filtered.every((b) => b.type === 'hard')).toBe(true);

      // Step 2: Remove a single bounce
      const bounceToRemove = state.bounces.recent[0];
      store.removeBounce(bounceToRemove.id);

      state = useReputationStore.getState();
      expect(state.bounces.total).toBe(initialBounceCount - 1);

      // Step 3: Remove all hard bounces
      store.removeBouncesByType('hard');

      state = useReputationStore.getState();
      expect(state.bounces.hard).toBe(0);
      expect(state.bounces.recent.filter((b) => b.type === 'hard').length).toBe(0);

      // Step 4: Export remaining bounces
      const exported = store.exportBounces();
      expect(exported.every((b) => b.type === 'soft')).toBe(true);
    });
  });

  describe('Score Calculation Accuracy', () => {
    it('should calculate accurate overall score', async () => {
      await useReputationStore.getState().loadReputationData();

      const { scores, overallScore, calculateOverallScore } = useReputationStore.getState();

      // Verify score calculation
      const expectedScore = Math.round(
        scores.bounceRate * 0.25 +
        scores.spamComplaint * 0.25 +
        scores.engagement * 0.2 +
        scores.authentication * 0.15 +
        scores.listQuality * 0.15
      );

      expect(overallScore).toBe(expectedScore);
      expect(calculateOverallScore()).toBe(expectedScore);
    });

    it('should have scores within valid range', async () => {
      await useReputationStore.getState().loadReputationData();

      const { scores, overallScore } = useReputationStore.getState();

      // All scores should be 0-100
      expect(scores.bounceRate).toBeGreaterThanOrEqual(0);
      expect(scores.bounceRate).toBeLessThanOrEqual(100);
      expect(scores.spamComplaint).toBeGreaterThanOrEqual(0);
      expect(scores.spamComplaint).toBeLessThanOrEqual(100);
      expect(scores.engagement).toBeGreaterThanOrEqual(0);
      expect(scores.engagement).toBeLessThanOrEqual(100);
      expect(scores.authentication).toBeGreaterThanOrEqual(0);
      expect(scores.authentication).toBeLessThanOrEqual(100);
      expect(scores.listQuality).toBeGreaterThanOrEqual(0);
      expect(scores.listQuality).toBeLessThanOrEqual(100);
      expect(overallScore).toBeGreaterThanOrEqual(0);
      expect(overallScore).toBeLessThanOrEqual(100);
    });
  });

  describe('Metrics Consistency', () => {
    it('should have consistent delivery metrics', async () => {
      await useReputationStore.getState().loadReputationData();

      const { metrics } = useReputationStore.getState();

      // Total sent should be >= total delivered + total bounced
      expect(metrics.totalSent).toBeGreaterThanOrEqual(metrics.totalDelivered);

      // Rates should be consistent with totals
      const calculatedBounceRate = (metrics.totalBounced / metrics.totalSent) * 100;
      expect(Math.abs(metrics.bounceRate - calculatedBounceRate)).toBeLessThan(0.1);
    });

    it('should have consistent bounce counts', async () => {
      await useReputationStore.getState().loadReputationData();

      const { bounces } = useReputationStore.getState();

      // Hard + soft should match or be close to total
      const recentHard = bounces.recent.filter((b) => b.type === 'hard').length;
      const recentSoft = bounces.recent.filter((b) => b.type === 'soft').length;

      expect(bounces.recent.length).toBe(recentHard + recentSoft);
    });
  });

  describe('Data Refresh Flow', () => {
    it('should update data on refresh', async () => {
      const store = useReputationStore.getState();
      await store.loadReputationData();

      const firstUpdate = useReputationStore.getState().lastUpdated;

      // Wait a bit and refresh
      await new Promise((r) => setTimeout(r, 50));
      await store.refreshMetrics();

      const state = useReputationStore.getState();
      expect(state.lastUpdated).not.toEqual(firstUpdate);
      expect(new Date(state.lastUpdated!).getTime()).toBeGreaterThan(
        new Date(firstUpdate!).getTime()
      );
    });
  });

  describe('Domain and IP Health Consistency', () => {
    it('should have valid domain authentication statuses', async () => {
      await useReputationStore.getState().loadReputationData();

      const { domainHealth } = useReputationStore.getState();

      expect(domainHealth).not.toBeNull();
      expect(['valid', 'invalid', 'missing', 'unknown']).toContain(domainHealth?.spf);
      expect(['valid', 'invalid', 'missing', 'unknown']).toContain(domainHealth?.dkim);
      expect(['valid', 'invalid', 'missing', 'unknown']).toContain(domainHealth?.dmarc);
    });

    it('should have valid IP health data', async () => {
      await useReputationStore.getState().loadReputationData();

      const { ipHealth } = useReputationStore.getState();

      expect(ipHealth).not.toBeNull();
      expect(['shared', 'dedicated']).toContain(ipHealth?.type);
      expect(['warming', 'warmed', 'not_started']).toContain(ipHealth?.warmingStatus);
      expect(['increasing', 'stable', 'decreasing']).toContain(ipHealth?.volumeTrend);
      expect(ipHealth?.reputation).toBeGreaterThanOrEqual(0);
      expect(ipHealth?.reputation).toBeLessThanOrEqual(100);
    });
  });

  describe('Recommendations Priority', () => {
    it('should have valid recommendation priorities', async () => {
      await useReputationStore.getState().loadReputationData();

      const { recommendations } = useReputationStore.getState();

      recommendations.forEach((rec) => {
        expect(['critical', 'high', 'medium', 'low']).toContain(rec.priority);
        expect(rec.title).toBeTruthy();
        expect(rec.description).toBeTruthy();
        expect(rec.action).toBeTruthy();
      });
    });
  });

  describe('Blacklist Status Consistency', () => {
    it('should have valid blacklist entries', async () => {
      await useReputationStore.getState().loadReputationData();

      const { blacklistStatus } = useReputationStore.getState();

      blacklistStatus.forEach((bl) => {
        expect(bl.id).toBeTruthy();
        expect(bl.name).toBeTruthy();
        expect(typeof bl.listed).toBe('boolean');
        expect(bl.checkedAt).toBeDefined();
      });
    });

    it('should provide delist URL for listed entries', async () => {
      await useReputationStore.getState().loadReputationData();

      const { blacklistStatus } = useReputationStore.getState();
      const listed = blacklistStatus.filter((bl) => bl.listed);

      listed.forEach((bl) => {
        expect(bl.delistUrl).toBeDefined();
      });
    });
  });

  describe('Trend Data Validation', () => {
    it('should have chronological trend data', async () => {
      await useReputationStore.getState().loadReputationData();

      const { trends } = useReputationStore.getState();

      for (let i = 1; i < trends.length; i++) {
        const prevDate = new Date(trends[i - 1].date).getTime();
        const currDate = new Date(trends[i].date).getTime();
        expect(currDate).toBeGreaterThan(prevDate);
      }
    });

    it('should have valid trend metrics', async () => {
      await useReputationStore.getState().loadReputationData();

      const { trends } = useReputationStore.getState();

      trends.forEach((point) => {
        expect(point.score).toBeGreaterThanOrEqual(0);
        expect(point.score).toBeLessThanOrEqual(100);
        expect(point.inboxRate).toBeGreaterThanOrEqual(0);
        expect(point.inboxRate).toBeLessThanOrEqual(100);
        expect(point.bounceRate).toBeGreaterThanOrEqual(0);
        expect(point.complaintRate).toBeGreaterThanOrEqual(0);
      });
    });
  });
});
