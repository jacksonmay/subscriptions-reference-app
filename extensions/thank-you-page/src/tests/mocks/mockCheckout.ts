import {vi} from 'vitest';

import type {ApiForExtension, CartLine} from '@shopify/ui-extensions/checkout';

import translations from '../../../locales/en.default.json';
import {createMockI18n} from '../../../../shared/mocks/i18n';

import * as componentMocks from './mockExtensionComponents';

const mockUseApi = vi.hoisted(() => {
  return vi.fn<() => ApiForExtension<'purchase.thank-you.block.render'>>();
});
const mockUseSubscription = vi.hoisted(() => {
  return vi.fn<() => CartLine[]>();
});

vi.mock('@shopify/ui-extensions-react/checkout', async () => ({
  ...(await vi.importActual('@shopify/ui-extensions-react/checkout')),
  ...componentMocks,
  useApi: mockUseApi,
  useSubscription: mockUseSubscription,
  useTranslate: vi.fn().mockReturnValue(createMockI18n(translations).translate),
}));

const subscriptionLine = {
  id: '1',
  merchandise: {sellingPlan: {recurringDeliveries: true}},
} as any as CartLine;
const nonSubscriptionLine = {
  id: '2',
  merchandise: {sellingPlan: {recurringDeliveries: false}},
} as any as CartLine;

export function mockApi(options?: {
  subscription?: boolean;
  nonSubscription?: boolean;
  editor?: boolean;
}) {
  const lines = [
    ...(options?.subscription ? [subscriptionLine] : []),
    ...(options?.nonSubscription ? [nonSubscriptionLine] : []),
  ];

  mockUseApi.mockReturnValue({
    lines,
    shop: {storefrontUrl: 'https://test.myshopify.io'},
    extension: {editor: options?.editor ?? false},
  } as any);

  mockUseSubscription.mockReturnValue(lines);
}
