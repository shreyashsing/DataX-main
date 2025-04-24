"use client"

import type React from "react"

import { useState } from "react"
import type { DatasetFormData } from "@/app/dashboard/publish/page"
import { Card } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Switch } from "@/components/ui/switch"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Coins, Key, ShieldCheck, Tag } from "lucide-react"

interface PricingAccessProps {
  formData: DatasetFormData
  updateFormData: (data: Partial<DatasetFormData>) => void
}

export default function PricingAccess({ formData, updateFormData }: PricingAccessProps) {
  const [pricingModel, setPricingModel] = useState<"free" | "fixed" | "subscription">(formData.pricing.model)

  const handlePricingModelChange = (value: "free" | "fixed" | "subscription") => {
    setPricingModel(value)
    updateFormData({
      pricing: {
        ...formData.pricing,
        model: value,
      },
    })
  }

  const handlePriceChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    updateFormData({
      pricing: {
        ...formData.pricing,
        price: e.target.value,
      },
    })
  }

  const handleTokenChange = (value: string) => {
    updateFormData({
      pricing: {
        ...formData.pricing,
        token: value,
      },
    })
  }

  const handleTierChange = (tier: "basic" | "premium" | "enterprise", value: string) => {
    updateFormData({
      pricing: {
        ...formData.pricing,
        tiers: {
          ...formData.pricing.tiers,
          [tier]: value,
        },
      },
    })
  }

  const handleNftMintChange = (checked: boolean) => {
    updateFormData({ nftMint: checked })
  }

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl font-bold mb-2">Pricing & Access Control</h2>
        <p className="text-muted-foreground mb-6">
          Set up how users can access your dataset and how you want to monetize it.
        </p>
      </div>

      <div className="space-y-6">
        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <Coins className="h-5 w-5 text-primary" />
            Pricing Options
          </h3>

          <RadioGroup
            value={pricingModel}
            onValueChange={(value) => handlePricingModelChange(value as "free" | "fixed" | "subscription")}
            className="space-y-4"
          >
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="free" id="free" />
              <Label htmlFor="free" className="font-medium">
                Free Dataset
              </Label>
            </div>

            <div className="flex items-center space-x-2">
              <RadioGroupItem value="fixed" id="fixed" />
              <Label htmlFor="fixed" className="font-medium">
                Fixed Price
              </Label>
            </div>

            <div className="flex items-center space-x-2">
              <RadioGroupItem value="subscription" id="subscription" />
              <Label htmlFor="subscription" className="font-medium">
                Subscription Model
              </Label>
            </div>
          </RadioGroup>

          {pricingModel === "fixed" && (
            <div className="mt-4 pl-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="price">Price</Label>
                  <Input
                    id="price"
                    type="number"
                    min="0"
                    step="0.01"
                    value={formData.pricing.price}
                    onChange={handlePriceChange}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="token">Token</Label>
                  <Select value={formData.pricing.token} onValueChange={handleTokenChange}>
                    <SelectTrigger id="token">
                      <SelectValue placeholder="Select token" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ETH">ETH</SelectItem>
                      <SelectItem value="USDC">USDC</SelectItem>
                      <SelectItem value="DAI">DAI</SelectItem>
                      <SelectItem value="MATIC">MATIC</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <p className="text-sm text-muted-foreground">
                Users will pay this amount once to access your dataset permanently.
              </p>
            </div>
          )}

          {pricingModel === "subscription" && (
            <div className="mt-4 pl-6 space-y-4">
              <p className="text-sm font-medium">Subscription Tiers</p>

              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="basic">Basic Tier (Monthly)</Label>
                    <div className="flex">
                      <Input
                        id="basic"
                        type="number"
                        min="0"
                        step="0.01"
                        value={formData.pricing.tiers.basic}
                        onChange={(e) => handleTierChange("basic", e.target.value)}
                      />
                      <Select value={formData.pricing.token} onValueChange={handleTokenChange}>
                        <SelectTrigger className="w-24 rounded-l-none">
                          <SelectValue placeholder="Token" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="ETH">ETH</SelectItem>
                          <SelectItem value="USDC">USDC</SelectItem>
                          <SelectItem value="DAI">DAI</SelectItem>
                          <SelectItem value="MATIC">MATIC</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="premium">Premium Tier (Monthly)</Label>
                    <div className="flex">
                      <Input
                        id="premium"
                        type="number"
                        min="0"
                        step="0.01"
                        value={formData.pricing.tiers.premium}
                        onChange={(e) => handleTierChange("premium", e.target.value)}
                      />
                      <div className="w-24 flex items-center justify-center bg-muted border rounded-r-md px-3">
                        {formData.pricing.token}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="enterprise">Enterprise Tier (Monthly)</Label>
                    <div className="flex">
                      <Input
                        id="enterprise"
                        type="number"
                        min="0"
                        step="0.01"
                        value={formData.pricing.tiers.enterprise}
                        onChange={(e) => handleTierChange("enterprise", e.target.value)}
                      />
                      <div className="w-24 flex items-center justify-center bg-muted border rounded-r-md px-3">
                        {formData.pricing.token}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <p className="text-sm text-muted-foreground">
                Define different subscription tiers with varying levels of access and features.
              </p>
            </div>
          )}
        </Card>

        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <Tag className="h-5 w-5 text-primary" />
            Dataset Ownership & NFT Minting
          </h3>

          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <Label htmlFor="nft-mint" className="font-medium">
                Mint Dataset as NFT
              </Label>
              <p className="text-sm text-muted-foreground">Create an NFT to prove ownership and enable royalties</p>
            </div>
            <Switch id="nft-mint" checked={formData.nftMint} onCheckedChange={handleNftMintChange} />
          </div>

          {formData.nftMint && (
            <div className="mt-6 border rounded-lg p-4 bg-muted/30">
              <div className="flex items-center gap-3 mb-3">
                <div className="bg-primary/10 p-2 rounded-full">
                  <ShieldCheck className="h-5 w-5 text-primary" />
                </div>
                <h4 className="font-medium">NFT Preview</h4>
              </div>

              <div className="aspect-square max-w-[200px] mx-auto bg-gradient-to-br from-primary/20 to-primary/40 rounded-lg border flex flex-col items-center justify-center p-4 mb-4">
                <div className="w-12 h-12 rounded-full bg-primary/30 mb-2 flex items-center justify-center">
                  <Key className="h-6 w-6 text-primary" />
                </div>
                <div className="text-center">
                  <p className="font-medium truncate max-w-full">{formData.name || "Dataset Name"}</p>
                  <p className="text-xs text-muted-foreground mt-1">{formData.file?.name || "filename.csv"}</p>
                </div>
              </div>

              <div className="text-sm space-y-2">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Dataset Hash:</span>
                  <span className="font-mono">0x7f83b...e95a</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Creator Royalty:</span>
                  <span>2.5%</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Blockchain:</span>
                  <span>Ethereum</span>
                </div>
              </div>
            </div>
          )}
        </Card>

        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <Key className="h-5 w-5 text-primary" />
            Access Control
          </h3>

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <Label className="font-medium">API Access</Label>
                <p className="text-sm text-muted-foreground">Allow users to access your dataset via API</p>
              </div>
              <Switch defaultChecked />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <Label className="font-medium">Download Access</Label>
                <p className="text-sm text-muted-foreground">Allow users to download the raw dataset</p>
              </div>
              <Switch defaultChecked />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <Label className="font-medium">Commercial Use</Label>
                <p className="text-sm text-muted-foreground">Allow commercial use of your dataset</p>
              </div>
              <Switch defaultChecked />
            </div>
          </div>
        </Card>
      </div>
    </div>
  )
}

