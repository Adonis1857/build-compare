// Use your existing import (don't change this)
import { travisSearch } from '@/lib/adapters/travis';

// Add this simple scoring function RIGHT IN THIS FILE
function scoreResults(results, keywords) {
  const searchTerm = keywords.toLowerCase();
  
  return results.map(result => {
    const searchText = `${result.product} ${result.pack}`.toLowerCase();
    let score = 0;
    
    // STRONG bonus for exact product name matches
    if (result.product.toLowerCase().includes(searchTerm)) {
      score += 30;
    }
    
    // Bonus for sealant-related products
    const sealantKeywords = ['silicone', 'sealant', 'caulk', 'adhesive', 'waterproof', 'bathroom', 'kitchen'];
    if (sealantKeywords.some(keyword => searchText.includes(keyword))) {
      score += 10;
    }
    
    // PENALTY for unrelated products (WD-40, etc.)
    const unrelatedKeywords = ['wd-40', 'lubricant', 'oil', 'grease', 'spray', 'multi-purpose', 'cleaner', 'degreaser'];
    if (unrelatedKeywords.some(keyword => searchText.includes(keyword))) {
      score -= 20;
    }
    
    // Small bonus for cheaper products
    if (result.price < 10) score += 2;
    if (result.price < 5) score += 3;
    
    return { ...result, score };
  });
}

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const q = searchParams.get('q');
  
  if (!q) {
    return Response.json({ error: 'Missing search query' }, { status: 400 });
  }
  
  try {
    // Use your existing Travis search
    const results = await travisSearch(q);
    
    // Score and filter the results
    const scoredResults = scoreResults(results, q);
    const filteredResults = scoredResults
      .filter(result => result.score > 0) // Only keep good results
      .sort((a, b) => b.score - a.score || a.price - b.price) // Sort by score, then price
      .slice(0, 50); // Limit to 50 results
    
    console.log(`Filtered: ${results.length} -> ${filteredResults.length} results for "${q}"`);
    
    return Response.json(filteredResults);
    
  } catch (error) {
    console.error('Search error:', error);
    return Response.json({ error: 'Internal server error' }, { status: 500 });
  }
}
