import db from '~/db.server';
import ShopQuery from '~/graphql/ShopQuery';
import {Job} from '~/lib/jobs';
import {unauthenticated} from '~/shopify.server';
import type {Jobs} from '~/types';

export class DisableShopJob extends Job<Jobs.Parameters<{}>> {
  public queue: string = 'webhooks';

  async perform(): Promise<void> {
    const {shop} = this.parameters;

    const emptyAccessToken = await this.hasEmptyAccessToken(shop);

    if (!emptyAccessToken && (await this.appInstalled(shop))) {
      this.logger.info('App is installed, skipping disableShop');
      return;
    }

    await this.disableShop(shop);
  }

  private async disableShop(shop: string) {
    await db.session.deleteMany({where: {shop}});
    await db.billingSchedule.updateMany({where: {shop}, data: {active: false}});
  }

  private async hasEmptyAccessToken(shop: string) {
    const emptyAccessToken = await db.session.findFirst({
      where: {
        accessToken: '',
        shop,
      },
    });
    const isAccessTokenEmpty = emptyAccessToken !== null;
    this.logger.info(
      {shop, isAccessTokenEmpty},
      'Checking for empty access token',
    );
    return isAccessTokenEmpty;
  }

  private async appInstalled(shop: string) {
    const {admin} = await unauthenticated.admin(shop);

    try {
      await admin.graphql(ShopQuery);
    } catch (error) {
      this.logger.warn({error}, 'Failed to query shop');
      if ((error as any)?.response?.code == 401) {
        return false;
      }
      throw error;
    }

    return true;
  }
}
