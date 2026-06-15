require('dotenv').config();
const { ingestAll } = require('../services/ingest');

(async () => {
  console.log('[ingest] Starting manual run…');
  const summary = await ingestAll();
  console.log('[ingest] Result:\n', JSON.stringify(summary, null, 2));
  process.exit(0);
})();
