const router = require('express').Router();
const db     = require('../models/db');
const { requireAuth, requireCompanyAccess } = require('../middleware/auth');

function genId(prefix) {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

// POST /api/interview-slots  — employer proposes up to 3 slots
router.post('/', requireAuth, requireCompanyAccess, async (req, res) => {
  try {
    const { application_id, slot1, slot2, slot3, location, notes } = req.body;
    if (!application_id || !slot1) {
      return res.status(400).json({ success: false, error: 'application_id and slot1 required' });
    }
    const app = await db.get(
      `SELECT a.*, j.title_en, j.title_fr, j.company_id
       FROM nh_applications a
       JOIN nh_jobs j ON a.job_id = j.id
       WHERE a.id = $1 AND j.company_id = $2`,
      [application_id, req.session.user.company_id]
    );
    if (!app) return res.status(404).json({ success: false, error: 'Application not found' });

    await db.run(
      "UPDATE nh_interview_slots SET status = 'cancelled' WHERE application_id = $1 AND status = 'pending'",
      [application_id]
    );

    const id = genId('is');
    await db.run(
      `INSERT INTO nh_interview_slots (id, application_id, company_id, job_id, slot1, slot2, slot3, location, notes, status)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,'pending')`,
      [id, application_id, req.session.user.company_id, app.job_id,
       slot1, slot2 || null, slot3 || null, location || '', notes || '']
    );

    await db.run("UPDATE nh_applications SET status = 'interview', updated_at = NOW() WHERE id = $1", [application_id]);

    const jobTitle = app.title_fr || app.title_en;
    const notifId  = genId('n');
    await db.run(
      `INSERT INTO nh_notifications (id, user_id, type, title, body, link, created_at)
       VALUES ($1,$2,'interview_invite',$3,$4,$5,NOW())`,
      [notifId, app.user_id, '📅 Invitation à un entretien',
       `${jobTitle} — Choisissez votre créneau`, `/nexhire/#applications`]
    );

    res.json({ success: true, slot_id: id });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

// GET /api/interview-slots/mine/pending  — candidate: all pending slot invites
router.get('/mine/pending', requireAuth, async (req, res) => {
  try {
    if (req.session.user.role !== 'candidate') return res.json({ success: true, slots: [] });
    const slots = await db.all(
      `SELECT s.*, j.title_en, j.title_fr, c.name AS company_name, c.logo_url AS company_logo
       FROM nh_interview_slots s
       JOIN nh_applications a ON s.application_id = a.id
       JOIN nh_jobs j          ON a.job_id = j.id
       JOIN nh_companies c     ON s.company_id = c.id
       WHERE a.user_id = $1 AND s.status = 'pending'
       ORDER BY s.created_at DESC`,
      [req.session.user.id]
    );
    res.json({ success: true, slots });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

// GET /api/interview-slots/:applicationId  — get latest slot for an application
router.get('/:applicationId', requireAuth, async (req, res) => {
  try {
    const slot = await db.get(
      'SELECT * FROM nh_interview_slots WHERE application_id = $1 ORDER BY created_at DESC LIMIT 1',
      [req.params.applicationId]
    );
    res.json({ success: true, slot: slot || null });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

// PATCH /api/interview-slots/:id/confirm  — candidate confirms one slot
router.patch('/:id/confirm', requireAuth, async (req, res) => {
  try {
    const { selected_slot } = req.body;
    if (!selected_slot) return res.status(400).json({ success: false, error: 'selected_slot required' });

    const slot = await db.get('SELECT * FROM nh_interview_slots WHERE id = $1', [req.params.id]);
    if (!slot) return res.status(404).json({ success: false, error: 'Slot not found' });

    const app = await db.get(
      'SELECT * FROM nh_applications WHERE id = $1 AND user_id = $2',
      [slot.application_id, req.session.user.id]
    );
    if (!app) return res.status(403).json({ success: false, error: 'Forbidden' });

    const valid = [slot.slot1, slot.slot2, slot.slot3]
      .filter(Boolean).map(s => new Date(s).toISOString());
    if (!valid.includes(new Date(selected_slot).toISOString())) {
      return res.status(400).json({ success: false, error: 'Invalid slot selection' });
    }

    await db.run(
      "UPDATE nh_interview_slots SET status = 'confirmed', selected_slot = $1, updated_at = NOW() WHERE id = $2",
      [selected_slot, req.params.id]
    );

    // ── Récupérer infos job + candidat + employeur ──────────
    const job = await db.get('SELECT title_en, title_fr FROM nh_jobs WHERE id = $1', [slot.job_id]);
    const jobTitle = job?.title_en || job?.title_fr || 'Entretien';
    const candName = `${req.session.user.first_name || ''} ${req.session.user.last_name || ''}`.trim();
    const candLang = req.session.user.preferred_lang || 'fr';
    const slotDate = new Date(selected_slot).toLocaleString(candLang === 'fr' ? 'fr-CA' : 'en-CA', {
      weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
      hour: '2-digit', minute: '2-digit'
    });

    const emailService = require('../services/email');

    // Email au candidat
    await emailService.send(
      req.session.user.email,
      candLang === 'fr' ? `✅ Entretien confirmé — ${jobTitle}` : `✅ Interview confirmed — ${jobTitle}`,
      emailService.emailTemplate
        ? emailService.emailTemplate(
            candLang === 'fr' ? 'Entretien confirmé' : 'Interview confirmed',
            `<p>${candLang === 'fr' ? 'Bonjour' : 'Hello'} ${candName},</p>
             <p>${candLang === 'fr' ? 'Votre entretien pour le poste' : 'Your interview for'} <strong>${jobTitle}</strong> ${candLang === 'fr' ? 'est confirmé pour le' : 'is confirmed for'} <strong>${slotDate}</strong>.</p>
             ${slot.location ? `<p><i>${candLang === 'fr' ? 'Lieu / Lien' : 'Location / Link'} :</i> <strong>${slot.location}</strong></p>` : ''}
             ${slot.notes ? `<p><i>${candLang === 'fr' ? 'Note' : 'Note'} :</i> ${slot.notes}</p>` : ''}
             <a href="https://nexhire.ca" class="btn">${candLang === 'fr' ? 'Voir mon tableau de bord' : 'View my dashboard'} →</a>`
          )
        : `Entretien confirmé : ${slotDate}`
    );

    // Notification + email à l'employeur
    const company = await db.get(
      'SELECT c.owner_id, u.email, u.first_name, u.preferred_lang FROM nh_companies c JOIN nh_users u ON u.id = c.owner_id WHERE c.id = $1',
      [slot.company_id]
    );
    if (company?.owner_id) {
      const { v4: uuidv4 } = require('uuid');
      await db.run(
        `INSERT INTO nh_notifications (id, user_id, type, title, body, link, created_at)
         VALUES ($1,$2,'slot_confirmed',$3,$4,$5,NOW())`,
        [uuidv4().replace(/-/g,''), company.owner_id,
         '✅ Entretien confirmé',
         `${candName} a choisi le ${slotDate}`,
         `/#interviews`]
      );

      // Email à l'employeur
      const empLang = company.preferred_lang || 'fr';
      await emailService.send(
        company.email,
        empLang === 'fr' ? `📅 Entretien confirmé — ${jobTitle}` : `📅 Interview confirmed — ${jobTitle}`,
        emailService.emailTemplate(
          empLang === 'fr' ? 'Entretien confirmé' : 'Interview confirmed',
          `<p>${empLang === 'fr' ? 'Bonjour' : 'Hello'} ${company.first_name},</p>
           <p><strong>${candName}</strong> ${empLang === 'fr' ? 'a confirmé son entretien pour le poste' : 'confirmed their interview for'} <strong>${jobTitle}</strong>.</p>
           <p>${empLang === 'fr' ? 'Date choisie' : 'Selected date'} : <strong>${slotDate}</strong></p>
           ${slot.location ? `<p>${empLang === 'fr' ? 'Lieu / Lien' : 'Location'} : <strong>${slot.location}</strong></p>` : ''}
           <a href="https://nexhire.ca" class="btn">${empLang === 'fr' ? 'Voir le tableau de bord' : 'View dashboard'} →</a>`
        )
      );
    }

    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

// PATCH /api/interview-slots/:id/decline  — candidate declines all slots
router.patch('/:id/decline', requireAuth, async (req, res) => {
  try {
    const slot = await db.get('SELECT * FROM nh_interview_slots WHERE id = $1', [req.params.id]);
    if (!slot) return res.status(404).json({ success: false, error: 'Not found' });
    const app = await db.get(
      'SELECT * FROM nh_applications WHERE id = $1 AND user_id = $2',
      [slot.application_id, req.session.user.id]
    );
    if (!app) return res.status(403).json({ success: false, error: 'Forbidden' });
    await db.run("UPDATE nh_interview_slots SET status = 'declined', updated_at = NOW() WHERE id = $1", [req.params.id]);
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

module.exports = router;
