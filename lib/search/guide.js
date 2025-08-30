export function generateSearchSuggestions(searchTerm, results) {
  const suggestions = {
    categories: new Set(),
    brands: new Set(),
    relatedTerms: new Set()
  };
  
  results.forEach(result => {
    if (result.category && result.category !== 'other') {
      suggestions.categories.add(result.category);
    }
    
    const brandMatch = result.product.match(/^([\w\-]+)/);
    if (brandMatch && brandMatch[1].length > 2) {
      suggestions.brands.add(brandMatch[1]);
    }
  });
  
  if (searchTerm.toLowerCase() === 'silicone') {
    suggestions.relatedTerms.add('silicone sealant');
    suggestions.relatedTerms.add('silicone gun');
    suggestions.relatedTerms.add('bathroom silicone');
    suggestions.relatedTerms.add('clear silicone');
  }
  
  return {
    categories: Array.from(suggestions.categories),
    brands: Array.from(suggestions.brands),
    relatedTerms: Array.from(suggestions.relatedTerms)
  };
}
