require('dotenv').config();
const db = require('../models/db');
const { getCategory, getRegion } = require('../services/classifier');

(async () => {
  const rows = await db.all(
    `SELECT id, title, description, province, city
     FROM nh_jobs_external
     WHERE category IS NULL OR region IS NULL`
  );
  console.log(`[classify] ${rows.length} offres à traiter…`);

  let updated = 0;
  for (const row of rows) {
    const category = getCategory(row.title, row.description);
    const region   = getRegion(row.province, row.city);
    await db.run(
      `UPDATE nh_jobs_external SET category = $1, region = $2, updated_at = NOW() WHERE id = $3`,
      [category, region, row.id]
    );
    updated++;
    if (updated % 100 === 0) console.log(`[classify] ${updated}/${rows.length}…`);
  }

  console.log(`[classify] Done — ${updated} offres mises à jour.`);

  const breakdown = await db.all(
    `SELECT category, COUNT(*) AS n FROM nh_jobs_external GROUP BY category ORDER BY n DESC`
  );
  console.log('\n[classify] Répartition par catégorie :');
  for (const r of breakdown) console.log(`  ${r.category}: ${r.n}`);

  process.exit(0);
})();
