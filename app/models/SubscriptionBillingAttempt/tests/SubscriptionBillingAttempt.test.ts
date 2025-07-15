import {mockShopifyServer} from '#/test-utils';
import {afterEach, describe, expect, it} from 'vitest';
import {TEST_SHOP} from '#/constants';
import SubscriptionBillingAttemptQuery from '~/graphql/SubscriptionBillingAttemptQuery';
import {
  findSubscriptionBillingAttempt,
  getNextBillingCycleDates,
  getPastBillingCycles,
} from '../SubscriptionBillingAttempt.server';
import type {SellingPlanInterval} from 'types/admin.types';

const {graphQL, mockGraphQL} = mockShopifyServer();

describe('SubscriptionBillingAttempt', () => {
  afterEach(async () => {
    graphQL.mockRestore();
    vi.useRealTimers();
  });

  describe('findSubscriptionBillingAttempt', () => {
    it('returns a billing attempt', async () => {
      mockGraphQL({
        SubscriptionBillingAttempt: {
          data: {
            subscriptionBillingAttempt: {
              id: 'gid://shopify/SubscriptionBillingAttempt/1',
              originTime: '2023-11-13T16:58:03Z',
              subscriptionContract: {
                id: 'gid://shopify/SubscriptionContract/1',
              },
            },
          },
        },
      });

      const billingAttempt = await findSubscriptionBillingAttempt(
        TEST_SHOP,
        'gid://shopify/SubscriptionBillingAttempt/1',
      );

      expect(billingAttempt.id).toEqual(
        'gid://shopify/SubscriptionBillingAttempt/1',
      );
      expect(billingAttempt.originTime).toEqual('2023-11-13T16:58:03Z');
      expect(billingAttempt.subscriptionContract.id).toEqual(
        'gid://shopify/SubscriptionContract/1',
      );

      expect(graphQL).toHavePerformedGraphQLOperation(
        SubscriptionBillingAttemptQuery,
        {
          variables: {
            billingAttemptId: 'gid://shopify/SubscriptionBillingAttempt/1',
          },
        },
      );
    });

    it('throws if it does not exist', async () => {
      mockGraphQL({
        SubscriptionBillingAttempt: {
          data: {
            subscriptionBillingAttempt: null,
          },
        },
      });

      await expect(
        findSubscriptionBillingAttempt(
          TEST_SHOP,
          'gid://shopify/SubscriptionBillingAttempt/2',
        ),
      ).rejects.toThrowError(
        'Failed to find SubscriptionBillingAttempt with id: gid://shopify/SubscriptionBillingAttempt/2',
      );
    });
  });

  describe('getNextBillingCycleDates', () => {
    it('returns the next billing cycle dates', async () => {
      mockGraphQL({
        SubscriptionBillingCycles: {
          data: {
            subscriptionBillingCycles: {
              edges: [
                {
                  node: {
                    billingAttemptExpectedDate: '2023-11-13T16:58:03Z',
                    skipped: false,
                    billingAttempts: {
                      edges: [],
                    },
                  },
                },
                {
                  node: {
                    billingAttemptExpectedDate: '2023-11-20T16:58:03Z',
                    skipped: false,
                    billingAttempts: {
                      edges: [],
                    },
                  },
                },
              ],
              pageInfo: {
                hasNextPage: true,
              },
            },
          },
        },
      });

      const result = await getNextBillingCycleDates(
        graphQL,
        '1',
        2,
        'WEEK' as SellingPlanInterval,
        2,
      );

      expect(
        result.upcomingBillingCycles[0].billingAttemptExpectedDate,
      ).toEqual('2023-11-13T16:58:03Z');
      expect(result.upcomingBillingCycles[0].skipped).toEqual(false);
      expect(
        result.upcomingBillingCycles[1].billingAttemptExpectedDate,
      ).toEqual('2023-11-20T16:58:03Z');
      expect(result.upcomingBillingCycles[1].skipped).toEqual(false);
    });

    it('omits billing cycles that have an order created', async () => {
      mockGraphQL({
        SubscriptionBillingCycles: {
          data: {
            subscriptionBillingCycles: {
              edges: [
                {
                  node: {
                    billingAttemptExpectedDate: '2023-11-13T16:58:03Z',
                    skipped: false,
                    billingAttempts: {
                      edges: [
                        {
                          node: {
                            order: {
                              id: 'gid://shopify/Order/1',
                            },
                          },
                        },
                      ],
                    },
                  },
                },
                {
                  node: {
                    billingAttemptExpectedDate: '2023-11-20T16:58:03Z',
                    skipped: false,
                    billingAttempts: {
                      edges: [],
                    },
                  },
                },
              ],
              pageInfo: {
                hasNextPage: true,
              },
            },
          },
        },
      });

      const result = await getNextBillingCycleDates(
        graphQL,
        '1',
        2,
        'WEEK' as SellingPlanInterval,
        2,
      );

      expect(result.upcomingBillingCycles).toHaveLength(1);

      expect(
        result.upcomingBillingCycles[0].billingAttemptExpectedDate,
      ).toEqual('2023-11-20T16:58:03Z');
    });

    it('throws if data not available', async () => {
      mockGraphQL({
        SubscriptionBillingCycles: {
          data: null,
        },
      });

      await expect(
        getNextBillingCycleDates(
          graphQL,
          '1',
          2,
          'WEEK' as SellingPlanInterval,
          2,
        ),
      ).rejects.toThrowError('Failed to find SubscriptionBillingCycles');
    });
  });

  describe('getPastBillingCycles', () => {
    const defaultBillingCycleByIndexQuery = {
      SubscriptionBillingCycleByIndex: {
        data: {
          subscriptionBillingCycle: {
            cycleStartAt: '2023-11-13T16:58:03Z',
          },
        },
      },
    };

    it('returns past billing cycles with order on the cycle instead of the attempt', async () => {
      mockGraphQL({
        ...defaultBillingCycleByIndexQuery,
        SubscriptionPastBillingCycles: {
          data: {
            subscriptionBillingCycles: {
              edges: [
                {
                  node: {
                    billingAttemptExpectedDate: '2023-11-13T16:58:03Z',
                    skipped: false,
                    billingAttempts: {
                      edges: [
                        {
                          node: {
                            order: {
                              id: 'gid://shopify/Order/1',
                              createdAt: '2023-11-13T16:58:03Z',
                            },
                          },
                        },
                      ],
                    },
                  },
                },
              ],
            },
          },
        },
      });

      const result = await getPastBillingCycles(
        graphQL,
        '1',
        '2023-11-14T16:58:03Z',
      );

      expect(result.pastBillingCycles).toHaveLength(1);
      expect(result.pastBillingCycles[0].order?.id).toEqual(
        'gid://shopify/Order/1',
      );
    });

    it('returns a past cycle if an order exists, even if the expected billing date is in the future', async () => {
      vi.useFakeTimers();
      vi.setSystemTime('2024-11-13T16:58:03Z');

      mockGraphQL({
        ...defaultBillingCycleByIndexQuery,
        SubscriptionPastBillingCycles: {
          data: {
            subscriptionBillingCycles: {
              edges: [
                {
                  node: {
                    billingAttemptExpectedDate: '2024-11-25T16:58:03Z',
                    skipped: false,
                    billingAttempts: {
                      edges: [
                        {
                          node: {
                            order: {
                              id: 'gid://shopify/Order/1',
                              createdAt: '2023-11-13T16:58:03Z',
                            },
                          },
                        },
                      ],
                    },
                  },
                },
              ],
            },
          },
        },
      });

      const result = await getPastBillingCycles(
        graphQL,
        '1',
        '2023-11-14T16:58:03Z',
      );

      expect(result.pastBillingCycles).toHaveLength(1);
    });

    it('returns a past cycle with no order if the expected billing date is in the past', async () => {
      vi.useFakeTimers();
      vi.setSystemTime('2024-11-13T16:58:03Z');

      mockGraphQL({
        ...defaultBillingCycleByIndexQuery,
        SubscriptionPastBillingCycles: {
          data: {
            subscriptionBillingCycles: {
              edges: [
                {
                  // This cycle is in the future, is not returned
                  node: {
                    billingAttemptExpectedDate: '2024-12-05T16:58:03Z',
                    skipped: false,
                    billingAttempts: {
                      edges: [],
                    },
                  },
                },
                {
                  // This cycle is in the past, is returned, even though
                  node: {
                    billingAttemptExpectedDate: '2024-11-05T16:58:03Z',
                    skipped: false,
                    billingAttempts: {
                      edges: [],
                    },
                  },
                },
              ],
            },
          },
        },
      });

      const result = await getPastBillingCycles(
        graphQL,
        '1',
        '2023-11-14T16:58:03Z',
      );

      expect(result.pastBillingCycles).toHaveLength(1);
      expect(result.pastBillingCycles[0].billingAttemptExpectedDate).toEqual(
        '2024-11-05T16:58:03Z',
      );
    });

    it('does not return a past cycle if the expected billing date is today', async () => {
      vi.useFakeTimers();
      vi.setSystemTime('2024-11-13T16:58:03Z');

      mockGraphQL({
        ...defaultBillingCycleByIndexQuery,
        SubscriptionPastBillingCycles: {
          data: {
            subscriptionBillingCycles: {
              edges: [
                {
                  // Expected billing date is earlier in current day, is not returned as past
                  node: {
                    billingAttemptExpectedDate: '2024-11-13T10:00:03Z',
                    skipped: false,
                    billingAttempts: {
                      edges: [],
                    },
                  },
                },
              ],
            },
          },
        },
      });

      const result = await getPastBillingCycles(
        graphQL,
        '1',
        '2023-11-14T16:58:03Z',
      );

      expect(result.pastBillingCycles).toHaveLength(0);
    });

    it('returns a failed billing cycle if the most recent billing attempt failed', async () => {
      vi.useFakeTimers();
      vi.setSystemTime('2024-11-13T16:58:03Z');

      mockGraphQL({
        ...defaultBillingCycleByIndexQuery,
        SubscriptionPastBillingCycles: {
          data: {
            subscriptionBillingCycles: {
              edges: [
                {
                  node: {
                    billingAttemptExpectedDate: '2024-11-10T10:00:03Z',
                    skipped: false,
                    billingAttempts: {
                      edges: [
                        {
                          node: {
                            processingError: {
                              code: 'INVENTORY_ALLOCATIONS_NOT_FOUND',
                            },
                          },
                        },
                      ],
                    },
                  },
                },
              ],
            },
          },
        },
      });

      const result = await getPastBillingCycles(
        graphQL,
        '1',
        '2023-11-14T16:58:03Z',
      );

      expect(result.failedBillingCycle).toEqual(
        expect.objectContaining({
          billingAttemptExpectedDate: '2024-11-10T10:00:03Z',
          billingAttemptErrorCode: 'INVENTORY_ALLOCATIONS_NOT_FOUND',
        }),
      );
    });

    it('does not return a failed billing cycle if inventory error was followed by a successful billing attempt', async () => {
      vi.useFakeTimers();
      vi.setSystemTime('2024-11-13T16:58:03Z');

      mockGraphQL({
        ...defaultBillingCycleByIndexQuery,
        SubscriptionPastBillingCycles: {
          data: {
            subscriptionBillingCycles: {
              edges: [
                {
                  node: {
                    billingAttemptExpectedDate: '2024-11-10T10:00:03Z',
                    skipped: false,
                    billingAttempts: {
                      edges: [
                        {
                          node: {
                            order: {
                              id: 'gid://shopify/Order/1',
                            },
                          },
                        },
                        {
                          node: {
                            processingError: {
                              code: 'INVENTORY_ALLOCATIONS_NOT_FOUND',
                            },
                          },
                        },
                      ],
                    },
                  },
                },
              ],
            },
          },
        },
      });

      const result = await getPastBillingCycles(
        graphQL,
        '1',
        '2023-11-14T16:58:03Z',
      );

      expect(result.failedBillingCycle).toBeUndefined();
    });
  });
});
