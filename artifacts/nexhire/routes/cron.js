'use strict';
const router = require('express').Router();

let _ingestRunning = false;

// POST /api/cron/ingest
// Appelé par cron-job.org toutes les 6h.
// Authentification : header X-Cron-Key = process.env.CRON_SECRET
// Répond 200 immédiatement après vérification du token, lance ingestAll() en background.
router.post('/ingest', (req, res) => {
  const key = req.headers['x-cron-key'];
  if (!key || key !== process.env.CRON_SECRET) {
    console.warn('[cron/ingest] Unauthorized attempt from', req.ip);
    return res.status(401).json({ error: 'Unauthorized' });
  }

  if (_ingestRunning) {
    console.log('[cron/ingest] Skipped — ingestion already in progress');
    return res.json({ success: true, status: 'already_running' });
  }

  // Répondre immédiatement — ne pas attendre la fin de l'ingestion
  res.json({ success: true, status: 'started' });

  _ingestRunning = true;
  const { ingestAll } = require('../services/ingest');

  ingestAll()
    .then(summary => {
      const az = summary.sources?.adzuna;
      console.log(`[cron/ingest] Terminé en ${summary.duration_ms}ms`);
      if (az?.ok) {
        console.log(`[cron/ingest] Adzuna — inserted:${az.inserted} updated:${az.updated} excluded:${az.excluded} skipped:${az.skipped} errors:${az.errors?.length || 0}`);
      } else {
        console.warn(`[cron/ingest] Adzuna FAILED — ${az?.error || 'unknown error'}`);
      }
    })
    .catch(e => {
      console.error('[cron/ingest] Erreur fatale :', e.message);
    })
    .finally(() => {
      _ingestRunning = false;
    });
});

module.exports = router;
