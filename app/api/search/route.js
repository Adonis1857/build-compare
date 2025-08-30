import { travisSearch } from '@/lib/adapters/travis';

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const q = searchParams.get('q');
  
  if (!q) {
    return Response.json({ error: 'Missing search query' }, { status: 400 });
  }
  
  try {
    const results = await travisSearch(q);
    return Response.json(results);
  } catch (error) {
    console.error('Search error:', error);
    return Response.json({ error: 'Internal server error' }, { status: 500 });
  }
}
