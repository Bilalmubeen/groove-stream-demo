/**
 * YouTube URL parsing utilities
 */

// Regex patterns for various YouTube URL formats
const YOUTUBE_PATTERNS = [
  /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/,
  /youtube\.com\/watch\?.*v=([a-zA-Z0-9_-]{11})/,
  /youtube\.com\/shorts\/([a-zA-Z0-9_-]{11})/,
];

/**
 * Extract YouTube video ID from various URL formats
 */
export function extractYouTubeVideoId(url: string): string | null {
  if (!url) return null;
  
  // Check if it's already just a video ID
  if (/^[a-zA-Z0-9_-]{11}$/.test(url)) {
    return url;
  }

  for (const pattern of YOUTUBE_PATTERNS) {
    const match = url.match(pattern);
    if (match && match[1]) {
      return match[1];
    }
  }

  return null;
}

/**
 * Validate if a string is a valid YouTube URL or video ID
 */
export function isValidYouTubeUrl(url: string): boolean {
  return extractYouTubeVideoId(url) !== null;
}

/**
 * Get YouTube thumbnail URL for a video ID
 */
export function getYouTubeThumbnail(videoId: string, quality: 'default' | 'medium' | 'high' | 'maxres' = 'high'): string {
  const qualityMap = {
    default: 'default',
    medium: 'mqdefault',
    high: 'hqdefault',
    maxres: 'maxresdefault',
  };
  return `https://img.youtube.com/vi/${videoId}/${qualityMap[quality]}.jpg`;
}

/**
 * Build embed URL with parameters
 */
export function buildYouTubeEmbedUrl(
  videoId: string,
  startSeconds: number = 0,
  options: {
    autoplay?: boolean;
    controls?: boolean;
    modestbranding?: boolean;
  } = {}
): string {
  const params = new URLSearchParams({
    start: startSeconds.toString(),
    autoplay: options.autoplay ? '1' : '0',
    controls: options.controls !== false ? '1' : '0',
    modestbranding: options.modestbranding !== false ? '1' : '0',
    rel: '0', // Don't show related videos
    enablejsapi: '1', // Enable JavaScript API
  });

  return `https://www.youtube.com/embed/${videoId}?${params.toString()}`;
}
