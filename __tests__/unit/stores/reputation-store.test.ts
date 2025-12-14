import { describe, it, expect, beforeEach, vi } from 'vitest';
import { useReputationStore } from '@/stores/reputation-store';

describe('Reputation Store', () => {
  beforeEach(() => {
    useReputationStore.getState().reset();
    vi.clearAllMocks();
  });

  describe('Initial State', () => {
    it('should have correct initial state', () => {
      const state = useReputationStore.getState();
      expect(state.overallScore).toBe(0);
      expect(state.isLoading).toBe(false);
      expect(state.lastUpdated).toBeNull();
      expect(state.bounces.total).toBe(0);
      expect(state.recommendations).toHaveLength(0);
    });

    it('should have default bounce filter', () => {
      const state = useReputationStore.getState();
      expect(state.bounceFilter.type).toBe('all');
      expect(state.bounceFilter.dateRange).toBe('month');
      expect(state.bounceFilter.search).toBe('');
    });

    it('should have empty scores', () => {
      const state = useReputationStore.getState();
      expect(state.scores.bounceRate).toBe(0);
      expect(state.scores.spamComplaint).toBe(0);
      expect(state.scores.engagement).toBe(0);
      expect(state.scores.authentication).toBe(0);
      expect(state.scores.listQuality).toBe(0);
    });

    it('should have empty metrics', () => {
      const state = useReputationStore.getState();
      expect(state.metrics.inboxRate).toBe(0);
      expect(state.metrics.totalSent).toBe(0);
      expect(state.metrics.totalDelivered).toBe(0);
    });
  });

  describe('Loading Reputation Data', () => {
    it('should load reputation data', async () => {
      const { loadReputationData } = useReputationStore.getState();
      await loadReputationData();

      const state = useReputationStore.getState();
      expect(state.overallScore).toBeGreaterThan(0);
      expect(state.lastUpdated).not.toBeNull();
      expect(state.isLoading).toBe(false);
    });

    it('should populate scores after loading', async () => {
      const { loadReputationData } = useReputationStore.getState();
      await loadReputationData();

      const state = useReputationStore.getState();
      expect(state.scores.bounceRate).toBeGreaterThan(0);
      expect(state.scores.spamComplaint).toBeGreaterThan(0);
      expect(state.scores.engagement).toBeGreaterThan(0);
      expect(state.scores.authentication).toBeGreaterThan(0);
      expect(state.scores.listQuality).toBeGreaterThan(0);
    });

    it('should populate metrics after loading', async () => {
      const { loadReputationData } = useReputationStore.getState();
      await loadReputationData();

      const state = useReputationStore.getState();
      expect(state.metrics.inboxRate).toBeGreaterThan(0);
      expect(state.metrics.totalSent).toBeGreaterThan(0);
      expect(state.metrics.totalDelivered).toBeGreaterThan(0);
    });

    it('should populate bounces after loading', async () => {
      const { loadReputationData } = useReputationStore.getState();
      await loadReputationData();

      const state = useReputationStore.getState();
      expect(state.bounces.total).toBeGreaterThan(0);
      expect(state.bounces.recent.length).toBeGreaterThan(0);
    });

    it('should populate domain health after loading', async () => {
      const { loadReputationData } = useReputationStore.getState();
      await loadReputationData();

      const state = useReputationStore.getState();
      expect(state.domainHealth).not.toBeNull();
      expect(state.domainHealth?.domain).toBeDefined();
      expect(state.domainHealth?.spf).toBeDefined();
    });

    it('should populate IP health after loading', async () => {
      const { loadReputationData } = useReputationStore.getState();
      await loadReputationData();

      const state = useReputationStore.getState();
      expect(state.ipHealth).not.toBeNull();
      expect(state.ipHealth?.ip).toBeDefined();
      expect(state.ipHealth?.reputation).toBeGreaterThan(0);
    });

    it('should populate blacklist status after loading', async () => {
      const { loadReputationData } = useReputationStore.getState();
      await loadReputationData();

      const state = useReputationStore.getState();
      expect(state.blacklistStatus.length).toBeGreaterThan(0);
    });

    it('should populate recommendations after loading', async () => {
      const { loadReputationData } = useReputationStore.getState();
      await loadReputationData();

      const state = useReputationStore.getState();
      expect(state.recommendations.length).toBeGreaterThan(0);
    });

    it('should populate trends after loading', async () => {
      const { loadReputationData } = useReputationStore.getState();
      await loadReputationData();

      const state = useReputationStore.getState();
      expect(state.trends.length).toBeGreaterThan(0);
    });
  });

  describe('Refresh Metrics', () => {
    it('should refresh metrics', async () => {
      const { loadReputationData, refreshMetrics } = useReputationStore.getState();
      await loadReputationData();

      const initialUpdate = useReputationStore.getState().lastUpdated;
      await new Promise((r) => setTimeout(r, 10));
      await refreshMetrics();

      const state = useReputationStore.getState();
      expect(state.lastUpdated).not.toEqual(initialUpdate);
    });
  });

  describe('Check Blacklists', () => {
    it('should check blacklists', async () => {
      const { checkBlacklists } = useReputationStore.getState();
      await checkBlacklists();

      const state = useReputationStore.getState();
      expect(state.blacklistStatus.length).toBeGreaterThan(0);
      expect(state.isCheckingBlacklist).toBe(false);
    });

    it('should set loading state during check', async () => {
      const { checkBlacklists } = useReputationStore.getState();
      const promise = checkBlacklists();

      expect(useReputationStore.getState().isCheckingBlacklist).toBe(true);
      await promise;
      expect(useReputationStore.getState().isCheckingBlacklist).toBe(false);
    });
  });

  describe('Check Domain Health', () => {
    it('should check domain health', async () => {
      const { checkDomainHealth } = useReputationStore.getState();
      await checkDomainHealth();

      const state = useReputationStore.getState();
      expect(state.domainHealth).not.toBeNull();
      expect(state.isCheckingDomain).toBe(false);
    });

    it('should set loading state during check', async () => {
      const { checkDomainHealth } = useReputationStore.getState();
      const promise = checkDomainHealth();

      expect(useReputationStore.getState().isCheckingDomain).toBe(true);
      await promise;
      expect(useReputationStore.getState().isCheckingDomain).toBe(false);
    });
  });

  describe('Bounce Management', () => {
    beforeEach(async () => {
      await useReputationStore.getState().loadReputationData();
    });

    it('should remove a bounce', () => {
      const state = useReputationStore.getState();
      const initialCount = state.bounces.total;
      const bounceId = state.bounces.recent[0].id;

      state.removeBounce(bounceId);

      const newState = useReputationStore.getState();
      expect(newState.bounces.total).toBe(initialCount - 1);
      expect(newState.bounces.recent.find((b) => b.id === bounceId)).toBeUndefined();
    });

    it('should remove bounces by type', () => {
      const state = useReputationStore.getState();
      const hardBounces = state.bounces.recent.filter((b) => b.type === 'hard').length;

      state.removeBouncesByType('hard');

      const newState = useReputationStore.getState();
      expect(newState.bounces.recent.filter((b) => b.type === 'hard').length).toBe(0);
      expect(newState.bounces.hard).toBe(0);
    });

    it('should remove all bounces', () => {
      const state = useReputationStore.getState();
      state.removeAllBounces();

      const newState = useReputationStore.getState();
      expect(newState.bounces.total).toBe(0);
      expect(newState.bounces.recent.length).toBe(0);
      expect(newState.bounces.hard).toBe(0);
      expect(newState.bounces.soft).toBe(0);
    });

    it('should export bounces', () => {
      const state = useReputationStore.getState();
      const exported = state.exportBounces();

      expect(exported.length).toBeGreaterThan(0);
      expect(exported[0]).toHaveProperty('email');
      expect(exported[0]).toHaveProperty('type');
    });
  });

  describe('Bounce Filtering', () => {
    beforeEach(async () => {
      await useReputationStore.getState().loadReputationData();
    });

    it('should filter bounces by type', () => {
      const { setBounceFilter, getFilteredBounces } = useReputationStore.getState();

      setBounceFilter({ type: 'hard' });
      const hardBounces = getFilteredBounces();
      expect(hardBounces.every((b) => b.type === 'hard')).toBe(true);

      setBounceFilter({ type: 'soft' });
      const softBounces = getFilteredBounces();
      expect(softBounces.every((b) => b.type === 'soft')).toBe(true);
    });

    it('should filter bounces by date range', () => {
      const { setBounceFilter, getFilteredBounces, bounces } = useReputationStore.getState();

      setBounceFilter({ dateRange: 'today', type: 'all' });
      const todayBounces = getFilteredBounces();

      const today = new Date();
      today.setHours(0, 0, 0, 0);

      todayBounces.forEach((b) => {
        expect(new Date(b.bouncedAt).getTime()).toBeGreaterThanOrEqual(today.getTime());
      });
    });

    it('should filter bounces by search', () => {
      const { setBounceFilter, getFilteredBounces, bounces } = useReputationStore.getState();
      const firstBounce = bounces.recent[0];

      setBounceFilter({ search: firstBounce.email.substring(0, 5), type: 'all', dateRange: 'all' });
      const searchResults = getFilteredBounces();

      expect(searchResults.length).toBeGreaterThan(0);
      expect(searchResults.some((b) => b.email.includes(firstBounce.email.substring(0, 5)))).toBe(true);
    });

    it('should combine filters', () => {
      const { setBounceFilter, getFilteredBounces } = useReputationStore.getState();

      setBounceFilter({ type: 'hard', dateRange: 'month' });
      const filtered = getFilteredBounces();

      const monthAgo = new Date();
      monthAgo.setDate(monthAgo.getDate() - 30);

      filtered.forEach((b) => {
        expect(b.type).toBe('hard');
        expect(new Date(b.bouncedAt).getTime()).toBeGreaterThanOrEqual(monthAgo.getTime());
      });
    });
  });

  describe('Recommendations', () => {
    beforeEach(async () => {
      await useReputationStore.getState().loadReputationData();
    });

    it('should dismiss a recommendation', () => {
      const state = useReputationStore.getState();
      const recId = state.recommendations[0].id;

      state.dismissRecommendation(recId);

      const newState = useReputationStore.getState();
      const dismissed = newState.recommendations.find((r) => r.id === recId);
      expect(dismissed?.dismissed).toBe(true);
      expect(dismissed?.dismissedAt).toBeDefined();
    });

    it('should restore a recommendation', () => {
      const state = useReputationStore.getState();
      const recId = state.recommendations[0].id;

      state.dismissRecommendation(recId);
      expect(useReputationStore.getState().recommendations.find((r) => r.id === recId)?.dismissed).toBe(true);

      state.restoreRecommendation(recId);

      const newState = useReputationStore.getState();
      const restored = newState.recommendations.find((r) => r.id === recId);
      expect(restored?.dismissed).toBe(false);
    });
  });

  describe('Score Level Calculation', () => {
    it('should return excellent for scores >= 90', () => {
      const { getScoreLevel } = useReputationStore.getState();
      expect(getScoreLevel(90)).toBe('excellent');
      expect(getScoreLevel(95)).toBe('excellent');
      expect(getScoreLevel(100)).toBe('excellent');
    });

    it('should return good for scores >= 75', () => {
      const { getScoreLevel } = useReputationStore.getState();
      expect(getScoreLevel(75)).toBe('good');
      expect(getScoreLevel(80)).toBe('good');
      expect(getScoreLevel(89)).toBe('good');
    });

    it('should return fair for scores >= 50', () => {
      const { getScoreLevel } = useReputationStore.getState();
      expect(getScoreLevel(50)).toBe('fair');
      expect(getScoreLevel(60)).toBe('fair');
      expect(getScoreLevel(74)).toBe('fair');
    });

    it('should return poor for scores >= 25', () => {
      const { getScoreLevel } = useReputationStore.getState();
      expect(getScoreLevel(25)).toBe('poor');
      expect(getScoreLevel(35)).toBe('poor');
      expect(getScoreLevel(49)).toBe('poor');
    });

    it('should return critical for scores < 25', () => {
      const { getScoreLevel } = useReputationStore.getState();
      expect(getScoreLevel(0)).toBe('critical');
      expect(getScoreLevel(10)).toBe('critical');
      expect(getScoreLevel(24)).toBe('critical');
    });
  });

  describe('Calculate Overall Score', () => {
    it('should calculate overall score from component scores', async () => {
      await useReputationStore.getState().loadReputationData();

      const { calculateOverallScore, scores } = useReputationStore.getState();
      const calculated = calculateOverallScore();

      // Expected formula: bounceRate*0.25 + spamComplaint*0.25 + engagement*0.2 + authentication*0.15 + listQuality*0.15
      const expected = Math.round(
        scores.bounceRate * 0.25 +
        scores.spamComplaint * 0.25 +
        scores.engagement * 0.2 +
        scores.authentication * 0.15 +
        scores.listQuality * 0.15
      );

      expect(calculated).toBe(expected);
    });
  });

  describe('Reset', () => {
    it('should reset to initial state', async () => {
      await useReputationStore.getState().loadReputationData();

      const stateBeforeReset = useReputationStore.getState();
      expect(stateBeforeReset.overallScore).toBeGreaterThan(0);

      stateBeforeReset.reset();

      const stateAfterReset = useReputationStore.getState();
      expect(stateAfterReset.overallScore).toBe(0);
      expect(stateAfterReset.lastUpdated).toBeNull();
      expect(stateAfterReset.bounces.total).toBe(0);
    });
  });

  describe('Complaints', () => {
    it('should load complaint data', async () => {
      await useReputationStore.getState().loadReputationData();

      const state = useReputationStore.getState();
      expect(state.complaints.total).toBeGreaterThan(0);
      expect(state.complaints.recent.length).toBeGreaterThan(0);
      expect(state.complaints.rate).toBeGreaterThanOrEqual(0);
    });

    it('should have complaint types breakdown', async () => {
      await useReputationStore.getState().loadReputationData();

      const state = useReputationStore.getState();
      expect(Object.keys(state.complaints.byType).length).toBeGreaterThan(0);
    });
  });

  describe('Bounce Stats', () => {
    it('should have bounce reason breakdown', async () => {
      await useReputationStore.getState().loadReputationData();

      const state = useReputationStore.getState();
      expect(Object.keys(state.bounces.byReason).length).toBeGreaterThan(0);
    });

    it('should correctly count hard and soft bounces', async () => {
      await useReputationStore.getState().loadReputationData();

      const state = useReputationStore.getState();
      const hardCount = state.bounces.recent.filter((b) => b.type === 'hard').length;
      const softCount = state.bounces.recent.filter((b) => b.type === 'soft').length;

      // Total should equal recent length
      expect(state.bounces.recent.length).toBe(hardCount + softCount);
    });
  });
});
