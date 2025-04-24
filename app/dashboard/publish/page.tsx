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

export type DatasetFormData = {
  file: File | null
  name: string
  description: string
  tags: string[]
  category: string
  license: string
  visibility: "public" | "private"
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
    license: "CC0",
    visibility: "public",
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

  // Mock data for AI verification
  const aiVerification = {
    missingValues: 2.3,
    anomaliesDetected: 5,
    biasScore: 85,
    piiDetected: false,
    overallQuality: 92,
  }

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

  return (
    <div className="container mx-auto py-6 max-w-5xl">
      <h1 className="text-3xl font-bold mb-6">Publish New Dataset</h1>

      <PublishStepper steps={steps} currentStep={currentStep} />

      <Card className="p-6 mt-6">
        {currentStep === 0 && <UploadDataset formData={formData} updateFormData={updateFormData} />}

        {currentStep === 1 && <MetadataInput formData={formData} updateFormData={updateFormData} />}

        {currentStep === 2 && <DataQuality aiVerification={aiVerification} formData={formData} />}

        {currentStep === 3 && <PricingAccess formData={formData} updateFormData={updateFormData} />}

        {currentStep === 4 && (
          <PreviewPublish formData={formData} aiVerification={aiVerification} onPublish={handlePublish} />
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

