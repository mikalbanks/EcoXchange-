/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_SUPABASE_URL?: string;
  readonly VITE_SUPABASE_ANON_KEY?: string;
  readonly VITE_ONBOARDING_API_URL?: string;
  /** Compliance mode: 'demo' (default) | 'preview' | 'live'. */
  readonly VITE_COMPLIANCE_MODE?: string;
  /** Required 'true' for live compliance mode (securities counsel sign-off). */
  readonly VITE_COUNSEL_APPROVED?: string;
  /** Explorer chain network: 'base-sepolia' (default) | 'base-mainnet'. */
  readonly VITE_NETWORK?: string;
  /**
   * TESTNET-ONLY throwaway signer key enabling live distribution execution.
   * Baked into the bundle at build time — must never hold real value.
   */
  readonly VITE_DISTRIBUTION_SIGNER_KEY?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
