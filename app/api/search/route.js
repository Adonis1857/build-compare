import { smartSearch } from '@/lib/search/ranked';
import { generateSearchSuggestions } from '@/lib/search/guide';

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const q = searchParams.get('q');
  
  if (!q) {
    return Response.json({ error: 'Missing search query' }, { status: 400 });
  }
  
  try {
    const results = await smartSearch(q);
    const suggestions = generateSearchSuggestions(q, results);
    
    return Response.json({
      query: q,
      results,
      suggestions,
      total: results.length
    });
    
  } catch (error) {
    console.error('Search error:', error);
    return Response.json({ error: 'Internal server error' }, { status: 500 });
  }
}
