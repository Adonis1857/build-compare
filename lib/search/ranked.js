import { searchAllMerchants } from './all.js';

const PRODUCT_CATEGORIES = {
  sealants: {
    keywords: ['silicone', 'sealant', 'caulk', 'adhesive', 'waterproof', 'bathroom', 'kitchen'],
    priority: 10
  },
  lubricants: {
    keywords: ['wd-40', 'lubricant', 'oil', 'grease', 'spray'],
    priority: 5
  },
  tools: {
    keywords: ['gun', 'applicator', 'tool', 'smoother', 'spreader'],
    priority: 3
  }
};

export async function smartSearch(keywords, limit = 50) {
  const rawResults = await searchAllMerchants(keywords, limit * 2);
  
  const scoredResults = rawResults.map(result => {
    const searchText = `${result.product} ${result.pack}`.toLowerCase();
    let score = 0;
    let category = 'other';
    
    if (result.product.toLowerCase().includes(keywords.toLowerCase())) {
      score += 20;
    }
    
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
    
    if (result.price < 10) score += 2;
    if (result.price < 5) score += 3;
    
    return { ...result, score, category };
  });
  
  return scoredResults
    .filter(result => result.score > 5)
    .sort((a, b) => b.score - a.score || a.price - b.price)
    .slice(0, limit);
}
