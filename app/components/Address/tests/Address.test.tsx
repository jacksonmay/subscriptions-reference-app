import {screen, waitFor} from '@testing-library/react';
import {mountComponentWithRemixStub} from '#/test-utils';
import {Address} from '~/components/Address/Address';
import type {Address as AddressType} from '@shopify/address';
import {describe, expect, it, vi} from 'vitest';

// Import the actual component, which is mocked globally in test/setup-address-mocks.tsx
vi.mock('~/components/Address/Address', async () => {
  return await vi.importActual('~/components/Address/Address');
});

function mockFormat(address: AddressType) {
  return [
    // Add a tag to confirm that the mock is being used
    `${address.firstName} ${address.lastName} AddressServiceMock`,
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

    mountComponentWithRemixStub(<Address address={address} />);

    await waitFor(() => {
      expect(
        screen.getByText('John Smith AddressServiceMock'),
      ).toBeInTheDocument();
    });

    expect(screen.getByText('150 Elgin Street')).toBeInTheDocument();
    expect(screen.getByText('8th Floor')).toBeInTheDocument();
    expect(screen.getByText('Ottawa, ON K2P1L4')).toBeInTheDocument();
    expect(screen.getByText('123-456-7890')).toBeInTheDocument();
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

      mountComponentWithRemixStub(<Address address={address} />);

      await waitFor(() => {
        expect(screen.getByText('John Smith')).toBeInTheDocument();
      });

      // Confirm we are using the fallback in the component,
      // not the mocked address service
      expect(screen.queryByText(/AddressServiceMock/)).not.toBeInTheDocument();
      expect(screen.getByText('150 Elgin Street')).toBeInTheDocument();
      expect(screen.getByText('8th Floor')).toBeInTheDocument();
      expect(screen.getByText('Ottawa, ON K2P1L4')).toBeInTheDocument();
      expect(screen.getByText('123-456-7890')).toBeInTheDocument();
    });
  });
});
