import '@shopify/shopify-app-remix/adapters/node';

import {createActiveBillingSchedule} from '~/models/BillingSchedule/BillingSchedule.server';
import {logger} from '~/utils/logger.server';

import {ensureSettingsMetaobjectDefinitionAndObjectExists} from '~/models/Settings/Settings.server';

export class AfterAuthService {
  steps: Function[] = [
    async function createActiveBillingScheduleStep(this: AfterAuthService) {
      await createActiveBillingSchedule(this.session.shop);
    },

    async function ensureSettingsMetaobjectStep(this: AfterAuthService) {
      await ensureSettingsMetaobjectDefinitionAndObjectExists(
        this.admin.graphql,
      );
    },
  ];

  // eslint-disable-next-line no-useless-constructor
  constructor(
    private session: any,
    private admin: any,
  ) {}

  public async run() {
    const response = await Promise.allSettled(
      this.steps.map((step) => step.bind(this)()),
    );

    response.forEach((result, index) => {
      if (result.status === 'rejected') {
        const stepName = this.steps[index].name;
        logger.error(
          {shop: this.session.shop, step: stepName},
          `Initial step "${stepName}" failed with "${result.reason}"`,
        );
      }
    });
  }
}
