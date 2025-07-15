import {useCallback} from 'react';
import type {Country, Address as AddressType} from '@shopify/address';
import {FieldName} from '@shopify/address';
import type {I18n} from '@shopify/ui-extensions-react/customer-account';
import {
  TextField,
  Select,
  Grid,
  Style,
  PhoneField,
} from '@shopify/ui-extensions-react/customer-account';

interface SelectOption {
  label: string;
  value: string;
}

interface AddressLineProps {
  i18n: I18n;
  countries: Country[];
  country: Country | null;
  line: FieldName[];
  address: AddressType;
  countrySelectOptions: SelectOption[];
  zoneSelectOptions: SelectOption[];
  onChange(newValue: Partial<AddressType>): void;
  formErrors: {[key in FieldName]?: string};
  disabled?: boolean;
}

export function AddressLine({
  i18n,
  line,
  countries,
  country,
  address,
  countrySelectOptions,
  zoneSelectOptions,
  onChange,
  formErrors,
  disabled,
}: AddressLineProps) {
  const displayLine = [...line];

  const handleChange = useCallback(
    (field: FieldName) => {
      return (value: string) => {
        onChange({[field]: value});
      };
    },
    [onChange],
  );

  const handleCountryChange = useCallback(
    (nextCountryCode: string) => {
      const country = countries.find(
        (country) => country.code === nextCountryCode,
      );
      onChange({
        zip: '',
        city: '',
        phone: '',
        address1: '',
        address2: '',
        country: nextCountryCode,
        province:
          country && country.zones.length > 0 ? country.zones[0].code : '',
      });
    },
    [countries, onChange],
  );

  const fields = displayLine
    .map((field) => {
      switch (field) {
        case FieldName.FirstName:
          return (
            <TextField
              key={field}
              label={
                country
                  ? country.labels.firstName
                  : i18n.translate('addressModal.firstName')
              }
              onChange={handleChange(field)}
              value={address[field]}
              error={formErrors[field]}
              disabled={disabled}
            />
          );
        case FieldName.LastName:
          return (
            <TextField
              key={field}
              label={
                country
                  ? country.labels.lastName
                  : i18n.translate('addressModal.lastName')
              }
              onChange={handleChange(field)}
              value={address[field]}
              error={formErrors[field]}
              disabled={disabled}
            />
          );
        case FieldName.Country:
          return (
            <Select
              key={field}
              label={
                country
                  ? country.labels.country
                  : i18n.translate('addressModal.country')
              }
              value={address[field]}
              options={countrySelectOptions}
              onChange={handleCountryChange}
              error={formErrors[field]}
              disabled={disabled}
              placeholder={i18n.translate('addressModal.country')}
            />
          );
        case FieldName.Address1:
          if (!country) {
            return null;
          }
          return (
            <TextField
              key={field}
              label={country.labels.address1}
              onChange={handleChange(field)}
              value={address[field]}
              error={formErrors[field]}
              disabled={disabled}
            />
          );
        case FieldName.Address2:
          if (!country) {
            return null;
          }
          return (
            <TextField
              key={field}
              label={country.optionalLabels.address2}
              onChange={handleChange(field)}
              value={address[field]}
              error={formErrors[field]}
              disabled={disabled}
            />
          );
        case FieldName.Zone:
          if (!country) {
            return null;
          }
          return (
            <Select
              key={field}
              label={country.labels.zone}
              value={address[field]}
              options={zoneSelectOptions}
              onChange={handleChange(field)}
              error={formErrors[field]}
              disabled={disabled}
            />
          );
        case FieldName.PostalCode:
          if (!country) {
            return null;
          }
          return (
            <TextField
              key={field}
              label={country.labels.postalCode}
              onChange={handleChange(field)}
              value={address[field]}
              error={formErrors[field]}
              disabled={disabled}
            />
          );
        case FieldName.City:
          if (!country) {
            return null;
          }
          return (
            <TextField
              key={field}
              label={country.labels.city}
              onChange={handleChange(field)}
              value={address[field]}
              error={formErrors[field]}
              disabled={disabled}
            />
          );
        case FieldName.Phone:
          if (!country) {
            return null;
          }
          return (
            <PhoneField
              key={field}
              label={country.labels.phone}
              onChange={handleChange(field)}
              value={address[field]}
              error={formErrors[field]}
              disabled={disabled}
            />
          );
        default:
          return null;
      }
    })
    .filter((field) => field !== null);

  return fields.length > 0 ? (
    <Grid
      columns={Style.default(['1fr']).when(
        {viewportInlineSize: {min: 'small'}},
        new Array(fields.length).fill('1fr'),
      )}
      rows="auto"
      spacing="base"
    >
      {fields}
    </Grid>
  ) : null;
}
