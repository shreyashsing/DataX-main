import React, { useState } from 'react';
import { createTokenForNFT } from '@/lib/blockchain/clientSigner';

// Button to handle dataset tokenization
interface TokenizeButtonProps {
  nftId: string;
  isDisabled?: boolean;
  onTokenCreated?: (tokenAddress: string) => void;
}

const TokenizeButton: React.FC<TokenizeButtonProps> = ({ 
  nftId, 
  isDisabled = false,
  onTokenCreated
}) => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const handleTokenize = async () => {
    setIsLoading(true);
    setError(null);
    setSuccess(null);
    
    try {
      console.log('Starting tokenization process for NFT:', nftId);
      
      const result = await createTokenForNFT(nftId);
      
      if (result.success) {
        console.log('Tokenization successful:', result);
        setSuccess(`Token created successfully${result.tokenAddress ? `: ${result.tokenAddress}` : ''}`);
        
        if (result.tokenAddress && onTokenCreated) {
          onTokenCreated(result.tokenAddress);
        }
      } else {
        console.error('Tokenization failed:', result.error);
        setError(result.error || 'Failed to create token');
      }
    } catch (error: any) {
      console.error('Tokenization error:', error);
      setError(error.message || 'An error occurred during tokenization');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div>
      <button
        className="w-full mb-2 py-2 px-4 bg-green-600 hover:bg-green-700 text-white rounded-md disabled:opacity-50"
        onClick={handleTokenize}
        disabled={isDisabled || isLoading}
        title="Create a token for this dataset to make it purchasable"
      >
        {isLoading ? (
          <span className="inline-block mr-2 h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
        ) : null}
        {isLoading ? 'Creating Token...' : 'Tokenize Dataset'}
      </button>
      
      {error && (
        <div className="mb-2 p-2 text-sm border border-red-300 bg-red-50 text-red-800 rounded-md">
          {error}
        </div>
      )}
      
      {success && (
        <div className="mb-2 p-2 text-sm border border-green-300 bg-green-50 text-green-800 rounded-md">
          {success}
        </div>
      )}
    </div>
  );
};

export default TokenizeButton; 