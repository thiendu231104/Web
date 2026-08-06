export const getBlockchainConfig = () => {
  const chainIdDecimal = import.meta.env.VITE_CHAIN_ID || '11155111';
  let chainIdHex = '';
  if (chainIdDecimal.startsWith('0x')) {
    chainIdHex = chainIdDecimal;
  } else {
    chainIdHex = '0x' + parseInt(chainIdDecimal, 10).toString(16);
  }

  return {
    networkName: import.meta.env.VITE_NETWORK_NAME || 'Sepolia',
    chainIdDecimal: String(chainIdDecimal),
    chainIdHex,
    rpcUrl: import.meta.env.VITE_RPC_URL || 'https://ethereum-sepolia-rpc.publicnode.com',
    blockExplorer: import.meta.env.VITE_BLOCK_EXPLORER || 'https://sepolia.etherscan.io',
    receiverWallet: import.meta.env.VITE_RECEIVER_WALLET || '0x26FE0B08bB4d0BCc05e04248770e6E2731a04137'
  };
};

export const web3Service = {
  isMetaMaskInstalled(): boolean {
    return typeof window !== 'undefined' && !!(window as any).ethereum;
  },

  async getConnectedAccounts(): Promise<string[]> {
    if (!this.isMetaMaskInstalled()) return [];
    try {
      const accounts = await (window as any).ethereum.request({ method: 'eth_accounts' });
      return accounts || [];
    } catch (err) {
      console.error('Error getting connected accounts:', err);
      return [];
    }
  },

  async getChainId(): Promise<string | null> {
    if (!this.isMetaMaskInstalled()) return null;
    try {
      const chainId = await (window as any).ethereum.request({ method: 'eth_chainId' });
      return chainId;
    } catch (err) {
      console.error('Error getting chain ID:', err);
      return null;
    }
  },

  async connect(): Promise<string> {
    if (!this.isMetaMaskInstalled()) {
      throw new Error('Vui lòng cài đặt tiện ích mở rộng MetaMask để thực hiện giao dịch');
    }
    
    // Request accounts
    const accounts = await (window as any).ethereum.request({
      method: 'eth_requestAccounts',
    });
    
    if (!accounts || accounts.length === 0) {
      throw new Error('Người dùng từ chối kết nối ví.');
    }
    
    return accounts[0];
  },

  async switchToSepolia(): Promise<boolean> {
    if (!this.isMetaMaskInstalled()) return false;
    const config = getBlockchainConfig();
    try {
      await (window as any).ethereum.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: config.chainIdHex }],
      });
      return true;
    } catch (switchError: any) {
      // This error code indicates that the chain has not been added to MetaMask.
      if (switchError.code === 4902) {
        try {
          await (window as any).ethereum.request({
            method: 'wallet_addEthereumChain',
            params: [
              {
                chainId: config.chainIdHex,
                chainName: config.networkName,
                rpcUrls: [config.rpcUrl],
                nativeCurrency: {
                  name: config.networkName + ' Ether',
                  symbol: 'ETH',
                  decimals: 18,
                },
                blockExplorerUrls: [config.blockExplorer],
              },
            ],
          });
          return true;
        } catch (addError) {
          console.error('Error adding chain:', addError);
          throw new Error(`Không thể thêm mạng ${config.networkName} vào MetaMask.`);
        }
      }
      console.error('Error switching network:', switchError);
      throw new Error(`Không thể chuyển sang mạng ${config.networkName}. Vui lòng xác nhận chuyển mạng trong MetaMask.`);
    }
  },

  truncateAddress(address: string): string {
    if (!address) return '';
    return `${address.substring(0, 6)}...${address.substring(address.length - 4)}`;
  }
};
