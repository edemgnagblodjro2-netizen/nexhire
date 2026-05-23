const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const db = require('../models/db');
const { requireAuth, requireCompanyAccess } = require('../middleware/auth');
const emailService = require('../services/email');

// ── GET /api/team — list team members for current company ──
router.get('/', requireAuth, requireCompanyAccess, async (req, res) => {
  try {
    const companyId = req.session.user.company_id;
    const members = await db.all(`
      SELECT
        tm.id, tm.email, tm.role, tm.status, tm.invited_at, tm.accepted_at,
        tm.invited_by,
        u.first_name, u.last_name, u.avatar_url,
        inv.first_name AS inviter_first, inv.last_name AS inviter_last
      FROM nh_team_members tm
      LEFT JOIN nh_users u ON u.email = tm.email AND u.id = tm.user_id
      LEFT JOIN nh_users inv ON inv.id = tm.invited_by
      WHERE tm.company_id = $1
      ORDER BY tm.invited_at DESC
    `, [companyId]);
    res.json({ success: true, members });
  } catch (err) {
    console.error('[team] GET error:', err.message);
    res.status(500).json({ success: false, error: 'Server error' });
  }
});

// ── POST /api/team/invite — invite a new team member ──
router.post('/invite', requireAuth, requireCompanyAccess, async (req, res) => {
  try {
    const { email, role = 'recruiter' } = req.body;
    if (!email) return res.status(400).json({ success: false, error: 'Email required' });
    if (!['recruiter', 'admin'].includes(role)) return res.status(400).json({ success: false, error: 'Invalid role' });

    const companyId = req.session.user.company_id;
    const inviterId = req.session.user.id;

    const existing = await db.get(
      'SELECT id, status FROM nh_team_members WHERE company_id = $1 AND email = $2',
      [companyId, email.toLowerCase()]
    );
    if (existing && existing.status === 'active') {
      return res.status(409).json({ success: false, error: 'This person is already a team member' });
    }

    const company = await db.get('SELECT name FROM nh_companies WHERE id = $1', [companyId]);
    const inviter = req.session.user;
    const token = uuidv4().replace(/-/g, '');
    const id = uuidv4();

    if (existing) {
      await db.run(`
        UPDATE nh_team_members SET role=$1, token=$2, status='pending', invited_at=NOW(), invited_by=$3
        WHERE id=$4
      `, [role, token, inviterId, existing.id]);
    } else {
      await db.run(`
        INSERT INTO nh_team_members (id, company_id, email, role, token, status, invited_by)
        VALUES ($1,$2,$3,$4,$5,'pending',$6)
      `, [id, companyId, email.toLowerCase(), role, token, inviterId]);
    }

    const inviteUrl = `${process.env.BASE_URL || 'https://nexhire.ca'}/nexhire/?accept-invite=${token}`;
    const inviterName = `${inviter.first_name || ''} ${inviter.last_name || ''}`.trim() || 'A colleague';
    const roleFr = role === 'admin' ? 'Administrateur' : 'Recruteur';

    const htmlBody = `
      <p>Bonjour,</p>
      <p><strong>${inviterName}</strong> vous invite à rejoindre l'équipe <strong>${company?.name || 'Nexhire'}</strong> en tant que <strong>${roleFr}</strong>.</p>
      <p>En tant que membre de l'équipe, vous pourrez consulter et gérer les candidatures, les offres d'emploi et le pipeline de recrutement.</p>
      <p style="margin:24px 0">
        <a href="${inviteUrl}" style="background:#4F46E5;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:600">
          Accepter l'invitation →
        </a>
      </p>
      <p style="color:#888;font-size:12px">Ce lien expire dans 7 jours. Si vous n'attendiez pas cette invitation, ignorez cet email.</p>
    `;

    try {
      await emailService.send(
        email,
        `${inviterName} vous invite à rejoindre ${company?.name || 'Nexhire'} sur Nexhire`,
        emailService.emailTemplate ? emailService.emailTemplate('Invitation équipe', htmlBody, 'fr') : htmlBody
      );
    } catch (emailErr) {
      console.warn('[team] Email failed (invite still created):', emailErr.message);
    }

    res.json({ success: true, message: 'Invitation sent', inviteUrl });
  } catch (err) {
    console.error('[team] invite error:', err.message);
    res.status(500).json({ success: false, error: 'Server error' });
  }
});

// ── GET /api/team/accept/:token — accept an invitation ──
router.get('/accept/:token', async (req, res) => {
  try {
    const { token } = req.params;
    const invite = await db.get(`
      SELECT tm.*, c.name AS company_name, c.id AS cid
      FROM nh_team_members tm
      JOIN nh_companies c ON c.id = tm.company_id
      WHERE tm.token = $1 AND tm.status = 'pending'
        AND tm.invited_at > NOW() - INTERVAL '7 days'
    `, [token]);

    if (!invite) return res.json({ success: false, error: 'Invitation invalide ou expirée' });

    const user = await db.get('SELECT id, company_id FROM nh_users WHERE email = $1', [invite.email]);
    if (!user) return res.json({ success: false, needsRegister: true, token, email: invite.email, company: invite.company_name });

    await db.run(`
      UPDATE nh_team_members SET status='active', user_id=$1, accepted_at=NOW(), token=NULL WHERE token=$2
    `, [user.id, token]);

    if (!user.company_id) {
      await db.run('UPDATE nh_users SET company_id=$1 WHERE id=$2', [invite.cid, user.id]);
    }

    res.json({ success: true, company: invite.company_name, role: invite.role, email: invite.email });
  } catch (err) {
    console.error('[team] accept error:', err.message);
    res.status(500).json({ success: false, error: 'Server error' });
  }
});

// ── PUT /api/team/:id/role — change role ──
router.put('/:id/role', requireAuth, requireCompanyAccess, async (req, res) => {
  try {
    const { role } = req.body;
    if (!['recruiter', 'admin'].includes(role)) return res.status(400).json({ success: false, error: 'Invalid role' });
    const companyId = req.session.user.company_id;
    const n = await db.run(
      'UPDATE nh_team_members SET role=$1 WHERE id=$2 AND company_id=$3',
      [role, req.params.id, companyId]
    );
    if (!n) return res.status(404).json({ success: false, error: 'Member not found' });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Server error' });
  }
});

// ── DELETE /api/team/:id — remove a member ──
router.delete('/:id', requireAuth, requireCompanyAccess, async (req, res) => {
  try {
    const companyId = req.session.user.company_id;
    const member = await db.get('SELECT user_id FROM nh_team_members WHERE id=$1 AND company_id=$2', [req.params.id, companyId]);
    if (!member) return res.status(404).json({ success: false, error: 'Member not found' });

    await db.run('DELETE FROM nh_team_members WHERE id=$1 AND company_id=$2', [req.params.id, companyId]);

    if (member.user_id) {
      await db.run('UPDATE nh_users SET company_id=NULL WHERE id=$1 AND company_id=$2', [member.user_id, companyId]);
    }

    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Server error' });
  }
});

// ── POST /api/team/resend/:id — resend invitation ──
router.post('/resend/:id', requireAuth, requireCompanyAccess, async (req, res) => {
  try {
    const companyId = req.session.user.company_id;
    const newToken = uuidv4().replace(/-/g, '');
    const n = await db.run(`
      UPDATE nh_team_members SET token=$1, invited_at=NOW()
      WHERE id=$2 AND company_id=$3 AND status='pending'
    `, [newToken, req.params.id, companyId]);
    if (!n) return res.status(404).json({ success: false, error: 'Pending invitation not found' });
    const invite = await db.get('SELECT email FROM nh_team_members WHERE id=$1', [req.params.id]);
    const inviteUrl = `${process.env.BASE_URL || 'https://nexhire.ca'}/nexhire/?accept-invite=${newToken}`;
    try { await emailService.send(invite.email, 'Rappel — Invitation Nexhire', `<p><a href="${inviteUrl}">Accepter l'invitation →</a></p>`); } catch {}
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Server error' });
  }
});

module.exports = router;
