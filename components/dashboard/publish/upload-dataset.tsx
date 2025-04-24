"use client"

import type React from "react"

import { useState, useRef } from "react"
import { Upload, X, FileText, AlertCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Alert, AlertDescription } from "@/components/ui/alert"
import type { DatasetFormData } from "@/app/dashboard/publish/page"

interface UploadDatasetProps {
  formData: DatasetFormData
  updateFormData: (data: Partial<DatasetFormData>) => void
}

export default function UploadDataset({ formData, updateFormData }: UploadDatasetProps) {
  const [isDragging, setIsDragging] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const allowedFileTypes = [
    "text/csv",
    "application/json",
    "application/octet-stream", // For parquet files
  ]

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    setIsDragging(true)
  }

  const handleDragLeave = () => {
    setIsDragging(false)
  }

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    setIsDragging(false)

    const files = e.dataTransfer.files
    if (files.length) {
      validateAndSetFile(files[0])
    }
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      validateAndSetFile(e.target.files[0])
    }
  }

  const validateAndSetFile = (file: File) => {
    setError(null)

    // Check file type
    const fileExtension = file.name.split(".").pop()?.toLowerCase()
    if (!allowedFileTypes.includes(file.type) && !["csv", "json", "parquet"].includes(fileExtension || "")) {
      setError("Unsupported file format. Please upload CSV, JSON, or Parquet files.")
      return
    }

    // Check file size (max 100MB)
    if (file.size > 100 * 1024 * 1024) {
      setError("File size exceeds the 100MB limit.")
      return
    }

    updateFormData({ file })
  }

  const handleRemoveFile = () => {
    updateFormData({ file: null })
    if (fileInputRef.current) {
      fileInputRef.current.value = ""
    }
  }

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + " bytes"
    else if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB"
    else return (bytes / (1024 * 1024)).toFixed(1) + " MB"
  }

  const getFileIcon = (fileName: string) => {
    const extension = fileName.split(".").pop()?.toLowerCase()
    switch (extension) {
      case "csv":
        return "CSV"
      case "json":
        return "JSON"
      case "parquet":
        return "PARQUET"
      default:
        return "FILE"
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold mb-2">Upload Dataset</h2>
        <p className="text-muted-foreground mb-6">
          Upload your dataset file. We support CSV, JSON, and Parquet formats.
        </p>
      </div>

      {error && (
        <Alert variant="destructive" className="mb-4">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {!formData.file ? (
        <div
          className={`border-2 border-dashed rounded-lg p-12 text-center cursor-pointer transition-colors ${
            isDragging ? "border-primary bg-primary/5" : "border-muted-foreground/20"
          }`}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
        >
          <div className="flex flex-col items-center justify-center gap-4">
            <div className="rounded-full bg-primary/10 p-4">
              <Upload className="h-10 w-10 text-primary animate-pulse" />
            </div>
            <div>
              <p className="font-medium mb-1">Drag and drop your file here or click to browse</p>
              <p className="text-sm text-muted-foreground">Supported formats: CSV, JSON, Parquet (Max 100MB)</p>
            </div>
            <Button variant="outline" size="sm" className="mt-2">
              Select File
            </Button>
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv,.json,.parquet"
            className="hidden"
            onChange={handleFileChange}
          />
        </div>
      ) : (
        <div className="border rounded-lg p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="flex items-center justify-center h-12 w-12 rounded-md bg-primary/10 text-primary font-mono text-xs">
                {getFileIcon(formData.file.name)}
              </div>
              <div>
                <p className="font-medium">{formData.file.name}</p>
                <p className="text-sm text-muted-foreground">{formatFileSize(formData.file.size)}</p>
              </div>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={handleRemoveFile}
              className="text-muted-foreground hover:text-destructive"
            >
              <X className="h-5 w-5" />
            </Button>
          </div>

          <div className="mt-6 flex items-center gap-2 text-sm text-muted-foreground">
            <FileText className="h-4 w-4" />
            <span>Your file is ready to be processed. Continue to the next step.</span>
          </div>
        </div>
      )}

      <div className="mt-8 bg-muted/50 rounded-lg p-4">
        <h3 className="font-medium mb-2">Dataset Requirements</h3>
        <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
          <li>Files must be in CSV, JSON, or Parquet format</li>
          <li>Maximum file size is 100MB</li>
          <li>Data should be properly structured with headers</li>
          <li>For best results, ensure your data is clean and well-formatted</li>
          <li>Sensitive or personally identifiable information (PII) should be anonymized</li>
        </ul>
      </div>
    </div>
  )
}

