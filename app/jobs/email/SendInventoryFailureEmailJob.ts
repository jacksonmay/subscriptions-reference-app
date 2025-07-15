import type {Jobs} from '~/types';
import {Job} from '~/lib/jobs';
import {MerchantSendSubscriptionInventoryEmailService} from '~/services/MerchantSendSubscriptionInventoryEmailService';
import {loadSettingsMetaobject} from '~/models/Settings/Settings.server';
import {unauthenticated} from '~/shopify.server';
import {IsValidInventoryNotificationFrequency} from '~/routes/app.settings._index/validator';

function isEmailable(frequency: string, frequencySettings: string): boolean {
  return (
    IsValidInventoryNotificationFrequency(frequencySettings) &&
    frequencySettings === frequency
  );
}

export class SendInventoryFailureEmailJob extends Job<
  Jobs.Parameters<Jobs.SendInventoryFailureEmailParameters>
> {
  public queue: string = 'default';

  async perform(): Promise<void> {
    const {shop} = this.parameters;
    const frequency = this.parameters.payload.frequency;

    const {admin} = await unauthenticated.admin(shop);
    const settings = await loadSettingsMetaobject(admin.graphql);

    if (!settings) {
      this.logger.error(
        {
          shopDomain: shop,
          frequency: frequency,
        },
        'Failed to load settings from metaobject for shop',
      );
      return;
    }

    if (isEmailable(frequency, settings.inventoryNotificationFrequency)) {
      this.logger.info(
        {
          shopDomain: shop,
          frequency: frequency,
        },
        'Sending email with MerchantSendSubscriptionInventoryEmailService',
      );

      await new MerchantSendSubscriptionInventoryEmailService().run(shop);
    } else {
      this.logger.info(
        {
          shopDomain: shop,
          frequency: frequency,
        },
        'Skipping inventory failure email because job frequency does not match shop setting',
      );
    }
  }
}
