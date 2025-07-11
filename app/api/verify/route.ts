import { NextRequest, NextResponse } from 'next/server';
import axios from 'axios';
import FormData from 'form-data';
import { connectToDatabase } from '@/lib/mongodb';
import { ObjectId } from 'mongodb';
import fs from 'fs';
import path from 'path';
import os from 'os';

// Temporary file handling
const saveTempFile = async (file: File): Promise<string> => {
  const bytes = await file.arrayBuffer();
  const buffer = Buffer.from(bytes);
  const tempDir = os.tmpdir();
  const filePath = path.join(tempDir, file.name);
  fs.writeFileSync(filePath, buffer);
  return filePath;
};

export async function POST(req: NextRequest) {
  try {
    // Get form data from request
    const formData = await req.formData();
    const file = formData.get('file') as File;
    const userId = formData.get('userId') as string || 'anonymous';
    const name = formData.get('name') as string;
    const description = formData.get('description') as string || '';
    const isPrivate = formData.get('isPrivate') === 'true';
    const draftId = formData.get('draftId') as string || null; // Get draft ID if available
    
    if (!file) {
      return NextResponse.json({ error: 'Missing file' }, { status: 400 });
    }

    // Save file temporarily
    const filePath = await saveTempFile(file);

    // Call AI Verification API
    const verificationFormData = new FormData();
    verificationFormData.append('file', fs.createReadStream(filePath));
    verificationFormData.append('name', name || file.name);

    // Use the verification service
    const verificationUrl = process.env.AI_VERIFICATION_API_URL || 'http://localhost:5000/api/verify';
    
    try {
      const verificationResponse = await axios.post(
        verificationUrl,
        verificationFormData,
        { headers: { ...verificationFormData.getHeaders() } }
      );
      
      // Clean up temp file
      fs.unlinkSync(filePath);
      
      const verificationResult = verificationResponse.data;
      
      // If a draft ID is provided, update the draft with verification results
      let updatedDraft = null;
      if (draftId) {
        try {
          const { db } = await connectToDatabase();
          
          // Update the draft with verification data
          const result = await db.collection('datasets').updateOne(
            { _id: new ObjectId(draftId), status: 'draft' },
            { 
              $set: {
                verified: verificationResult.isVerified,
                verificationHash: verificationResult.verificationHash,
                datasetHash: verificationResult.datasetHash,
                qualityScore: verificationResult.qualityScore,
                ipfsCid: verificationResult.details.datasetCID || 'ipfs://pending',
                verificationData: {
                  missingValues: verificationResult.details.missingValues,
                  anomaliesDetected: verificationResult.details.anomaliesDetected,
                  biasScore: verificationResult.details.biasScore,
                  piiDetected: verificationResult.details.piiDetected,
                  overallQuality: verificationResult.qualityScore,
                },
                updatedAt: new Date()
              }
            }
          );
          
          if (result.matchedCount > 0) {
            // Get the updated draft
            updatedDraft = await db.collection('datasets').findOne({ _id: new ObjectId(draftId) });
          }
        } catch (dbError) {
          console.error('Database error:', dbError);
          // Continue even if DB update fails
        }
      }
      
      return NextResponse.json({
        success: true,
        isVerified: verificationResult.isVerified,
        verificationHash: verificationResult.verificationHash,
        datasetHash: verificationResult.datasetHash,
        qualityScore: verificationResult.qualityScore,
        draftId: updatedDraft ? updatedDraft._id : draftId,
        draft: updatedDraft,
        details: {
          missingValues: verificationResult.details.missingValues,
          anomaliesDetected: verificationResult.details.anomaliesDetected,
          biasScore: verificationResult.details.biasScore,
          piiDetected: verificationResult.details.piiDetected,
          overallQuality: verificationResult.qualityScore,
          diversity: verificationResult.details.diversity,
          duplicates: verificationResult.details.duplicates,
          datasetCID: verificationResult.details.datasetCID,
          analysisReport: verificationResult.details.analysisReport
        }
      });
      
    } catch (apiError) {
      // Clean up temp file on error
      fs.existsSync(filePath) && fs.unlinkSync(filePath);
      
      console.error('Verification API error:', apiError);
      return NextResponse.json({ 
        success: false, 
        message: 'Error connecting to verification service',
        error: apiError instanceof Error ? apiError.message : String(apiError)
      }, { status: 500 });
    }
    
  } catch (error) {
    console.error('Request processing error:', error);
    return NextResponse.json({ 
      success: false, 
      message: 'Error during verification',
      error: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
} 