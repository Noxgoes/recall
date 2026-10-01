export type Platform = 'youtube' | 'shorts' | 'instagram' | 'twitter' | 'other'

export function detectPlatform(url: string): Platform {
  if (url.includes('youtube.com/shorts') || url.includes('youtu.be/shorts')) {
    return 'shorts'
  }
  if (url.includes('youtube.com') || url.includes('youtu.be')) {
    return 'youtube'
  }
  if (url.includes('instagram.com')) {
    return 'instagram'
  }
  if (url.includes('twitter.com') || url.includes('x.com')) {
    return 'twitter'
  }
  return 'other'
}

export const platformLabels: Record<Platform, string> = {
  youtube: 'YouTube',
  shorts: 'YouTube',
  instagram: 'Instagram',
  twitter: 'X / Twitter',
  other: 'Link',
}

export const platformColors: Record<Platform, string> = {
  youtube: '#FF0000',
  shorts: '#FF0000',
  instagram: '#E1306C',
  twitter: '#1DA1F2',
  other: '#888880',
}
