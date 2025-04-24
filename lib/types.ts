export interface Dataset {
    id: string
    name: string
    description: string
    price: number
    owner: string
    category: string
    dataType: string
    size: string
    downloads: number
    popularity: number
    verified: boolean
    createdAt: string
    previewImage?: string
    recommended?: boolean
    recommendationReason?: string
    matchScore?: string
  }
  
  