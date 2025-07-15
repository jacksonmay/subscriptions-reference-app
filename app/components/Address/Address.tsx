import type {Address as AddressType} from '@shopify/address';
import AddressFormatter from '@shopify/address';
import {BlockStack, Text} from '@shopify/polaris';
import {useEffect, useRef, useState} from 'react';
import {useTranslation} from 'react-i18next';

export interface AddressProps {
  address: AddressType;
}

export function Address({address}: AddressProps) {
  const formattedAddress = useFormattedAddress(address);

  return formattedAddress ? (
    <BlockStack gap="0">
      {formattedAddress.map((line) => (
        <Text as="p" key={line}>
          {line}
        </Text>
      ))}
    </BlockStack>
  ) : null;
}

function useFormattedAddress(address: AddressType) {
  const {i18n} = useTranslation();
  const locale = i18n.language;

  const [formattedAddress, setFormattedAddress] = useState<string[] | null>(
    null,
  );

  const isMounted = useRef(false);

  useEffect(() => {
    isMounted.current = true;
    const addressFormatter = new AddressFormatter(locale);

    async function formatAddress() {
      try {
        const formattedAddress = await addressFormatter.format(address);

        // prevent state updates to formattedAddress if the component is unmounted
        if (isMounted) {
          setFormattedAddress(formattedAddress.filter(Boolean));
        }
      } catch (error) {
        // Rescue error when formatting address and return default format
        if (isMounted) {
          setFormattedAddress(defaultFormatAddress(address));
        }
      }
    }

    formatAddress();

    return () => {
      isMounted.current = false;
    };
  }, [address, locale]);

  return formattedAddress;
}

/**
 * Converts an address to a fallback format when the formatting service fails.
 * @param address - The address to format.
 * @returns The formatted address.
 */
function defaultFormatAddress(address: AddressType): string[] {
  return [
    `${address.firstName || ''} ${address.lastName || ''}`.trim(),
    address.address1,
    address.address2,
    `${address.city || ''}, ${address.province || ''} ${address.zip || ''}`.trim(),
    address.country,
    address.phone,
  ].filter(Boolean) as string[];
}
