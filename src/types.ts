export interface MenuItem {
  text: string
  url: string
  target?: string
  rel?: string
}

export interface SiteMenu {
  siteUrl: string
  items: MenuItem[]
  scannedAt: Date
  error?: string
}

export interface ScanSitesRequest {
  urls: string[]
  options?: {
    batchSize?: number
    timeout?: number
    retries?: number
  }
}

export interface ScanSitesResponse {
  success: boolean
  results: SiteMenu[]
  totalProcessed: number
  errors: number
} 