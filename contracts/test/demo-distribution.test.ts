import { expect } from "chai";
import hre from "hardhat";
import { parseUnits } from "viem";

// Mirrors ecoxchange-dashboard/src/data/demo-wallets.ts — 12 holders, 10000 bps.
const HOLDERS = [
  { address: "0x1111111111111111111111111111111111111111", shareBps: 200n },
  { address: "0x2222222222222222222222222222222222222222", shareBps: 400n },
  { address: "0x3333333333333333333333333333333333333333", shareBps: 150n },
  { address: "0x4444444444444444444444444444444444444444", shareBps: 300n },
  { address: "0x5555555555555555555555555555555555555555", shareBps: 250n },
  { address: "0x6666666666666666666666666666666666666666", shareBps: 500n },
  { address: "0x7777777777777777777777777777777777777777", shareBps: 350n },
  { address: "0x8888888888888888888888888888888888888888", shareBps: 100n },
  { address: "0x9999999999999999999999999999999999999999", shareBps: 600n },
  { address: "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa", shareBps: 200n },
  { address: "0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb", shareBps: 450n },
  { address: "0xcccccccccccccccccccccccccccccccccccccccc", shareBps: 6500n },
] as const;

const RECIPIENTS = HOLDERS.map((h) => h.address);
const SHARES = HOLDERS.map((h) => h.shareBps);
const TOTAL = parseUnits("17700", 6); // $17,700.00 monthly pool
const PERIOD_START = BigInt(Math.floor(Date.parse("2024-12-01T00:00:00Z") / 1000));

async function deployFixture() {
  const [owner, stranger] = await hre.viem.getWalletClients();
  const usdc = await hre.viem.deployContract("MockUSDC");
  const bridge = await hre.viem.deployContract("DemoOracleBridge");
  const distributor = await hre.viem.deployContract("DemoDistributor", [
    usdc.address,
    bridge.address,
  ]);
  await usdc.write.transfer([distributor.address, parseUnits("100000", 6)]);
  const publicClient = await hre.viem.getPublicClient();
  return { owner, stranger, usdc, bridge, distributor, publicClient };
}

describe("DemoOracleBridge", () => {
  it("stores a record and emits ProductionVerified", async () => {
    const { bridge, publicClient } = await deployFixture();
    const hash = await bridge.write.writeVerifiedProduction([
      PERIOD_START,
      489823n,
      489823n,
      0n,
      "v2.0.0",
      "VERIFIED",
    ]);
    await publicClient.waitForTransactionReceipt({ hash });

    const record = await bridge.read.getRecord([PERIOD_START]);
    expect(record.verifiedKwh).to.equal(489823n);
    expect(record.verdict).to.equal("VERIFIED");
    expect(await bridge.read.recordCount()).to.equal(1n);

    const events = await bridge.getEvents.ProductionVerified();
    expect(events).to.have.lengthOf(1);
    expect(events[0].args.periodStart).to.equal(PERIOD_START);
  });

  it("rejects non-owner writes", async () => {
    const { bridge, stranger } = await deployFixture();
    const asStranger = await hre.viem.getContractAt("DemoOracleBridge", bridge.address, {
      client: { wallet: stranger },
    });
    await expect(
      asStranger.write.writeVerifiedProduction([PERIOD_START, 1n, 1n, 0n, "v2.0.0", "VERIFIED"])
    ).to.be.rejectedWith(/OwnableUnauthorizedAccount/);
  });
});

describe("DemoDistributor", () => {
  it("distributes pro-rata and emits per-share events", async () => {
    const { distributor, usdc, publicClient } = await deployFixture();
    const hash = await distributor.write.distribute([RECIPIENTS, SHARES, TOTAL, PERIOD_START]);
    await publicClient.waitForTransactionReceipt({ hash });

    // 2% holder receives $354.00; 65% holder receives $11,505.00
    expect(await usdc.read.balanceOf([RECIPIENTS[0]])).to.equal(parseUnits("354", 6));
    expect(await usdc.read.balanceOf([RECIPIENTS[11]])).to.equal(parseUnits("11505", 6));
    expect(await distributor.read.getDistributionCount()).to.equal(1n);

    const shareEvents = await distributor.getEvents.ShareDistributed();
    expect(shareEvents).to.have.lengthOf(12);
    const execEvents = await distributor.getEvents.DistributionExecuted();
    expect(execEvents).to.have.lengthOf(1);
    expect(execEvents[0].args.totalAmount).to.equal(TOTAL);
  });

  it("rejects shares that do not sum to 10000 bps", async () => {
    const { distributor } = await deployFixture();
    const badShares = [...SHARES.slice(0, 11), 6400n]; // sums to 9900
    await expect(
      distributor.write.distribute([RECIPIENTS, badShares, TOTAL, PERIOD_START])
    ).to.be.rejectedWith(/Shares must sum to 10000 bps/);
  });

  it("rejects mismatched array lengths and empty recipients", async () => {
    const { distributor } = await deployFixture();
    await expect(
      distributor.write.distribute([RECIPIENTS.slice(0, 3), SHARES, TOTAL, PERIOD_START])
    ).to.be.rejectedWith(/Length mismatch/);
    await expect(
      distributor.write.distribute([[], [], TOTAL, PERIOD_START])
    ).to.be.rejectedWith(/No recipients/);
  });

  it("rejects non-owner distribute and allows owner withdraw", async () => {
    const { distributor, usdc, stranger, owner, publicClient } = await deployFixture();
    const asStranger = await hre.viem.getContractAt("DemoDistributor", distributor.address, {
      client: { wallet: stranger },
    });
    await expect(
      asStranger.write.distribute([RECIPIENTS, SHARES, TOTAL, PERIOD_START])
    ).to.be.rejectedWith(/OwnableUnauthorizedAccount/);

    const before = await usdc.read.balanceOf([owner.account.address]);
    const hash = await distributor.write.withdraw([usdc.address, parseUnits("1000", 6)]);
    await publicClient.waitForTransactionReceipt({ hash });
    const after = await usdc.read.balanceOf([owner.account.address]);
    expect(after - before).to.equal(parseUnits("1000", 6));
  });
});
