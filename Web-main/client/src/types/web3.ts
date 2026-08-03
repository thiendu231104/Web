export interface Web3State {
  isInstalled: boolean;
  isConnected: boolean;
  walletAddress: string | null;
  chainId: string | null;
  isSepolia: boolean;
  error: string | null;
}
