// lib/search/parse.js
export function parseQuery(raw) {
  const q = String(raw || "").toLowerCase();
  const tokens = q.match(/[a-z0-9.]+/g) || [];

  // basic unit extraction: 6mm, 5x50, 5 x 50
  const mmMatch = q.match(/(\d+(?:\.\d+)?)\s*mm/);
  const diameterMM = mmMatch ? Number(mmMatch[1]) : null;

  // simple size formats like 5x50
  const sizeMatch = q.match(/(\d+(?:\.\d+)?)\s*x\s*(\d+(?:\.\d+)?)/);
  const sizeTuple = sizeMatch ? [Number(sizeMatch[1]), Number(sizeMatch[2])] : null;

  // naive category hints
  const isDrill = q.includes("drill") && q.includes("bit");
  const isSilicone = q.includes("silicone") || tokens.includes("sil");

  // synonyms expansion
  const synonyms = {
    sil: "silicone",
    sealant: "silicone",
    hss: "drill", // HSS drill bits
    masonry: "drill"
  };
  const expandedTokens = tokens.map(t => synonyms[t] || t);

  const normalized = expandedTokens.join(" ");

  return { normalized, diameterMM, sizeTuple, isDrill, isSilicone };
}
