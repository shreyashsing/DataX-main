import { NextRequest, NextResponse } from 'next/server';
import { ethers } from 'ethers';
import { DataNFTAbi } from '@/lib/contracts/abis/DataNFTAbi';
import { TokenFactoryAbi } from '@/lib/contracts/abis/TokenFactoryAbi';
import { getConfig } from '@/lib/contracts/config';

// Helper function to wait
const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// Function to make a raw JSON-RPC request to the blockchain
async function jsonRpcRequest(method: string, params: any[] = [], url: string = 'http://localhost:8545') {
  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        method,
        params,
        id: Math.floor(Math.random() * 1000000)
      })
    });
    
    const data = await response.json();
    if (data.error) {
      throw new Error(`JSON-RPC error: ${data.error.message || JSON.stringify(data.error)}`);
    }
    
    return data.result;
  } catch (error: any) {
    console.error(`JSON-RPC request failed for method ${method}:`, error.message);
    throw error;
  }
}

export async function POST(req: NextRequest) {
  try {
    // Get request body
    const body = await req.json();
    const { walletAddress, tokenName, tokenSymbol, datasetCID, datasetHash } = body;

    if (!walletAddress) {
      return NextResponse.json({ error: 'Missing wallet address' }, { status: 400 });
    }

    console.log('Minting NFT for wallet:', walletAddress);
    console.log('Token details:', { tokenName, tokenSymbol });

    // Get the network configuration
    const networkConfig = getConfig(1337);
    
    try {
      // Test if the blockchain is reachable using raw JSON-RPC
      console.log('Testing blockchain connection via raw JSON-RPC...');
      try {
        const blockNumber = await jsonRpcRequest('eth_blockNumber');
        console.log(`Blockchain connection successful! Current block: ${parseInt(blockNumber, 16)}`);
      } catch (error: any) {
        console.error('Failed to connect to blockchain:', error.message);
        throw new Error('Could not connect to blockchain. Please make sure your node is running.');
      }
      
      // Verify token factory contract is deployed, but don't fail if it's not
      console.log('Verifying TokenFactory contract...');
      let tokenFactoryDeployed = false;
      try {
        const tokenFactoryCode = await jsonRpcRequest('eth_getCode', [networkConfig.tokenFactoryAddress, 'latest']);
        if (tokenFactoryCode === '0x' || tokenFactoryCode === '') {
          console.warn(`TokenFactory contract not found at address ${networkConfig.tokenFactoryAddress}, will proceed without automatic token creation`);
        } else {
          console.log('TokenFactory contract verified at', networkConfig.tokenFactoryAddress);
          tokenFactoryDeployed = true;
        }
      } catch (error) {
        console.warn('Error verifying TokenFactory contract, proceeding without token creation:', error);
      }
      
      // Create a dummy provider for encoding/decoding only
      const dummyProvider = new ethers.providers.JsonRpcProvider();
      
      // Generate a dataset hash if not provided using ethers.js utilities
      let datasetHashValue;
      if (datasetHash) {
        if (datasetHash.includes('-')) {
          datasetHashValue = ethers.utils.keccak256(ethers.utils.toUtf8Bytes(datasetHash));
        } else if (datasetHash.startsWith('0x')) {
          datasetHashValue = datasetHash;
        } else {
          datasetHashValue = ethers.utils.keccak256(ethers.utils.toUtf8Bytes(datasetHash));
        }
      } else {
        datasetHashValue = ethers.utils.keccak256(ethers.utils.toUtf8Bytes(datasetCID || "mock-dataset-cid"));
      }
      
      // Generate a metadata URI
      const metadataURI = `ipfs://metadata/${tokenName.replace(/\s+/g, '')}`;
      
      console.log('DataNFT contract address:', networkConfig.dataNFTAddress);
      console.log('Dataset hash:', datasetHashValue);
      console.log('Dataset CID:', datasetCID || "ipfs://QmDatasetCID");
      
      // Use any account for minting now that the function is open
      const privateKey = '0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80';
      const wallet = new ethers.Wallet(privateKey, dummyProvider);
      
      // Get nonce for the transaction and ensure it's fresh
      let nonceHex = await jsonRpcRequest('eth_getTransactionCount', [wallet.address, 'latest']);
      let nonce = parseInt(nonceHex, 16);
      console.log('Using nonce:', nonce);
      
      // Get gas price
      const gasPriceHex = await jsonRpcRequest('eth_gasPrice');
      const gasPrice = parseInt(gasPriceHex, 16);
      console.log('Gas price:', gasPrice);
      
      console.log('Minting NFT directly...');
      
      // Create contract interface for DataNFT
      const dataNFTInterface = new ethers.utils.Interface(DataNFTAbi);
      
      // Encode the function call for minting
      const mintData = dataNFTInterface.encodeFunctionData("mintNFT", [
        metadataURI,
        datasetCID || "ipfs://QmDatasetCID",
        datasetHashValue,
        false, // isPrivate
        ethers.constants.HashZero, // decryptionKey
        walletAddress
      ]);
      
      // Create transaction object
      const mintTx = {
        to: networkConfig.dataNFTAddress,
        nonce,
        gasLimit: ethers.utils.hexlify(8000000), // Increased gas limit from 4M to 8M for better reliability
        gasPrice: ethers.utils.hexlify(gasPrice),
        data: mintData,
        chainId: 1337, // Hardhat's chainId
      };
      
      console.log('Signing mint transaction...');
      const signedMintTx = await wallet.signTransaction(mintTx);
      
      console.log('Sending mint transaction...');
      const mintTxHash = await jsonRpcRequest('eth_sendRawTransaction', [signedMintTx]);
      console.log('Mint transaction hash:', mintTxHash);
      
      // Wait for mint transaction to be mined
      console.log('Waiting for mint transaction to be mined...');
      let mintReceipt = null;
      let attempts = 0;
      
      while (!mintReceipt && attempts < 30) {
        try {
          mintReceipt = await jsonRpcRequest('eth_getTransactionReceipt', [mintTxHash]);
          if (!mintReceipt) {
            console.log(`Mint transaction not yet mined, checking again in 2 seconds... (attempt ${attempts + 1}/30)`);
            await sleep(2000);
            attempts++;
          }
        } catch (error) {
          console.log('Error checking receipt, retrying...');
          await sleep(2000);
          attempts++;
        }
      }
      
      if (!mintReceipt) {
        throw new Error('Mint transaction was not mined within the timeout period');
      }
      
      console.log('Mint transaction mined in block:', parseInt(mintReceipt.blockNumber, 16));
      
      // Check if mint transaction was successful
      if (mintReceipt.status !== '0x1') {
        console.error('Mint transaction failed. Receipt:', JSON.stringify(mintReceipt, null, 2));
        throw new Error('Mint transaction failed. The transaction was mined but execution failed.');
      }
      
      console.log('Mint transaction successful!');
      
      // Try to extract tokenId from logs if available
      let tokenId = "1"; // Default value
      try {
        if (mintReceipt.logs && mintReceipt.logs.length > 0) {
          // Look for Transfer event which is typically emitted when NFTs are minted
          // ERC721 Transfer event has the signature: Transfer(address,address,uint256)
          // The tokenId is usually the third topic
          const transferEvent = mintReceipt.logs.find((log: any) => 
            log.topics && log.topics.length >= 4 && 
            log.topics[0] === '0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef' // Transfer event signature
          );
          
          if (transferEvent && transferEvent.topics[3]) {
            tokenId = parseInt(transferEvent.topics[3], 16).toString();
            console.log('Extracted token ID from logs:', tokenId);
          }
        }
      } catch (logError) {
        console.warn('Could not extract token ID from logs:', logError);
        // Using the default token ID
      }

      // Only attempt token creation if TokenFactory is deployed
      let tokenAddress = null;
      let tokenTxHash = null;

      if (tokenFactoryDeployed) {
        console.log('Automatically creating DataToken for NFT...');
        
        try {
          // Refresh nonce to avoid issues
          nonceHex = await jsonRpcRequest('eth_getTransactionCount', [wallet.address, 'latest']);
          nonce = parseInt(nonceHex, 16);
          console.log('Using fresh nonce for token creation:', nonce);
          
          // Use the TokenFactory contract to create token
          const tokenFactoryInterface = new ethers.utils.Interface(TokenFactoryAbi);
          
          // Prepare token name and symbol
          const MAX_TOKEN_NAME_LENGTH = 10; // Even smaller limit
          const MAX_TOKEN_SYMBOL_LENGTH = 5; // Even smaller limit
          
          // Use extremely short names to avoid memory issues
          let finalTokenName = "DTN" + tokenId.slice(-3); // e.g. "DTN123"
          let finalTokenSymbol = "DT" + tokenId.slice(-2); // e.g. "DT23"
          
          console.log(`Using minimal token name: ${finalTokenName} and symbol: ${finalTokenSymbol}`);
          
          // Create DataToken via TokenFactory
          const createTokenData = tokenFactoryInterface.encodeFunctionData("createToken", [
            ethers.BigNumber.from(tokenId),
            finalTokenName,
            finalTokenSymbol,
            ethers.BigNumber.from(1000), // Much smaller initial supply
            ethers.utils.parseEther("0.01"), // tokenPrice - 0.01 ETH
            18  // decimals - standard ERC20
          ]);
          
          // Create transaction for token creation
          const createTokenTx = {
            to: networkConfig.tokenFactoryAddress,
            nonce,
            gasLimit: ethers.utils.hexlify(10000000), // Increased gas limit from 7M to 10M to avoid out-of-gas errors
            gasPrice: ethers.utils.hexlify(gasPrice),
            data: createTokenData,
            chainId: 1337, // Hardhat's chainId
          };
          
          console.log('Signing token creation transaction...');
          const signedCreateTokenTx = await wallet.signTransaction(createTokenTx);
          
          console.log('Sending token creation transaction...');
          
          try {
            tokenTxHash = await jsonRpcRequest('eth_sendRawTransaction', [signedCreateTokenTx]);
            console.log('Token creation transaction hash:', tokenTxHash);
            
            // Wait for token creation transaction to be mined
            console.log('Waiting for token creation transaction to be mined...');
            let tokenReceipt = null;
            attempts = 0;
            
            while (!tokenReceipt && attempts < 30) {
              try {
                tokenReceipt = await jsonRpcRequest('eth_getTransactionReceipt', [tokenTxHash]);
                if (!tokenReceipt) {
                  console.log(`Token creation not yet mined, checking again in 2 seconds... (attempt ${attempts + 1}/30)`);
                  await sleep(2000);
                  attempts++;
                }
              } catch (error) {
                console.log('Error checking token receipt, retrying...');
                await sleep(2000);
                attempts++;
              }
            }
            
            if (!tokenReceipt) {
              console.warn('Token creation transaction was not mined within the timeout period');
            } else if (tokenReceipt.status !== '0x1') {
              console.warn('Token creation transaction failed:', tokenReceipt);
              // If TokenFactory fails, try direct deployment as fallback
              console.log('TokenFactory failed, trying direct deployment as fallback...');
              const directDeploymentResult = await tryDirectTokenDeployment(wallet, tokenId, finalTokenName, finalTokenSymbol, networkConfig.dataNFTAddress, gasPrice, nonce + 1);
              if (directDeploymentResult.success) {
                tokenAddress = directDeploymentResult.tokenAddress;
                tokenTxHash = directDeploymentResult.tokenTxHash;
                console.log('Direct deployment successful! Token created at:', tokenAddress);
              }
            } else {
              console.log('Token creation successful!');
              
              // Try to extract token address from logs
              try {
                // Look for the DataTokenCreated event
                const tokenCreatedLog = tokenReceipt.logs.find((log: any) => 
                  log.address.toLowerCase() === networkConfig.tokenFactoryAddress.toLowerCase()
                );
                
                if (tokenCreatedLog && tokenCreatedLog.data) {
                  // The token address should be in the event data
                  const decodedLog = ethers.utils.defaultAbiCoder.decode(
                    ['address', 'string', 'string', 'uint256', 'address'], 
                    '0x' + tokenCreatedLog.data.slice(66)
                  );
                  tokenAddress = decodedLog[0];
                  console.log('Extracted token address from logs:', tokenAddress);
                }
              } catch (logError) {
                console.warn('Could not extract token address from logs:', logError);
              }
              
              // If we couldn't extract from logs, query the contract
              if (!tokenAddress) {
                try {
                  // Query the TokenFactory contract for the token address
                  const getTokenData = tokenFactoryInterface.encodeFunctionData("tokensByNFTId", [
                    ethers.BigNumber.from(tokenId)
                  ]);
                  
                  const getTokenResult = await jsonRpcRequest('eth_call', [{
                    to: networkConfig.tokenFactoryAddress,
                    data: getTokenData
                  }, 'latest']);
                  
                  tokenAddress = ethers.utils.defaultAbiCoder.decode(['address'], getTokenResult)[0];
                  console.log('Retrieved token address from contract:', tokenAddress);
                }
                catch (queryError) {
                  console.warn('Could not query token address from contract:', queryError);
                }
              }
            }
          } catch (tokenError) {
            console.error('Failed to create token, but NFT was minted successfully:', tokenError);
            // Try direct deployment as fallback
            console.log('TokenFactory failed, trying direct deployment as fallback...');
            const directDeploymentResult = await tryDirectTokenDeployment(wallet, tokenId, finalTokenName, finalTokenSymbol, networkConfig.dataNFTAddress, gasPrice, nonce + 1);
            if (directDeploymentResult.success) {
              tokenAddress = directDeploymentResult.tokenAddress;
              tokenTxHash = directDeploymentResult.tokenTxHash;
              console.log('Direct deployment successful! Token created at:', tokenAddress);
            }
          }
        } catch (tokenCreationError) {
          console.error('Error during token creation preparation, but NFT was minted successfully:', tokenCreationError);
          // Continue without failing the whole process
        }
      } else {
        console.log('Skipping token creation as TokenFactory is not deployed or not verified');
      }

      // Helper function for direct token deployment
      async function tryDirectTokenDeployment(wallet: any, tokenId: string, finalTokenName: string, finalTokenSymbol: string, dataNFTAddress: string, gasPrice: number, nonce: number) {
        try {
          console.log('Attempting direct token deployment with nonce:', nonce);
          
          // Import from remote files to avoid having bytecode in this file
          const { DatatokenBytecode, DatatokenAbi } = await import('@/lib/contracts/bytecode/DataToken');
          
          // Ensure token name and symbol are not too long (additional safeguard)
          const MAX_TOKEN_NAME_LENGTH = 10; // Even smaller limit
          const MAX_TOKEN_SYMBOL_LENGTH = 5; // Even smaller limit
          
          // Use extremely short names to avoid memory issues
          let safeTokenName = "DTN" + tokenId.slice(-3); // e.g. "DTN123"
          let safeTokenSymbol = "DT" + tokenId.slice(-2); // e.g. "DT23"
          
          console.log(`Using minimal token name: ${safeTokenName} and symbol: ${safeTokenSymbol}`);
          
          // Encode constructor parameters with minimal values
          const datatokenInterface = new ethers.utils.Interface(DatatokenAbi);
          const constructorData = datatokenInterface.encodeDeploy([
            safeTokenName,
            safeTokenSymbol,
            ethers.BigNumber.from(1000), // Much smaller initial supply
            ethers.utils.parseEther("0.01"), // tokenPrice - 0.01 ETH
            18  // decimals - standard ERC20
          ]);
          
          // Create transaction to deploy DataToken directly
          const deployData = DatatokenBytecode + constructorData.slice(2); // Remove 0x prefix from constructor data
          
          // Create transaction object
          const deployTx = {
            nonce,
            gasLimit: ethers.utils.hexlify(15000000), // Use even higher gas limit for direct deployment
            gasPrice: ethers.utils.hexlify(gasPrice),
            data: deployData,
            chainId: 1337, // Hardhat's chainId
          };
          
          // Calculate the expected contract address
          const expectedAddress = ethers.utils.getContractAddress({
            from: wallet.address,
            nonce: nonce
          });
          
          console.log('Signing direct token deployment transaction...');
          const signedDeployTx = await wallet.signTransaction(deployTx);
          
          console.log('Sending direct token deployment transaction...');
          const deployTxHash = await jsonRpcRequest('eth_sendRawTransaction', [signedDeployTx]);
          console.log('Direct deployment transaction hash:', deployTxHash);
          
          // Wait for deployment transaction to be mined
          let deployReceipt = null;
          let attempts = 0;
          
          while (!deployReceipt && attempts < 30) {
            deployReceipt = await jsonRpcRequest('eth_getTransactionReceipt', [deployTxHash]);
            if (!deployReceipt) {
              console.log(`Direct deployment not yet mined, checking again in 2 seconds... (attempt ${attempts + 1}/30)`);
              await sleep(2000);
              attempts++;
            }
          }
          
          if (!deployReceipt) {
            console.warn('Direct deployment transaction was not mined within the timeout period');
            return { success: false };
          } else if (deployReceipt.status !== '0x1') {
            console.warn('Direct deployment transaction failed:', deployReceipt);
            return { success: false };
          }
          
          console.log('Direct deployment successful!');
          
          // Link the token to the NFT
          const dataNFTInterface = new ethers.utils.Interface(DataNFTAbi);
          const linkTokenData = dataNFTInterface.encodeFunctionData("linkDatatoken", [
            ethers.BigNumber.from(tokenId),
            expectedAddress
          ]);
          
          // Create transaction to link the token
          const linkTx = {
            to: dataNFTAddress,
            nonce: nonce + 1,
            gasLimit: ethers.utils.hexlify(1000000),
            gasPrice: ethers.utils.hexlify(gasPrice),
            data: linkTokenData,
            chainId: 1337,
          };
          
          console.log('Signing token linking transaction...');
          const signedLinkTx = await wallet.signTransaction(linkTx);
          
          console.log('Sending token linking transaction...');
          const linkTxHash = await jsonRpcRequest('eth_sendRawTransaction', [signedLinkTx]);
          
          // Wait for linking transaction to be mined
          let linkReceipt = null;
          attempts = 0;
          
          while (!linkReceipt && attempts < 30) {
            linkReceipt = await jsonRpcRequest('eth_getTransactionReceipt', [linkTxHash]);
            if (!linkReceipt) {
              console.log(`Linking transaction not yet mined, checking again in 2 seconds... (attempt ${attempts + 1}/30)`);
              await sleep(2000);
              attempts++;
            }
          }
          
          if (!linkReceipt || linkReceipt.status !== '0x1') {
            console.warn('Linking transaction failed or was not mined, but token was created');
          } else {
            console.log('Token successfully linked to NFT!');
          }
          
          return {
            success: true,
            tokenAddress: expectedAddress,
            tokenTxHash: deployTxHash
          };
        } catch (error) {
          console.error('Direct token deployment error:', error);
          return { success: false };
        }
      }

      // Return successful response with token details if available
      return NextResponse.json({
        success: true,
        tokenId: tokenId,
        dataNFTAddress: networkConfig.dataNFTAddress,
        tokenFactoryAddress: networkConfig.tokenFactoryAddress,
        tokenAddress: tokenAddress,
        mintTxHash: mintTxHash,
        tokenTxHash: tokenTxHash,
        message: tokenAddress 
          ? 'Dataset successfully minted as NFT with DataToken on the blockchain'
          : 'Dataset successfully minted as NFT, but DataToken creation was skipped or failed',
        automaticTokenCreation: !!tokenAddress,
        result: tokenAddress ? 'Complete' : 'Partial',
        detail: tokenFactoryDeployed ? 'Token factory contract found' : 'Token factory contract not found'
      });
    } catch (contractError: any) {
      console.error('Contract interaction error:', contractError);
            
      // Return a helpful error message with clear instructions
      return NextResponse.json({ 
        success: false, 
        message: 'Error interacting with blockchain contract',
        error: contractError instanceof Error ? contractError.message : String(contractError),
        hint: "1. Make sure Hardhat node is running with: npx hardhat node --hostname 0.0.0.0\n2. Deploy contracts with: npx hardhat run scripts/deploy-local.js --network localhost\n3. Check that your contracts are deployed to the expected addresses in config.ts"
      }, { status: 500 });
    }
  } catch (error: any) {
    console.error('NFT Minting error:', error);
    
    return NextResponse.json({ 
      success: false, 
      message: 'Error during NFT minting',
      error: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
} 