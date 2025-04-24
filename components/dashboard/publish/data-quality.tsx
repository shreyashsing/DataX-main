"use client"

import { useState, useEffect } from "react"
import type { DatasetFormData } from "@/app/dashboard/publish/page"
import { Card } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { AlertCircle, CheckCircle2, XCircle, AlertTriangle, Shield, BarChart4 } from "lucide-react"
import { PieChart, Pie, Cell, ResponsiveContainer } from "recharts"

interface DataQualityProps {
  aiVerification: {
    missingValues: number
    anomaliesDetected: number
    biasScore: number
    piiDetected: boolean
    overallQuality: number
  }
  formData: DatasetFormData
}

export default function DataQuality({ aiVerification, formData }: DataQualityProps) {
  const [animatedProgress, setAnimatedProgress] = useState({
    missingValues: 0,
    biasScore: 0,
    overallQuality: 0,
  })

  useEffect(() => {
    // Animate progress bars
    const timer = setTimeout(() => {
      setAnimatedProgress({
        missingValues: aiVerification.missingValues,
        biasScore: aiVerification.biasScore,
        overallQuality: aiVerification.overallQuality,
      })
    }, 300)

    return () => clearTimeout(timer)
  }, [aiVerification])

  // Bias data for pie chart
  const biasData = [
    { name: "Balanced", value: aiVerification.biasScore },
    { name: "Imbalanced", value: 100 - aiVerification.biasScore },
  ]
  const COLORS = ["#10b981", "#f43f5e"]

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl font-bold mb-2">Data Quality & AI Verification</h2>
        <p className="text-muted-foreground mb-6">
          Our AI has analyzed your dataset and generated the following quality report.
        </p>
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

