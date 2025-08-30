import { merchants } from '../merchants/config.js';

export async function searchAllMerchants(keywords, limit = 50) {
  const results = [];
  const activeMerchants = Object.values(merchants).filter(m => process.env[m.envVar]);
  
  console.log(`Searching ${activeMerchants.length} merchants for: "${keywords}"`);
  
  const promises = activeMerchants.map(async (merchant) => {
    try {
      const adapter = await import(`../adapters/${merchant.adapter}.js`);
      const offers = await adapter.search(keywords);
      return offers.slice(0, limit);
    } catch (error) {
      console.error(`Error searching ${merchant.name}:`, error.message);
      return [];
    }
  });
  
  const allResults = await Promise.allSettled(promises);
  
  allResults.forEach((result, index) => {
    if (result.status === 'fulfilled') {
      results.push(...result.value);
    }
  });
  
  return results.sort((a, b) => a.price - b.price);
}
