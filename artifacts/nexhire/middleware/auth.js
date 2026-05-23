function requireAuth(req, res, next) {
  if (!req.session?.user) {
    return res.status(401).json({ success: false, error: 'Authentication required' });
  }
  next();
}

function requireCompanyAccess(req, res, next) {
  if (!req.session?.user?.company_id) {
    return res.status(403).json({ success: false, error: 'Employer account required' });
  }
  next();
}

function requireRole(role) {
  return (req, res, next) => {
    if (!req.session?.user || req.session.user.role !== role) {
      return res.status(403).json({ success: false, error: 'Insufficient permissions' });
    }
    next();
  };
}

module.exports = { requireAuth, requireCompanyAccess, requireRole };
