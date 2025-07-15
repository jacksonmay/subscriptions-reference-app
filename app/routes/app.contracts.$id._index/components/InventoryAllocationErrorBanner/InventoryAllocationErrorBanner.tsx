import {Banner, Box, InlineStack, Text, Link} from '@shopify/polaris';
import {useTranslation} from 'react-i18next';
import {formatDate} from '~/utils/helpers/date';

interface InventoryAllocationErrorBannerProps {
  billingCycleDate: string;
}

export function InventoryAllocationErrorBanner({
  billingCycleDate,
}: InventoryAllocationErrorBannerProps) {
  const {t, i18n} = useTranslation('app.contracts');

  return (
    <Box paddingBlockEnd="400">
      <Banner
        tone="warning"
        title={t('failedOrder.allocationError.title', {
          date: formatDate(billingCycleDate, i18n.language),
        })}
      >
        <InlineStack gap="200">
          <Text as="p">
            {t('failedOrder.allocationError.description', {
              settingsLink: (
                <Link monochrome url="shopify://admin/settings/shipping">
                  {t('failedOrder.allocationError.settingsLinkText')}
                </Link>
              ),
            })}
          </Text>
        </InlineStack>
      </Banner>
    </Box>
  );
}
