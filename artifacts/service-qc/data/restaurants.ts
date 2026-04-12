export type CuisineType =
  | "québécois"
  | "français"
  | "italien"
  | "japonais"
  | "méditerranéen"
  | "américain"
  | "asiatique"
  | "steakhouse"
  | "fruits de mer"
  | "bistro"
  | "végétarien"
  | "brasserie";

export interface Restaurant {
  id: string;
  name: string;
  city: string;
  region: string;
  cuisine: CuisineType;
  description: string;
  address: string;
  phone: string;
  website: string;
  rating: number;
  coordinates: { lat: number; lng: number };
  mustTry?: string;
  openHours?: string;
}

export const QUEBEC_CITIES = [
  "Montréal",
  "Québec",
  "Laval",
  "Gatineau",
  "Sherbrooke",
  "Saguenay",
  "Trois-Rivières",
  "Lévis",
] as const;

export type QuebecCity = (typeof QUEBEC_CITIES)[number];

export const CUISINE_LABELS: Record<CuisineType, string> = {
  québécois: "Québécois",
  français: "Français",
  italien: "Italien",
  japonais: "Japonais",
  méditerranéen: "Méditerranéen",
  américain: "Américain",
  asiatique: "Asiatique",
  steakhouse: "Steakhouse",
  "fruits de mer": "Fruits de mer",
  bistro: "Bistro",
  végétarien: "Végétarien",
  brasserie: "Brasserie",
};

export const RESTAURANTS: Restaurant[] = [
  // ─── MONTRÉAL ─────────────────────────────────────────────────────────────
  {
    id: "mtl-01",
    name: "Toqué!",
    city: "Montréal",
    region: "Centre-ville",
    cuisine: "québécois",
    description:
      "Icône de la gastronomie québécoise, Toqué! célèbre les produits locaux avec une créativité sans pareille. Chef Normand Laprise revisite la cuisine du terroir avec audace.",
    address: "900 Place Jean-Paul-Riopelle, Montréal",
    phone: "514-499-2084",
    website: "https://restaurant-toque.com",
    rating: 4.8,
    coordinates: { lat: 45.508, lng: -73.554 },
    mustTry: "Menu dégustation saison",
    openHours: "Mar-Sam 17h30–22h",
  },
  {
    id: "mtl-02",
    name: "Joe Beef",
    city: "Montréal",
    region: "Petite-Bourgogne",
    cuisine: "américain",
    description:
      "Institution montréalaise dans la Petite-Bourgogne. Cuisine généreuse et conviviale alliant tradition française et comfort food américain. Carte des vins exceptionnelle.",
    address: "2491 Rue Notre-Dame O, Montréal",
    phone: "514-935-6504",
    website: "https://joebeef.ca",
    rating: 4.7,
    coordinates: { lat: 45.4749, lng: -73.5827 },
    mustTry: "Homard et côte de bœuf",
    openHours: "Mer-Sam 18h–22h",
  },
  {
    id: "mtl-03",
    name: "Au Pied de Cochon",
    city: "Montréal",
    region: "Plateau-Mont-Royal",
    cuisine: "québécois",
    description:
      "Martin Picard signe une cuisine québécoise généreuse et décomplexée. Foie gras, gibier, fromages du Québec — un festin inoubliable qui fait la fierté nationale.",
    address: "536 Avenue Duluth E, Montréal",
    phone: "514-281-1114",
    website: "https://restaurantaupieddecochon.ca",
    rating: 4.7,
    coordinates: { lat: 45.5178, lng: -73.5786 },
    mustTry: "Foie gras poutine",
    openHours: "Mer-Sam 17h–22h30",
  },
  {
    id: "mtl-04",
    name: "Liverpool House",
    city: "Montréal",
    region: "Petite-Bourgogne",
    cuisine: "américain",
    description:
      "Restaurant frère de Joe Beef, Liverpool House offre une ambiance plus décontractée avec une cuisine tout aussi remarquable. Spécialités de poisson et plateaux de mer.",
    address: "2501 Rue Notre-Dame O, Montréal",
    phone: "514-313-6049",
    website: "https://liverpoolhouse.ca",
    rating: 4.6,
    coordinates: { lat: 45.4751, lng: -73.5829 },
    mustTry: "Plateau de fruits de mer",
    openHours: "Mer-Sam 18h–22h",
  },
  {
    id: "mtl-05",
    name: "Maison Boulud",
    city: "Montréal",
    region: "Centre-ville",
    cuisine: "français",
    description:
      "Le chef étoilé Daniel Boulud s'installe au Ritz-Carlton. Cuisine française raffinée dans un cadre somptueux, avec un jardin extérieur magnifique en saison.",
    address: "1228 Rue Sherbrooke O, Montréal",
    phone: "514-842-4224",
    website: "https://maisonboulud.com",
    rating: 4.6,
    coordinates: { lat: 45.5034, lng: -73.5795 },
    mustTry: "Tartare de thon et risotto aux morilles",
    openHours: "Mar-Dim 6h30–22h30",
  },
  {
    id: "mtl-06",
    name: "Jun I",
    city: "Montréal",
    region: "Westmount",
    cuisine: "japonais",
    description:
      "Le meilleur restaurant japonais de Montréal selon les critiques. Jun Namikawa signe une cuisine omakase d'exception avec les produits les plus frais du marché.",
    address: "156 Avenue Laurier O, Montréal",
    phone: "514-276-5864",
    website: "https://juni.ca",
    rating: 4.8,
    coordinates: { lat: 45.5231, lng: -73.5907 },
    mustTry: "Menu omakase sushis",
    openHours: "Mar-Sam 18h–21h30",
  },
  {
    id: "mtl-07",
    name: "Ferreira Café",
    city: "Montréal",
    region: "Centre-ville",
    cuisine: "méditerranéen",
    description:
      "Référence incontournable de la cuisine portugaise à Montréal. Bacalhau, fruits de mer et vins portugais dans un cadre chaleureux au cœur de la ville.",
    address: "1446 Rue Peel, Montréal",
    phone: "514-848-0988",
    website: "https://ferreiracafe.com",
    rating: 4.5,
    coordinates: { lat: 45.4975, lng: -73.5735 },
    mustTry: "Bacalhau à brás et pieuvre grillée",
    openHours: "Lun-Sam 12h–22h",
  },
  {
    id: "mtl-08",
    name: "Schwartz's Deli",
    city: "Montréal",
    region: "Plateau-Mont-Royal",
    cuisine: "américain",
    description:
      "Fondé en 1928, Schwartz's est une institution montréalaise. La smoke meat de bœuf fumé à la main reste inégalée. File d'attente légendaire mais ça en vaut la peine.",
    address: "3895 Boulevard Saint-Laurent, Montréal",
    phone: "514-842-4813",
    website: "https://schwartzsdeli.com",
    rating: 4.4,
    coordinates: { lat: 45.5186, lng: -73.5843 },
    mustTry: "Sandwich smoke meat medium",
    openHours: "Lun-Dim 8h–23h30",
  },
  {
    id: "mtl-09",
    name: "Impasto",
    city: "Montréal",
    region: "Saint-Henri",
    cuisine: "italien",
    description:
      "Pasta fraîche, risottos et viandes braisées dans un cadre convivial. Impasto réinterprète la cuisine italienne avec des produits locaux québécois. Chef Michele Forgione.",
    address: "48 Rue Dante, Montréal",
    phone: "514-508-6508",
    website: "https://impasto.ca",
    rating: 4.6,
    coordinates: { lat: 45.5316, lng: -73.6057 },
    mustTry: "Tagliatelles aux truffes et vitello tonnato",
    openHours: "Mer-Dim 17h30–22h",
  },
  {
    id: "mtl-10",
    name: "Bouillon Bilk",
    city: "Montréal",
    region: "Centre-ville",
    cuisine: "français",
    description:
      "Restaurant gastronomique intimiste qui excelle dans la cuisine de marché. Menu créatif changeant selon les saisons, avec une cave à vins naturels remarquable.",
    address: "1595 Boulevard Saint-Laurent, Montréal",
    phone: "514-845-1595",
    website: "https://bouillonbilk.com",
    rating: 4.7,
    coordinates: { lat: 45.5106, lng: -73.5675 },
    mustTry: "Menu confiance du chef",
    openHours: "Mar-Sam 17h30–22h",
  },
  {
    id: "mtl-11",
    name: "Elena",
    city: "Montréal",
    region: "Griffintown",
    cuisine: "italien",
    description:
      "Pizzas napolitaines cuites au feu de bois, pasta maison et antipasti généreux. Elena est devenue la référence pizza à Montréal avec une ambiance décontractée et animée.",
    address: "5090 Rue Notre-Dame O, Montréal",
    phone: "514-379-2999",
    website: "https://coffeepizzawine.com",
    rating: 4.5,
    coordinates: { lat: 45.4715, lng: -73.5876 },
    mustTry: "Pizza Margherita DOP et pasta carbonara",
    openHours: "Mar-Dim 17h30–22h",
  },
  {
    id: "mtl-12",
    name: "Leméac",
    city: "Montréal",
    region: "Outremont",
    cuisine: "bistro",
    description:
      "Bistro français par excellence d'Outremont. Tables serrées, menu ardoise, ambiance feutrée et menu « après minuit » légendaire. Une institution de la gastronomie montréalaise.",
    address: "1045 Avenue Laurier O, Montréal",
    phone: "514-270-0999",
    website: "https://restaurantlemeac.com",
    rating: 4.5,
    coordinates: { lat: 45.5238, lng: -73.6118 },
    mustTry: "Tartare de bœuf et crème brûlée",
    openHours: "Lun-Dim 11h30–23h",
  },

  // ─── QUÉBEC (VILLE) ───────────────────────────────────────────────────────
  {
    id: "qc-01",
    name: "Le Champlain",
    city: "Québec",
    region: "Vieux-Québec",
    cuisine: "français",
    description:
      "Dans le mythique Château Frontenac, Le Champlain offre une cuisine gastronomique d'exception avec vue panoramique sur le fleuve Saint-Laurent. Service blanc impeccable.",
    address: "1 Rue des Carrières, Québec",
    phone: "418-692-3861",
    website: "https://restaurants.fairmont.com/fr/le-champlain",
    rating: 4.7,
    coordinates: { lat: 46.8199, lng: -71.2026 },
    mustTry: "Menu prestige et soufflé au Grand Marnier",
    openHours: "Mar-Dim 17h30–21h30",
  },
  {
    id: "qc-02",
    name: "L'Initiale",
    city: "Québec",
    region: "Vieux-Québec",
    cuisine: "français",
    description:
      "Table gastronomique incontournable de la Vieille Capitale. Cuisine de haute voltige misant sur les produits du terroir québécois dans un décor sobre et élégant.",
    address: "54 Rue Saint-Pierre, Québec",
    phone: "418-694-1818",
    website: "https://initiale.ca",
    rating: 4.8,
    coordinates: { lat: 46.8133, lng: -71.2029 },
    mustTry: "Menu dégustation 7 services",
    openHours: "Mar-Sam 18h–21h",
  },
  {
    id: "qc-03",
    name: "Chez Boulay Bistro Boréal",
    city: "Québec",
    region: "Vieux-Québec",
    cuisine: "québécois",
    description:
      "Cuisine boréale inspirée des forêts et toundras du Québec. Ingrédients sauvages cueillies à la main : champignons, baies arctiques, herbes boréales et poissons du Nord.",
    address: "1110 Rue Saint-Jean, Québec",
    phone: "418-380-8166",
    website: "https://chezboulay.com",
    rating: 4.6,
    coordinates: { lat: 46.8117, lng: -71.2158 },
    mustTry: "Tartare de caribou et saumon de l'Arctique",
    openHours: "Lun-Dim 11h30–22h",
  },
  {
    id: "qc-04",
    name: "Le Café du Monde",
    city: "Québec",
    region: "Vieux-Port",
    cuisine: "bistro",
    description:
      "Brasserie française au cœur du Vieux-Port avec vue sur le fleuve. Moules-frites, steak tartare et plateau de fruits de mer dans un décor rappelant les brasseries parisiennes.",
    address: "84 Rue Dalhousie, Québec",
    phone: "418-692-4455",
    website: "https://lecafedumonde.com",
    rating: 4.4,
    coordinates: { lat: 46.8149, lng: -71.2058 },
    mustTry: "Moules marinières et plateau de fruits de mer",
    openHours: "Lun-Dim 11h30–22h30",
  },
  {
    id: "qc-05",
    name: "Le Clocher Penché",
    city: "Québec",
    region: "Saint-Roch",
    cuisine: "bistro",
    description:
      "Bistro de quartier devenu une référence dans le quartier Saint-Roch. Cuisine de marché créative, brunchs légendaires et cave à vins naturels dans un ancien presbytère.",
    address: "203 Rue Saint-Joseph E, Québec",
    phone: "418-640-0597",
    website: "https://clocherpenche.ca",
    rating: 4.5,
    coordinates: { lat: 46.8068, lng: -71.2164 },
    mustTry: "Brunch du weekend et tartare de cerf",
    openHours: "Mer-Dim 9h–21h",
  },

  // ─── LAVAL ────────────────────────────────────────────────────────────────
  {
    id: "lav-01",
    name: "Bâton Rouge Laval",
    city: "Laval",
    region: "Chomedey",
    cuisine: "américain",
    description:
      "Le flagship montréalais de la chaîne Bâton Rouge. Côtes levées « back ribs » fumées, steaks grillés et cocktails signature dans un décor convivial.",
    address: "1055 Boulevard du Souvenir, Laval",
    phone: "450-681-6600",
    website: "https://batonrouge.ca",
    rating: 4.2,
    coordinates: { lat: 45.5609, lng: -73.7554 },
    mustTry: "BBQ Ribs et pouding chômeur maison",
    openHours: "Lun-Dim 11h–22h",
  },
  {
    id: "lav-02",
    name: "Giard Resto Bar",
    city: "Laval",
    region: "Saint-François",
    cuisine: "québécois",
    description:
      "Institution de Laval depuis 40 ans, Giard propose une cuisine québécoise généreuse avec spécialités de chasse et de pêche dans une ambiance de chalet nordique.",
    address: "3900 Rue Lesage, Laval",
    phone: "450-666-7450",
    website: "https://giardrestobar.com",
    rating: 4.3,
    coordinates: { lat: 45.6087, lng: -73.7087 },
    mustTry: "Gibier en saison et soupe à l'oignon gratinée",
    openHours: "Mar-Dim 11h30–22h",
  },

  // ─── GATINEAU ─────────────────────────────────────────────────────────────
  {
    id: "gat-01",
    name: "Soif Bar à vin",
    city: "Gatineau",
    region: "Hull",
    cuisine: "bistro",
    description:
      "Bar à vins et bistro gourmet très populaire dans le secteur Hull. Sélection de plus de 300 vins, petites assiettes créatives et ambiance festive en bord de rivière.",
    address: "88 Rue Montcalm, Gatineau",
    phone: "819-600-7643",
    website: "https://soifbaravin.com",
    rating: 4.4,
    coordinates: { lat: 45.4269, lng: -75.7056 },
    mustTry: "Plateau charcuteries-fromages et cépages naturels",
    openHours: "Mar-Sam 16h–23h",
  },
  {
    id: "gat-02",
    name: "La Brasserie du Temps",
    city: "Gatineau",
    region: "Hull",
    cuisine: "brasserie",
    description:
      "Microbrasserie artisanale et restaurant gastronomique au cœur de Gatineau. Bières brassées sur place, cuisine de pub élevée et terrasse face à la rivière des Outaouais.",
    address: "170 Rue Montcalm, Gatineau",
    phone: "819-205-4999",
    website: "https://brasseriedutemps.com",
    rating: 4.3,
    coordinates: { lat: 45.4275, lng: -75.7068 },
    mustTry: "Burger artisanal et frites à la graisse de canard",
    openHours: "Lun-Dim 11h–23h",
  },

  // ─── SHERBROOKE ───────────────────────────────────────────────────────────
  {
    id: "she-01",
    name: "Auguste Restaurant",
    city: "Sherbrooke",
    region: "Centre-ville",
    cuisine: "français",
    description:
      "La grande table de Sherbrooke. Cuisine gastronomique française avec des produits des Cantons-de-l'Est. Chef élève de Joël Robuchon, prix du meilleur chef de l'Estrie.",
    address: "82 Rue Wellington N, Sherbrooke",
    phone: "819-565-9559",
    website: "https://auguste-restaurant.com",
    rating: 4.7,
    coordinates: { lat: 45.4005, lng: -71.8983 },
    mustTry: "Agneau de l'Estrie et fromages locaux",
    openHours: "Mar-Sam 17h30–21h30",
  },
  {
    id: "she-02",
    name: "Le Bouchon",
    city: "Sherbrooke",
    region: "Vieux-Nord",
    cuisine: "bistro",
    description:
      "Bistro de quartier animé avec une belle terrasse. Cuisine du marché, tartares et charcuteries locales dans une ambiance décontractée très prisée des Sherbrookois.",
    address: "134 Rue Wellington N, Sherbrooke",
    phone: "819-791-2583",
    website: "https://lebouchon.ca",
    rating: 4.4,
    coordinates: { lat: 45.4019, lng: -71.8985 },
    mustTry: "Tartare classique et moules-frites",
    openHours: "Mer-Dim 11h30–22h",
  },

  // ─── SAGUENAY ─────────────────────────────────────────────────────────────
  {
    id: "sag-01",
    name: "La Cuisine",
    city: "Saguenay",
    region: "Chicoutimi",
    cuisine: "québécois",
    description:
      "Table gastronomique incontournable du Saguenay. Cuisine locale inventive valorisant les richesses de la région : bleuets du Lac, truites du fjord et fromages locaux.",
    address: "387 Rue Racine E, Saguenay",
    phone: "418-698-2822",
    website: "https://restaurantlacuisine.ca",
    rating: 4.6,
    coordinates: { lat: 48.4232, lng: -71.0571 },
    mustTry: "Truite du Fjord et gâteau aux bleuets sauvages",
    openHours: "Mar-Sam 17h30–21h30",
  },
  {
    id: "sag-02",
    name: "L'Entrecôte",
    city: "Saguenay",
    region: "Chicoutimi",
    cuisine: "steakhouse",
    description:
      "Meilleur steakhouse du Saguenay-Lac-Saint-Jean. Viandes locales vieillies à sec, ambiance chaleureuse et service attentionné dans un décor boisé typique de la région.",
    address: "457 Rue Racine E, Saguenay",
    phone: "418-543-8778",
    website: "https://entrecotesaintjean.com",
    rating: 4.4,
    coordinates: { lat: 48.424, lng: -71.0548 },
    mustTry: "Côte de bœuf locale vieilli 28 jours",
    openHours: "Lun-Dim 17h–22h",
  },

  // ─── TROIS-RIVIÈRES ───────────────────────────────────────────────────────
  {
    id: "tr-01",
    name: "Le Sacristain",
    city: "Trois-Rivières",
    region: "Centre-ville",
    cuisine: "bistro",
    description:
      "Bistro gastronomique niché dans une ancienne sacristie. Carte inventive valorisant les produits de la Mauricie, avec une belle sélection de bières microbrassées locales.",
    address: "195 Rue des Forges, Trois-Rivières",
    phone: "819-370-0020",
    website: "https://lesacristain.com",
    rating: 4.5,
    coordinates: { lat: 46.3484, lng: -72.5434 },
    mustTry: "Tartare de cerf de la Mauricie",
    openHours: "Mar-Sam 11h30–22h",
  },
  {
    id: "tr-02",
    name: "L'Ardoise",
    city: "Trois-Rivières",
    region: "Centre-ville",
    cuisine: "québécois",
    description:
      "Restaurant de cuisine régionale contemporaine célébrant les saveurs de la Mauricie. Menu à l'ardoise changeant selon les arrivages et les saisons.",
    address: "3 Rue des Forges, Trois-Rivières",
    phone: "819-373-3939",
    website: "https://ehmonteregie.ca",
    rating: 4.4,
    coordinates: { lat: 46.3476, lng: -72.5458 },
    mustTry: "Risotto aux champignons sauvages de la Mauricie",
    openHours: "Mar-Dim 17h–21h30",
  },

  // ─── LÉVIS ────────────────────────────────────────────────────────────────
  {
    id: "lev-01",
    name: "La Fenouillère",
    city: "Lévis",
    region: "Saint-Romuald",
    cuisine: "français",
    description:
      "Grande table de la rive sud de Québec. Cuisine française créative avec une vue imprenable sur le fleuve Saint-Laurent et une terrasse spectaculaire en saison.",
    address: "3100 Chemin Saint-Louis, Lévis",
    phone: "418-653-9795",
    website: "https://fenouillere.com",
    rating: 4.6,
    coordinates: { lat: 46.7451, lng: -71.2943 },
    mustTry: "Homard de la Gaspésie et fromages fins",
    openHours: "Mar-Sam 18h–21h",
  },
];
