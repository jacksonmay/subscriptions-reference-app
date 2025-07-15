import type {MetaobjectDefinitionCreateMutationVariables} from 'types/admin.generated';
import type {
  MetaobjectAdminAccessInput,
  MetaobjectStorefrontAccess,
} from 'types/admin.types';
import {OnFailureType} from '~/routes/app.settings._index/validator';
import {MetafieldType, type NonNullMetaobjectField} from '~/utils/metaobjects';

export const SETTINGS_METAOBJECT_HANDLE = {
  type: '$app:settings',
  handle: 'subscription_settings',
};

export const SETTINGS_METAOBJECT_DEFINITION: MetaobjectDefinitionCreateMutationVariables =
  {
    definition: {
      name: 'Settings',
      description: 'Subscription app settings',
      type: SETTINGS_METAOBJECT_HANDLE.type,
      access: {
        admin: 'MERCHANT_READ' as MetaobjectAdminAccessInput,
        storefront: 'NONE' as MetaobjectStorefrontAccess,
      },
      fieldDefinitions: [
        {
          key: 'retryAttempts',
          type: MetafieldType.NUMBER_INTEGER,
          name: 'Retry attempts',
          description: 'Number of retry attempts',
          required: true,
          validations: [],
        },
        {
          key: 'daysBetweenRetryAttempts',
          type: MetafieldType.NUMBER_INTEGER,
          name: 'Days between',
          description: 'Days between payment retry attempts',
          required: true,
          validations: [],
        },
        {
          key: 'onFailure',
          type: MetafieldType.SINGLE_LINE_TEXT_FIELD,
          name: 'On failure',
          description: 'Action when all retry attempts have failed',
          required: true,
          validations: [],
        },
        {
          key: 'inventoryDaysBetweenRetryAttempts',
          type: MetafieldType.NUMBER_INTEGER,
          name: 'Days between inventory',
          description: 'Days between retry attempts for inventory errors',
          required: true,
          validations: [],
        },
        {
          key: 'inventoryRetryAttempts',
          type: MetafieldType.NUMBER_INTEGER,
          name: 'Retry attempts',
          description: 'Number of retry attempts for inventory errors',
          required: true,
          validations: [],
        },
        {
          key: 'inventoryOnFailure',
          type: MetafieldType.SINGLE_LINE_TEXT_FIELD,
          name: 'On failure',
          description: 'Action when all retry attempts have failed',
          required: true,
          validations: [],
        },
        {
          key: 'inventoryNotificationFrequency',
          type: MetafieldType.SINGLE_LINE_TEXT_FIELD,
          name: 'Notification frequency',
          description: 'Notification frequency for inventory errors',
          required: true,
          validations: [],
        },
      ],
    },
  };

const DEFAULT_RETRY_ATTEMPTS = 3;
const DEFAULT_DAYS_BETWEEN_RETRY_ATTEMPTS = 7;
const DEFAULT_ON_FAILURE = OnFailureType.cancel;
const DEFAULT_INVENTORY_DAYS_BETWEEN_RETRY_ATTEMPTS = 1;
const DEFAULT_INVENTORY_RETRY_ATTEMPTS = 5;
const DEFAULT_INVENTORY_ON_FAILURE = 'skip';
const DEFAULT_INVENTORY_NOTIFICATION_FREQUENCY = 'weekly';

export const SETTINGS_METAOBJECT_FIELDS: NonNullMetaobjectField[] = [
  {
    key: 'retryAttempts',
    value: DEFAULT_RETRY_ATTEMPTS,
    valueType: MetafieldType.NUMBER_INTEGER,
  },
  {
    key: 'daysBetweenRetryAttempts',
    value: DEFAULT_DAYS_BETWEEN_RETRY_ATTEMPTS,
    valueType: MetafieldType.NUMBER_INTEGER,
  },
  {
    key: 'onFailure',
    value: DEFAULT_ON_FAILURE,
    valueType: MetafieldType.SINGLE_LINE_TEXT_FIELD,
  },
  {
    key: 'inventoryDaysBetweenRetryAttempts',
    value: DEFAULT_INVENTORY_DAYS_BETWEEN_RETRY_ATTEMPTS,
    valueType: MetafieldType.NUMBER_INTEGER,
  },
  {
    key: 'inventoryRetryAttempts',
    value: DEFAULT_INVENTORY_RETRY_ATTEMPTS,
    valueType: MetafieldType.NUMBER_INTEGER,
  },
  {
    key: 'inventoryOnFailure',
    value: DEFAULT_INVENTORY_ON_FAILURE,
    valueType: MetafieldType.SINGLE_LINE_TEXT_FIELD,
  },
  {
    key: 'inventoryNotificationFrequency',
    value: DEFAULT_INVENTORY_NOTIFICATION_FREQUENCY,
    valueType: MetafieldType.SINGLE_LINE_TEXT_FIELD,
  },
];
