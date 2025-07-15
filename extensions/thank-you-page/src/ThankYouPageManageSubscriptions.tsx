import {
  useApi,
  useTranslate,
  useSubscription,
  reactExtension,
  Button,
  BlockStack,
  Text,
  View,
  Heading,
  Banner,
} from '@shopify/ui-extensions-react/checkout';

export default reactExtension('purchase.thank-you.block.render', () => (
  <ThankYouPageManageSubscriptions />
));

export function ThankYouPageManageSubscriptions() {
  const translate = useTranslate();
  const {lines, shop, extension} = useApi();
  const currentLines = useSubscription(lines);
  const defaultAccountURL = `${shop.storefrontUrl}/account`;

  const isEditor = extension.editor;
  const hasSubscription = currentLines.some(
    (line) => line.merchandise.sellingPlan?.recurringDeliveries,
  );

  if (!hasSubscription && !isEditor) {
    return null;
  }

  return (
    <BlockStack spacing="base">
      {isEditor ? (
        <Banner status="info">
          This extension is only visible for orders with subscriptions.
        </Banner>
      ) : null}

      <BlockStack padding="base" border="base" borderRadius="base">
        <Heading>{translate('title')}</Heading>
        <Text>{translate('content')}</Text>
        <View>
          <Button kind="secondary" to={defaultAccountURL}>
            {translate('manageSubscriptionLink')}
          </Button>
        </View>
      </BlockStack>
    </BlockStack>
  );
}
