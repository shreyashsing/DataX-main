'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import TokenizeButton from '@/components/dataset/TokenizeButton';

export default function TokenFixPage() {
  const [nftId, setNftId] = useState('');
  const [tokenAddress, setTokenAddress] = useState('');
  const [message, setMessage] = useState('');

  const handleTokenCreated = (address: string) => {
    setTokenAddress(address);
    setMessage(`Token created and linked successfully! You can now add the token to your wallet.`);
  };

  return (
    <div className="max-w-4xl mx-auto p-6 bg-white rounded-lg shadow-md">
      <h1 className="text-2xl font-bold mb-4">DataX Token Fix</h1>
      
      <div className="bg-blue-50 p-4 mb-6 rounded-md border border-blue-200">
        <h2 className="text-lg font-semibold mb-2">About This Page</h2>
        <p className="mb-2">
          This page offers a simplified token creation solution for datasets that are encountering 
          memory allocation errors when trying to tokenize them using the standard approach.
        </p>
        <p>
          Our simplified token implementation uses less memory while preserving the core functionality 
          needed to make your datasets tradable on DataX.
        </p>
      </div>
      
      <div className="mb-6">
        <h2 className="text-lg font-semibold mb-2">Create Simplified Token</h2>
        <div className="mb-4">
          <label htmlFor="nftId" className="block text-sm font-medium mb-1">
            Dataset NFT ID
          </label>
          <input
            id="nftId"
            type="text"
            value={nftId}
            onChange={(e) => setNftId(e.target.value)}
            placeholder="Enter the NFT ID of your dataset"
            className="w-full p-2 border border-gray-300 rounded-md"
          />
          <p className="text-sm text-gray-500 mt-1">
            You can find this ID in your Dataset details page or in the DataX Debug console.
          </p>
        </div>
        
        <div className="mb-2">
          <TokenizeButton 
            nftId={nftId} 
            isDisabled={!nftId} 
            onTokenCreated={handleTokenCreated}
          />
        </div>
      </div>
      
      {tokenAddress && (
        <div className="bg-green-50 p-4 mb-6 rounded-md border border-green-200">
          <h2 className="text-lg font-semibold mb-2">Token Created!</h2>
          <p className="mb-2">{message}</p>
          <div className="mb-2">
            <span className="font-medium">Token Address:</span>
            <code className="ml-2 p-1 bg-gray-100 rounded text-sm">{tokenAddress}</code>
          </div>
          <p className="text-sm">
            You can add this token to your wallet by using the "Import Token" feature and entering the address above.
          </p>
        </div>
      )}
      
      <div className="mt-8 border-t pt-4">
        <Link href="/dashboard" className="text-blue-600 hover:text-blue-800">
          ← Return to Dashboard
        </Link>
      </div>
    </div>
  );
} 