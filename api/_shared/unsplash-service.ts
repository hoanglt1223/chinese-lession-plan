import fetch from 'node-fetch';

const UNSPLASH_ACCESS_KEY = process.env.UNSPLASH_ACCESS_KEY || 'poF9K3BYmWruw5RBN3y-QXw06nURgZ4ciaT4NgG76r4';
const UNSPLASH_API_URL = 'https://api.unsplash.com';

interface UnsplashPhoto {
  id: string;
  urls: {
    small: string;
    regular: string;
    thumb: string;
    full: string;
  };
  alt_description: string | null;
  description: string | null;
  user: {
    name: string;
    username: string;
  };
  links: {
    html: string;
  };
}

interface UnsplashSearchResponse {
  results: UnsplashPhoto[];
  total: number;
  total_pages: number;
}

export interface FlashcardImage {
  id: string;
  url: string;
  alt: string;
  description: string;
  credit: string;
  sourceUrl: string;
  type: 'photo' | 'illustration';
}

/**
 * Search for photos on Unsplash
 */
export async function searchUnsplashPhotos(
  query: string,
  count: number = 3,
  page: number = 1
): Promise<FlashcardImage[]> {
  try {
    // Translate Chinese to English for better search results
    const { deeplService } = await import('./deepl-service.js');
    const englishQuery = await deeplService.translateChineseToEnglish(query);
    console.log(`🔍 Searching Unsplash for "${englishQuery}" (translated from: "${query}", count: ${count})`);
    
    const searchUrl = new URL(`${UNSPLASH_API_URL}/search/photos`);
    searchUrl.searchParams.set('query', englishQuery);
    searchUrl.searchParams.set('per_page', count.toString());
    searchUrl.searchParams.set('page', page.toString());
    searchUrl.searchParams.set('order_by', 'relevant');
    searchUrl.searchParams.set('orientation', 'squarish');
    searchUrl.searchParams.set('content_filter', 'high'); // Family-friendly content
    
    const response = await fetch(searchUrl.toString(), {
      headers: {
        'Authorization': `Client-ID ${UNSPLASH_ACCESS_KEY}`,
        'Accept-Version': 'v1',
      },
    });

    if (!response.ok) {
      throw new Error(`Unsplash API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json() as UnsplashSearchResponse;
    
    return data.results.map(photo => ({
      id: photo.id,
      url: photo.urls.regular,
      alt: photo.alt_description || photo.description || englishQuery,
      description: photo.description || photo.alt_description || `Photo of ${englishQuery}`,
      credit: `${photo.user.name} on Unsplash`,
      sourceUrl: photo.links.html,
      type: 'photo' as const,
    }));
  } catch (error) {
    console.error('Error searching Unsplash photos:', error);
    return [];
  }
}

/**
 * Search for illustrations on Unsplash (using illustration-related keywords)
 */
export async function searchUnsplashIllustrations(
  query: string,
  count: number = 3,
  page: number = 1
): Promise<FlashcardImage[]> {
  try {
    // Translate Chinese to English for better search results
    const { deeplService } = await import('./deepl-service.js');
    const englishQuery = await deeplService.translateChineseToEnglish(query);
    console.log(`🎨 Searching Unsplash for "${englishQuery}" illustrations (translated from: "${query}", count: ${count})`);
    
    // Add more specific illustration-related keywords to improve filtering
    const illustrationQuery = `${englishQuery} illustration drawing art cartoon`;
    
    const searchUrl = new URL(`${UNSPLASH_API_URL}/search/photos`);
    searchUrl.searchParams.set('query', illustrationQuery);
    searchUrl.searchParams.set('per_page', count.toString());
    searchUrl.searchParams.set('page', page.toString());
    searchUrl.searchParams.set('order_by', 'relevant');
    searchUrl.searchParams.set('orientation', 'squarish');
    searchUrl.searchParams.set('content_filter', 'high'); // Family-friendly content
    
    const response = await fetch(searchUrl.toString(), {
      headers: {
        'Authorization': `Client-ID ${UNSPLASH_ACCESS_KEY}`,
        'Accept-Version': 'v1',
      },
    });

    if (!response.ok) {
      throw new Error(`Unsplash API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json() as UnsplashSearchResponse;
    
    return data.results.map(photo => ({
      id: photo.id,
      url: photo.urls.regular,
      alt: photo.alt_description || photo.description || englishQuery,
      description: photo.description || photo.alt_description || `Illustration of ${englishQuery}`,
      credit: `${photo.user.name} on Unsplash`,
      sourceUrl: photo.links.html,
      type: 'illustration' as const,
    }));
  } catch (error) {
    console.error('Error searching Unsplash illustrations:', error);
    return [];
  }
}

/**
 * Get images for a flashcard word (5 photos + 5 illustrations + 1 auto-selected)
 * Note: Icons are fetched separately via Freepik service
 */
export async function getFlashcardImages(imageQuery: string): Promise<{
  photos: FlashcardImage[];
  illustrations: FlashcardImage[];
  autoSelected: FlashcardImage | null;
  all: FlashcardImage[];
}> {
  try {
    console.log(`📸 Getting flashcard images for: "${imageQuery}"`);
    
    // Search for both photos and illustrations in parallel
    const [photos, illustrations] = await Promise.all([
      searchUnsplashPhotos(imageQuery, 5),
      searchUnsplashIllustrations(imageQuery, 5),
    ]);
    
    // Combine all images
    const allImages = [...photos, ...illustrations];
    
    // Auto-select the first image (preferring illustrations over photos)
    const autoSelected = illustrations.length > 0 ? illustrations[0] : photos.length > 0 ? photos[0] : null;
    
    console.log(`📊 Found ${photos.length} photos, ${illustrations.length} illustrations for "${imageQuery}"`);
    
    return {
      photos,
      illustrations,
      autoSelected,
      all: allImages,
    };
  } catch (error) {
    console.error('Error getting flashcard images:', error);
    return {
      photos: [],
      illustrations: [],
      autoSelected: null,
      all: [],
    };
  }
}

/**
 * Batch process multiple image queries for flashcards
 */
export async function batchGetFlashcardImages(
  imageQueries: string[]
): Promise<Record<string, {
  photos: FlashcardImage[];
  illustrations: FlashcardImage[];
  autoSelected: FlashcardImage | null;
  all: FlashcardImage[];
}>> {
  console.log(`🔄 Batch processing ${imageQueries.length} image queries`);
  
  const results: Record<string, any> = {};
  
  // Process queries in batches to respect rate limits
  const batchSize = 2; // Conservative to avoid hitting rate limits
  const batches: string[][] = [];
  
  for (let i = 0; i < imageQueries.length; i += batchSize) {
    batches.push(imageQueries.slice(i, i + batchSize));
  }
  
  for (let batchIndex = 0; batchIndex < batches.length; batchIndex++) {
    const batch = batches[batchIndex];
    console.log(`Processing batch ${batchIndex + 1}/${batches.length} (${batch.length} queries)`);
    
    // Process batch in parallel
    const batchPromises = batch.map(async (query) => {
      const images = await getFlashcardImages(query);
      return { query, images };
    });
    
    const batchResults = await Promise.all(batchPromises);
    
    // Store results
    batchResults.forEach(({ query, images }) => {
      results[query] = images;
    });
    
    // Add delay between batches to respect rate limits
    if (batchIndex < batches.length - 1) {
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }
  
  console.log(`✅ Batch processing completed for ${imageQueries.length} queries`);
  return results;
}
