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
    timeout?: number
    depth?: number
  }
}

export interface ScanSitesResponse {
  results: SiteMenu[]
  message: string
} 