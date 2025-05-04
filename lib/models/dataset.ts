import mongoose, { Schema, Document } from 'mongoose';

export interface IDataset extends Document {
  name: string;
  description: string;
  tags: string[];
  category: string;
  accessDuration: string;
  pricing: {
    model: string;
    price: string;
    token: string;
    tiers: {
      basic: string;
      premium: string;
      enterprise: string;
    }
  };
  walletAddress: string;
  owner: string;
  status: 'draft' | 'processing' | 'active' | 'failed';
  createdAt: Date;
  updatedAt: Date;
  downloads: number;
  popularity: number;
  datatokenAddress: string | null;
  file: Record<string, any>;
  nftMint: boolean;
  tokenId: string | null;
  tokenName: string | null;
  tokenSymbol: string | null;
  verificationData?: {
    isVerified: boolean;
    missingValues: number;
    anomaliesDetected: number;
    biasScore: number;
    piiDetected: boolean;
    overallQuality: number;
  };
  verified: boolean;
  error?: string;
  publishingId?: string; // Unique ID to track the publishing process
}

const DatasetSchema = new Schema<IDataset>(
  {
    name: { type: String, required: true },
    description: { type: String, default: '' },
    tags: { type: [String], default: [] },
    category: { type: String, default: 'Uncategorized' },
    accessDuration: { type: String, default: 'forever' },
    pricing: {
      model: { type: String, enum: ['free', 'paid', 'subscription'], default: 'free' },
      price: { type: String, default: '0' },
      token: { type: String, default: 'ETH' },
      tiers: {
        basic: { type: String, default: '10' },
        premium: { type: String, default: '25' },
        enterprise: { type: String, default: '100' }
      }
    },
    walletAddress: { type: String, required: true },
    owner: { type: String, required: true },
    status: { 
      type: String, 
      enum: ['draft', 'processing', 'active', 'failed'], 
      default: 'draft' 
    },
    downloads: { type: Number, default: 0 },
    popularity: { type: Number, default: 0 },
    datatokenAddress: { type: String, default: null },
    file: { type: Schema.Types.Mixed, default: {} },
    nftMint: { type: Boolean, default: false },
    tokenId: { type: String, default: null },
    tokenName: { type: String, default: null },
    tokenSymbol: { type: String, default: null },
    verificationData: {
      isVerified: { type: Boolean, default: false },
      missingValues: { type: Number, default: 0 },
      anomaliesDetected: { type: Number, default: 0 },
      biasScore: { type: Number, default: 0 },
      piiDetected: { type: Boolean, default: false },
      overallQuality: { type: Number, default: 0 }
    },
    verified: { type: Boolean, default: false },
    error: { type: String },
    publishingId: { type: String }
  },
  { timestamps: true }
);

// Create indexes for better performance
DatasetSchema.index({ owner: 1 });
DatasetSchema.index({ tokenId: 1 });
DatasetSchema.index({ publishingId: 1 });
DatasetSchema.index({ 'verificationData.isVerified': 1 });

export default mongoose.models.Dataset || mongoose.model<IDataset>('Dataset', DatasetSchema); 