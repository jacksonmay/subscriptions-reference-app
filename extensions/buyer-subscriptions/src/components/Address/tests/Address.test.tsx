import {mockApis} from 'tests/mocks/api';
import {mountWithAppContext} from 'tests/utilities';
import {screen, waitFor} from '@testing-library/react';

import {Address, isValidCountryCode} from '../Address';
import type {Address as AddressType} from '@shopify/address';

const {mockExtensionApi} = mockApis();

function mockFormat(address: AddressType) {
  return [
    `${address.firstName} ${address.lastName}`,
    address.address1,
    address.address2,
    `${address.city}, ${address.province} ${address.zip}`,
    address.country,
    address.phone,
  ].filter(Boolean) as string[];
}

const formatMock = vi.hoisted(() => vi.fn().mockImplementation(mockFormat));

// avoid making network calls to the address formatter
vi.mock('@shopify/address', async () => ({
  ...(await vi.importActual('@shopify/address')),
  // default export is AddressFormatter
  default: vi.fn().mockImplementation(() => ({
    constructor: vi.fn(),
    format: formatMock,
  })),
  loadCountries: vi.fn().mockResolvedValue([
    {
      code: 'CA',
      name: 'Canada',
      zones: [
        {
          code: 'ON',
          name: 'Ontario',
        },
        {
          code: 'QC',
          name: 'Quebec',
        },
      ],
    },
  ]),
}));

describe('Address', () => {
  beforeEach(() => {
    mockExtensionApi();
  });

  it('renders the formatted address', async () => {
    const address = {
      address1: '150 Elgin Street',
      address2: '8th Floor',
      firstName: 'John',
      lastName: 'Smith',
      city: 'Ottawa',
      province: 'ON',
      country: 'CA',
      zip: 'K2P1L4',
      phone: '123-456-7890',
    };

    await mountWithAppContext(<Address address={address} />);

    await waitFor(() => {
      expect(screen.getByText('John Smith')).toBeInTheDocument();
    });

    expect(screen.getByText('150 Elgin Street')).toBeInTheDocument();
    expect(screen.getByText('8th Floor')).toBeInTheDocument();
    expect(screen.getByText('Ottawa, ON K2P1L4')).toBeInTheDocument();
    expect(screen.getByText('123-456-7890')).toBeInTheDocument();
  });

  it('still formats the address if the country code is invalid', async () => {
    const address = {
      address1: '150 Elgin Street',
      address2: '8th Floor',
      firstName: 'John',
      lastName: 'Smith',
      city: 'Ottawa',
      province: 'ON',
      country: 'INVALID',
      zip: 'K2P1L4',
      phone: '123-456-7890',
    };

    await mountWithAppContext(<Address address={address} />);

    await waitFor(() => {
      expect(screen.getByText('John Smith')).toBeInTheDocument();
    });

    expect(screen.getByText('150 Elgin Street')).toBeInTheDocument();
    expect(screen.getByText('8th Floor')).toBeInTheDocument();
    // default address formatter won't turn the zone code into a name
    expect(screen.getByText('Ottawa, ON K2P1L4')).toBeInTheDocument();
    expect(screen.getByText('123-456-7890')).toBeInTheDocument();
  });

  describe('isValidCountryCode', () => {
    it('returns true if the country code is valid', async () => {
      const isValid = await isValidCountryCode('en', 'CA');
      expect(isValid).toBe(true);
    });

    it('returns false if the country code is invalid', async () => {
      const isValid = await isValidCountryCode('en', 'INVALID');
      expect(isValid).toBe(false);
    });
  });

  describe('when address formatting returns an error', () => {
    it('returns the default format', async () => {
      formatMock.mockImplementationOnce(() => {
        throw new Error('Failed to format address');
      });

      const address = {
        address1: '150 Elgin Street',
        address2: '8th Floor',
        firstName: 'John',
        lastName: 'Smith',
        city: 'Ottawa',
        province: 'ON',
        country: 'CA',
        zip: 'K2P1L4',
        phone: '123-456-7890',
      };

      await mountWithAppContext(<Address address={address} />);

      await waitFor(() => {
        expect(screen.getByText('John Smith')).toBeInTheDocument();
      });

      expect(screen.getByText('150 Elgin Street')).toBeInTheDocument();
      expect(screen.getByText('8th Floor')).toBeInTheDocument();
      expect(screen.getByText('Ottawa, ON K2P1L4')).toBeInTheDocument();
      expect(screen.getByText('123-456-7890')).toBeInTheDocument();
    });
  });
});
