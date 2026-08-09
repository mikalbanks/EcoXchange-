/**
 * Spec 18 § 2.3 — GraphQL queries, written against the real schema.
 *
 * Field names here come from `docs/polymesh-middleware-schema.graphql`
 * (polymesh-subquery v19.6.0), not from prose. The spec is explicit that
 * hardcoding guessed field names produces silent failures.
 *
 * Two caveats, both of which `scripts/introspect-polymesh.sh` exists to close:
 *
 * 1. The snapshot is the indexer's published schema, not an introspection of
 *    the deployed middleware. Run the script and diff before mainnet.
 * 2. SubQuery wraps entities in PostGraphile-style connections (`nodes`,
 *    `totalCount`) and derives a scalar `assetId` filter column from the
 *    `asset: Asset!` relation. That is the generator's standard output, but it
 *    is generated rather than declared in schema.graphql — so it is the most
 *    likely thing to need adjusting if a query 400s.
 */

/** One asset's current on-chain state. `Asset.id` is the ticker in this version. */
export const ASSET_QUERY = `
  query PolymeshAsset($assetId: String!) {
    asset(id: $assetId) {
      id
      ticker
      name
      type
      isDivisible
      isFrozen
      totalSupply
      owner {
        did
      }
    }
  }
`;

/**
 * Holder balances for one asset, largest first so a truncated page is still the
 * useful part of the cap table.
 */
export const HOLDERS_QUERY = `
  query PolymeshHolders($assetId: String!, $first: Int!, $offset: Int!) {
    assetHolders(
      filter: { assetId: { equalTo: $assetId } }
      orderBy: [AMOUNT_DESC]
      first: $first
      offset: $offset
    ) {
      totalCount
      nodes {
        id
        amount
        identity {
          did
        }
      }
    }
  }
`;

/**
 * Distribution history for one asset, newest first.
 *
 * `currency` is an Asset reference, not a string. `paymentAt` / `expiresAt` are
 * BigInt milliseconds. Block number and timestamp come from `createdBlock` —
 * there is no extrinsic hash on this entity (see models.ts).
 */
export const DISTRIBUTIONS_QUERY = `
  query PolymeshDistributions($assetId: String!, $first: Int!, $offset: Int!) {
    distributions(
      filter: { assetId: { equalTo: $assetId } }
      orderBy: [PAYMENT_AT_DESC]
      first: $first
      offset: $offset
    ) {
      totalCount
      nodes {
        id
        localId
        perShare
        amount
        remaining
        taxes
        paymentAt
        expiresAt
        currency {
          id
        }
        createdBlock {
          blockId
          hash
          datetime
        }
      }
    }
  }
`;

/** Page size for the paged collections above. */
export const PAGE_SIZE = 100;
