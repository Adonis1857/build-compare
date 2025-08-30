import { searchAllMerchants } from './all.js';

const PRODUCT_CATEGORIES = {
  sealants: {
    keywords: ['silicone', 'sealant', 'caulk', 'adhesive', 'waterproof', 'bathroom', 'kitchen'],
    priority: 10
  },
  lubricants: {
    keywords: ['wd-40', 'lubricant', 'oil', 'grease', 'spray', 'multi-purpose'],
    priority: -10 // NEGATIVE to push these down
  },
  tools: {
    keywords: ['gun', 'applicator', 'tool', 'smoother', 'spreader'],
    priority: 3
  },
  unrelated: {
    keywords: ['cleaner', 'degreaser', 'penetrating', 'maintenance', 'automotive'],
    priority: -20 // STRONGLY penalize these
  }
};

export async function smartSearch(keywords, limit = 50) {
  const rawResults = await searchAllMerchants(keywords, limit * 3); // Get more to filter
  
  const scoredResults = rawResults.map(result => {
    const searchText = `${result.product} ${result.pack}`.toLowerCase();
    const searchTerm = keywords.toLowerCase();
    let score = 0;
    let category = 'other';
    
    // Strong bonus for exact product name matches
    if (result.product.toLowerCase().includes(searchTerm)) {
      score += 30;
    }
    
    // Check categories
    for (const [cat, config] of Object.entries(PRODUCT_CATEGORIES)) {
      const hasKeyword = config.keywords.some(keyword => 
        searchText.includes(keyword.toLowerCase())
      );
      
      if (hasKeyword) {
        score += config.priority;
        category = cat;
        break;
      }
    }
    
    // Penalize completely unrelated products
    if (category === 'other' && !result.product.toLowerCase().includes(searchTerm)) {
      score -= 15;
    }
    
    return { ...result, score, category };
  });
  
  // Filter out low-scoring results and sort
  const filtered = scoredResults
    .filter(result => result.score > 0) // Only keep positive scores
    .sort((a, b) => b.score - a.score || a.price - b.price)
    .slice(0, limit);
  
  console.log(`Smart search: ${rawResults.length} -> ${filtered.length} results`);
  return filtered;
}
