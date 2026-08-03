import { useState, useEffect, useCallback } from 'react';
import { web3Service, getBlockchainConfig } from '../services/web3Service';
import type { Web3State } from '../types/web3';

export function useWeb3() {
  const [state, setState] = useState<Web3State>({
    isInstalled: web3Service.isMetaMaskInstalled(),
    isConnected: false,
    walletAddress: null,
    chainId: null,
    isSepolia: false,
    error: null,
  });

  const checkConnection = useCallback(async () => {
    if (!web3Service.isMetaMaskInstalled()) {
      setState(prev => ({ ...prev, isInstalled: false }));
      return;
    }

    const config = getBlockchainConfig();
    const accounts = await web3Service.getConnectedAccounts();
    const chainId = await web3Service.getChainId();

    const isConnected = accounts.length > 0;
    const walletAddress = isConnected ? accounts[0] : null;
    const isSepolia = chainId?.toLowerCase() === config.chainIdHex.toLowerCase();

    setState({
      isInstalled: true,
      isConnected,
      walletAddress,
      chainId,
      isSepolia,
      error: null,
    });
  }, []);

  // Listen to changes in MetaMask
  useEffect(() => {
    if (!web3Service.isMetaMaskInstalled()) return;

    const handleAccountsChanged = (accounts: string[]) => {
      const isConnected = accounts.length > 0;
      const walletAddress = isConnected ? accounts[0] : null;
      setState(prev => ({
        ...prev,
        isConnected,
        walletAddress,
        error: null,
      }));
    };

    const handleChainChanged = (chainId: string) => {
      const config = getBlockchainConfig();
      setState(prev => ({
        ...prev,
        chainId,
        isSepolia: chainId?.toLowerCase() === config.chainIdHex.toLowerCase(),
        error: null,
      }));
    };

    const ethereum = (window as any).ethereum;
    ethereum.on('accountsChanged', handleAccountsChanged);
    ethereum.on('chainChanged', handleChainChanged);

    return () => {
      if (ethereum.removeListener) {
        ethereum.removeListener('accountsChanged', handleAccountsChanged);
        ethereum.removeListener('chainChanged', handleChainChanged);
      }
    };
  }, []);

  const connect = async () => {
    setState(prev => ({ ...prev, error: null }));
    try {
      if (!web3Service.isMetaMaskInstalled()) {
        throw new Error('Vui lòng cài đặt tiện ích mở rộng MetaMask để thực hiện giao dịch');
      }
      const config = getBlockchainConfig();
      // Connect first
      const account = await web3Service.connect();
      const chainId = await web3Service.getChainId();
      const isSepolia = chainId?.toLowerCase() === config.chainIdHex.toLowerCase();

      setState(prev => ({
        ...prev,
        isConnected: true,
        walletAddress: account,
        chainId,
        isSepolia,
        error: null,
      }));

      return { success: true, address: account, isSepolia };
    } catch (err: any) {
      const errMsg = err.message || 'Kết nối ví thất bại.';
      setState(prev => ({ ...prev, error: errMsg }));
      return { success: false, error: errMsg };
    }
  };

  const switchToSepolia = async () => {
    setState(prev => ({ ...prev, error: null }));
    try {
      const config = getBlockchainConfig();
      const success = await web3Service.switchToSepolia();
      if (success) {
        setState(prev => ({
          ...prev,
          chainId: config.chainIdHex,
          isSepolia: true,
          error: null,
        }));
      }
      return success;
    } catch (err: any) {
      const errMsg = err.message || 'Chuyển mạng thất bại.';
      setState(prev => ({ ...prev, error: errMsg }));
      return false;
    }
  };

  return {
    ...state,
    connect,
    connectWallet: connect,
    switchToSepolia,
    checkConnection,
  };
}
