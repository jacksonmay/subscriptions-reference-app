import type {Jobs} from '~/types';
import {jobs} from '~/jobs';
import {SendInventoryFailureEmailJob} from './SendInventoryFailureEmailJob';
import {findActiveBillingSchedulesInBatches} from '~/models/BillingSchedule/BillingSchedule.server';
import {isFulfilled} from '~/utils/typeGuards/promises';
import {Job} from '~/lib/jobs';
import {IsValidInventoryNotificationFrequency} from '~/routes/app.settings._index/validator';

export class EnqueueInventoryFailureEmailJob extends Job<Jobs.SendInventoryFailureEmailParameters> {
  async perform(): Promise<void> {
    if (!IsValidInventoryNotificationFrequency(this.parameters.frequency)) {
      this.logger.error(
        {frequency: this.parameters.frequency},
        'Invalid frequency',
      );
      return;
    }

    await findActiveBillingSchedulesInBatches(async (batch) => {
      this.logger.info(
        `Scheduling SendInventoryFailureEmailJob for ${batch.length} shops`,
      );

      const results = await Promise.allSettled(
        batch.map(async (billingSchedule) => {
          const params: Jobs.Parameters<Jobs.SendInventoryFailureEmailParameters> =
            {
              shop: billingSchedule.shop,
              payload: {
                frequency: this.parameters.frequency,
              },
            };

          this.logger.info(
            {params},
            'Scheduling SendInventoryFailureEmailJob with params',
          );

          const job = new SendInventoryFailureEmailJob(params);

          try {
            await jobs.enqueue(job);
            return true;
          } catch (err) {
            const error = err instanceof Error ? err : new Error(String(err));

            this.logger.error(error);
            return false;
          }
        }),
      );

      const startedJobsCount = results.filter(
        (result) => isFulfilled(result) && result.value,
      ).length;

      this.logger.info(
        {successCount: startedJobsCount, batchCount: results.length},
        'Successfully enqueued jobs',
      );
    });
  }
}
