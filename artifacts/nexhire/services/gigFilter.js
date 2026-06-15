'use strict';

// Termes à exclure — insensible à la casse, cherché dans title ET company.
// Ajouter ici pour filtrer une nouvelle source gig sans toucher au reste du code.
const GIG_EXCLUSIONS = [
  'uber', 'uber eats',
  'doordash', 'door dash',
  'instacart',
  'amazon flex',
  'skipthedishes',
  'lyft',
  'grubhub',
  'delivery driver',
  'deliver with',
  'conduisez',
  'chauffeur',
  // Sondages & pseudo-emplois
  'survey', 'earn cash', 'earn money', 'per survey', 'paid survey',
  'sondage rémunéré', 'work from home and earn',
  // Services perso (pas des emplois formels)
  'house cleaning', 'babysitter', 'nanny', 'gardiennage', 'childcare',
];

function isGig(title, company) {
  const text = `${title || ''} ${company || ''}`.toLowerCase();
  return GIG_EXCLUSIONS.some(k => text.includes(k));
}

module.exports = { GIG_EXCLUSIONS, isGig };
