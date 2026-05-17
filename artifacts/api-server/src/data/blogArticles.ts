export interface BlogArticleMeta {
  slug: string;
  titleFr: string;
  titleEn: string;
  excerptFr: string;
  excerptEn: string;
}

export const BLOG_ARTICLES: BlogArticleMeta[] = [
  {
    slug: "ia-secteur-public",
    titleFr: "L'IA au service du secteur public : opportunités et défis",
    titleEn: "AI in the Public Sector: Opportunities and Challenges",
    excerptFr:
      "Comment les administrations publiques canadiennes peuvent tirer parti de l'intelligence artificielle pour améliorer leurs services aux citoyens, tout en respectant les exigences de transparence et de protection des données.",
    excerptEn:
      "How Canadian public administrations can leverage artificial intelligence to improve their citizen services, while respecting transparency requirements and data protection obligations.",
  },
  {
    slug: "developpement-web-2026",
    titleFr: "Développement web en 2026 : ce qui a vraiment changé",
    titleEn: "Web Development in 2026: What Has Really Changed",
    excerptFr:
      "De React Server Components à l'IA générative intégrée aux outils de développement, le paysage du développement web évolue à une vitesse vertigineuse. Voici notre lecture des tendances qui comptent vraiment.",
    excerptEn:
      "From React Server Components to AI-powered dev tools, the web development landscape is evolving at a dizzying pace. Here is our take on the trends that truly matter.",
  },
  {
    slug: "modele-b2g",
    titleFr:
      "Le modèle B2G : quand les gouvernements deviennent des clients technologiques",
    titleEn: "The B2G Model: When Governments Become Technology Clients",
    excerptFr:
      "Le modèle Business-to-Government (B2G) représente une opportunité considérable pour les entreprises technologiques québécoises. Découvrez comment fonctionne ce marché, ses particularités et pourquoi CivicAI l'a choisi pour AttenteZéro.",
    excerptEn:
      "The Business-to-Government (B2G) model represents a considerable opportunity for Quebec technology companies. Discover how this market works, its particularities, and why CivicAI chose it for AttenteZéro.",
  },
];

export function findArticle(slug: string): BlogArticleMeta | undefined {
  return BLOG_ARTICLES.find((a) => a.slug === slug);
}
