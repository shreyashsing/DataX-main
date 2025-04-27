"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import PublishStepper from "@/components/dashboard/publish/publish-stepper"
import UploadDataset from "@/components/dashboard/publish/upload-dataset"
import MetadataInput from "@/components/dashboard/publish/metadata-input"
import DataQuality from "@/components/dashboard/publish/data-quality"
import PricingAccess from "@/components/dashboard/publish/pricing-access"
import PreviewPublish from "@/components/dashboard/publish/preview-publish"
import { useToast } from "@/hooks/use-toast"
import { WalletProvider } from "@/components/wallet/wallet-provider"

export type DatasetFormData = {
  file: File | null
  name: string
  description: string
  tags: string[]
  category: string
  accessDuration: string
  pricing: {
    model: "free" | "fixed" | "subscription"
    price: string
    token: string
    tiers: {
      basic: string
      premium: string
      enterprise: string
    }
  }
  nftMint: boolean
}

export type VerificationData = {
  isVerified: boolean
  datasetHash: string
  verificationHash: string
  missingValues: number
  anomaliesDetected: number
  biasScore: number
  piiDetected: boolean
  overallQuality: number
  duplicates: number
  diversity: number
  datasetCID: string
  analysisReport: string
}

export default function PublishDatasetPage() {
  const router = useRouter()
  const { toast } = useToast()
  const [currentStep, setCurrentStep] = useState(0)
  const [formData, setFormData] = useState<DatasetFormData>({
    file: null,
    name: "",
    description: "",
    tags: [],
    category: "",
    accessDuration: "forever",
    pricing: {
      model: "free",
      price: "0",
      token: "ETH",
      tiers: {
        basic: "10",
        premium: "25",
        enterprise: "100",
      },
    },
    nftMint: true,
  })
  
  const [verificationData, setVerificationData] = useState<VerificationData | null>(null)

  // Mock data for AI verification (for backward compatibility)
  const aiVerification = verificationData ? {
    missingValues: verificationData.missingValues,
    anomaliesDetected: verificationData.anomaliesDetected,
    biasScore: verificationData.biasScore,
    piiDetected: verificationData.piiDetected,
    overallQuality: verificationData.overallQuality,
  } : {
    missingValues: 0,
    anomaliesDetected: 0,
    biasScore: 0,
    piiDetected: false,
    overallQuality: 0,
  };

  const steps = ["Upload Dataset", "Metadata", "Data Quality", "Pricing & Access", "Preview & Publish"]

  const handleNext = () => {
    if (currentStep === 0 && !formData.file) {
      toast({
        title: "File Required",
        description: "Please upload a dataset file to continue.",
        variant: "destructive",
      })
      return
    }

    if (currentStep === 1 && (!formData.name || !formData.description)) {
      toast({
        title: "Required Fields Missing",
        description: "Please fill in all required fields to continue.",
        variant: "destructive",
      })
      return
    }
    
    // Check if verification is completed before proceeding from Data Quality step
    if (currentStep === 2 && !verificationData) {
      toast({
        title: "Verification Required",
        description: "Please verify your dataset before proceeding.",
        variant: "destructive",
      })
      return
    }
    
    // If dataset didn't pass verification, show warning but allow to proceed
    if (currentStep === 2 && verificationData && !verificationData.isVerified) {
      toast({
        title: "Dataset Quality Warning",
        description: "Your dataset did not pass all quality checks. You can still proceed, but consider addressing the issues.",
      })
    }

    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1)
      window.scrollTo(0, 0)
    }
  }

  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1)
      window.scrollTo(0, 0)
    }
  }

  const handlePublish = async () => {
    // Show loading toast
    toast({
      title: "Publishing Dataset",
      description: "Please confirm the transaction in your wallet...",
    })

    // Simulate publishing process
    setTimeout(() => {
      toast({
        title: "Dataset Published Successfully!",
        description: "Your dataset is now available on the marketplace.",
        variant: "default",
      })
      router.push("/dashboard/datasets")
    }, 2000)
  }

  const updateFormData = (data: Partial<DatasetFormData>) => {
    setFormData((prev) => ({ ...prev, ...data }))
  }
  
  // Function to receive verification data from the DataQuality component
  const updateVerificationData = (data: VerificationData) => {
    setVerificationData(data)
  }

  return (
    <div className="container mx-auto py-6 max-w-5xl">
      <h1 className="text-3xl font-bold mb-6">Publish New Dataset</h1>

      <PublishStepper steps={steps} currentStep={currentStep} />

      <Card className="p-6 mt-6">
        {currentStep === 0 && <UploadDataset formData={formData} updateFormData={updateFormData} />}

        {currentStep === 1 && <MetadataInput formData={formData} updateFormData={updateFormData} />}

        {currentStep === 2 && (
          <DataQuality 
            formData={formData} 
            onVerification={updateVerificationData} 
          />
        )}

        {currentStep === 3 && <PricingAccess formData={formData} updateFormData={updateFormData} />}

        {currentStep === 4 && (
          <WalletProvider>
            <PreviewPublish 
              formData={formData} 
              aiVerification={aiVerification} 
              onPublish={handlePublish} 
            />
          </WalletProvider>
        )}

        <div className="flex justify-between mt-8">
          <Button variant="outline" onClick={handleBack} disabled={currentStep === 0}>
            Back
          </Button>

          {currentStep < steps.length - 1 ? <Button onClick={handleNext}>Continue</Button> : null}
        </div>
      </Card>
    </div>
  )
}

