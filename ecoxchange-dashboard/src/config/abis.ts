// Human-readable ABIs for the demo distribution contracts (contracts/ at the
// repo root). Kept as plain string arrays so viem's parseAbi can consume them
// inside the lazy distribution chunk — importing this module pulls in no viem
// code by itself.

export const DEMO_ORACLE_BRIDGE_ABI = [
  "function writeVerifiedProduction(uint256 _periodStart, uint256 _verifiedKwh, uint256 _expectedKwh, int256 _deviationBps, string _engineVersion, string _verdict)",
  "function getRecord(uint256 _periodStart) view returns ((uint256 periodStart, uint256 verifiedKwh, uint256 expectedKwh, int256 deviationBps, string engineVersion, string verdict, uint256 timestamp))",
  "function recordCount() view returns (uint256)",
  "function lastWriteTimestamp() view returns (uint256)",
  "event ProductionVerified(uint256 indexed periodStart, uint256 verifiedKwh, string verdict, uint256 timestamp)",
] as const;

export const DEMO_DISTRIBUTOR_ABI = [
  "function distribute(address[] recipients, uint256[] shares, uint256 totalAmount, uint256 periodStart)",
  "function getDistributionCount() view returns (uint256)",
  "event DistributionExecuted(uint256 indexed distributionId, uint256 totalAmount, uint256 recipientCount, uint256 periodStart)",
  "event ShareDistributed(uint256 indexed distributionId, address indexed recipient, uint256 amount)",
] as const;

export const ERC20_ABI = [
  "function balanceOf(address account) view returns (uint256)",
  "function transfer(address to, uint256 amount) returns (bool)",
  "function decimals() view returns (uint8)",
] as const;
