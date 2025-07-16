import {
  mockShopifyServer,
  mountRemixStubWithAppContext,
  wait,
  waitForGraphQL,
} from '#/test-utils';
import {faker} from '@faker-js/faker';
import {composeGid, parseGid} from '@shopify/admin-graphql-api-utilities';
import {screen} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {mockShopify} from '#/setup-app-bridge';
import type {
  CurrencyCode,
  DiscountTargetType,
  SellingPlanInterval,
  SellingPlanPricingPolicyAdjustmentType,
  SubscriptionBillingAttemptErrorCode,
  SubscriptionBillingAttemptInsufficientStockProductVariantsError,
  SubscriptionBillingCycleBillingCycleStatus,
  SubscriptionContractSubscriptionStatus,
  SubscriptionContractLastBillingErrorType,
  CountryCode,
} from 'types/admin.types';
import {afterEach, describe, expect, it, vi} from 'vitest';
import {formatPrice} from '~/utils/helpers/money';
import {SubscriptionContractStatus, BillingAttemptErrorType} from '~/types';
import {action as pauseAction} from '../../app.contracts.$id.pause/route';
import {action as resumeAction} from '../../app.contracts.$id.resume/route';
import {action as billAttemptAction} from '../../app.contracts.$id.bill-contract/route';
import {action as pollBillAttemptAction} from '../../app.contracts.$id.poll-bill-attempt/route';
import ContractsDetailsPage, {loader} from '../route';
import {
  createGraphQLLocalDeliveryDeliveryMethod,
  createGraphQLPickupDeliveryMethod,
  createMockBillingCycles,
  createMockSubscriptionContract,
  generateSubscriptionContractLineNode,
  type SubscriptionContractDetailsGraphQLType,
} from './Fixtures';
import {formatDate} from '~/utils/helpers/date';
import SubscriptionBillingCycleChargeIndexMutation from '~/graphql/SubscriptionBillingCycleChargeIndexMutation';

vi.stubGlobal('shopify', mockShopify);

const defaultContract = createMockSubscriptionContract({
  subscriptionContract: {id: 'gid://1'},
});
const pausedContract = createMockSubscriptionContract({
  subscriptionContract: {
    id: 'gid://1',
    status:
      SubscriptionContractStatus.Paused as SubscriptionContractSubscriptionStatus,
  },
});
const mockBillingCycles = createMockBillingCycles();

const defaultGraphQLResponses = {
  SubscriptionContractDetails: {
    data: {
      subscriptionContract: defaultContract,
    },
  },
  SubscriptionBillingCycles: {
    data: {
      subscriptionBillingCycles: mockBillingCycles,
    },
  },
  SubscriptionContractPause: {
    data: {
      subscriptionContractPause: {
        contract: {id: defaultContract.id},
        userErrors: [],
      },
    },
  },
  SubscriptionContractResume: {
    data: {
      subscriptionContractActivate: {
        contract: {id: defaultContract.id},
        userErrors: [],
      },
    },
  },
  CustomerSendEmail: {
    data: {
      customerSendEmail: {
        customer: {
          id: 'gid://shopify/Customer/1',
        },
        userErrors: [],
      },
    },
  },
};

function getDefaultGraphQLResponses(
  subscriptionContract?: Partial<SubscriptionContractDetailsGraphQLType>,
) {
  return {
    ...defaultGraphQLResponses,
    SubscriptionContractDetails: {
      data: {
        subscriptionContract: {
          ...defaultContract,
          ...subscriptionContract,
        },
      },
    },
  };
}

const errorGraphQLResponses = {
  ...defaultGraphQLResponses,
  SubscriptionContractPause: {
    data: {
      subscriptionContractPause: {
        contract: null,
        userErrors: [
          {field: 'contractId', message: 'Unable to pause contract'},
        ],
      },
    },
  },
  SubscriptionContractResume: {
    data: {
      subscriptionContractActivate: {
        contract: null,
        userErrors: [
          {field: 'contractId', message: 'Unable to resume contract'},
        ],
      },
    },
  },
};

const pausedGraphQLResponses = {
  ...defaultGraphQLResponses,
  SubscriptionContractDetails: {
    data: {
      subscriptionContract: pausedContract,
    },
  },
  SubscriptionContractResume: {
    data: {
      subscriptionContractActivate: {
        contract: {id: pausedContract.id},
        userErrors: [],
      },
    },
  },
};

const pausedErrorGraphQLResponses = {
  ...defaultGraphQLResponses,
  SubscriptionContractDetails: {
    data: {
      subscriptionContract: pausedContract,
    },
  },
  SubscriptionContractResume: {
    data: {
      subscriptionContractActivate: {
        contract: null,
        userErrors: [
          {field: 'contractId', message: 'Unable to resume contract'},
        ],
      },
    },
  },
};

const defaultExpectedBillingDate = new Date('2024-01-31').toISOString();
const graphQLResponseWithInventoryError = {
  ...defaultGraphQLResponses,
  SubscriptionContractDetails: {
    data: {
      subscriptionContract: createMockSubscriptionContract({
        subscriptionContract: {
          id: 'gid://1',
          status: 'ACTIVE' as SubscriptionContractSubscriptionStatus,
          lastBillingAttemptErrorType:
            BillingAttemptErrorType.InventoryError as SubscriptionContractLastBillingErrorType,
        },
      }),
    },
  },
  SubscriptionPastBillingCycles: {
    data: {
      subscriptionBillingCycles: {
        edges: [
          {
            node: {
              billingAttemptExpectedDate: defaultExpectedBillingDate,
              cycleIndex: 2,
              skipped: false,
              status: 'UNBILLED' as SubscriptionBillingCycleBillingCycleStatus,
              billingAttempts: {
                edges: [
                  {
                    node: {
                      id: 'gid://shopify/SubscriptionBillingAttempt/1',
                      processingError: {
                        code: 'INSUFFICIENT_INVENTORY' as SubscriptionBillingAttemptErrorCode,
                        insufficientStockProductVariants: {
                          edges: [
                            {
                              node: {
                                id: 'gid://shopify/ProductVariant/1',
                                title: 'Variant Title',
                                image: {
                                  url: 'https://example.com/image.jpg',
                                  altText: 'Product 1 image',
                                },
                                product: {
                                  id: 'gid://shopify/Product/1',
                                  title: 'Product 1',
                                },
                              },
                            },
                          ],
                        },
                      } as SubscriptionBillingAttemptInsufficientStockProductVariantsError,
                    },
                  },
                ],
              },
            },
          },
        ],
      },
    },
  },
  SubscriptionBillingCycleByIndex: {
    data: {
      subscriptionBillingCycle: {
        cycleStartAt: new Date('2024-01-01').toISOString(),
        cycleEndAt: new Date('2024-01-31').toISOString(),
        billingAttemptExpectedDate: defaultExpectedBillingDate,
      },
    },
  },
};

const graphQLResponseWithInventoryAllocationError = structuredClone(
  graphQLResponseWithInventoryError,
);
graphQLResponseWithInventoryAllocationError.SubscriptionPastBillingCycles.data.subscriptionBillingCycles.edges[0].node.billingAttempts.edges[0].node.processingError.code =
  'INVENTORY_ALLOCATIONS_NOT_FOUND' as SubscriptionBillingAttemptErrorCode;

const {mockGraphQL, graphQL} = mockShopifyServer();

const deliveryPolicy = {
  interval: 'YEAR' as SellingPlanInterval,
  intervalCount: 2,
};

async function mountContractDetails({
  graphQLResponses = defaultGraphQLResponses as object,
} = {}) {
  mockGraphQL(graphQLResponses);

  mountRemixStubWithAppContext({
    routes: [
      {
        path: `/app/contracts/:id`,
        Component: () => <ContractsDetailsPage />,
        loader,
      },
      {
        path: `/app/contracts/:id/pause`,
        action: pauseAction,
      },
      {
        path: `/app/contracts/:id/resume`,
        action: resumeAction,
      },
      {
        path: `/app/contracts/:id/bill-contract`,
        action: billAttemptAction,
      },
      {
        path: `/app/contracts/:id/poll-bill-attempt`,
        action: pollBillAttemptAction,
      },
    ],
    remixStubProps: {
      initialEntries: [`/app/contracts/${parseGid(defaultContract.id)}`],
    },
  });

  return await screen.findByText('Subscription details');
}

describe('Contract details', () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it('displays the contract id', async () => {
    await mountContractDetails();

    expect(screen.getByText(parseGid(defaultContract.id))).toBeInTheDocument();
  });

  describe('contract details card', () => {
    it('displays the edit button', async () => {
      await mountContractDetails();
      expect(screen.getByRole('link', {name: /Edit/i})).toBeInTheDocument();
    });

    it('displays the contract status', async () => {
      await mountContractDetails();
      expect(screen.getByText('Active')).toBeInTheDocument();
    });

    it('displays the product name, quantity, order number and price', async () => {
      await mountContractDetails();

      expect(
        screen.getByText(defaultContract.lines.edges[0].node.title),
      ).toBeInTheDocument();
      expect(
        screen.getByText(defaultContract.lines.edges[0].node.variantTitle!),
      ).toBeInTheDocument();
      expect(
        screen.getByText(defaultContract.lines.edges[0].node.quantity),
      ).toBeInTheDocument();
      expect(
        screen.getByText(`Order ${defaultContract.originOrder!.name}`, {
          exact: false,
        }),
      ).toBeInTheDocument();
    });

    describe('No units in stock', () => {
      it('displayed when line item variant id matches out of stock variant', async () => {
        const graphQLResponseWithLineItem = getDefaultGraphQLResponses({
          lines: {
            edges: [
              {
                node: generateSubscriptionContractLineNode({
                  variantId: 'gid://shopify/ProductVariant/1',
                }),
              },
            ],
          },
        });

        await mountContractDetails({
          graphQLResponses: {
            ...graphQLResponseWithInventoryError,
            ...graphQLResponseWithLineItem,
          },
        });

        expect(
          screen.getByText('Not enough inventory during last billing attempt'),
        ).toBeInTheDocument();
      });
    });

    describe('delivery frequency', () => {
      it('is displayed for weekly contracts', async () => {
        const graphQLResponses = getDefaultGraphQLResponses({
          deliveryPolicy: {
            interval: 'WEEK' as SellingPlanInterval,
            intervalCount: 5,
          },
        });

        await mountContractDetails({graphQLResponses});

        expect(screen.getByText('Every 5 weeks')).toBeInTheDocument();
      });

      it('is displayed for monthly contracts', async () => {
        const graphQLResponses = getDefaultGraphQLResponses({
          deliveryPolicy: {
            interval: 'MONTH' as SellingPlanInterval,
            intervalCount: 3,
          },
        });

        await mountContractDetails({graphQLResponses});

        expect(screen.getByText('Every 3 months')).toBeInTheDocument();
      });

      it('is displayed for yearly contracts', async () => {
        const graphQLResponses = getDefaultGraphQLResponses({
          deliveryPolicy: {
            interval: 'YEAR' as SellingPlanInterval,
            intervalCount: 2,
          },
        });

        await mountContractDetails({graphQLResponses});

        expect(screen.getByText('Every 2 years')).toBeInTheDocument();
      });
    });

    describe('Delivery - local pickup text', () => {
      it('is not displayed for shipping option delivery method', async () => {
        const graphQLResponses = getDefaultGraphQLResponses({
          deliveryPolicy: deliveryPolicy,
        });

        await mountContractDetails({graphQLResponses});

        expect(
          screen.queryByText('Every 2 years, local pickup'),
        ).not.toBeInTheDocument();
      });

      it('is not displayed for local delivery delivery method', async () => {
        const localDeliveryMethod = createGraphQLLocalDeliveryDeliveryMethod();
        const graphQLResponses = getDefaultGraphQLResponses({
          deliveryMethod: {
            ...localDeliveryMethod,
            address: {
              ...localDeliveryMethod.address,
              countryCode: localDeliveryMethod.address
                .countryCodeV2 as CountryCode,
            },
            __typename: 'SubscriptionDeliveryMethodLocalDelivery' as const,
          },
          deliveryPolicy: deliveryPolicy,
        });

        await mountContractDetails({graphQLResponses});

        expect(
          screen.queryByText('Every 2 years, local pickup'),
        ).not.toBeInTheDocument();
      });

      it('is displayed for local pickup delivery method', async () => {
        const pickupDeliveryMethod = createGraphQLPickupDeliveryMethod();
        const graphQLResponses = getDefaultGraphQLResponses({
          deliveryMethod: {
            ...pickupDeliveryMethod,
            __typename: 'SubscriptionDeliveryMethodPickup' as const,
          },
          deliveryPolicy: deliveryPolicy,
        });

        await mountContractDetails({graphQLResponses});

        expect(
          screen.getByText('Every 2 years, local pickup'),
        ).toBeInTheDocument();
      });
    });

    describe('discount', () => {
      const basePricingPolicy = {
        basePrice: {
          amount: faker.finance.amount({min: 1, max: 100}),
          currencyCode: 'CAD' as CurrencyCode,
        },
      };

      it('displays percentage discounts', async () => {
        const graphQLResponses = getDefaultGraphQLResponses(
          createMockSubscriptionContract({
            subscriptionContractLineNode: {
              pricingPolicy: {
                ...basePricingPolicy,
                cycleDiscounts: [
                  {
                    adjustmentType:
                      'PERCENTAGE' as SellingPlanPricingPolicyAdjustmentType,
                    adjustmentValue: {
                      percentage: 10,
                    },
                  },
                ],
              },
            },
          }),
        );

        await mountContractDetails({graphQLResponses});

        expect(screen.getByText('10% off')).toBeInTheDocument();
      });

      it('displays fixed amount discounts', async () => {
        const graphQLResponses = getDefaultGraphQLResponses(
          createMockSubscriptionContract({
            subscriptionContractLineNode: {
              pricingPolicy: {
                ...basePricingPolicy,
                cycleDiscounts: [
                  {
                    adjustmentType:
                      'FIXED_AMOUNT' as SellingPlanPricingPolicyAdjustmentType,
                    adjustmentValue: {
                      amount: 34,
                      currencyCode: 'CAD' as CurrencyCode,
                    },
                  },
                ],
              },
            },
          }),
        );

        await mountContractDetails({graphQLResponses});

        expect(screen.getByText('CA$34.00 off')).toBeInTheDocument();
      });

      it('displays fixed price discounts', async () => {
        const graphQLResponses = getDefaultGraphQLResponses(
          createMockSubscriptionContract({
            subscriptionContractLineNode: {
              pricingPolicy: {
                ...basePricingPolicy,
                cycleDiscounts: [
                  {
                    adjustmentType:
                      'PRICE' as SellingPlanPricingPolicyAdjustmentType,
                    adjustmentValue: {
                      amount: 91,
                      currencyCode: 'CAD' as CurrencyCode,
                    },
                  },
                ],
              },
            },
          }),
        );

        await mountContractDetails({graphQLResponses});

        expect(screen.getByText('CA$91.00 fixed price')).toBeInTheDocument();
      });

      it('displays multiple discounts text when there is more than one line item', async () => {
        const graphQLResponses = getDefaultGraphQLResponses(
          createMockSubscriptionContract({
            subscriptionContract: {
              lines: {
                edges: [
                  {node: generateSubscriptionContractLineNode()},
                  {node: generateSubscriptionContractLineNode()},
                ],
              },
            },
          }),
        );

        await mountContractDetails({graphQLResponses});

        expect(screen.getByText('Multiple discounts')).toBeInTheDocument();
      });
    });

    describe('when contract is paused successfully', () => {
      it('shows a success toast', async () => {
        await mountContractDetails();

        // in more recent versions of polaris both the page action button (big screen)
        // and the action menu button accessed by the 3 dots on mobile layout will be
        // present in the DOM resulting in 2 buttons with the same content
        await userEvent.click(
          screen.getAllByRole('button', {name: 'Pause contract'})[0],
        );
        await waitForGraphQL();

        expect(mockShopify.toast.show).toHaveBeenCalledWith(
          'Contract paused successfully',
          {isError: false},
        );
      });
    });

    describe('when contract is paused unsuccessfully', () => {
      it('shows a failure toast', async () => {
        await mountContractDetails({graphQLResponses: errorGraphQLResponses});

        await userEvent.click(
          screen.getAllByRole('button', {name: 'Pause contract'})[0],
        );
        await waitForGraphQL();

        expect(mockShopify.toast.show).toHaveBeenCalledWith(
          'Unable to pause contract',
          {isError: true},
        );
      });
    });

    describe('when a contract is resumed successfully', () => {
      it('shows a success toast', async () => {
        await mountContractDetails({graphQLResponses: pausedGraphQLResponses});

        await userEvent.click(
          screen.getAllByRole('button', {name: 'Resume contract'})[0],
        );
        await waitForGraphQL();

        expect(mockShopify.toast.show).toHaveBeenCalledWith(
          'Contract resumed successfully',
          {isError: false},
        );
      });
    });

    describe('when a contract is resumed unsuccessfully', () => {
      it('shows a failure toast', async () => {
        await mountContractDetails({
          graphQLResponses: pausedErrorGraphQLResponses,
        });

        await userEvent.click(
          screen.getAllByRole('button', {name: 'Resume contract'})[0],
        );
        await waitForGraphQL();

        expect(mockShopify.toast.show).toHaveBeenCalledWith(
          'Unable to resume contract',
          {isError: true},
        );
      });
    });
  });

  describe('price summary card', async () => {
    it('displays substotal price', async () => {
      const graphQLResponses = getDefaultGraphQLResponses({
        lines: {
          edges: [
            {
              node: generateSubscriptionContractLineNode({
                lineDiscountedPrice: {
                  amount: 13.45,
                  currencyCode: 'CAD' as CurrencyCode,
                },
              }),
            },
            {
              node: generateSubscriptionContractLineNode({
                lineDiscountedPrice: {
                  amount: 27.5,
                  currencyCode: 'CAD' as CurrencyCode,
                },
              }),
            },
          ],
        },
      });

      await mountContractDetails({graphQLResponses});

      const expectedCurrencyText = formatPrice({
        amount: 40.95,
        currency: 'CAD',
        locale: 'en',
      });

      expect(screen.getByText('Subtotal')).toBeInTheDocument();
      expect(screen.getByText(expectedCurrencyText)).toBeInTheDocument();
    });

    it('dislays shipping price', async () => {
      const graphQLResponses = getDefaultGraphQLResponses({
        deliveryPrice: {
          amount: 7.5,
          currencyCode: 'CAD' as CurrencyCode,
        },
      });

      await mountContractDetails({graphQLResponses});

      const expectedCurrencyText = formatPrice({
        amount: 7.5,
        currency: 'CAD',
        locale: 'en',
      });

      expect(screen.getByText('Shipping')).toBeInTheDocument();
      expect(screen.getByText(expectedCurrencyText)).toBeInTheDocument();
    });

    it('displays discounted shipping price', async () => {
      const graphQLResponses = getDefaultGraphQLResponses({
        deliveryPrice: {
          amount: 7.5,
          currencyCode: 'CAD' as CurrencyCode,
        },
        discounts: {
          edges: [
            {
              node: {
                id: '1',
                title: 'Shipping Discount',
                targetType: 'SHIPPING_LINE' as DiscountTargetType,
              },
            },
          ],
        },
      });

      await mountContractDetails({graphQLResponses});

      const expectedCurrencyText = formatPrice({
        amount: 0,
        currency: 'CAD',
        locale: 'en',
      });

      expect(screen.getByText('Shipping')).toBeInTheDocument();
      expect(screen.getByText(expectedCurrencyText)).toBeInTheDocument();
    });
  });
  describe('with the contract created via API', () => {
    const contractFromApi = createMockSubscriptionContract({
      subscriptionContract: {
        status: 'CANCELLED' as SubscriptionContractSubscriptionStatus,
        originOrder: null,
      },
    });
    const newGraphQLResponse = {
      SubscriptionContractDetails: {
        data: {
          subscriptionContract: contractFromApi,
        },
      },
      SubscriptionBillingCycles: {
        data: {
          subscriptionBillingCycles: mockBillingCycles,
        },
      },
    };

    it('displays the contract id', async () => {
      await mountContractDetails({graphQLResponses: newGraphQLResponse});
      expect(
        screen.getByText(parseGid(contractFromApi.id)),
      ).toBeInTheDocument();
    });

    it('displays the contract status', async () => {
      await mountContractDetails({graphQLResponses: newGraphQLResponse});
      expect(screen.getByText('Canceled')).toBeInTheDocument();
    });

    it('does not display the order number, and purchase date', async () => {
      await mountContractDetails({graphQLResponses: newGraphQLResponse});
      expect(screen.queryByText(`Order #`)).not.toBeInTheDocument();
    });
  });

  describe('inventory allocation not found banner', () => {
    it('displays displays when inventory allocation not found on most recent billing attempt', async () => {
      await mountContractDetails({
        graphQLResponses: graphQLResponseWithInventoryAllocationError,
      });

      const date = formatDate(defaultExpectedBillingDate.toString(), 'en');

      expect(
        screen.getByText(`${date} order couldn't be created`),
      ).toBeInTheDocument();
      expect(
        screen.getByText(
          /Customer address is in a shipping zone with no available inventory or is not supported by current shipping settings/,
        ),
      ).toBeInTheDocument();
    });

    it('does not display when most recemt billing attempt has INSUFFICIENT_INVENTORY error', async () => {
      await mountContractDetails({
        graphQLResponses: graphQLResponseWithInventoryError,
      });

      expect(
        screen.queryByText(
          /Customer address is in a shipping zone with no available inventory/,
        ),
      ).not.toBeInTheDocument();
    });

    it('does not display by default', async () => {
      await mountContractDetails();

      expect(
        screen.queryByText(/order couldn't be created/),
      ).not.toBeInTheDocument();
    });
  });

  describe('with inventory error in recent billing attempt', () => {
    it('displays a warning banner', async () => {
      await mountContractDetails({
        graphQLResponses: graphQLResponseWithInventoryError,
      });

      const date = formatDate(defaultExpectedBillingDate.toString(), 'en');
      expect(
        screen.getByText(`${date} order couldn't be created`),
      ).toBeInTheDocument();
    });

    it('displays a bill contract button', async () => {
      await mountContractDetails({
        graphQLResponses: graphQLResponseWithInventoryError,
      });
      expect(
        screen.getAllByRole('button', {name: 'Bill contract'})[0],
      ).toBeInTheDocument();
    });

    describe('when the bill contract button is clicked', () => {
      describe('when bill contract is successful', () => {
        const billAttemptSuccessGraphQLResponse = {
          ...graphQLResponseWithInventoryError,
          SubscriptionBillingCycleChargeIndexMutation: {
            data: {
              subscriptionBillingCycleCharge: {
                subscriptionBillingAttempt: {
                  id: 'gid://shopify/SubscriptionBillingAttempt/1',
                  ready: false,
                },
                userErrors: [],
              },
            },
          },
        };

        it('displays a billing attempt started toast', async () => {
          await mountContractDetails({
            graphQLResponses: billAttemptSuccessGraphQLResponse,
          });

          await userEvent.click(
            screen.getAllByRole('button', {name: 'Bill contract'})[0],
          );

          await waitForGraphQL();

          expect(mockShopify.toast.show).toHaveBeenCalledWith(
            'Billing attempt started',
            {isError: false, duration: 2000},
          );
        });

        it('calls subscription billing cycle charge mutation with correct index', async () => {
          await mountContractDetails({
            graphQLResponses: billAttemptSuccessGraphQLResponse,
          });

          await userEvent.click(
            screen.getAllByRole('button', {name: 'Bill contract'})[0],
          );

          await waitForGraphQL();

          expect(graphQL).toHavePerformedGraphQLOperation(
            SubscriptionBillingCycleChargeIndexMutation,
            {
              variables: {
                subscriptionContractId: composeGid('SubscriptionContract', 1),
                inventoryPolicy: 'PRODUCT_VARIANT_INVENTORY_POLICY',
                index: 2,
              },
            },
          );
        });
      });

      describe('when bill contract button is unsuccessful', () => {
        it('displays a billing attempt failed banner', async () => {
          await mountContractDetails({
            graphQLResponses: {
              ...graphQLResponseWithInventoryError,
              SubscriptionBillingCycleChargeIndexMutation: {
                data: {
                  subscriptionBillingCycleCharge: {
                    userErrors: [
                      {field: 'id', message: 'Unable to bill contract'},
                    ],
                  },
                },
              },
            },
          });

          await userEvent.click(
            screen.getAllByRole('button', {name: 'Bill contract'})[0],
          );

          await waitForGraphQL();

          expect(mockShopify.toast.show).toHaveBeenCalledWith(
            'Unable to bill contract',
            {isError: true, duration: 2000},
          );
        });
      });
    });

    describe('when polling for billing attempt progress', () => {
      describe('when billing attempt finishes successfully', () => {
        const billAttemptFinishedSuccessGraphQLResponse = {
          ...graphQLResponseWithInventoryError,
          SubscriptionBillingCycleChargeIndexMutation: {
            data: {
              subscriptionBillingCycleCharge: {
                subscriptionBillingAttempt: {
                  id: 'gid://shopify/SubscriptionBillingAttempt/1',
                  ready: false,
                },
                userErrors: [],
              },
            },
          },
          SubscriptionBillingAttempt: {
            data: {
              subscriptionBillingAttempt: {
                id: 'gid://shopify/SubscriptionBillingAttempt/1',
                originTime: new Date().toISOString(),
                ready: true,
                subscriptionContract: {
                  id: defaultContract.id,
                },
              },
            },
          },
        };

        it('does not display attempt in progress banner', async () => {
          await mountContractDetails({
            graphQLResponses: billAttemptFinishedSuccessGraphQLResponse,
          });

          await userEvent.click(
            screen.getAllByRole('button', {name: 'Bill contract'})[0],
          );

          // We need to wait >1s because billing attempt is polled every second.
          await wait(1100);

          expect(
            screen.queryByText(
              'A billing attempt is in progress. This page wil refresh when the billing attempt is done.',
            ),
          ).not.toBeInTheDocument();
        });
      });
    });
  });
});
