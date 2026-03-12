/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_URL?: string;
  readonly VITE_SUPABASE_URL?: string;
  readonly VITE_SUPABASE_ANON_KEY?: string;
  readonly VITE_ADMIN_EMAIL?: string;
  readonly VITE_CONTRACT_ADDRESS?: string;
  readonly VITE_CHAIN_ID?: string;
  readonly VITE_WALLETCONNECT_PROJECT_ID?: string;
  readonly VITE_POLYGON_RPC_URL?: string;
  readonly VITE_MUMBAI_RPC_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
