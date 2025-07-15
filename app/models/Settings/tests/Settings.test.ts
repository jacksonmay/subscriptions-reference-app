import {mockShopifyServer} from '#/test-utils';
import {describe, expect, it} from 'vitest';
import {authenticate} from '~/shopify.server';
import {
  loadSettingsMetaobject,
  updateSettingsMetaobject,
} from '../Settings.server';
import MetaobjectUpdate from '~/graphql/MetaobjectUpdateMutation';
import {TEST_SHOP} from '#/constants';
import MetaobjectRepository from '~/utils/metaobjects/MetaobjectRepository';

const createOrUpdateMetaobjectDefinitionMock = vi
  .spyOn(MetaobjectRepository.prototype, 'createOrUpdateMetaobjectDefinition')
  .mockResolvedValue({
    id: 'gid://shopify/MetaobjectDefinition/1',
    fieldDefinitions: [],
  });

const createOrUpdateMetaobjectFieldsMock = vi
  .spyOn(MetaobjectRepository.prototype, 'createOrUpdateMetaobjectFields')
  .mockResolvedValue({
    id: 'gid://shopify/Metaobject/1',
    fields: [],
  } as any);

const {graphQL, mockGraphQL, sequentiallyMockGraphQL} = mockShopifyServer();

const {admin} = await authenticate.admin(new Request('https://foo.bar'));
const shopDomain = TEST_SHOP;

describe('Settings', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });
  describe('updateSettingsMetaobject', () => {
    it('updates the settings and returns userErrors', async () => {
      const userErrors = [
        {
          field: ['retryAttempts'],
          message: 'Retry attempts must be a number',
        },
      ];

      mockGraphQL({
        MetaobjectUpdate: {
          data: {
            metaobjectUpdate: {
              metaobject: {
                id: 'gid://shopify/Metaobject/1',
              },
              userErrors,
            },
          },
        },
      });

      const result = await updateSettingsMetaobject(
        admin.graphql,
        {
          id: 'gid://shopify/Metaobject/1',
          retryAttempts: 3,
          daysBetweenRetryAttempts: 7,
          onFailure: 'cancel',
          inventoryRetryAttempts: 3,
          inventoryDaysBetweenRetryAttempts: 7,
          inventoryOnFailure: 'skip',
          inventoryNotificationFrequency: 'monthly',
        },
        shopDomain,
      );

      expect(result).toEqual({success: false});
      expect(graphQL).toHavePerformedGraphQLOperation(MetaobjectUpdate, {
        variables: {
          id: 'gid://shopify/Metaobject/1',
          metaobject: {
            fields: [
              {key: 'retryAttempts', value: '3'},
              {key: 'daysBetweenRetryAttempts', value: '7'},
              {key: 'onFailure', value: 'cancel'},
              {key: 'inventoryRetryAttempts', value: '3'},
              {key: 'inventoryDaysBetweenRetryAttempts', value: '7'},
              {key: 'inventoryOnFailure', value: 'skip'},
              {key: 'inventoryNotificationFrequency', value: 'monthly'},
            ],
          },
        },
      });
    });
  });

  describe('loadSettingsMetaobject', () => {
    it('adds missing fields to metaobject', async () => {
      sequentiallyMockGraphQL([
        {
          MetaobjectByHandle: {
            data: {
              metaobjectByHandle: {
                id: 'gid://shopify/Metaobject/1',
                fields: [
                  {key: 'retryAttempts', value: '3', type: 'number_integer'},
                  {
                    key: 'daysBetweenRetryAttempts',
                    value: null,
                    type: 'number_integer',
                  },
                  {
                    key: 'onFailure',
                    value: 'cancel',
                    type: 'single_line_text_field',
                  },
                  {
                    key: 'inventoryRetryAttempts',
                    value: '3',
                    type: 'number_integer',
                  },
                  {
                    key: 'inventoryDaysBetweenRetryAttempts',
                    value: '7',
                    type: 'number_integer',
                  },
                  {
                    key: 'inventoryOnFailure',
                    value: 'skip',
                    type: 'single_line_text_field',
                  },
                  {
                    key: 'inventoryNotificationFrequency',
                    value: 'monthly',
                    type: 'single_line_text_field',
                  },
                ],
              },
            },
          },
        },
        {
          MetaobjectByHandle: {
            data: {
              metaobjectByHandle: {
                id: 'gid://shopify/Metaobject/1',
                fields: [
                  {key: 'retryAttempts', value: '3', type: 'number_integer'},
                  {
                    key: 'daysBetweenRetryAttempts',
                    value: '4',
                    type: 'number_integer',
                  },
                  {
                    key: 'onFailure',
                    value: 'cancel',
                    type: 'single_line_text_field',
                  },
                  {
                    key: 'inventoryRetryAttempts',
                    value: '3',
                    type: 'number_integer',
                  },
                  {
                    key: 'inventoryDaysBetweenRetryAttempts',
                    value: '7',
                    type: 'number_integer',
                  },
                  {
                    key: 'inventoryOnFailure',
                    value: 'skip',
                    type: 'single_line_text_field',
                  },
                  {
                    key: 'inventoryNotificationFrequency',
                    value: 'monthly',
                    type: 'single_line_text_field',
                  },
                ],
              },
            },
          },
        },
      ]);

      await loadSettingsMetaobject(admin.graphql, shopDomain);

      expect(createOrUpdateMetaobjectDefinitionMock).toHaveBeenCalledTimes(1);
      expect(createOrUpdateMetaobjectFieldsMock).toHaveBeenCalledTimes(1);
    });
    it('creates a new metaobject if it does not exist', async () => {
      sequentiallyMockGraphQL([
        {
          MetaobjectByHandle: {
            data: null,
          },
        },
        {
          MetaobjectByHandle: {
            data: {
              metaobjectByHandle: {
                id: 'gid://shopify/Metaobject/1',
                fields: [
                  {key: 'retryAttempts', value: '3', type: 'number_integer'},
                  {
                    key: 'daysBetweenRetryAttempts',
                    value: '4',
                    type: 'number_integer',
                  },
                  {
                    key: 'onFailure',
                    value: 'cancel',
                    type: 'single_line_text_field',
                  },
                  {
                    key: 'inventoryRetryAttempts',
                    value: '3',
                    type: 'number_integer',
                  },
                  {
                    key: 'inventoryDaysBetweenRetryAttempts',
                    value: '7',
                    type: 'number_integer',
                  },
                  {
                    key: 'inventoryOnFailure',
                    value: 'skip',
                    type: 'single_line_text_field',
                  },
                  {
                    key: 'inventoryNotificationFrequency',
                    value: 'monthly',
                    type: 'single_line_text_field',
                  },
                ],
              },
            },
          },
        },
      ]);

      await loadSettingsMetaobject(admin.graphql, shopDomain);

      expect(createOrUpdateMetaobjectDefinitionMock).toHaveBeenCalledTimes(1);
      expect(createOrUpdateMetaobjectFieldsMock).toHaveBeenCalledTimes(1);
    });
  });
});
