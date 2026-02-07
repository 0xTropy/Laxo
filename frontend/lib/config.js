// App URL — set NEXT_PUBLIC_APP_URL in .env.local for dev or in your deployment platform for prod
// Defaults to /hub route
export const APP_URL = process.env.NEXT_PUBLIC_APP_URL || '/hub'

// Check if URL is external (starts with http:// or https://)
export const isExternalUrl = (url) => {
  return url.startsWith('http://') || url.startsWith('https://')
}
