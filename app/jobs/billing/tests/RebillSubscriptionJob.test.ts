import {mockShopifyServer} from '#/test-utils';
import {afterEach, describe, expect, it} from 'vitest';
import SubscriptionBillingCycleChargeMutation from '~/graphql/SubscriptionBillingCycleChargeMutation';
import {RebillSubscriptionJob} from '~/jobs';
import type {Jobs} from '~/types';
import {TEST_SHOP} from '#/constants';
import fixture from './fixtures/RebillSubscriptionJobPayload.json';

function defaultGraphQLResponses() {
  return {
    SubscriptionContractRebillingQuery: {
      data: {subscriptionContract: {id: '1'}},
    },
    SubscriptionBillingCycleChargeMutation: {
      data: {
        subscriptionBillingCycleCharge: {
          subscriptionBillingAttempt: {id: '1', ready: false},
          userErrors: [],
        },
      },
    },
  };
}

function alreadyBilledGraphQLResponses() {
  return {
    SubscriptionContractRebillingQuery: {
      data: {subscriptionContract: {lastPaymentStatus: 'SUCCEEDED'}},
    },
    SubscriptionBillingCycleChargeMutation: {
      data: {
        subscriptionBillingCycleCharge: {
          subscriptionBillingAttempt: {id: '1', ready: false},
          userErrors: [],
        },
      },
    },
  };
}

function errorGraphQLResponses() {
  return {
    SubscriptionContractRebillingQuery: {
      data: {subscriptionContract: {id: '1'}},
    },
    SubscriptionBillingCycleChargeMutation: {
      data: {
        subscriptionBillingCycleCharge: {
          subscriptionBillingAttempt: null,
          userErrors: [
            {
              field: 'my_random_field',
              message: 'test error message',
              code: 'INVALID',
            },
          ],
        },
      },
    },
  };
}

function nonBillableStateGraphQLResponses() {
  return {
    SubscriptionContractRebillingQuery: {
      data: {subscriptionContract: {id: '1'}},
    },
    SubscriptionBillingCycleChargeMutation: {
      data: {
        subscriptionBillingCycleCharge: {
          subscriptionBillingAttempt: null,
          userErrors: [
            {
              message: 'Contract must be active or failed',
              field: ['subscriptionContractId'],
              code: 'CONTRACT_PAUSED',
            },
          ],
        },
      },
    },
  };
}

function skippedBillingCycleGraphQLResponses() {
  return {
    SubscriptionContractRebillingQuery: {
      data: {subscriptionContract: {id: '1'}},
    },
    SubscriptionBillingCycleChargeMutation: {
      data: {
        subscriptionBillingCycleCharge: {
          subscriptionBillingAttempt: null,
          userErrors: [
            {
              message: 'Cannot charge a skipped billing cycle',
              field: ['billingCycleSelector'],
              code: 'BILLING_CYCLE_SKIPPED',
            },
          ],
        },
      },
    },
  };
}

function billingCycleChargeBeforeExpectedDateGraphQLResponses() {
  return {
    SubscriptionContractRebillingQuery: {
      data: {subscriptionContract: {id: '1'}},
    },
    SubscriptionBillingCycleChargeMutation: {
      data: {
        subscriptionBillingCycleCharge: {
          subscriptionBillingAttempt: null,
          userErrors: [
            {
              message: 'Billing cycle charge before expected date',
              field: ['billingCycleSelector'],
              code: 'BILLING_CYCLE_CHARGE_BEFORE_EXPECTED_DATE',
            },
          ],
        },
      },
    },
  };
}

const {graphQL, mockGraphQL} = mockShopifyServer();

describe('RebillSubscriptionJob', () => {
  afterEach(() => {
    graphQL.mockRestore();
  });

  describe('with a valid session', () => {
    it('calls SubscriptionBillingCycleCharge mutation', async () => {
      mockGraphQL(defaultGraphQLResponses());

      const task: Jobs.Parameters<Jobs.RebillSubscriptionJobPayload> = {
        shop: TEST_SHOP,
        payload: fixture as unknown as Jobs.RebillSubscriptionJobPayload,
      };

      const job = new RebillSubscriptionJob(task);

      await job.perform();

      expect(graphQL).toHavePerformedGraphQLOperation(
        SubscriptionBillingCycleChargeMutation,
        {
          variables: {
            subscriptionContractId: 'gid://shopify/SubscriptionContract/1',
            originTime: '2023-01-20T15:00:00-05:00',
          },
        },
      );
    });

    it('does not call SubscriptionBillingCycleCharge mutation if contract already billed', async () => {
      mockGraphQL(alreadyBilledGraphQLResponses());

      const params: Jobs.Parameters<Jobs.RebillSubscriptionJobPayload> = {
        shop: TEST_SHOP,
        payload: fixture as unknown as Jobs.RebillSubscriptionJobPayload,
      };

      const job = new RebillSubscriptionJob(params);

      await job.perform();

      expect(graphQL).not.toHavePerformedGraphQLOperation(
        SubscriptionBillingCycleChargeMutation,
      );
    });

    describe('when an error is returned by SubscriptionBillingCycleChargeMutation', () => {
      it('throws an error', async () => {
        mockGraphQL(errorGraphQLResponses());

        const task: Jobs.Parameters<Jobs.RebillSubscriptionJobPayload> = {
          shop: TEST_SHOP,
          payload: fixture as unknown as Jobs.RebillSubscriptionJobPayload,
        };

        const job = new RebillSubscriptionJob(task);

        await expect(job.perform()).rejects.toThrowError(
          'Failed to process RebillSubscriptionJob',
        );
      });

      describe('when the contract is not a billable state', () => {
        it('logs error message and terminates without throwing', async () => {
          mockGraphQL(nonBillableStateGraphQLResponses());

          const task: Jobs.Parameters<Jobs.RebillSubscriptionJobPayload> = {
            shop: TEST_SHOP,
            payload: fixture as unknown as Jobs.RebillSubscriptionJobPayload,
          };

          const job = new RebillSubscriptionJob(task);

          await expect(job.perform()).resolves.not.toThrowError();
        });

        it('logs error message and terminates without throwing when the billing cycle is skipped', async () => {
          mockGraphQL(skippedBillingCycleGraphQLResponses());

          const task: Jobs.Parameters<Jobs.RebillSubscriptionJobPayload> = {
            shop: TEST_SHOP,
            payload: fixture as unknown as Jobs.RebillSubscriptionJobPayload,
          };

          const job = new RebillSubscriptionJob(task);

          await expect(job.perform()).resolves.not.toThrowError();
        });

        it('logs warning message and terminates without throwing when the billing cycle charge is before the expected date', async () => {
          mockGraphQL(billingCycleChargeBeforeExpectedDateGraphQLResponses());

          const task: Jobs.Parameters<Jobs.RebillSubscriptionJobPayload> = {
            shop: TEST_SHOP,
            payload: fixture as unknown as Jobs.RebillSubscriptionJobPayload,
          };

          const job = new RebillSubscriptionJob(task);

          await expect(job.perform()).resolves.not.toThrowError();
        });
      });
    });
  });
});
