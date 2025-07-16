import type {ComponentProps} from 'react';
import {
  View,
  Grid,
  Heading,
  Text,
  BlockStack,
  Icon,
  Image,
  InlineStack,
  ResourceItem,
  ImageGroup,
} from '@shopify/ui-extensions-react/customer-account';
import {
  BillingCycle,
  DeliveryPolicy,
  Money,
  SubscriptionStatus,
  BillingAttemptErrorType,
} from 'types';
import {useFormatDate} from 'utilities/hooks/useFormatDate';

import {SubscriptionActions} from './components';
import {useExtensionApi} from 'foundation/Api';
import {parseGid} from '@shopify/admin-graphql-api-utilities';
import {getBillingCycleInfo} from 'utilities';

export interface SubscriptionListItemProps {
  id: string;
  lastBillingAttemptErrorType: BillingAttemptErrorType | null;
  upcomingBillingCycles: BillingCycle[];
  firstLineName: string;
  lineCount: number;
  totalQuantity: number;
  image?: {
    id?: string | null;
    altText?: string | null;
    url: string;
  } | null;
  status: SubscriptionStatus;
  deliveryPolicy: DeliveryPolicy;
  updatedAt: string;
  totalPrice?: Money | null;
  lastOrderPrice?: Money | null;
  refetchSubscriptionListData: () => void;
}

type IconSource = ComponentProps<typeof Icon>['source'];
const statusIcon: {
  [key in SubscriptionStatus]: IconSource;
} = {
  ACTIVE: 'reorder',
  PAUSED: 'disabled',
  CANCELLED: 'error',
  EXPIRED: 'error',
  FAILED: 'error',
  STALE: 'error',
};

export function SubscriptionListItem({
  upcomingBillingCycles,
  firstLineName,
  lineCount,
  totalQuantity,
  image,
  id,
  status,
  deliveryPolicy,
  updatedAt,
  totalPrice,
  lastOrderPrice,
  refetchSubscriptionListData,
  lastBillingAttemptErrorType,
}: SubscriptionListItemProps) {
  const {i18n} = useExtensionApi();
  const formatDate = useFormatDate();

  const {nextBillingDate, resumeDateIfNextCycleSkipped, cycleIndexToSkip} =
    getBillingCycleInfo(upcomingBillingCycles);

  const title =
    lineCount === 1
      ? firstLineName
      : i18n.translate('listItem.multipleItemsName', {count: totalQuantity});

  const accessibilityLabel = i18n.translate('listItem.accessibilityLabel', {
    title,
  });

  const hasInventoryError =
    lastBillingAttemptErrorType === BillingAttemptErrorType.InventoryError &&
    (status === 'ACTIVE' || status === 'FAILED');

  const nextOrderText = (() => {
    if (hasInventoryError) {
      return i18n.translate('delayed');
    }

    if (status === 'ACTIVE' && nextBillingDate) {
      return i18n.translate('nextOrder', {
        date: formatDate(nextBillingDate),
      });
    }

    return i18n.translate('lastUpdated', {
      date: formatDate(updatedAt),
    });
  })();

  return (
    <View>
      <ResourceItem
        to={`extension:/subscriptions/${parseGid(id)}`}
        actionLabel={i18n.translate('subscriptionActions.manage')}
        accessibilityLabel={accessibilityLabel}
        action={
          <SubscriptionActions
            id={id}
            status={status}
            cycleIndexToSkip={cycleIndexToSkip}
            refetchSubscriptionListData={refetchSubscriptionListData}
            resumeDate={nextBillingDate}
            lastOrderPrice={lastOrderPrice}
            nextOrderPrice={totalPrice}
            resumeDateIfNextCycleSkipped={resumeDateIfNextCycleSkipped}
          />
        }
      >
        <BlockStack>
          <View background="subdued" padding="loose" borderRadius="base">
            <Grid columns={['auto', 'fill']} spacing="tight">
              {hasInventoryError ? (
                <Icon source="info" />
              ) : (
                <Icon source={statusIcon[status]} />
              )}
              <BlockStack spacing="none">
                <Text emphasis="bold" size="small">
                  {hasInventoryError
                    ? i18n.translate('subscriptionStatus.pending')
                    : i18n.translate(
                        `subscriptionStatus.${status.toLowerCase()}`,
                      )}
                </Text>
                <Text size="small">{nextOrderText}</Text>
              </BlockStack>
            </Grid>
          </View>
          <ImageGroup totalItems={1}>
            {image?.url ? <Image source={image?.url} /> : null}
          </ImageGroup>
          <BlockStack spacing="extraTight">
            <Heading level={3}>{title}</Heading>
            <Text appearance="subdued">
              {i18n.translate(
                `deliveryInterval.${deliveryPolicy.interval.toLowerCase()}.${
                  deliveryPolicy.intervalCount?.count === 1 ? 'one' : 'other'
                }`,
                deliveryPolicy.intervalCount?.count === 1
                  ? undefined
                  : {
                      count: deliveryPolicy.intervalCount?.count,
                    },
              )}
            </Text>
            <View padding={['tight', 'none']}>
              <InlineStack blockAlignment="center">
                {totalPrice ? (
                  <Heading level={3}>
                    {i18n.formatCurrency(Number(totalPrice.amount), {
                      currency: totalPrice.currencyCode,
                      currencyDisplay: 'narrowSymbol',
                    })}
                  </Heading>
                ) : null}
              </InlineStack>
            </View>
          </BlockStack>
        </BlockStack>
      </ResourceItem>
    </View>
  );
}
