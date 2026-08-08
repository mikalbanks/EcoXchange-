import { describe, expect, it } from "vitest";
import {
  CHAIN_DECIMALS,
  descaleToNumber,
  descaleToString,
  msToIso,
  normalizeAsset,
  normalizeDistribution,
  normalizeHolder,
  rawString,
  type ChainAsset,
  type ChainAssetHolder,
  type ChainDistribution,
} from "./models.js";

describe("descaleToString", () => {
  it("applies the chain's fixed 10^6 scale", () => {
    expect(CHAIN_DECIMALS).toBe(6);
    expect(descaleToString("1000000")).toBe("1");
    expect(descaleToString("1500000")).toBe("1.5");
    expect(descaleToString("1")).toBe("0.000001");
    expect(descaleToString("0")).toBe("0");
  });

  it("keeps full precision on values a float would round", () => {
    // This is the whole reason the function does string math. The numbers below
    // exceed 2^53 once scaled, so Number()/1e6 loses low-order digits — and the
    // point of this surface is that figures are checkable against a ledger.
    expect(descaleToString("123456789012345678")).toBe("123456789012.345678");
    expect(descaleToString("9007199254740993000001")).toBe(
      "9007199254740993.000001",
    );
  });

  it("never emits scientific notation for very small or large values", () => {
    expect(descaleToString("1")).not.toMatch(/e/i);
    expect(descaleToString("9".repeat(30))).not.toMatch(/e/i);
  });

  it("trims trailing zeros but keeps significant ones", () => {
    expect(descaleToString("1200000")).toBe("1.2");
    expect(descaleToString("1000001")).toBe("1.000001");
    expect(descaleToString("1010000")).toBe("1.01");
  });

  it("returns null rather than 0 for absent or malformed input", () => {
    // A zero balance and an unreadable balance are different facts.
    expect(descaleToString(null)).toBeNull();
    expect(descaleToString(undefined)).toBeNull();
    expect(descaleToString("")).toBeNull();
    expect(descaleToString("not-a-number")).toBeNull();
    expect(descaleToString("1.5")).toBeNull();
  });
});

describe("rawString", () => {
  it("passes the chain integer through verbatim", () => {
    expect(rawString("123456789012345678")).toBe("123456789012345678");
    expect(rawString(1000000)).toBe("1000000");
  });

  it("rejects anything that is not an integer string", () => {
    expect(rawString("1.5")).toBeNull();
    expect(rawString("abc")).toBeNull();
    expect(rawString(null)).toBeNull();
  });
});

describe("descaleToNumber", () => {
  it("is display-only and returns null for bad input", () => {
    expect(descaleToNumber("1500000")).toBe(1.5);
    expect(descaleToNumber("bad")).toBeNull();
  });
});

describe("msToIso", () => {
  it("reads paymentAt as BigInt milliseconds", () => {
    expect(msToIso("1717200000000")).toBe("2024-06-01T00:00:00.000Z");
  });

  it("keeps an absent expiresAt null instead of collapsing to epoch zero", () => {
    expect(msToIso(null)).toBeNull();
    expect(msToIso("0")).toBeNull();
    expect(msToIso("")).toBeNull();
  });
});

describe("normalizeAsset", () => {
  const asset: ChainAsset = {
    id: "ECOSAV",
    ticker: "ECOSAV",
    name: "EcoXchange Savannah Solar Note",
    type: "EquityCommon",
    isDivisible: true,
    isFrozen: false,
    totalSupply: "17700000000",
    owner: { did: "0xissuer" },
  };

  it("stores both the exact decimal and the raw chain integer", () => {
    expect(normalizeAsset(asset)).toEqual({
      ticker: "ECOSAV",
      asset_name: "EcoXchange Savannah Solar Note",
      total_supply: "17700",
      total_supply_raw: "17700000000",
      issuer_did: "0xissuer",
      is_divisible: true,
    });
  });

  it("falls back to Asset.id when ticker is absent", () => {
    // In this schema version Asset.id IS the ticker, so the fallback is exact.
    expect(normalizeAsset({ ...asset, ticker: null }).ticker).toBe("ECOSAV");
  });

  it("tolerates a null owner", () => {
    expect(normalizeAsset({ ...asset, owner: null }).issuer_did).toBeNull();
  });
});

describe("normalizeHolder", () => {
  const snapshot = "2026-08-08T06:00:00.000Z";

  it("uses the identity relation when present", () => {
    const holder: ChainAssetHolder = {
      id: "ECOSAV/0xabc",
      identity: { did: "0xabc" },
      amount: "5000000",
    };
    expect(normalizeHolder(holder, "asset-uuid", snapshot)).toEqual({
      polymesh_asset_id: "asset-uuid",
      holder_did: "0xabc",
      balance: "5",
      balance_raw: "5000000",
      snapshot_at: snapshot,
    });
  });

  it("parses the DID out of the composite id when identity is null", () => {
    // Dropping the row would silently understate the cap table.
    const holder: ChainAssetHolder = {
      id: "ECOSAV/0xdef",
      identity: null,
      amount: "1000000",
    };
    expect(normalizeHolder(holder, "asset-uuid", snapshot)?.holder_did).toBe("0xdef");
  });

  it("returns null when no DID can be recovered", () => {
    const holder: ChainAssetHolder = { id: "ECOSAV", identity: null, amount: "1" };
    expect(normalizeHolder(holder, "asset-uuid", snapshot)).toBeNull();
  });

  it("returns null rather than a zero balance when the amount will not parse", () => {
    const holder: ChainAssetHolder = {
      id: "ECOSAV/0xabc",
      identity: { did: "0xabc" },
      amount: "garbage",
    };
    expect(normalizeHolder(holder, "asset-uuid", snapshot)).toBeNull();
  });
});

describe("normalizeDistribution", () => {
  const dist: ChainDistribution = {
    id: "ECOSAV/3",
    localId: 3,
    currency: { id: "USDC" },
    perShare: "1200",
    amount: "21240000",
    remaining: "0",
    taxes: "0",
    paymentAt: "1717200000000",
    expiresAt: null,
    createdBlock: {
      blockId: 8_432_100,
      hash: "0xblockhash",
      datetime: "2024-06-01T00:00:00.000Z",
    },
  };

  it("maps chain field names onto the spec's columns, exactly", () => {
    const row = normalizeDistribution(dist, "asset-uuid");
    expect(row.distribution_id).toBe("ECOSAV/3");
    expect(row.amount_per_share).toBe("0.0012");
    expect(row.amount_per_share_raw).toBe("1200");
    expect(row.total_amount).toBe("21.24");
    expect(row.total_amount_raw).toBe("21240000");
    expect(row.payment_at).toBe("2024-06-01T00:00:00.000Z");
    expect(row.expires_at).toBeNull();
    expect(row.block_number).toBe(8_432_100);
  });

  it("stores currency as the referenced Asset's id, not the object", () => {
    // The spec assumed a plain string here; the chain gives an Asset reference.
    expect(normalizeDistribution(dist, "asset-uuid").currency).toBe("USDC");
  });

  it("falls back to the block hash because Distribution carries no extrinsic hash", () => {
    expect(normalizeDistribution(dist, "asset-uuid").extrinsic_hash).toBe("0xblockhash");
  });

  it("preserves remaining and taxes in raw_event, which have no columns", () => {
    const raw = normalizeDistribution(
      { ...dist, remaining: "5000000", taxes: "120000" },
      "asset-uuid",
    ).raw_event as ChainDistribution;
    expect(raw.remaining).toBe("5000000");
    expect(raw.taxes).toBe("120000");
  });

  it("survives a missing createdBlock", () => {
    const row = normalizeDistribution({ ...dist, createdBlock: null }, "asset-uuid");
    expect(row.block_number).toBeNull();
    expect(row.extrinsic_hash).toBeNull();
  });
});
