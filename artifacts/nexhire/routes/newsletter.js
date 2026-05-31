const router = require('express').Router();
const emailService = require('../services/email');

router.post('/subscribe', async (req, res) => {
  try {
    const { email } = req.body;
    if (!email || !/^[^@]+@[^@]+\.[^@]+$/.test(email)) {
      return res.status(400).json({ success: false, error: 'Invalid email' });
    }
    const html = emailService.emailTemplate(
      'Nouvel abonné newsletter',
      `<p>Une nouvelle personne s'est abonnée à la newsletter Nexhire :</p>
       <p style="background:#F0F4FF;border-radius:8px;padding:14px;font-size:16px;font-weight:600">${email}</p>
       <p style="color:#9CA3AF;font-size:12px">Ajoutez cette adresse à votre liste de diffusion.</p>`
    );
    await emailService.send('contact@nexhire.ca', `📧 Nouvel abonné newsletter : ${email}`, html);
    res.json({ success: true });
  } catch (e) {
    console.error('[Newsletter]', e.message);
    res.status(500).json({ success: false, error: e.message });
  }
});

module.exports = router;