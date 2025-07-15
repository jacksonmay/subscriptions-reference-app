import {TransitionFailedContractsToActiveJob} from '../TransitionFailedContractsToActiveJob';

import type {Mock} from 'vitest';
import {beforeEach, describe, expect, it, vi} from 'vitest';
import {jobs} from '~/jobs';
import {findActiveBillingSchedulesInBatches} from '~/models/BillingSchedule/BillingSchedule.server';
import {EnqueueTransitionFailedContractsToActiveJob} from '../EnqueueTransitionFailedContractsToActiveJob';

vi.mock('~/models/BillingSchedule/BillingSchedule.server', () => ({
  findActiveBillingSchedulesInBatches: vi.fn(),
}));

describe('EnqueueTransitionFailedContractsToActiveJob', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('should enqueue a TransitionFailedContractsToActiveJob for each shop with active billing schedules', async () => {
    const testBatch = [
      {shop: 'shop-billable-1.myshopify.com'},
      {shop: 'shop-billable-2.myshopify.com'},
    ];

    const enqueueSpy = vi.spyOn(jobs, 'enqueue');

    (findActiveBillingSchedulesInBatches as Mock).mockImplementation(
      async (callback) => {
        await callback(testBatch);
      },
    );

    const job = new EnqueueTransitionFailedContractsToActiveJob({});
    await job.perform();

    expect(findActiveBillingSchedulesInBatches).toHaveBeenCalled();
    expect(enqueueSpy).toHaveBeenCalledTimes(testBatch.length);

    testBatch.forEach((billingSchedule) => {
      expect(enqueueSpy).toHaveBeenCalledWith(
        expect.objectContaining(
          new TransitionFailedContractsToActiveJob({
            shop: billingSchedule.shop,
            payload: {},
          }),
        ),
      );
    });
  });

  it('should not enqueue a TransitionFailedContractsToActiveJob for shops with no active billing schedules', async () => {
    const enqueueSpy = vi.spyOn(jobs, 'enqueue');

    (findActiveBillingSchedulesInBatches as Mock).mockImplementation(
      async (callback) => {
        await callback([]);
      },
    );

    const job = new EnqueueTransitionFailedContractsToActiveJob({});
    await job.perform();

    expect(findActiveBillingSchedulesInBatches).toHaveBeenCalled();
    expect(enqueueSpy).not.toHaveBeenCalled();
  });
});
