/**
 * DID display helpers for the chain view (Spec 18 § 2.8).
 *
 * "Truncate DIDs in display (`0x1a2b…c3d4`) with copy-to-clipboard." A Polymesh
 * DID is 66 characters; showing it whole wrecks every table layout, and showing
 * a prefix alone makes two different DIDs look identical.
 */

/** `0x9a1b2c3d…c6d7e8f9` — head and tail, so near-identical DIDs stay distinct. */
export function shortDid(did: string, head = 8, tail = 6): string {
  if (did.length <= head + tail + 1) return did;
  return `${did.slice(0, head)}…${did.slice(-tail)}`;
}

/** Polymesh's public explorer. Network-aware — testnet data is not on mainnet. */
export function explorerBase(network: "testnet" | "mainnet"): string {
  return network === "mainnet"
    ? "https://polymesh.subscan.io"
    : "https://polymesh-testnet.subscan.io";
}

export function blockUrl(
  network: "testnet" | "mainnet",
  blockNumber: number,
): string {
  return `${explorerBase(network)}/block/${blockNumber}`;
}

export function identityUrl(
  network: "testnet" | "mainnet",
  did: string,
): string {
  return `${explorerBase(network)}/identity/${did}`;
}
