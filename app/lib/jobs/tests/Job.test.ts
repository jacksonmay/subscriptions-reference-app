import {HttpResponseError} from '@shopify/shopify-api';
import {SessionNotFoundError} from '@shopify/shopify-app-remix/server';
import {describe, expect, it} from 'vitest';
import {Job} from '../Job';

class FailureJob extends Job {
  async perform() {
    throw new Error('Failed FailureJob');
  }
}

class UnauthorizedJob extends Job {
  async perform() {
    throw new HttpResponseError({
      code: 401,
      message: 'Unauthorized',
      statusText: '401 Unauthorized',
    });
  }
}

class ShopUnavailableJob extends Job {
  async perform() {
    throw new HttpResponseError({
      code: 402,
      message: 'Payment Required',
      statusText: '402 Payment Required',
    });
  }
}

class NoAccessJob extends Job {
  async perform() {
    throw new HttpResponseError({
      code: 403,
      message: 'Forbidden',
      statusText: '403 Forbidden',
    });
  }
}

class NotFoundJob extends Job {
  async perform() {
    throw new HttpResponseError({
      code: 404,
      message: 'Not Found',
      statusText: '404 Not Found',
    });
  }
}

class LockedJob extends Job {
  async perform() {
    throw new HttpResponseError({
      code: 423,
      message: 'Locked',
      statusText: '423 Locked',
    });
  }
}

class RateLimitedJob extends Job {
  async perform() {
    throw new HttpResponseError({
      code: 429,
      message: 'Rate Limited',
      statusText: '429 Rate Limited',
    });
  }
}

class AppUninstalledJob extends Job {
  async perform() {
    throw new SessionNotFoundError('Session does not exist');
  }
}

describe('Job', () => {
  describe.each([
    [401, UnauthorizedJob],
    [402, ShopUnavailableJob],
    [403, NoAccessJob],
    [404, NotFoundJob],
    [423, LockedJob],
  ])(
    'when the job fails with a non-retryable http response error %s',
    (code, Job) => {
      it('does not throw', async () => {
        const job = new Job({});
        await expect(job.run()).resolves.not.toThrowError();
      });
    },
  );

  describe('when the job fails with a session not found error', () => {
    it('does not throw', async () => {
      const job = new AppUninstalledJob({});
      await expect(job.run()).resolves.not.toThrowError();
    });
  });

  describe('when the job fails with an unexpected error', () => {
    it('throws that error', async () => {
      const job = new FailureJob({});
      await expect(job.run()).rejects.toThrow(new Error('Failed FailureJob'));
    });
  });

  describe('when the job fails with a retryable http response error', () => {
    it('throws that error', async () => {
      const job = new RateLimitedJob({});
      await expect(job.run()).rejects.toThrow(
        new HttpResponseError({
          code: 429,
          message: 'Rate Limited',
          statusText: '429 Rate Limited',
        }),
      );
    });
  });
});
