import {useState, useEffect} from 'react';
import {BlockStack, Text} from '@shopify/ui-extensions-react/customer-account';
import type {Address as AddressType} from '@shopify/address';
import AddressFormatter, {loadCountries} from '@shopify/address';
import {useExtensionApi} from 'foundation/Api';

export interface AddressProps {
  address: AddressType;
}

export function Address({address}: AddressProps) {
  const formattedAddress = useFormattedAddress(address);

  return formattedAddress ? (
    <BlockStack spacing="none">
      {formattedAddress.map((line) => (
        <Text key={line}>{line}</Text>
      ))}
    </BlockStack>
  ) : null;
}

export function useFormattedAddress(address: AddressType) {
  const {localization} = useExtensionApi();
  const locale = localization.extensionLanguage.current.isoCode;

  const [formattedAddress, setFormattedAddress] = useState<string[] | null>(
    null,
  );

  useEffect(() => {
    let isMounted = true;
    const addressFormatter = new AddressFormatter(locale);

    async function formatAddress() {
      try {
        // avoid passing in invalid country codes to the address formatter
        const isValidCountry = await isValidCountryCode(
          locale,
          address.country,
        );

        const formattedAddress = isValidCountry
          ? await addressFormatter.format(address)
          : defaultFormatAddress(address);

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
      isMounted = false;
    };
  }, [address, locale]);

  return formattedAddress;
}

/**
 * Checks if a country code is valid for the given locale.
 * @param locale - The locale to check the country code for.
 * @param countryCode - The country code to check.
 * @returns True if the country code is valid, false otherwise.
 */
export async function isValidCountryCode(locale: string, countryCode?: string) {
  if (!countryCode) {
    return false;
  }

  const validCodes = (await loadCountries(locale)).map(({code}) => code);

  return validCodes.includes(countryCode);
}

/**
 * Formats an address with the default format.
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
