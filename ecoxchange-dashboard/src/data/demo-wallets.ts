// Demo holder wallets for the distribution simulation. Used whenever Privy
// embedded wallets are not configured (the current default). Shares are
// basis points and sum to exactly 10000 (100%). Holder 1 is the demo
// investor persona ("Your Wallet", 2% — matching the canonical demo dataset:
// 100 ESN, $354.00/month at a $17,700 monthly pool).

export interface DemoHolder {
  address: string;
  name: string;
  shareBps: number;
  label: string;
}

export const DEMO_HOLDERS: DemoHolder[] = [
  { address: "0x1111111111111111111111111111111111111111", name: "Demo Investor 1",  shareBps: 200,  label: "Your Wallet" },
  { address: "0x2222222222222222222222222222222222222222", name: "Demo Investor 2",  shareBps: 400,  label: "Investor 2" },
  { address: "0x3333333333333333333333333333333333333333", name: "Demo Investor 3",  shareBps: 150,  label: "Investor 3" },
  { address: "0x4444444444444444444444444444444444444444", name: "Demo Investor 4",  shareBps: 300,  label: "Investor 4" },
  { address: "0x5555555555555555555555555555555555555555", name: "Demo Investor 5",  shareBps: 250,  label: "Investor 5" },
  { address: "0x6666666666666666666666666666666666666666", name: "Demo Investor 6",  shareBps: 500,  label: "Investor 6" },
  { address: "0x7777777777777777777777777777777777777777", name: "Demo Investor 7",  shareBps: 350,  label: "Investor 7" },
  { address: "0x8888888888888888888888888888888888888888", name: "Demo Investor 8",  shareBps: 100,  label: "Investor 8" },
  { address: "0x9999999999999999999999999999999999999999", name: "Demo Investor 9",  shareBps: 600,  label: "Investor 9" },
  { address: "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa", name: "Demo Investor 10", shareBps: 200,  label: "Investor 10" },
  { address: "0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb", name: "Demo Investor 11", shareBps: 450,  label: "Investor 11" },
  { address: "0xcccccccccccccccccccccccccccccccccccccccc", name: "Demo Investor 12", shareBps: 6500, label: "Investor 12" },
];

/** Dollar amount a holder receives from a pool (bps share, rounded to cents). */
export function holderAmountUsd(poolUsd: number, shareBps: number): number {
  return Math.round((poolUsd * shareBps) / 100) / 100;
}
