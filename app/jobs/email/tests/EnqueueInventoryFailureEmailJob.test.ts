import {afterEach, beforeAll, describe, expect, it, vi} from 'vitest';
import * as factories from '#/factories';
import prisma from '~/db.server';
import type {Jobs} from '~/types';
import {jobs} from '~/jobs';
import {TEST_SHOP} from '#/constants';
import {EnqueueInventoryFailureEmailJob} from '../EnqueueInventoryFailureEmailJob';
import {SendInventoryFailureEmailJob} from '../SendInventoryFailureEmailJob';
import {unauthenticated} from '~/shopify.server';
import {mockShopifyServer} from '#/test-utils';

vi.mock('~/jobs', () => {
  const originalModule = vi.importActual('~/jobs');
  return {
    ...originalModule,
    jobs: {
      enqueue: vi.fn(),
    },
  };
});

const {graphQL} = mockShopifyServer();

describe('Enqueues inventory failure email jobs', () => {
  beforeAll(async () => {
    await prisma.billingSchedule.deleteMany();
  });

  afterEach(async () => {
    await prisma.billingSchedule.deleteMany();
    vi.restoreAllMocks();
    graphQL.mockRestore();
  });

  it('ensure that graphQL admin API is not reached', async () => {
    await factories.billingSchedule.create({
      shop: TEST_SHOP,
      hour: 10,
      timezone: 'America/Toronto',
      active: true,
    });

    const params: Jobs.SendInventoryFailureEmailParameters = {
      frequency: 'monthly',
    };

    const adminSpy = vi.spyOn(unauthenticated, 'admin');

    const job = new EnqueueInventoryFailureEmailJob(params);

    await job.perform();
    expect(adminSpy).not.toHaveBeenCalled();
  });

  it('schedules jobs for shops that have notification frequency set to monthly', async () => {
    await factories.billingSchedule.create({
      shop: 'shop-monthly-inventory-notification.myshopify.com',
      hour: 10,
      timezone: 'America/Toronto',
      active: true,
    });

    await factories.billingSchedule.create({
      shop: 'shop-monthly-2-inventory-notification.myshopify.com',
      hour: 10,
      timezone: 'America/Toronto',
      active: true,
    });

    const enqueueSpy = vi.spyOn(jobs, 'enqueue');

    const params: Jobs.SendInventoryFailureEmailParameters = {
      frequency: 'monthly',
    };

    const job = new EnqueueInventoryFailureEmailJob(params);

    await job.perform();

    expect(enqueueSpy).toHaveBeenCalledTimes(2);

    expect(enqueueSpy).toHaveBeenCalledWith(
      new SendInventoryFailureEmailJob({
        shop: 'shop-monthly-inventory-notification.myshopify.com',
        payload: {
          frequency: 'monthly',
        },
      }),
    );

    expect(enqueueSpy).toHaveBeenCalledWith(
      new SendInventoryFailureEmailJob({
        shop: 'shop-monthly-2-inventory-notification.myshopify.com',
        payload: {
          frequency: 'monthly',
        },
      }),
    );
  });

  it('schedules jobs for shops that have notification frequency set to weekly', async () => {
    await factories.billingSchedule.create({
      shop: 'shop-weekly-inventory-notification.myshopify.com',
      hour: 10,
      timezone: 'America/Toronto',
      active: true,
    });

    await factories.billingSchedule.create({
      shop: 'shop-weekly-2-inventory-notification.myshopify.com',
      hour: 10,
      timezone: 'America/Toronto',
      active: true,
    });

    const enqueueSpy = vi.spyOn(jobs, 'enqueue');

    const params: Jobs.SendInventoryFailureEmailParameters = {
      frequency: 'weekly',
    };

    const job = new EnqueueInventoryFailureEmailJob(params);

    await job.perform();

    expect(enqueueSpy).toHaveBeenCalledTimes(2);

    expect(enqueueSpy).toHaveBeenCalledWith(
      new SendInventoryFailureEmailJob({
        shop: 'shop-weekly-inventory-notification.myshopify.com',
        payload: {
          frequency: 'weekly',
        },
      }),
    );

    expect(enqueueSpy).toHaveBeenCalledWith(
      new SendInventoryFailureEmailJob({
        shop: 'shop-weekly-2-inventory-notification.myshopify.com',
        payload: {
          frequency: 'weekly',
        },
      }),
    );
  });
});
