"use client"
import { motion } from "framer-motion"
import { X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
import { Slider } from "@/components/ui/slider"

interface FilterPanelProps {
  selectedCategories: string[]
  setSelectedCategories: (categories: string[]) => void
  selectedDataTypes: string[]
  setSelectedDataTypes: (types: string[]) => void
  priceRange: number[]
  setPriceRange: (range: number[]) => void
  onClose: () => void
}

export default function FilterPanel({
  selectedCategories,
  setSelectedCategories,
  selectedDataTypes,
  setSelectedDataTypes,
  priceRange,
  setPriceRange,
  onClose,
}: FilterPanelProps) {
  const categories = [
    "Finance",
    "Healthcare",
    "E-commerce",
    "Social Media",
    "IoT",
    "Transportation",
    "Education",
    "Entertainment",
  ]
  const dataTypes = ["Structured", "Unstructured", "Time Series", "Images", "Text", "Audio", "Video", "Geospatial"]

  const toggleCategory = (category: string) => {
    if (selectedCategories.includes(category)) {
      setSelectedCategories(selectedCategories.filter((c: string) => c !== category))
    } else {
      setSelectedCategories([...selectedCategories, category])
    }
  }

  const toggleDataType = (dataType: string) => {
    if (selectedDataTypes.includes(dataType)) {
      setSelectedDataTypes(selectedDataTypes.filter((t: string) => t !== dataType))
    } else {
      setSelectedDataTypes([...selectedDataTypes, dataType])
    }
  }

  const handlePriceRangeChange = (value: number[]) => {
    setPriceRange(value)
  }

  const clearFilters = () => {
    setSelectedCategories([])
    setSelectedDataTypes([])
    setPriceRange([0, 1000])
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className="bg-card rounded-lg p-6 border shadow-lg"
    >
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-medium">Filters</h3>
        <Button variant="ghost" size="icon" onClick={onClose}>
          <X className="h-4 w-4" />
          <span className="sr-only">Close</span>
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="space-y-4">
          <h4 className="font-medium text-sm text-muted-foreground">Categories</h4>
          <div className="space-y-2 max-h-60 overflow-y-auto pr-2">
            {categories.map((category) => (
              <div key={category} className="flex items-center space-x-2">
                <Checkbox
                  id={`category-${category}`}
                  checked={selectedCategories.includes(category)}
                  onCheckedChange={() => toggleCategory(category)}
                />
                <Label htmlFor={`category-${category}`} className="text-sm">
                  {category}
                </Label>
              </div>
            ))}
          </div>
        </div>

        <div className="space-y-4">
          <h4 className="font-medium text-sm text-muted-foreground">Data Types</h4>
          <div className="space-y-2 max-h-60 overflow-y-auto pr-2">
            {dataTypes.map((type) => (
              <div key={type} className="flex items-center space-x-2">
                <Checkbox
                  id={`type-${type}`}
                  checked={selectedDataTypes.includes(type)}
                  onCheckedChange={() => toggleDataType(type)}
                />
                <Label htmlFor={`type-${type}`} className="text-sm">
                  {type}
                </Label>
              </div>
            ))}
          </div>
        </div>

        <div className="space-y-4">
          <h4 className="font-medium text-sm text-muted-foreground">Price Range</h4>
          <div className="px-2 pt-4">
            <Slider
              defaultValue={[0, 1000]}
              max={1000}
              step={10}
              value={priceRange}
              onValueChange={handlePriceRangeChange}
            />
            <div className="flex justify-between mt-2 text-sm">
              <span>${priceRange[0]}</span>
              <span>${priceRange[1]}</span>
            </div>
          </div>

          <div className="pt-4">
            <Button variant="outline" size="sm" onClick={clearFilters} className="w-full">
              Clear All Filters
            </Button>
          </div>
        </div>
      </div>
    </motion.div>
  )
}

