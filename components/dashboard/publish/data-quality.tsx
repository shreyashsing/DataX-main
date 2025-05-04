"use client"

import { useState, useEffect } from "react"
import type { DatasetFormData, VerificationData } from "@/app/dashboard/publish/page"
import { Card } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { AlertCircle, CheckCircle2, XCircle, AlertTriangle, Shield, BarChart4, Loader2 } from "lucide-react"
import { PieChart, Pie, Cell, ResponsiveContainer } from "recharts"
import { Button } from "@/components/ui/button"

interface VerificationResult {
    missingValues: number
    anomaliesDetected: number
    biasScore: number
    piiDetected: boolean
    overallQuality: number
  duplicates: number
  diversity: number
  }

interface DataQualityProps {
  formData: DatasetFormData
  onVerification?: (data: VerificationData) => void
}

export default function DataQuality({ formData, onVerification }: DataQualityProps) {
  const [isVerifying, setIsVerifying] = useState(false)
  const [verificationComplete, setVerificationComplete] = useState(false)
  const [verificationError, setVerificationError] = useState<string | null>(null)
  const [aiVerification, setAiVerification] = useState<VerificationResult>({
    missingValues: 0,
    anomaliesDetected: 0,
    biasScore: 0,
    piiDetected: false,
    overallQuality: 0,
    duplicates: 0,
    diversity: 0
  })
  const [verificationData, setVerificationData] = useState<VerificationData | null>(null)

  const [animatedProgress, setAnimatedProgress] = useState({
    missingValues: 0,
    biasScore: 0,
    overallQuality: 0,
  })

  useEffect(() => {
    // If verification is complete, animate progress bars
    if (verificationComplete) {
    const timer = setTimeout(() => {
      setAnimatedProgress({
        missingValues: aiVerification.missingValues,
        biasScore: aiVerification.biasScore,
        overallQuality: aiVerification.overallQuality,
      })
    }, 300)

    return () => clearTimeout(timer)
    }
  }, [verificationComplete, aiVerification])

  // When verification data changes, notify parent component
  useEffect(() => {
    if (verificationData && onVerification) {
      onVerification(verificationData)
    }
  }, [verificationData, onVerification])

  // Function to handle verification
  const verifyDataset = async () => {
    if (!formData.file) {
      setVerificationError("No dataset file uploaded")
      return
    }

    setIsVerifying(true)
    setVerificationError(null)
    setVerificationComplete(false)

    try {
      // Create form data for upload and verification
      const verifyFormData = new FormData()
      verifyFormData.append('file', formData.file)
      verifyFormData.append('name', formData.name)
      
      // Call verification API
      const response = await fetch('/api/verify', {
        method: 'POST',
        body: verifyFormData,
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.message || 'Verification failed')
      }

      const data = await response.json()
      
      // Update state with verification results
      setAiVerification({
        missingValues: data.details.missingValues,
        anomaliesDetected: data.details.anomaliesDetected,
        biasScore: data.details.biasScore,
        piiDetected: data.details.piiDetected,
        overallQuality: data.details.overallQuality,
        duplicates: data.details.duplicates,
        diversity: data.details.diversity
      })
      
      // Store complete verification data to pass to parent
      setVerificationData({
        isVerified: data.isVerified,
        datasetHash: data.datasetHash,
        verificationHash: data.verificationHash,
        missingValues: data.details.missingValues,
        anomaliesDetected: data.details.anomaliesDetected,
        biasScore: data.details.biasScore,
        piiDetected: data.details.piiDetected,
        overallQuality: data.details.overallQuality,
        duplicates: data.details.duplicates,
        diversity: data.details.diversity,
        datasetCID: data.details.datasetCID,
        analysisReport: data.details.analysisReport
      })
      
      setVerificationComplete(true)
    } catch (error) {
      console.error("Verification error:", error)
      setVerificationError(error instanceof Error ? error.message : 'An unknown error occurred')
    } finally {
      setIsVerifying(false)
    }
  }

  // Bias data for pie chart
  const biasData = [
    { name: "Balanced", value: aiVerification.biasScore },
    { name: "Imbalanced", value: 100 - aiVerification.biasScore },
  ]
  const COLORS = ["#10b981", "#f43f5e"]

  // If no file is uploaded yet
  if (!formData.file && !verificationComplete) {
    return (
      <div className="space-y-8">
        <div>
          <h2 className="text-2xl font-bold mb-2">Data Quality & AI Verification</h2>
          <p className="text-muted-foreground mb-6">
            Upload a dataset in the previous step to get quality metrics.
          </p>
        </div>
      </div>
    )
  }

  // If verification hasn't started or is in progress
  if (!verificationComplete && !isVerifying) {
    return (
      <div className="space-y-8">
        <div>
          <h2 className="text-2xl font-bold mb-2">Data Quality & AI Verification</h2>
          <p className="text-muted-foreground mb-6">
            Click the button below to analyze your dataset and generate a quality report.
          </p>
          {verificationError && (
            <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
              <p>{verificationError}</p>
            </div>
          )}
          <Button onClick={verifyDataset} className="mt-2">
            Analyze Dataset
          </Button>
        </div>
      </div>
    )
  }

  // If verification is in progress
  if (isVerifying) {
    return (
      <div className="space-y-8">
        <div>
          <h2 className="text-2xl font-bold mb-2">Data Quality & AI Verification</h2>
          <p className="text-muted-foreground mb-6">
            Our AI is analyzing your dataset. This might take a moment...
          </p>
          <div className="flex flex-col items-center justify-center py-12">
            <Loader2 className="w-12 h-12 animate-spin text-primary mb-4" />
            <p className="text-lg">Analyzing dataset quality</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl font-bold mb-2">Data Quality & AI Verification</h2>
        <p className="text-muted-foreground mb-6">
          Our AI has analyzed your dataset and generated the following quality report.
        </p>
        {verificationData && (
          <div className={`p-4 border rounded-md mb-4 ${verificationData.isVerified ? 'bg-green-50 border-green-200' : 'bg-amber-50 border-amber-200'}`}>
            <div className="flex items-center gap-2">
              {verificationData.isVerified ? (
                <CheckCircle2 className="h-5 w-5 text-green-500" />
              ) : (
                <AlertTriangle className="h-5 w-5 text-amber-500" />
              )}
              <p className="font-medium">
                {verificationData.isVerified 
                  ? "Dataset verification passed! Your dataset meets quality standards." 
                  : "Dataset verification flagged some issues. You can still proceed, but consider addressing them for better quality."}
              </p>
            </div>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="p-6 flex flex-col">
          <div className="flex items-center gap-3 mb-4">
            <div className="bg-primary/10 p-2 rounded-full">
              <BarChart4 className="h-5 w-5 text-primary" />
            </div>
            <h3 className="font-semibold text-lg">Missing Values</h3>
          </div>

          <div className="mt-2 mb-4">
            <div className="flex justify-between mb-1">
              <span className="text-sm text-muted-foreground">Percentage</span>
              <span className="text-sm font-medium">{animatedProgress.missingValues.toFixed(1)}%</span>
            </div>
            <Progress value={animatedProgress.missingValues} className="h-2" />
          </div>

          <div className="mt-auto">
            <div className="flex items-center gap-2 text-sm">
              {aiVerification.missingValues < 5 ? (
                <>
                  <CheckCircle2 className="h-4 w-4 text-green-500" />
                  <span>Low percentage of missing values - Good quality</span>
                </>
              ) : aiVerification.missingValues < 15 ? (
                <>
                  <AlertTriangle className="h-4 w-4 text-amber-500" />
                  <span>Moderate missing values - Consider imputation</span>
                </>
              ) : (
                <>
                  <XCircle className="h-4 w-4 text-red-500" />
                  <span>High missing values - Data quality issues</span>
                </>
              )}
            </div>
          </div>
        </Card>

        <Card className="p-6 flex flex-col">
          <div className="flex items-center gap-3 mb-4">
            <div className="bg-primary/10 p-2 rounded-full">
              <AlertCircle className="h-5 w-5 text-primary" />
            </div>
            <h3 className="font-semibold text-lg">Anomalies Detected</h3>
          </div>

          <div className="flex items-center justify-center flex-1">
            <div className="text-center">
              <span className="text-4xl font-bold block mb-2">{aiVerification.anomaliesDetected}</span>
              <span className="text-sm text-muted-foreground">
                {aiVerification.anomaliesDetected === 0
                  ? "No anomalies detected"
                  : aiVerification.anomaliesDetected === 1
                    ? "Anomaly detected"
                    : "Anomalies detected"}
              </span>
            </div>
          </div>

          <div className="mt-auto">
            <div className="flex items-center gap-2 text-sm">
              {aiVerification.anomaliesDetected === 0 ? (
                <>
                  <CheckCircle2 className="h-4 w-4 text-green-500" />
                  <span>No anomalies - Clean data</span>
                </>
              ) : aiVerification.anomaliesDetected < 10 ? (
                <>
                  <AlertTriangle className="h-4 w-4 text-amber-500" />
                  <span>Few anomalies - Review recommended</span>
                </>
              ) : (
                <>
                  <XCircle className="h-4 w-4 text-red-500" />
                  <span>Many anomalies - Data cleaning required</span>
                </>
              )}
            </div>
          </div>
        </Card>

        <Card className="p-6 flex flex-col">
          <div className="flex items-center gap-3 mb-4">
            <div className="bg-primary/10 p-2 rounded-full">
              <Shield className="h-5 w-5 text-primary" />
            </div>
            <h3 className="font-semibold text-lg">Bias Analysis</h3>
          </div>

          <div className="flex items-center justify-center h-40">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={biasData}
                  cx="50%"
                  cy="50%"
                  innerRadius={40}
                  outerRadius={60}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {biasData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
              </PieChart>
            </ResponsiveContainer>
          </div>

          <div className="mt-2 mb-4">
            <div className="flex justify-between mb-1">
              <span className="text-sm text-muted-foreground">Balance Score</span>
              <span className="text-sm font-medium">{animatedProgress.biasScore}%</span>
            </div>
            <Progress value={animatedProgress.biasScore} className="h-2" />
          </div>

          <div className="mt-auto">
            <div className="flex items-center gap-2 text-sm">
              {aiVerification.biasScore > 80 ? (
                <>
                  <CheckCircle2 className="h-4 w-4 text-green-500" />
                  <span>Well-balanced dataset</span>
                </>
              ) : aiVerification.biasScore > 60 ? (
                <>
                  <AlertTriangle className="h-4 w-4 text-amber-500" />
                  <span>Moderately balanced - Some bias present</span>
                </>
              ) : (
                <>
                  <XCircle className="h-4 w-4 text-red-500" />
                  <span>Significant bias detected - Review recommended</span>
                </>
              )}
            </div>
          </div>
        </Card>

        <Card className="p-6 flex flex-col">
          <div className="flex items-center gap-3 mb-4">
            <div className="bg-primary/10 p-2 rounded-full">
              <AlertCircle className="h-5 w-5 text-primary" />
            </div>
            <h3 className="font-semibold text-lg">PII Detection</h3>
          </div>

          <div className="flex items-center justify-center flex-1">
            {aiVerification.piiDetected ? (
              <div className="text-center text-red-500">
                <XCircle className="h-16 w-16 mx-auto mb-2" />
                <span className="text-lg font-medium block">PII Detected</span>
                <span className="text-sm block mt-1">Personal information found in dataset</span>
              </div>
            ) : (
              <div className="text-center text-green-500">
                <CheckCircle2 className="h-16 w-16 mx-auto mb-2" />
                <span className="text-lg font-medium block">No PII Detected</span>
                <span className="text-sm block mt-1">No personal information found</span>
              </div>
            )}
          </div>

          <div className="mt-auto">
            <div className="flex items-center gap-2 text-sm">
              {!aiVerification.piiDetected ? (
                <>
                  <CheckCircle2 className="h-4 w-4 text-green-500" />
                  <span>Safe to publish - No privacy concerns</span>
                </>
              ) : (
                <>
                  <AlertTriangle className="h-4 w-4 text-red-500" />
                  <span>Privacy risk - Anonymize data before publishing</span>
                </>
              )}
            </div>
          </div>
        </Card>
      </div>

      <Card className="p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="bg-primary/10 p-2 rounded-full">
            <BarChart4 className="h-5 w-5 text-primary" />
          </div>
          <h3 className="font-semibold text-lg">Overall Quality Score</h3>
        </div>

        <div className="mb-2">
          <div className="flex justify-between mb-1">
            <span className="text-sm text-muted-foreground">Quality Rating</span>
            <span className="text-sm font-medium">{animatedProgress.overallQuality}/100</span>
          </div>
          <Progress value={animatedProgress.overallQuality} className="h-3" />
        </div>

        <div className="mt-4 p-4 bg-muted/50 rounded-lg">
          <h4 className="font-medium mb-2">AI Recommendations</h4>
          <ul className="space-y-2 text-sm">
            {aiVerification.missingValues > 0 && (
              <li className="flex items-start gap-2">
                <AlertTriangle className="h-4 w-4 text-amber-500 mt-0.5 shrink-0" />
                <span>
                  Consider imputing or removing rows with missing values ({aiVerification.missingValues.toFixed(1)}% of
                  data)
                </span>
              </li>
            )}
            {aiVerification.anomaliesDetected > 0 && (
              <li className="flex items-start gap-2">
                <AlertTriangle className="h-4 w-4 text-amber-500 mt-0.5 shrink-0" />
                <span>
                  Review and address the {aiVerification.anomaliesDetected} anomalies detected in your dataset
                </span>
              </li>
            )}
            {aiVerification.biasScore < 80 && (
              <li className="flex items-start gap-2">
                <AlertTriangle className="h-4 w-4 text-amber-500 mt-0.5 shrink-0" />
                <span>Your dataset shows some bias. Consider balancing classes or features.</span>
              </li>
            )}
            {aiVerification.piiDetected && (
              <li className="flex items-start gap-2">
                <XCircle className="h-4 w-4 text-red-500 mt-0.5 shrink-0" />
                <span>PII detected - anonymize personal information before publishing</span>
              </li>
            )}
            {aiVerification.overallQuality > 90 && (
              <li className="flex items-start gap-2">
                <CheckCircle2 className="h-4 w-4 text-green-500 mt-0.5 shrink-0" />
                <span>Excellent dataset quality! Ready for publishing.</span>
              </li>
            )}
          </ul>
        </div>
      </Card>
    </div>
  )
}

