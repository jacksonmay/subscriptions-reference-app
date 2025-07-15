import type {FetcherWithComponents} from '@remix-run/react';
import {useFetcher} from '@remix-run/react';
import type {Address as AddressType} from '@shopify/address';
import {parseGid} from '@shopify/admin-graphql-api-utilities';
import {Modal, TitleBar} from '@shopify/app-bridge-react';
import {Banner, Box, Divider, Link, RadioButton} from '@shopify/polaris';
import {Fragment, useEffect, useState} from 'react';
import {useTranslation} from 'react-i18next';
import {Address} from '~/components/Address/Address';
import {useToasts} from '~/hooks';
import type {WithToast} from '~/types';
import type {FormattedAddressWithId} from '~/types/contracts';

export interface CustomerAddressModalProps {
  open: boolean;
  onClose: () => void;
  currentContractAddress: AddressType;
  customerAddresses: FormattedAddressWithId[];
  deliveryMethodName: string | undefined;
  customerId: string;
}

export function CustomerAddressModal({
  open,
  onClose,
  currentContractAddress,
  customerAddresses,
  deliveryMethodName,
  customerId,
}: CustomerAddressModalProps) {
  const {t} = useTranslation('app.contracts');
  const {showToasts} = useToasts();

  const isLocalDelivery =
    deliveryMethodName === 'SubscriptionDeliveryMethodLocalDelivery';

  const hasInvalidLocalDeliveryAddresses =
    isLocalDelivery &&
    customerAddresses.some((address) => !address.address.phone);

  const [selectedAddress, setSelectedAddress] = useState<string>(() => {
    // currentContractAddress does not have an ID.
    // Find the matching address in customerAddresses by comparing the address object
    // and set as the default selected address.
    const currentAddressString = JSON.stringify(currentContractAddress);
    return (
      customerAddresses.find((addressOption) => {
        return JSON.stringify(addressOption.address) === currentAddressString;
      })?.id || ''
    );
  });

  const fetcher: FetcherWithComponents<WithToast<{error?: boolean}>> =
    useFetcher();

  const isLoadingOrSubmitting =
    fetcher.state === 'loading' || fetcher.state === 'submitting';

  useEffect(() => {
    if (!isLoadingOrSubmitting) {
      showToasts(fetcher.data);

      if (fetcher.data && !fetcher.data.error) {
        onClose();
      }

      fetcher.data = undefined;
    }
  }, [fetcher, fetcher.data, isLoadingOrSubmitting, onClose, showToasts]);

  async function updateAddress() {
    const formData = new FormData();

    formData.append(
      'address',
      JSON.stringify(
        customerAddresses.find((addressOption) => {
          return addressOption.id === selectedAddress;
        })?.address,
      ),
    );

    formData.append('deliveryMethodName', deliveryMethodName || '');

    fetcher.submit(formData, {method: 'post', action: './address-update'});
  }

  return (
    <Modal open={open} onHide={onClose}>
      {hasInvalidLocalDeliveryAddresses && (
        <Box padding="400">
          <Banner tone="warning">
            {t('customerDetails.addressModal.localDeliveryBanner.content', {
              link: (
                <Link
                  target="_top"
                  url={`shopify:admin/customers/${parseGid(customerId)}`}
                >
                  {t('customerDetails.addressModal.localDeliveryBanner.link')}
                </Link>
              ),
            })}
          </Banner>
        </Box>
      )}
      {customerAddresses!.map((address) => {
        return (
          <Fragment key={address.id}>
            <Box
              paddingInlineStart="400"
              paddingBlockStart="200"
              paddingBlockEnd="200"
            >
              <RadioButton
                label={<Address address={address.address} />}
                value={address.id}
                checked={selectedAddress === address.id}
                onChange={() => setSelectedAddress(address.id)}
                disabled={isLocalDelivery && !address.address.phone}
              />
            </Box>
            <Divider />
          </Fragment>
        );
      })}
      <TitleBar title={t('customerDetails.addressModal.title')}>
        <button onClick={onClose}>
          {t('customerDetails.addressModal.actions.cancel')}
        </button>
        <button
          variant="primary"
          loading={isLoadingOrSubmitting ? '' : undefined}
          disabled={!selectedAddress}
          onClick={updateAddress}
        >
          {t('customerDetails.addressModal.actions.update')}
        </button>
      </TitleBar>
    </Modal>
  );
}
