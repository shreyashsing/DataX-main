"use client"

import type React from "react"

import { useState } from "react"
import type { DatasetFormData } from "@/app/dashboard/publish/page"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { Badge } from "@/components/ui/badge"
import { X } from "lucide-react"

interface MetadataInputProps {
  formData: DatasetFormData
  updateFormData: (data: Partial<DatasetFormData>) => void
}

const AVAILABLE_TAGS = [
  "Finance",
  "Healthcare",
  "AI",
  "Machine Learning",
  "Climate",
  "Transportation",
  "Energy",
  "Social Media",
  "E-commerce",
  "IoT",
  "Blockchain",
  "Crypto",
  "Government",
  "Education",
  "Real Estate",
]

const CATEGORIES = [
  "Finance",
  "Healthcare",
  "Technology",
  "Environment",
  "Social Sciences",
  "Business",
  "Government",
  "Education",
]

const LICENSES = [
  { value: "CC0", label: "CC0 (Public Domain)" },
  { value: "CC-BY", label: "CC-BY (Attribution)" },
  { value: "CC-BY-SA", label: "CC-BY-SA (Attribution-ShareAlike)" },
  { value: "MIT", label: "MIT License" },
  { value: "Apache-2.0", label: "Apache License 2.0" },
  { value: "GPL-3.0", label: "GNU GPL v3" },
  { value: "Custom", label: "Custom License" },
]

export default function MetadataInput({ formData, updateFormData }: MetadataInputProps) {
  const [tagInput, setTagInput] = useState("")
  const [suggestedTags, setSuggestedTags] = useState<string[]>([])

  const handleTagInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value
    setTagInput(value)

    if (value.length > 0) {
      const filtered = AVAILABLE_TAGS.filter(
        (tag) => tag.toLowerCase().includes(value.toLowerCase()) && !formData.tags.includes(tag),
      )
      setSuggestedTags(filtered.slice(0, 5))
    } else {
      setSuggestedTags([])
    }
  }

  const addTag = (tag: string) => {
    if (tag && !formData.tags.includes(tag)) {
      updateFormData({ tags: [...formData.tags, tag] })
    }
    setTagInput("")
    setSuggestedTags([])
  }

  const removeTag = (tagToRemove: string) => {
    updateFormData({
      tags: formData.tags.filter((tag) => tag !== tagToRemove),
    })
  }

  const handleTagKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && tagInput) {
      e.preventDefault()
      addTag(tagInput)
    }
  }

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl font-bold mb-2">Dataset Metadata</h2>
        <p className="text-muted-foreground mb-6">
          Provide detailed information about your dataset to help others discover and use it.
        </p>
      </div>

      <div className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="name" className="text-base">
            Dataset Name <span className="text-destructive">*</span>
          </Label>
          <Input
            id="name"
            value={formData.name}
            onChange={(e) => updateFormData({ name: e.target.value })}
            placeholder="Enter a descriptive name for your dataset"
            required
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="description" className="text-base">
            Description <span className="text-destructive">*</span>
          </Label>
          <Textarea
            id="description"
            value={formData.description}
            onChange={(e) => updateFormData({ description: e.target.value })}
            placeholder="Describe your dataset, its contents, and potential use cases. Markdown is supported."
            className="min-h-[150px]"
            required
          />
          <p className="text-xs text-muted-foreground">
            Markdown formatting is supported. Be detailed about data collection methods, timeframe, and limitations.
          </p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="tags" className="text-base">
            Tags
          </Label>
          <div className="space-y-2">
            <div className="flex flex-wrap gap-2 mb-2">
              {formData.tags.map((tag) => (
                <Badge key={tag} variant="secondary" className="px-2 py-1 text-sm">
                  {tag}
                  <button onClick={() => removeTag(tag)} className="ml-1 hover:text-destructive">
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              ))}
            </div>
            <div className="relative">
              <Input
                id="tags"
                value={tagInput}
                onChange={handleTagInputChange}
                onKeyDown={handleTagKeyDown}
                placeholder="Add tags (press Enter to add)"
              />
              {suggestedTags.length > 0 && (
                <div className="absolute z-10 w-full mt-1 bg-background border rounded-md shadow-md">
                  {suggestedTags.map((tag) => (
                    <div key={tag} className="px-3 py-2 hover:bg-muted cursor-pointer" onClick={() => addTag(tag)}>
                      {tag}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="category" className="text-base">
            Category
          </Label>
          <Select value={formData.category} onValueChange={(value) => updateFormData({ category: value })}>
            <SelectTrigger id="category">
              <SelectValue placeholder="Select a category" />
            </SelectTrigger>
            <SelectContent>
              {CATEGORIES.map((category) => (
                <SelectItem key={category} value={category}>
                  {category}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="license" className="text-base">
            License
          </Label>
          <Select value={formData.license} onValueChange={(value) => updateFormData({ license: value })}>
            <SelectTrigger id="license">
              <SelectValue placeholder="Select a license" />
            </SelectTrigger>
            <SelectContent>
              {LICENSES.map((license) => (
                <SelectItem key={license.value} value={license.value}>
                  {license.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="text-xs text-muted-foreground">
            Choose how others can use your dataset.{" "}
            <a href="#" className="text-primary hover:underline">
              Learn more about licenses
            </a>
          </p>
        </div>

        <div className="flex items-center justify-between pt-2">
          <div className="space-y-0.5">
            <Label htmlFor="visibility" className="text-base">
              Dataset Visibility
            </Label>
            <p className="text-sm text-muted-foreground">
              {formData.visibility === "public"
                ? "Anyone can discover and access your dataset"
                : "Only you and those you share with can access"}
            </p>
          </div>
          <Switch
            id="visibility"
            checked={formData.visibility === "public"}
            onCheckedChange={(checked) => updateFormData({ visibility: checked ? "public" : "private" })}
          />
        </div>
      </div>
    </div>
  )
}

