// On-chain DRIP behavior — DEFINITIONS ONLY (Spec 09). Implementation is deferred
// to a post-counsel-review spec. Kept here so the off-chain types and the future
// contract stay aligned. Not imported by runtime code.

export type OnChainPreference = "cash_out" | "reinvest";

export interface DistributionContract {
  // Current: distribute USDC pro-rata to all token holders.
  distribute(amount: bigint): void;

  // Future DRIP extension — check the investor's preference before transferring.
  getDistributionPreference(investor: string): OnChainPreference;

  // If reinvest: route USDC to the offering contract to mint new tokens.
  // If cash_out: transfer USDC to the investor wallet (current behavior).
  executeDistribution(
    investor: string,
    amount: bigint,
    preference: OnChainPreference,
  ): void;

  // Investor sets their on-chain preference.
  setDistributionPreference(preference: OnChainPreference): void;
}
