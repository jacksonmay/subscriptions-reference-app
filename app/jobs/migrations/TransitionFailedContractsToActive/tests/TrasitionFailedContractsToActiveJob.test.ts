import {mockShopifyServer} from '#/test-utils';
import {afterEach, describe, expect, it} from 'vitest';
import {TransitionFailedContractsToActiveJob} from '../TransitionFailedContractsToActiveJob';
import type {Jobs} from '~/types';
import {TEST_SHOP} from '../../../../../test/constants';
import SubscriptionContractResume from '~/graphql/SubscriptionContractResumeMutation';

function defaultGraphQLResponses() {
  return {
    SubscriptionContracts: {
      data: {
        subscriptionContracts: {
          edges: [
            {
              node: {
                id: '1',
                status: 'FAILED',
                lines: {
                  edges: [],
                },
              },
            },
            {
              node: {
                id: '2',
                status: 'FAILED',
                lines: {
                  edges: [],
                },
              },
            },
            {
              node: {
                id: '3',
                status: 'FAILED',
                lines: {
                  edges: [],
                },
              },
            },
            {
              node: {
                id: '4',
                status: 'FAILED',
                lines: {
                  edges: [],
                },
              },
            },
            {
              node: {
                id: '5',
                status: 'FAILED',
                lines: {
                  edges: [],
                },
              },
            },
          ],
          pageInfo: {
            hasNextPage: false,
            hasPreviousPage: false,
            endCursor: '',
            startCursor: '',
          },
          userErrors: [],
        },
      },
    },
  };
}

const {mockGraphQL, graphQL} = mockShopifyServer();

describe('TransitionFailedContractsToActiveJob', () => {
  afterEach(() => {
    graphQL.mockRestore();
  });

  it('retrieves all failed contracts', async () => {
    const mockResponses = defaultGraphQLResponses();

    mockGraphQL(mockResponses);

    const task: Jobs.Parameters<{}> = {
      shop: TEST_SHOP,
      payload: {},
    };

    const job = new TransitionFailedContractsToActiveJob(task);

    const failedContractIds = await job.getAllFailedContractIds(graphQL);

    expect(failedContractIds).toEqual(['1', '2', '3', '4', '5']);
  });

  it('does not call update mutation when there are no contracts', async () => {
    mockGraphQL({
      SubscriptionContracts: {
        data: {
          subscriptionContracts: {
            edges: [],
            pageInfo: {
              hasNextPage: false,
              hasPreviousPage: false,
              endCursor: '',
              startCursor: '',
            },
            userErrors: [],
          },
        },
      },
    });

    const task: Jobs.Parameters<{}> = {
      shop: TEST_SHOP,
      payload: {},
    };

    const job = new TransitionFailedContractsToActiveJob(task);

    await job.perform();

    expect(graphQL).not.toHavePerformedGraphQLOperation(
      SubscriptionContractResume,
    );
  });
});
