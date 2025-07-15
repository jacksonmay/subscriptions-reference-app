import type {Address} from '@shopify/address';
import {FieldName} from '@shopify/address';
import type {CountryCode} from 'generatedTypes/customer.types';
import type {
  DeliveryOption,
  ShippingOption,
  PickupOption,
  LocalDeliveryOption,
} from 'types';

interface FormError {
  field?: string[] | null;
  message: string;
}

export interface FormattedPhoneNumber {
  inputPhoneNumber: string;
  inputRegionCode: string | undefined;

  forcedFormattedPhoneNumber: string | undefined;
  detectedRegionCode: string | undefined;
  isValid: boolean;
  formattedPhoneNumber: string;
  countryCodeForRegion?: number;
}

export function formatUserErrorsForFields(submitErrors: FormError[]) {
  const errors: {[key in FieldName]?: string} = {};
  const addressFieldNames = Object.values<string>(FieldName);
  submitErrors.forEach((userError) => {
    if (userError.field && userError.field.length > 0) {
      const field = userError.field[0];
      if (field === 'zoneCode') {
        errors.province = userError.message;
      } else if (field === 'countryCode') {
        errors.country = userError.message;
      } else if (addressFieldNames.includes(field)) {
        errors[field as FieldName] = userError.message;
      }
    }
  });

  return errors;
}

export function deliveryOptionIsShipping(
  deliveryOption: DeliveryOption,
): deliveryOption is ShippingOption {
  return deliveryOption.__typename === 'SubscriptionShippingOption';
}

export function deliveryOptionIsLocalDelivery(
  deliveryOption: DeliveryOption,
): deliveryOption is LocalDeliveryOption {
  return deliveryOption.__typename === 'SubscriptionLocalDeliveryOption';
}

export function deliveryOptionIsLocalPickup(
  deliveryOption: DeliveryOption,
): deliveryOption is PickupOption {
  return deliveryOption.__typename === 'SubscriptionPickupOption';
}

export function createBlankAddress(country: CountryCode): Address {
  return {
    address1: '',
    address2: '',
    city: '',
    zip: '',
    country,
  };
}
