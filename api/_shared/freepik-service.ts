import fetch from 'node-fetch';

const FREEPIK_API_KEY = process.env.FREEPIK_API_KEY;
const FREEPIK_API_URL = 'https://api.freepik.com/v1';

interface FreepikAuthor {
  assets: number;
  name: string;
  id: number;
  avatar: string;
  slug: string;
}

interface FreepikStyle {
  name: string;
  id: number;
}

interface FreepikFamily {
  total: number;
  name: string;
  id: number;
}

interface FreepikThumbnail {
  width: number;
  url: string;
  height: number;
}

interface FreepikTag {
  name: string;
  slug: string;
}

interface FreepikIcon {
  free_svg: boolean;
  created: string;
  author: FreepikAuthor;
  name: string;
  style: FreepikStyle;
  id: number;
  family: FreepikFamily;
  thumbnails: FreepikThumbnail[];
  slug: string;
  tags: FreepikTag[];
}

interface FreepikPagination {
  per_page: number;
  total: number;
  last_page: number;
  current_page: number;
}

interface FreepikMeta {
  pagination: FreepikPagination;
}

interface FreepikSearchResponse {
  data: FreepikIcon[];
  meta: FreepikMeta;
}

export interface FreepikImage {
  id: string;
  url: string;
  alt: string;
  description: string;
  credit: string;
  sourceUrl: string;
  type: 'icon';
}

/**
 * Search for icons on Freepik
 */
export async function searchFreepikIcons(
  query: string,
  count: number = 3,
  page: number = 1
): Promise<FreepikImage[]> {
  try {
    if (!FREEPIK_API_KEY) {
      console.warn('FREEPIK_API_KEY not configured, skipping Freepik icons');
      return [];
    }

    console.log(`🎨 Searching Freepik for "${query}" icons (count: ${count})`);
    
    const searchUrl = new URL(`${FREEPIK_API_URL}/icons`);
    searchUrl.searchParams.set('term', query);
    searchUrl.searchParams.set('per_page', count.toString());
    searchUrl.searchParams.set('page', page.toString());
    searchUrl.searchParams.set('order', 'relevance'); // Order by relevance for better results
    searchUrl.searchParams.set('filters.free_svg', 'all'); // Include both free and premium
    
    console.log(`🔗 Freepik API URL: ${searchUrl.toString()}`);
    
    const response = await fetch(searchUrl.toString(), {
      headers: {
        'X-Freepik-API-Key': FREEPIK_API_KEY,
        'Accept': 'application/json',
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      console.error(`Freepik API error: ${response.status} ${response.statusText}`);
      const errorText = await response.text().catch(() => 'Unable to read error response');
      console.error('Freepik error details:', errorText);
      console.error('Request URL:', searchUrl.toString());
      return [];
    }

    const data = await response.json().catch(() => ({})) as FreepikSearchResponse;
    
    // Ensure we have valid data structure
    if (!data.data || !Array.isArray(data.data)) {
      console.warn('Invalid Freepik API response structure');
      return [];
    }
    
    console.log('Freepik API response sample:', {
      requested_count: count,
      returned_count: data.data?.length || 0,
      total_available: data.meta?.pagination?.total,
      per_page: data.meta?.pagination?.per_page,
      current_page: data.meta?.pagination?.current_page,
      firstIcon: data.data?.[0] ? {
        id: data.data[0].id,
        name: data.data[0].name,
        thumbnails: data.data[0].thumbnails?.length || 0,
        free_svg: data.data[0].free_svg
      } : null
    });
    
    return data.data?.map(icon => {
      // Use the first thumbnail as the image URL, fallback to empty if none available
      let imageUrl = icon.thumbnails?.length > 0 ? icon.thumbnails[0]?.url || '' : '';
      

      
      return {
        id: icon.id?.toString() || '',
        url: imageUrl,
        alt: icon.name || query,
        description: icon.name || `Icon of ${query}`,
        credit: `Icon by ${icon.author?.name || 'Unknown'} from Freepik`,
        sourceUrl: `https://www.freepik.com/icon/${icon.slug || icon.id}`,
        type: 'icon' as const,
      };
    }) || [];
  } catch (error) {
    console.error('Error searching Freepik icons:', error);
    return [];
  }
}

/**
 * Get icons for a flashcard word with Chinese to English translation
 */
export async function getFlashcardIcons(imageQuery: string): Promise<FreepikImage[]> {
  try {
    if (!FREEPIK_API_KEY) {
      console.warn('FREEPIK_API_KEY not configured, skipping Freepik icons');
      return [];
    }

    console.log(`🔍 Getting Freepik icons for: "${imageQuery}"`);
    
    // Translate Chinese to English for better search results
    // Import the unified DeepL service
    const { deeplService } = await import('./deepl-service.js');
    const englishQuery = await deeplService.translateChineseToEnglish(imageQuery);
    
    // Search for icons
    const icons = await searchFreepikIcons(englishQuery, 10);
    
    console.log(`📊 Found ${icons.length} icons for "${englishQuery}" (requested 3, got ${icons.length})`);
    
    return icons;
  } catch (error) {
    console.error('Error getting flashcard icons:', error);
    return [];
  }
}

/**
 * Batch process multiple image queries for flashcard icons
 */
export async function batchGetFlashcardIcons(
  imageQueries: string[]
): Promise<Record<string, FreepikImage[]>> {
  if (!FREEPIK_API_KEY) {
    console.warn('FREEPIK_API_KEY not configured, skipping Freepik icons');
    return {};
  }

  console.log(`🔄 Batch processing ${imageQueries.length} icon queries`);
  
  const results: Record<string, FreepikImage[]> = {};
  
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
      const icons = await getFlashcardIcons(query);
      return { query, icons };
    });
    
    const batchResults = await Promise.all(batchPromises);
    
    // Store results
    batchResults.forEach(({ query, icons }) => {
      results[query] = icons;
    });
    
    // Add delay between batches to respect rate limits
    if (batchIndex < batches.length - 1) {
      await new Promise(resolve => setTimeout(resolve, 1500)); // Longer delay for API limits
    }
  }
  
  console.log(`✅ Batch processing completed for ${imageQueries.length} icon queries`);
  
  // Log total icons returned
  const totalIcons = Object.values(results).reduce((total, icons) => total + icons.length, 0);
  console.log(`📊 Total icons returned across all queries: ${totalIcons}`);
  
  return results;
}