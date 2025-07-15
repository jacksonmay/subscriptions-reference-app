import type {GraphQLClient, Settings} from '~/types';
import {
  MetafieldType,
  type Metaobject,
  MetaobjectRepository,
} from '~/utils/metaobjects';
import {logger} from '~/utils/logger.server';
import {
  SETTINGS_METAOBJECT_DEFINITION,
  SETTINGS_METAOBJECT_FIELDS,
  SETTINGS_METAOBJECT_HANDLE,
} from './SettingsDefinitions';
import type {
  InventoryNotificationFrequencyTypeType,
  OnFailureTypeType,
  OnInventoryFailureTypeType,
} from '~/routes/app.settings._index/validator';

export async function ensureSettingsMetaobjectDefinitionAndObjectExists(
  graphqlClient: GraphQLClient,
) {
  const repository = new MetaobjectRepository(graphqlClient);
  await repository.createOrUpdateMetaobjectDefinition(
    SETTINGS_METAOBJECT_DEFINITION.definition,
  );
  await repository.createOrUpdateMetaobjectFields({
    handle: SETTINGS_METAOBJECT_HANDLE,
    fields: SETTINGS_METAOBJECT_FIELDS,
  });
}

export async function loadSettingsMetaobject(
  graphqlClient: GraphQLClient,
  shopDomain?: string,
): Promise<Settings> {
  const repository = new MetaobjectRepository(graphqlClient);
  try {
    const settingsMetaobject: Metaobject | undefined =
      await repository.fetchMetaobjectByHandle(SETTINGS_METAOBJECT_HANDLE);

    if (!settingsMetaobject) {
      logger.info({shopDomain}, 'Settings metaobject not found, creating it');
      throw new Error();
    }

    return settingsValuesFromMetaobject(settingsMetaobject);
  } catch (error) {
    logger.info(
      {shopDomain},
      'Settings metaobject does not exist or missing required fields',
    );

    await ensureSettingsMetaobjectDefinitionAndObjectExists(graphqlClient);
    const retrySettingsMetaobject = await repository.fetchMetaobjectByHandle(
      SETTINGS_METAOBJECT_HANDLE,
    );

    if (!retrySettingsMetaobject) {
      logger.error({shopDomain}, 'Settings metaobject could not be created');
      throw new Error('Settings metaobject could not be created');
    }

    return settingsValuesFromMetaobject(retrySettingsMetaobject);
  }
}

export async function updateSettingsMetaobject(
  graphqlClient: GraphQLClient,
  {
    id,
    retryAttempts,
    daysBetweenRetryAttempts,
    onFailure,
    inventoryRetryAttempts,
    inventoryDaysBetweenRetryAttempts,
    inventoryOnFailure,
    inventoryNotificationFrequency,
  }: Settings,
  shopDomain?: string,
) {
  const repository = new MetaobjectRepository(graphqlClient);

  const fields = [
    {
      key: 'retryAttempts',
      value: retryAttempts,
      valueType: MetafieldType.NUMBER_INTEGER,
    },
    {
      key: 'daysBetweenRetryAttempts',
      value: daysBetweenRetryAttempts,
      valueType: MetafieldType.NUMBER_INTEGER,
    },
    {
      key: 'onFailure',
      value: onFailure,
      valueType: MetafieldType.SINGLE_LINE_TEXT_FIELD,
    },
    {
      key: 'inventoryRetryAttempts',
      value: inventoryRetryAttempts,
      valueType: MetafieldType.NUMBER_INTEGER,
    },
    {
      key: 'inventoryDaysBetweenRetryAttempts',
      value: inventoryDaysBetweenRetryAttempts,
      valueType: MetafieldType.NUMBER_INTEGER,
    },
    {
      key: 'inventoryOnFailure',
      value: inventoryOnFailure,
      valueType: MetafieldType.SINGLE_LINE_TEXT_FIELD,
    },
    {
      key: 'inventoryNotificationFrequency',
      value: inventoryNotificationFrequency,
      valueType: MetafieldType.SINGLE_LINE_TEXT_FIELD,
    },
  ];

  try {
    await repository.updateMetaobject({
      id,
      fields,
    });

    return {success: true};
  } catch (error) {
    logger.error(
      `Failed to update settings metaobject with Error: ${error} on shop ${shopDomain}`,
    );
    return {success: false};
  }
}

function settingsValuesFromMetaobject(metaobject: Metaobject): Settings {
  try {
    return {
      id: metaobject.id,
      retryAttempts: Number(
        metaobject.getNumberIntegerFieldValue('retryAttempts'),
      ),
      daysBetweenRetryAttempts: Number(
        metaobject.getNumberIntegerFieldValue('daysBetweenRetryAttempts'),
      ),
      onFailure: metaobject.getSingleLineTextFieldValue(
        'onFailure',
      ) as OnFailureTypeType,
      inventoryRetryAttempts: Number(
        metaobject.getNumberIntegerFieldValue('inventoryRetryAttempts'),
      ),
      inventoryDaysBetweenRetryAttempts: Number(
        metaobject.getNumberIntegerFieldValue(
          'inventoryDaysBetweenRetryAttempts',
        ),
      ),
      inventoryOnFailure: metaobject.getSingleLineTextFieldValue(
        'inventoryOnFailure',
      ) as OnInventoryFailureTypeType,
      inventoryNotificationFrequency: metaobject.getSingleLineTextFieldValue(
        'inventoryNotificationFrequency',
      ) as InventoryNotificationFrequencyTypeType,
    };
  } catch (error) {
    throw new Error('Settings metaobject has missing or invalid fields');
  }
}
