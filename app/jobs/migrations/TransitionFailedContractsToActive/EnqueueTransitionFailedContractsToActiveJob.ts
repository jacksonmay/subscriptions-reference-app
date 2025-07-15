import {Job} from '~/lib/jobs';
import {jobs} from '~/jobs';
import {TransitionFailedContractsToActiveJob} from './TransitionFailedContractsToActiveJob';
import {findActiveBillingSchedulesInBatches} from '~/models/BillingSchedule/BillingSchedule.server';
import {logger} from '~/utils/logger.server';

export class EnqueueTransitionFailedContractsToActiveJob extends Job<{}> {
  public queue: string = 'migrations';

  async perform(): Promise<void> {
    await findActiveBillingSchedulesInBatches(async (batch) => {
      logger.info(
        `Scheduling TransitionFailedContractsToActiveJob for ${batch.length} shops`,
      );

      const enqueuePromises = batch.map((billingSchedule) =>
        jobs.enqueue(
          new TransitionFailedContractsToActiveJob({
            shop: billingSchedule.shop,
            payload: {},
          }),
        ),
      );

      await Promise.all(enqueuePromises);
    });
  }
}
