import { NextRequest, NextResponse } from 'next/server';
import { ethers } from 'ethers';
import { verifyAuth } from '@/lib/auth/auth-helpers';
import { DatatokenAbi } from '@/lib/contracts/bytecode/DataToken';

/**
 * API endpoint to check a user's DataToken balance for a specific token
 */
export async function POST(req: NextRequest) {
  try {
    // Verify authentication
    const authResult = await verifyAuth(req);
    
    if (!authResult.isValid) {
      return NextResponse.json({ 
        success: false, 
        message: 'Authentication required' 
      }, { status: 401 });
    }

    // Get request body
    const body = await req.json();
    const { tokenAddress, walletAddress, chainId = 1337 } = body;

    // Validate required fields
    if (!tokenAddress) {
      return NextResponse.json({ 
        success: false, 
        message: 'Token address is required' 
      }, { status: 400 });
    }

    if (!walletAddress) {
      return NextResponse.json({ 
        success: false, 
        message: 'Wallet address is required' 
      }, { status: 400 });
    }

    // Connect to the local blockchain node
    const provider = new ethers.providers.JsonRpcProvider('http://localhost:8545');
    
    try {
      // Check if the token contract exists
      const code = await provider.getCode(tokenAddress);
      
      if (code === '0x') {
        return NextResponse.json({ 
          success: false, 
          message: 'Token contract not found at the specified address' 
        }, { status: 400 });
      }
      
      // Create a contract instance
      const token = new ethers.Contract(tokenAddress, DatatokenAbi, provider);
      
      // Get token details
      const name = await token.name();
      const symbol = await token.symbol();
      const decimals = await token.decimals();
      const totalSupply = await token.totalSupply();
      const price = await token.tokenPrice();
      
      // Get the user's balance
      const balance = await token.balanceOf(walletAddress);
      
      return NextResponse.json({
        success: true,
        token: {
          address: tokenAddress,
          name,
          symbol,
          decimals: decimals.toString(),
          totalSupply: ethers.utils.formatUnits(totalSupply, decimals),
          price: ethers.utils.formatEther(price),
          balance: ethers.utils.formatUnits(balance, decimals)
        }
      });
    } catch (error) {
      console.error('Error fetching token balance:', error);
      
      return NextResponse.json({ 
        success: false, 
        message: 'Error fetching token balance',
        error: error instanceof Error ? error.message : String(error)
      }, { status: 500 });
    }
  } catch (error) {
    console.error('API error:', error);
    
    return NextResponse.json({ 
      success: false, 
      message: 'Server error',
      error: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
} 