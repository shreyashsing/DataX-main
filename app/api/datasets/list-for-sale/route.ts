import { NextRequest, NextResponse } from 'next/server';
import { ethers } from 'ethers';
import { DataNFTAbi } from '@/lib/contracts/abis/DataNFTAbi';
import { MarketplaceAbi } from '@/lib/contracts/abis/MarketplaceAbi';
import { getConfig } from '@/lib/contracts/config';
import { verifyAuth } from '@/lib/auth';

export async function POST(req: NextRequest) {
  try {
    // Verify authentication
    const authResult = await verifyAuth(req);
    if (!authResult.success) {
      return NextResponse.json({ 
        success: false, 
        message: 'Authentication required' 
      }, { status: 401 });
    }

    // Get request body
    const body = await req.json();
    const { nftId, price, walletAddress, chainId = 1337 } = body;

    // Validate required fields
    if (!nftId) {
      return NextResponse.json({ 
        success: false, 
        message: 'Missing NFT ID'
      }, { status: 400 });
    }

    if (price === undefined || price <= 0) {
      return NextResponse.json({ 
        success: false, 
        message: 'Invalid price'
      }, { status: 400 });
    }

    if (!walletAddress) {
      return NextResponse.json({ 
        success: false, 
        message: 'Missing wallet address'
      }, { status: 400 });
    }

    // Get network configuration
    const networkConfig = getConfig(chainId);
    
    // Prepare transaction parameters
    try {
      // Get contract address and ABI
      const dataNFTAddress = networkConfig.dataNFTAddress;
      const marketplaceAddress = networkConfig.marketplaceAddress;
      
      if (!marketplaceAddress || marketplaceAddress === '0x0000000000000000000000000000000000000000') {
        return NextResponse.json({ 
          success: false, 
          message: 'Marketplace contract not configured', 
          hint: 'Update marketplace address in config.ts'
        }, { status: 400 });
      }
      
      if (!dataNFTAddress || dataNFTAddress === '0x0000000000000000000000000000000000000000') {
        return NextResponse.json({ 
          success: false, 
          message: 'DataNFT contract not configured', 
          hint: 'Update DataNFT address in config.ts'
        }, { status: 400 });
      }

      // Check blockchain connection
      const provider = new ethers.providers.JsonRpcProvider('http://localhost:8545');
      
      try {
        await provider.getBlockNumber();
      } catch (error) {
        return NextResponse.json({ 
          success: false, 
          message: 'Failed to connect to blockchain', 
          hint: 'Make sure Hardhat node is running'
        }, { status: 500 });
      }

      // Check if contracts exist
      const dataNFTCode = await provider.getCode(dataNFTAddress);
      if (dataNFTCode === '0x') {
        return NextResponse.json({ 
          success: false, 
          message: 'DataNFT contract not found at the specified address',
          hint: 'Update DataNFT address in config.ts'
        }, { status: 400 });
      }

      const marketplaceCode = await provider.getCode(marketplaceAddress);
      if (marketplaceCode === '0x') {
        return NextResponse.json({ 
          success: false, 
          message: 'Marketplace contract not found at the specified address',
          hint: 'Update Marketplace address in config.ts'
        }, { status: 400 });
      }

      // Get contracts
      const dataNFT = new ethers.Contract(dataNFTAddress, DataNFTAbi, provider);
      const marketplace = new ethers.Contract(marketplaceAddress, MarketplaceAbi, provider);

      // Check NFT ownership
      try {
        const owner = await dataNFT.ownerOf(nftId);
        if (owner.toLowerCase() !== walletAddress.toLowerCase()) {
          return NextResponse.json({ 
            success: false, 
            message: 'You do not own this NFT'
          }, { status: 403 });
        }
      } catch (error) {
        return NextResponse.json({ 
          success: false, 
          message: 'NFT does not exist or cannot be accessed', 
          error: error instanceof Error ? error.message : String(error)
        }, { status: 400 });
      }

      // Check if NFT has a linked token
      try {
        const tokenAddress = await dataNFT.getDatatoken(nftId);
        if (tokenAddress === '0x0000000000000000000000000000000000000000') {
          return NextResponse.json({ 
            success: false, 
            message: 'NFT does not have a linked token',
            hint: 'You need to create a token for this NFT first'
          }, { status: 400 });
        }
      } catch (error) {
        return NextResponse.json({ 
          success: false, 
          message: 'Failed to check token link', 
          error: error instanceof Error ? error.message : String(error)
        }, { status: 500 });
      }

      // Check marketplace approvals
      try {
        const isApproved = await marketplace.checkApprovals(nftId, walletAddress);
        if (!isApproved) {
          // Prepare approval transaction
          // We can't execute it here, but we can instruct the client
          const dataNFTInterface = new ethers.utils.Interface(DataNFTAbi);
          const approveData = dataNFTInterface.encodeFunctionData("approve", [
            marketplaceAddress,
            nftId
          ]);

          return NextResponse.json({ 
            success: false, 
            requiresApproval: true,
            message: 'NFT requires approval for marketplace', 
            approvalTransaction: {
              to: dataNFTAddress,
              from: walletAddress,
              data: approveData
            }
          }, { status: 200 });
        }
      } catch (error) {
        console.error('Error checking approvals:', error);
        // Continue as we'll include approval in instructions
      }

      // Prepare listing transaction
      const marketplaceInterface = new ethers.utils.Interface(MarketplaceAbi);
      const priceInWei = ethers.utils.parseEther(price.toString());
      
      const listingData = marketplaceInterface.encodeFunctionData("listDataset", [
        nftId,
        priceInWei
      ]);

      // Get gas price and nonce
      const gasPrice = await provider.getGasPrice();
      const nonce = await provider.getTransactionCount(walletAddress);
      
      // Prepare transaction
      const listingTransaction = {
        to: marketplaceAddress,
        from: walletAddress,
        gasLimit: ethers.utils.hexlify(1000000),
        gasPrice: gasPrice.toHexString(),
        data: listingData,
        chainId: chainId,
        nonce: nonce
      };

      return NextResponse.json({
        success: true,
        message: 'Dataset ready to be listed on marketplace',
        transaction: listingTransaction
      });

    } catch (error: any) {
      console.error('Error preparing listing transaction:', error);
      
      return NextResponse.json({ 
        success: false, 
        message: 'Error preparing listing transaction', 
        error: error instanceof Error ? error.message : String(error)
      }, { status: 500 });
    }
  } catch (error: any) {
    console.error('API error:', error);
    
    return NextResponse.json({ 
      success: false, 
      message: 'Server error', 
      error: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
} 