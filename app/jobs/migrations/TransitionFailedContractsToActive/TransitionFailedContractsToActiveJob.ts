import type {GraphQLClient, Jobs} from '~/types';
import {Job} from '~/lib/jobs';
import {unauthenticated} from '~/shopify.server';
import SubscriptionContractResume from '~/graphql/SubscriptionContractResumeMutation';
import {getContracts} from '~/models/SubscriptionContract/SubscriptionContract.server';
import {type SubscriptionContractListItem} from '~/types/contracts';
import {type SubscriptionContractsQueryVariables} from 'types/admin.generated';
import {performBulkMutation} from '~/utils/bulkOperations/performBulkMutation';

/*
  This job is used to transition failed contracts to active.
  As of now, we no longer transition contracts to failed during the dunning process.
  This job will mark all previously failed contracts as active.
*/
export class TransitionFailedContractsToActiveJob extends Job<
  Jobs.Parameters<{}>
> {
  public queue: string = 'migrations';

  // page size for the getContracts query
  private pageSize = 50;

  async perform(): Promise<void> {
    const {shop} = this.parameters;
    const {admin} = await unauthenticated.admin(shop);
    // get all failed contracts
    const contractIds = await this.getAllFailedContractIds(admin.graphql);
    if (contractIds.length === 0) {
      this.logger.info(`${shop}: No failed contracts found`);
      return;
    }
    const input = contractIds.map((contractId) => ({
      subscriptionContractId: contractId,
    }));
    await this.activateContracts(shop, admin.graphql, input);
  }

  private async getFailedContracts(
    graphql: GraphQLClient,
    endCursor: string,
  ): Promise<{
    contracts: SubscriptionContractListItem[];
    pageInfo: {
      hasNextPage: boolean;
      endCursor: string;
    };
  }> {
    let variables: SubscriptionContractsQueryVariables = {
      query: 'status:FAILED',
      first: this.pageSize,
    };
    if (endCursor !== '') {
      variables = {
        ...variables,
        after: endCursor,
      };
    }
    const {subscriptionContracts, subscriptionContractPageInfo} =
      await getContracts(graphql, variables);
    return {
      contracts: subscriptionContracts,
      pageInfo: {
        hasNextPage: subscriptionContractPageInfo.hasNextPage,
        endCursor: subscriptionContractPageInfo.endCursor,
      },
    };
  }

  async getAllFailedContractIds(graphql: GraphQLClient): Promise<string[]> {
    let {contracts, pageInfo} = await this.getFailedContracts(graphql, '');
    while (pageInfo.hasNextPage) {
      const {contracts: nextContracts, pageInfo: nextPageInfo} =
        await this.getFailedContracts(graphql, pageInfo.endCursor);
      contracts = [...contracts, ...nextContracts];
      pageInfo = nextPageInfo;
    }
    return contracts.map((contract) => contract.id);
  }

  private async activateContracts(
    shop: string,
    graphql: GraphQLClient,
    contracts: ReadonlyArray<{
      subscriptionContractId: string;
    }>,
  ): Promise<void> {
    this.logger.info(
      `${shop}: Reactivating ${contracts.length} subscription contracts`,
    );
    const response = await performBulkMutation(
      graphql,
      SubscriptionContractResume,
      contracts,
      (results) => {
        this.logger.info(
          `${shop}: Reactivated ${results.length} subscription contracts`,
        );
      },
      (error) => {
        this.logger.error(`${shop}: Error reactivating contracts: ${error}`);
      },
    );

    this.logger.info(
      `${shop}: Started bulk operation to reactivate ${contracts.length} contracts. Operation ID: ${response.bulkOperation.id}`,
    );
  }
}
