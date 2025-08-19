import fetch from 'node-fetch';

// High-quality SVG icon sources
const ICON_SOURCES = {
  heroicons: {
    name: 'Heroicons',
    baseUrl: 'https://heroicons.com',
    searchUrl: 'https://api.github.com/repos/tailwindlabs/heroicons/contents/optimized',
    credit: 'Icon from Heroicons by Tailwind Labs'
  },
  lucide: {
    name: 'Lucide',
    baseUrl: 'https://lucide.dev',
    searchUrl: 'https://api.github.com/repos/lucide-icons/lucide/contents/icons',
    credit: 'Icon from Lucide Icons'
  },
  feather: {
    name: 'Feather',
    baseUrl: 'https://feathericons.com',
    searchUrl: 'https://api.github.com/repos/feathericons/feather/contents/icons',
    credit: 'Icon from Feather Icons'
  }
};

export interface SVGIconImage {
  id: string;
  url: string;
  alt: string;
  description: string;
  credit: string;
  sourceUrl: string;
  type: 'icon';
  source: 'heroicons' | 'lucide' | 'feather';
  quality: 'high'; // SVG icons are always high quality
  svgContent?: string;
  size?: string; // For heroicons: '24/outline' or '24/solid'
}

// Icon name mapping for better search results
const ICON_MAPPINGS: Record<string, string[]> = {
  // Animals & Nature
  'cat': ['cat', 'pet', 'animal'],
  'dog': ['dog', 'pet', 'animal'],
  'bird': ['bird', 'animal', 'wing'],
  'fish': ['fish', 'animal', 'water'],
  'tree': ['tree', 'nature', 'plant'],
  'flower': ['flower', 'nature', 'plant'],
  'sun': ['sun', 'weather', 'sunny'],
  'moon': ['moon', 'night', 'lunar'],
  'star': ['star', 'night', 'sparkle'],
  'cloud': ['cloud', 'weather', 'cloudy'],
  
  // Food & Drink
  'apple': ['apple', 'fruit', 'food'],
  'banana': ['banana', 'fruit', 'food'],
  'bread': ['bread', 'food', 'wheat'],
  'cake': ['cake', 'food', 'dessert'],
  'water': ['water', 'drink', 'glass'],
  'coffee': ['coffee', 'drink', 'cup'],
  'tea': ['tea', 'drink', 'cup'],
  
  // Transportation
  'car': ['car', 'vehicle', 'transport'],
  'bus': ['bus', 'vehicle', 'transport'],
  'train': ['train', 'vehicle', 'transport'],
  'plane': ['plane', 'aircraft', 'flight'],
  'bike': ['bike', 'bicycle', 'cycling'],
  'boat': ['boat', 'ship', 'water'],
  
  // Body & Health
  'eye': ['eye', 'vision', 'see'],
  'ear': ['ear', 'hearing', 'listen'],
  'hand': ['hand', 'palm', 'finger'],
  'foot': ['foot', 'leg', 'walk'],
  'heart': ['heart', 'love', 'health'],
  'smile': ['smile', 'happy', 'face'],
  
  // Objects & Tools
  'book': ['book', 'read', 'education'],
  'pen': ['pen', 'write', 'pencil'],
  'phone': ['phone', 'mobile', 'call'],
  'computer': ['computer', 'laptop', 'screen'],
  'clock': ['clock', 'time', 'hour'],
  'key': ['key', 'lock', 'security'],
  'bag': ['bag', 'handbag', 'shopping'],
  'ball': ['ball', 'sport', 'play'],
  'music': ['music', 'musical-note', 'sound'],
  'camera': ['camera', 'photo', 'picture'],
  
  // Colors & Shapes
  'red': ['circle', 'red', 'color'],
  'blue': ['circle', 'blue', 'color'],
  'green': ['circle', 'green', 'color'],
  'yellow': ['circle', 'yellow', 'color'],
  'circle': ['circle', 'round', 'shape'],
  'square': ['square', 'rectangle', 'shape'],
  'triangle': ['triangle', 'shape', 'geometric'],
  
  // Actions & Emotions
  'happy': ['smile', 'happy', 'joy'],
  'sad': ['sad', 'cry', 'tear'],
  'angry': ['angry', 'mad', 'emotion'],
  'love': ['heart', 'love', 'like'],
  'run': ['run', 'running', 'sport'],
  'walk': ['walk', 'walking', 'step'],
  'eat': ['eat', 'food', 'mouth'],
  'drink': ['drink', 'water', 'glass'],
  'sleep': ['sleep', 'bed', 'rest'],
  'play': ['play', 'game', 'fun'],
  
  // Numbers
  'one': ['1', 'one', 'first'],
  'two': ['2', 'two', 'second'],
  'three': ['3', 'three', 'third'],
  'four': ['4', 'four', 'fourth'],
  'five': ['5', 'five', 'fifth'],
};

/**
 * Get mapped icon names for a search query
 */
function getMappedIconNames(query: string): string[] {
  const lowerQuery = query.toLowerCase().trim();
  
  // Check direct mappings
  if (ICON_MAPPINGS[lowerQuery]) {
    return ICON_MAPPINGS[lowerQuery];
  }
  
  // Check if query contains any mapped terms
  const mappedNames: string[] = [];
  Object.entries(ICON_MAPPINGS).forEach(([key, values]) => {
    if (lowerQuery.includes(key) || values.some(v => lowerQuery.includes(v))) {
      mappedNames.push(...values);
    }
  });
  
  // Always include the original query
  return [lowerQuery, ...mappedNames].slice(0, 5); // Limit to 5 variations
}

/**
 * Search for high-quality SVG icons from Heroicons
 */
async function searchHeroicons(query: string, count: number = 3): Promise<SVGIconImage[]> {
  try {
    console.log(`🎯 Searching Heroicons for: "${query}"`);
    
    const mappedNames = getMappedIconNames(query);
    const results: SVGIconImage[] = [];
    
    // Search for both outline and solid versions
    for (const iconName of mappedNames) {
      if (results.length >= count) break;
      
      try {
        // Try to get the outline version first (more universal)
        const outlineUrl = `https://cdn.jsdelivr.net/npm/heroicons@2.0.18/24/outline/${iconName}.svg`;
                  const outlineResponse = await fetch(outlineUrl);
        
        if (outlineResponse.ok) {
          const svgContent = await outlineResponse.text();
          results.push({
            id: `heroicons-outline-${iconName}`,
            url: outlineUrl,
            alt: `${iconName} icon`,
            description: `${iconName} outline icon`,
            credit: ICON_SOURCES.heroicons.credit,
            sourceUrl: `https://heroicons.com/`,
            type: 'icon' as const,
            source: 'heroicons' as const,
            quality: 'high' as const,
            svgContent,
            size: '24/outline'
          });
        }
        
        // Also try solid version if we need more icons
        if (results.length < count) {
          const solidUrl = `https://cdn.jsdelivr.net/npm/heroicons@2.0.18/24/solid/${iconName}.svg`;
          const solidResponse = await fetch(solidUrl);
          
          if (solidResponse.ok) {
            const svgContent = await solidResponse.text();
            results.push({
              id: `heroicons-solid-${iconName}`,
              url: solidUrl,
              alt: `${iconName} icon`,
              description: `${iconName} solid icon`,
              credit: ICON_SOURCES.heroicons.credit,
              sourceUrl: `https://heroicons.com/`,
              type: 'icon' as const,
              source: 'heroicons' as const,
              quality: 'high' as const,
              svgContent,
              size: '24/solid'
            });
          }
        }
      } catch (iconError) {
        console.warn(`Failed to fetch Heroicon for "${iconName}":`, iconError);
      }
    }
    
    console.log(`✅ Found ${results.length} Heroicons for "${query}"`);
    return results.slice(0, count);
    
  } catch (error) {
    console.error('Error searching Heroicons:', error);
    return [];
  }
}

/**
 * Search for high-quality SVG icons from Lucide
 */
async function searchLucideIcons(query: string, count: number = 3): Promise<SVGIconImage[]> {
  try {
    console.log(`🎯 Searching Lucide for: "${query}"`);
    
    const mappedNames = getMappedIconNames(query);
    const results: SVGIconImage[] = [];
    
    for (const iconName of mappedNames) {
      if (results.length >= count) break;
      
      try {
        // Lucide icons from CDN
        const iconUrl = `https://cdn.jsdelivr.net/npm/lucide@latest/icons/${iconName}.svg`;
        const response = await fetch(iconUrl);
        
        if (response.ok) {
          const svgContent = await response.text();
          results.push({
            id: `lucide-${iconName}`,
            url: iconUrl,
            alt: `${iconName} icon`,
            description: `${iconName} icon`,
            credit: ICON_SOURCES.lucide.credit,
            sourceUrl: `https://lucide.dev/icons/${iconName}`,
            type: 'icon' as const,
            source: 'lucide' as const,
            quality: 'high' as const,
            svgContent
          });
        }
      } catch (iconError) {
        console.warn(`Failed to fetch Lucide icon for "${iconName}":`, iconError);
      }
    }
    
    console.log(`✅ Found ${results.length} Lucide icons for "${query}"`);
    return results.slice(0, count);
    
  } catch (error) {
    console.error('Error searching Lucide icons:', error);
    return [];
  }
}

/**
 * Get high-quality SVG icons from multiple sources
 */
export async function searchSVGIcons(query: string, count: number = 6): Promise<SVGIconImage[]> {
  console.log(`🔍 Searching for high-quality SVG icons: "${query}"`);
  
  try {
    // Search multiple sources in parallel
    const [heroicons, lucideIcons] = await Promise.all([
      searchHeroicons(query, Math.ceil(count / 2)),
      searchLucideIcons(query, Math.ceil(count / 2))
    ]);
    
    // Combine results, prioritizing variety
    const allIcons = [...heroicons, ...lucideIcons];
    
    // Remove duplicates based on description
    const uniqueIcons = allIcons.filter((icon, index, self) => 
      index === self.findIndex(i => i.description === icon.description)
    );
    
    console.log(`📊 Found ${uniqueIcons.length} unique high-quality SVG icons for "${query}"`);
    return uniqueIcons.slice(0, count);
    
  } catch (error) {
    console.error('Error in unified SVG icon search:', error);
    return [];
  }
}

/**
 * Get SVG icons for a flashcard word with Chinese to English translation
 */
export async function getFlashcardSVGIcons(imageQuery: string): Promise<SVGIconImage[]> {
  try {
    console.log(`🔍 Getting high-quality SVG icons for: "${imageQuery}"`);
    
    // Translate Chinese to English for better search results
    const { deeplService } = await import('./deepl-service.js');
    const englishQuery = await deeplService.translateChineseToEnglish(imageQuery);
    
    console.log(`🌐 Translated "${imageQuery}" to "${englishQuery}" for icon search`);
    
    // Search for high-quality SVG icons
    const icons = await searchSVGIcons(englishQuery, 8);
    
    console.log(`📊 Found ${icons.length} high-quality SVG icons for "${englishQuery}"`);
    
    return icons;
  } catch (error) {
    console.error('Error getting flashcard SVG icons:', error);
    return [];
  }
}

/**
 * Batch process multiple image queries for SVG icons
 */
export async function batchGetFlashcardSVGIcons(
  imageQueries: string[]
): Promise<Record<string, SVGIconImage[]>> {
  console.log(`🔄 Batch processing ${imageQueries.length} SVG icon queries`);
  
  const results: Record<string, SVGIconImage[]> = {};
  
  // Process queries in smaller batches to avoid overwhelming the CDN
  const batchSize = 2;
  const batches: string[][] = [];
  
  for (let i = 0; i < imageQueries.length; i += batchSize) {
    batches.push(imageQueries.slice(i, i + batchSize));
  }
  
  for (let batchIndex = 0; batchIndex < batches.length; batchIndex++) {
    const batch = batches[batchIndex];
    console.log(`Processing SVG batch ${batchIndex + 1}/${batches.length} (${batch.length} queries)`);
    
    // Process batch in parallel
    const batchPromises = batch.map(async (query) => {
      const icons = await getFlashcardSVGIcons(query);
      return { query, icons };
    });
    
    const batchResults = await Promise.all(batchPromises);
    
    // Store results
    batchResults.forEach(({ query, icons }) => {
      results[query] = icons;
    });
    
    // Add small delay between batches to be respectful to CDNs
    if (batchIndex < batches.length - 1) {
      await new Promise(resolve => setTimeout(resolve, 500));
    }
  }
  
  console.log(`✅ SVG batch processing completed for ${imageQueries.length} queries`);
  
  // Log statistics
  const totalIcons = Object.values(results).reduce((total, icons) => total + icons.length, 0);
  console.log(`📊 Total high-quality SVG icons returned: ${totalIcons}`);
  
  return results;
}
