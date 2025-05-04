import React, { useState, useEffect } from 'react';
import { ethers } from 'ethers';
import { toast } from 'react-hot-toast';
import { Button, Card, Spinner, Alert } from 'flowbite-react';
import { purchaseDataTokens } from '@/lib/blockchain/tokenUtils';
import { useAuth } from '@/hooks/useAuth';

const DatasetPurchase = ({ dataset, onPurchaseComplete }) => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [purchaseStatus, setPurchaseStatus] = useState('idle'); // idle, connecting, purchasing, success, error
  const [error, setError] = useState(null);
  const [walletAddress, setWalletAddress] = useState('');
  const [purchaseResult, setPurchaseResult] = useState(null);
  const [transactionHash, setTransactionHash] = useState('');
  const [debugMode, setDebugMode] = useState(false);

  // Check if MetaMask is available
  const isMetaMaskAvailable = typeof window !== 'undefined' && window.ethereum;

  // Connect to MetaMask wallet
  const connectWallet = async () => {
    if (!isMetaMaskAvailable) {
      toast.error('MetaMask is not installed. Please install MetaMask to continue.');
      setError('MetaMask not detected. Please install MetaMask to purchase tokens.');
      return;
    }

    try {
      setPurchaseStatus('connecting');
      setLoading(true);
      console.log('Connecting to wallet...');
      
      // Request accounts from MetaMask
      const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
      const account = accounts[0];
      
      console.log('Wallet connected:', account);
      setWalletAddress(account);
      setPurchaseStatus('connected');
      toast.success('Wallet connected successfully!');
      setLoading(false);
    } catch (error) {
      console.error('Error connecting wallet:', error);
      setError('Failed to connect wallet: ' + (error.message || 'Unknown error'));
      setPurchaseStatus('error');
      setLoading(false);
      toast.error('Failed to connect wallet');
    }
  };

  // Direct transaction method (skips the purchaseDataTokens helper)
  const handleDirectPurchase = async () => {
    if (!walletAddress || !dataset._id) {
      toast.error('Wallet not connected or invalid dataset');
      return;
    }

    try {
      setPurchaseStatus('purchasing');
      setLoading(true);
      console.log('Starting direct purchase flow...');
      toast.loading('Initiating direct purchase...');

      // 1. Get purchase info from API
      console.log('Fetching transaction details from API...');
      const response = await fetch(`/api/datasets/${dataset._id}/purchase`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          address: walletAddress,
          chainId: window.ethereum ? parseInt(window.ethereum.chainId, 16) : 1337 
        })
      });

      if (!response.ok) {
        throw new Error(`API error: ${response.status} ${response.statusText}`);
      }

      const purchaseData = await response.json();
      console.log('Purchase API response:', purchaseData);

      if (!purchaseData.success) {
        throw new Error(purchaseData.error || 'Failed to initialize purchase');
      }

      if (purchaseData.alreadyPurchased) {
        console.log('Dataset already purchased');
        setPurchaseResult(purchaseData);
        setPurchaseStatus('success');
        toast.dismiss();
        toast.success('Dataset already purchased!');
        if (onPurchaseComplete) {
          onPurchaseComplete(purchaseData);
        }
        return;
      }

      if (!purchaseData.requiresTokenPurchase || !purchaseData.transaction) {
        throw new Error('No purchase transaction returned from API');
      }

      // 2. Send transaction via wallet
      console.log('Preparing to send transaction to MetaMask...');
      const provider = new ethers.providers.Web3Provider(window.ethereum);
      const signer = provider.getSigner();

      // Ensure we have all the transaction details
      if (!purchaseData.transaction.to) {
        purchaseData.transaction.to = purchaseData.tokenAddress;
      }
      
      if (!purchaseData.transaction.value) {
        purchaseData.transaction.value = ethers.utils.parseEther(purchaseData.cost || "0.01").toString();
      }

      console.log('Transaction details:', {
        to: purchaseData.transaction.to,
        value: purchaseData.transaction.value,
        data: purchaseData.transaction.data ? purchaseData.transaction.data.substring(0, 20) + '...' : 'No data',
        gasLimit: purchaseData.transaction.gasLimit
      });

      try {
        console.log('Sending transaction to wallet for approval...');
        const tx = await signer.sendTransaction({
          to: purchaseData.transaction.to,
          value: purchaseData.transaction.value.startsWith('0x') 
            ? purchaseData.transaction.value 
            : ethers.utils.parseEther(purchaseData.cost || "0.01"),
          data: purchaseData.transaction.data || '0x',
          gasLimit: ethers.BigNumber.from(purchaseData.transaction.gasLimit || 200000).mul(2) // Double for safety
        });

        console.log('Transaction sent:', tx);
        console.log('Transaction hash:', tx.hash);
        setTransactionHash(tx.hash);

        // Show toast that transaction is processing
        toast.dismiss();
        toast.loading('Transaction sent! Waiting for confirmation...');

        // 3. Wait for transaction to be mined
        console.log('Waiting for transaction to be mined...');
        const receipt = await tx.wait();
        console.log('Transaction confirmed in block:', receipt.blockNumber);

        // 4. Confirm purchase with backend
        console.log('Confirming purchase with backend...');
        try {
          const confirmResponse = await fetch(`/api/datasets/${dataset._id}/purchase/confirm`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              address: walletAddress,
              transactionHash: tx.hash,
              chainId: window.ethereum ? parseInt(window.ethereum.chainId, 16) : 1337
            })
          });

          if (!confirmResponse.ok) {
            console.error(`Confirmation API error: ${confirmResponse.status} ${confirmResponse.statusText}`);
            // Store transaction hash for manual confirmation later
            setTransactionHash(tx.hash);
            setPurchaseStatus('needsConfirmation');
            toast.dismiss();
            toast.success('Transaction completed! Manual confirmation needed.');
            return;
          }

          const confirmData = await confirmResponse.json();
          console.log('Purchase confirmation response:', confirmData);

          if (!confirmData.success) {
            throw new Error(confirmData.error || 'Failed to confirm purchase');
          }

          setPurchaseResult(confirmData);
          setPurchaseStatus('success');
          toast.dismiss();
          toast.success('Purchase successful!');
          if (onPurchaseComplete) {
            onPurchaseComplete(confirmData);
          }
        } catch (confirmError) {
          console.error('Error confirming purchase:', confirmError);
          // Even if confirmation fails, the transaction was successful
          // Store the transaction hash for manual confirmation later
          setTransactionHash(tx.hash);
          setPurchaseStatus('needsConfirmation');
          toast.dismiss();
          toast.warning('Transaction completed, but confirmation failed. Please try manual confirmation.');
        }
      } catch (txError) {
        console.error('Transaction error:', txError);
        setTransactionHash(txError.transaction?.hash || '');
        throw new Error('Transaction failed: ' + (txError.message || 'Unknown error'));
      }
    } catch (error) {
      console.error('Direct purchase error:', error);
      setPurchaseStatus('error');
      setError(error.message || 'Purchase failed');
      toast.dismiss();
      toast.error('Purchase failed: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  // Original purchase method
  const handlePurchase = async () => {
    if (!walletAddress) {
      toast.error('Please connect your wallet first');
      return;
    }

    if (!dataset._id) {
      toast.error('Invalid dataset');
      return;
    }

    try {
      setPurchaseStatus('purchasing');
      setLoading(true);
      console.log('Starting purchase flow via tokenUtils...');
      toast.loading('Initiating purchase...');

      const result = await purchaseDataTokens(dataset._id, walletAddress, {
        chainId: window.ethereum ? parseInt(window.ethereum.chainId, 16) : 1337
      });
      
      console.log('Purchase result:', result);
      setPurchaseResult(result);
      
      if (result.success) {
        setPurchaseStatus('success');
        toast.dismiss();
        toast.success('Purchase successful!');
        if (onPurchaseComplete) {
          onPurchaseComplete(result);
        }
      } else if (result.requiresTokenization) {
        setPurchaseStatus('error');
        setError('This dataset needs to be tokenized before it can be purchased.');
        toast.dismiss();
        toast.error('Dataset needs tokenization');
      } else {
        setPurchaseStatus('error');
        setError(result.error || 'Purchase failed');
        toast.dismiss();
        toast.error('Purchase failed');
      }
    } catch (error) {
      console.error('Error purchasing tokens:', error);
      setPurchaseStatus('error');
      setError('Failed to purchase tokens: ' + (error.message || 'Unknown error'));
      toast.dismiss();
      toast.error('Purchase failed');
    } finally {
      setLoading(false);
    }
  };

  // Manual confirmation method for when automatic confirmation fails
  const handleManualConfirm = async () => {
    if (!transactionHash || !walletAddress) {
      toast.error('No transaction hash or wallet address available');
      return;
    }

    try {
      setLoading(true);
      console.log('Manually confirming purchase with hash:', transactionHash);
      toast.loading('Manually confirming purchase...');

      const response = await fetch(`/api/datasets/${dataset._id}/purchase/confirm`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          address: walletAddress,
          transactionHash,
          chainId: window.ethereum ? parseInt(window.ethereum.chainId, 16) : 1337
        })
      });

      if (!response.ok) {
        throw new Error(`API error: ${response.status} ${response.statusText}`);
      }

      const confirmData = await response.json();
      console.log('Manual confirmation response:', confirmData);

      if (!confirmData.success) {
        throw new Error(confirmData.error || 'Failed to confirm purchase');
      }

      setPurchaseResult(confirmData);
      setPurchaseStatus('success');
      toast.dismiss();
      toast.success('Purchase confirmed manually!');
      if (onPurchaseComplete) {
        onPurchaseComplete(confirmData);
      }
    } catch (error) {
      console.error('Manual confirmation error:', error);
      setError('Manual confirmation failed: ' + (error.message || 'Unknown error'));
      toast.dismiss();
      toast.error('Manual confirmation failed');
    } finally {
      setLoading(false);
    }
  };

  // Get purchase button text based on status
  const getPurchaseButtonText = () => {
    switch (purchaseStatus) {
      case 'idle':
        return 'Connect Wallet';
      case 'connecting':
        return 'Connecting...';
      case 'connected':
        return 'Purchase Dataset';
      case 'purchasing':
        return 'Purchasing...';
      case 'success':
        return 'Purchased';
      case 'error':
        return 'Try Again';
      case 'needsConfirmation':
        return 'Needs Manual Confirmation';
      default:
        return 'Connect Wallet';
    }
  };

  // Get purchase button action based on status
  const getPurchaseButtonAction = () => {
    if (purchaseStatus === 'idle' || purchaseStatus === 'error') {
      return connectWallet;
    } else if (purchaseStatus === 'connected') {
      return debugMode ? handleDirectPurchase : handlePurchase;
    } else if (purchaseStatus === 'needsConfirmation') {
      return handleManualConfirm;
    }
    return null;
  };

  // Toggle debug mode
  const toggleDebugMode = () => {
    setDebugMode(!debugMode);
    console.log('Debug mode:', !debugMode);
  };

  return (
    <Card className="max-w-lg mx-auto">
      <h3 className="text-xl font-bold mb-4">Purchase Access</h3>
      
      {dataset && (
        <div className="mb-4">
          <p className="text-gray-700 mb-2">
            <span className="font-semibold">Dataset:</span> {dataset.name}
          </p>
          <p className="text-gray-700 mb-2">
            <span className="font-semibold">Price:</span> {dataset.price || '0.01'} ETH
          </p>
          <p className="text-gray-700 mb-2">
            <span className="font-semibold">Token:</span> {dataset.tokenName || 'Data Token'}
          </p>
        </div>
      )}

      {error && (
        <Alert color="failure" className="mb-4">
          <span className="font-medium">Error!</span> {error}
        </Alert>
      )}

      {purchaseResult && purchaseResult.success && (
        <Alert color="success" className="mb-4">
          <span className="font-medium">Success!</span> You now have access to this dataset.
          {purchaseResult.tokenBalance && (
            <p className="mt-2">Token Balance: {purchaseResult.tokenBalance}</p>
          )}
        </Alert>
      )}

      <div className="flex flex-col space-y-4">
        {walletAddress && (
          <div className="text-sm text-gray-500 break-all">
            Connected: {walletAddress}
          </div>
        )}

        <Button
          onClick={getPurchaseButtonAction()}
          disabled={loading || purchaseStatus === 'purchasing' || purchaseStatus === 'success'}
          color={purchaseStatus === 'success' ? 'success' : 'primary'}
        >
          {loading && <Spinner className="mr-2" size="sm" />}
          {getPurchaseButtonText()}
        </Button>

        {purchaseStatus === 'error' && transactionHash && (
          <Button onClick={handleManualConfirm} color="warning">
            {loading ? <Spinner className="mr-2" size="sm" /> : null}
            Try Manual Confirmation
          </Button>
        )}
        
        {purchaseStatus === 'needsConfirmation' && (
          <div className="mt-4">
            <Alert color="warning" className="mb-4">
              <span className="font-medium">Transaction sent but not confirmed!</span> Your transaction was sent successfully,
              but we couldn't confirm it with our server. Click below to manually confirm the transaction.
            </Alert>
            <Button onClick={handleManualConfirm} color="warning">
              {loading ? <Spinner className="mr-2" size="sm" /> : null}
              Manually Confirm Transaction
            </Button>
            <div className="mt-2 text-xs text-gray-500 break-all">
              Transaction hash: {transactionHash}
            </div>
          </div>
        )}

        {debugMode && (
          <div className="mt-4 p-3 bg-gray-100 rounded-lg text-sm">
            <h4 className="font-semibold text-gray-700">Debug Info</h4>
            {transactionHash && (
              <div className="mt-2">
                <p className="font-semibold">Transaction Hash:</p>
                <p className="text-xs break-all">{transactionHash}</p>
              </div>
            )}
            <Button 
              size="xs" 
              color="light" 
              className="mt-2" 
              onClick={handleManualConfirm}
              disabled={!transactionHash || loading}
            >
              Manual Confirm
            </Button>
          </div>
        )}

        {purchaseStatus === 'success' && (
          <Button onClick={() => window.location.reload()} color="light">
            Refresh Page
          </Button>
        )}

        {!isMetaMaskAvailable && (
          <Alert color="warning">
            <span className="font-medium">MetaMask not detected!</span> Please install the{' '}
            <a 
              href="https://metamask.io/download.html" 
              target="_blank" 
              rel="noopener noreferrer"
              className="underline text-blue-700"
            >
              MetaMask
            </a>{' '}
            browser extension to purchase datasets.
          </Alert>
        )}
        
        <div className="text-right">
          <button 
            type="button" 
            onClick={toggleDebugMode} 
            className="text-xs text-gray-400 hover:text-gray-600"
          >
            {debugMode ? 'Disable Debug Mode' : 'Enable Debug Mode'}
          </button>
        </div>
      </div>
    </Card>
  );
};

export default DatasetPurchase; 