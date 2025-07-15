import type {AddressProps} from '~/components/Address/Address';

function MockAddress({address}: AddressProps) {
  return (
    <div>
      <p>
        {address.firstName} {address.lastName}
      </p>
      <p>{address.phone}</p>
      <p>{address.address1}</p>
      <p>{address.address2}</p>
      <p>{`${address.city} ${address.province} ${address.zip}`}</p>
      <p>{address.country}</p>
    </div>
  );
}

// the Address component uses a library that makes calls to an external service
// for address formatting data. We are mocking out this component in our tests
// to avoid making unnecessary calls to the external service.
vi.mock('~/components/Address/Address', async () => {
  const actual = await vi.importActual('~/components/Address/Address');

  return {
    ...actual,
    Address: (props: AddressProps) => <MockAddress {...props} />,
  };
});
