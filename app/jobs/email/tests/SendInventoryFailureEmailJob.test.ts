import {afterEach, describe, expect, it, vi} from 'vitest';
import * as factories from '#/factories';
import type {Jobs} from '~/types';
import {SendInventoryFailureEmailJob} from '../SendInventoryFailureEmailJob';
import {loadSettingsMetaobject} from '~/models/Settings/Settings.server';
import {MerchantSendSubscriptionInventoryEmailService} from '~/services/MerchantSendSubscriptionInventoryEmailService';

vi.mock(
  '~/services/MerchantSendSubscriptionInventoryEmailService',
  async (importOriginal) => {
    const original: any = await importOriginal();
    const MerchantSendSubscriptionInventoryEmailService = vi.fn();
    MerchantSendSubscriptionInventoryEmailService.prototype.run = vi
      .fn()
      .mockResolvedValue(undefined);

    return {...original, MerchantSendSubscriptionInventoryEmailService};
  },
);

vi.mock('~/shopify.server', async (original) => {
  const {sessionStorage}: any = await original();
  return {
    sessionStorage,
    unauthenticated: {
      admin: vi.fn().mockResolvedValue({admin: vi.fn()}),
    },
  };
});

vi.mock('~/models/Settings/Settings.server.ts', () => {
  return {loadSettingsMetaobject: vi.fn()};
});

describe('SendInventoryFailureEmailJob', () => {
  afterEach(async () => {
    vi.clearAllMocks();
  });

  it('runs no job when settings are undefined', async () => {
    const params: Jobs.Parameters<Jobs.SendInventoryFailureEmailParameters> = {
      shop: 'test-shop.myshopify.com',
      payload: {
        frequency: 'weekly',
      },
    };

    const job = new SendInventoryFailureEmailJob(params);
    await job.perform();

    expect(loadSettingsMetaobject).toHaveBeenCalled();
  });

  it('when settings is weekly and the task frequency is monthly, it should not send an email', async () => {
    const settings = factories.settings.build();
    vi.mocked(loadSettingsMetaobject).mockResolvedValueOnce(settings);

    settings['inventoryNotificationFrequency'] = 'weekly';

    const params: Jobs.Parameters<Jobs.SendInventoryFailureEmailParameters> = {
      shop: 'shop.myshopify.com',
      payload: {
        frequency: 'monthly',
      },
    };

    const job = new SendInventoryFailureEmailJob(params);

    await job.perform();

    expect(loadSettingsMetaobject).toHaveBeenCalled();
    expect(
      MerchantSendSubscriptionInventoryEmailService.prototype.run,
    ).not.toHaveBeenCalled();
  });

  it('when settings is monthly and the task frequency is weekly, it should not send an email', async () => {
    const settings = factories.settings.build();
    vi.mocked(loadSettingsMetaobject).mockResolvedValueOnce(settings);

    settings['inventoryNotificationFrequency'] = 'monthly';

    const params: Jobs.Parameters<Jobs.SendInventoryFailureEmailParameters> = {
      shop: 'shop.myshopify.com',
      payload: {
        frequency: 'weekly',
      },
    };

    const job = new SendInventoryFailureEmailJob(params);

    await job.perform();

    expect(loadSettingsMetaobject).toHaveBeenCalled();
    expect(
      MerchantSendSubscriptionInventoryEmailService.prototype.run,
    ).not.toHaveBeenCalled();
  });

  it('when settings is weekly and the task frequency is weekly, it should send an email', async () => {
    const settings = factories.settings.build();
    vi.mocked(loadSettingsMetaobject).mockResolvedValueOnce(settings);

    settings['inventoryNotificationFrequency'] = 'weekly';

    const params: Jobs.Parameters<Jobs.SendInventoryFailureEmailParameters> = {
      shop: 'shop.myshopify.com',
      payload: {
        frequency: 'weekly',
      },
    };

    const job = new SendInventoryFailureEmailJob(params);

    await job.perform();

    expect(loadSettingsMetaobject).toHaveBeenCalled();
    expect(
      MerchantSendSubscriptionInventoryEmailService.prototype.run,
    ).toHaveBeenCalledOnce();
  });

  it('when settings is monthly and the task frequency is monthly, it should send an email', async () => {
    const settings = factories.settings.build();
    vi.mocked(loadSettingsMetaobject).mockResolvedValueOnce(settings);

    settings['inventoryNotificationFrequency'] = 'monthly';

    const params: Jobs.Parameters<Jobs.SendInventoryFailureEmailParameters> = {
      shop: 'shop.myshopify.com',
      payload: {
        frequency: 'monthly',
      },
    };

    const job = new SendInventoryFailureEmailJob(params);

    await job.perform();

    expect(loadSettingsMetaobject).toHaveBeenCalled();
    expect(
      MerchantSendSubscriptionInventoryEmailService.prototype.run,
    ).toHaveBeenCalledOnce();
  });
});
