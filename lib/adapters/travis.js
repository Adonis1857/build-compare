// after parseCSV(csv);
const rows = parseCSV(csv);

// DEBUG: show me the first 5 rows raw
if (q === "__debug") {
  return rows.slice(0, 5).map(r => ({ sample: r }));
}
