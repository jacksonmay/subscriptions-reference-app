import {describe, expect, it, vi} from 'vitest';
import {render, screen} from '@testing-library/react';

import {mockApi} from 'tests/mocks/mockCheckout';

import {ThankYouPageManageSubscriptions} from 'src/ThankYouPageManageSubscriptions';

describe('ThankYouPageManageSubscriptions', () => {
  const component = <ThankYouPageManageSubscriptions />;

  beforeEach(() => {
    mockApi();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('renders the component when there is a subscription, and does not show the notice banner', async () => {
    mockApi({subscription: true, editor: false});

    render(component);

    expect(
      screen.getByRole('button', {name: 'Manage your subscription'}),
    ).toBeInTheDocument();
    expect(
      screen.queryByText(
        'This extension is only visible for orders with subscriptions.',
      ),
    ).not.toBeInTheDocument();
  });

  it('renders the component in the editor, and shows the notice banner', async () => {
    mockApi({editor: true});

    render(component);

    expect(
      screen.getByText(
        'This extension is only visible for orders with subscriptions.',
      ),
    ).toBeInTheDocument();
  });

  it('does not render the component when there is no subscription', async () => {
    mockApi({subscription: false, editor: false, nonSubscription: true});

    render(component);

    expect(
      screen.queryByRole('button', {name: 'Manage your subscription'}),
    ).not.toBeInTheDocument();
  });
});
