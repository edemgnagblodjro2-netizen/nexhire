// Seeds 12 well-known rental / classified-ads platforms as "regional"
// services in the housing category. These are website-only services
// (no physical address), so service_type='regional' + is_province_wide=true.
// Run: pnpm --filter @workspace/scripts run seed:rentals

import { db, servicesTable } from "@workspace/db";
import { sql } from "drizzle-orm";

interface RentalPlatform {
  id: string;
  name: string;
  website: string;
  description: string;
  scope: "QC" | "CA";
}

const PLATFORMS: RentalPlatform[] = [
  {
    id: "rental-centris",
    name: "Centris",
    website: "https://www.centris.ca/",
    description:
      "Plateforme officielle des courtiers immobiliers du Québec. Locations et achats — la référence pour les annonces vérifiées.",
    scope: "QC",
  },
  {
    id: "rental-realtor",
    name: "Realtor.ca",
    website: "https://www.realtor.ca/",
    description:
      "Site officiel de l'Association canadienne de l'immeuble (ACI). Locations et propriétés à travers le Canada.",
    scope: "CA",
  },
  {
    id: "rental-duproprio",
    name: "DuProprio",
    website: "https://duproprio.com/",
    description:
      "Plateforme québécoise de vente et location de propriétés sans intermédiaire. Contact direct propriétaire-locataire.",
    scope: "QC",
  },
  {
    id: "rental-kijiji",
    name: "Kijiji",
    website: "https://www.kijiji.ca/",
    description:
      "Petites annonces gratuites — section logement très active partout au Canada. Attention aux fraudes : visitez toujours avant de payer.",
    scope: "CA",
  },
  {
    id: "rental-marketplace",
    name: "Facebook Marketplace",
    website: "https://www.facebook.com/marketplace/",
    description:
      "Annonces de location entre particuliers via Facebook. Vérifiez le profil du propriétaire et ne payez jamais à l'avance sans visite.",
    scope: "CA",
  },
  {
    id: "rental-lespac",
    name: "LesPAC",
    website: "https://www.lespac.com/",
    description:
      "Petites annonces québécoises depuis 1996. Section logement avec annonces partout au Québec.",
    scope: "QC",
  },
  {
    id: "rental-logisquebec",
    name: "Logis Québec",
    website: "https://www.logisquebec.com/",
    description:
      "Site spécialisé en location d'appartements au Québec — recherche par ville, prix, nombre de pièces.",
    scope: "QC",
  },
  {
    id: "rental-rentals-ca",
    name: "Rentals.ca",
    website: "https://rentals.ca/",
    description:
      "Plateforme nationale dédiée à la location avec rapports de prix médians par quartier — utile pour évaluer un loyer.",
    scope: "CA",
  },
  {
    id: "rental-4rent",
    name: "4Rent.ca",
    website: "https://4rent.ca/",
    description:
      "Annonces d'appartements à louer au Canada, avec photos et visites virtuelles pour la plupart des immeubles.",
    scope: "CA",
  },
  {
    id: "rental-livrent",
    name: "liv.rent",
    website: "https://liv.rent/",
    description:
      "Plateforme moderne avec vérification d'identité, signature de bail en ligne et paiement sécurisé du loyer.",
    scope: "CA",
  },
  {
    id: "rental-zumper",
    name: "Zumper",
    website: "https://www.zumper.com/",
    description:
      "Plateforme de location nord-américaine — Montréal, Québec, Toronto, Vancouver. Filtres avancés et alertes par courriel.",
    scope: "CA",
  },
  {
    id: "rental-omhm",
    name: "Office municipal d'habitation de Montréal (OMHM)",
    website: "https://www.omhm.qc.ca/",
    description:
      "Logement social et abordable à Montréal. Demande à faire pour la liste d'attente HLM. Service public, gratuit.",
    scope: "QC",
  },
];

async function main() {
  console.log(`Seeding ${PLATFORMS.length} rental platforms…`);

  for (const p of PLATFORMS) {
    await db
      .insert(servicesTable)
      .values({
        id: p.id,
        name: p.name,
        category: "housing",
        subcategory: "recherche-logement",
        city: "",
        province: p.scope,
        phone: "",
        website: p.website,
        description: p.description,
        address: null,
        hours: null,
        isUrgent: false,
        isProvinceWide: true,
        lat: null,
        lng: null,
        serviceType: "regional",
        geocodePrecisionM: null,
        geocodeSource: null,
        active: true,
      })
      .onConflictDoUpdate({
        target: servicesTable.id,
        set: {
          name: sql`EXCLUDED.name`,
          website: sql`EXCLUDED.website`,
          description: sql`EXCLUDED.description`,
          category: sql`EXCLUDED.category`,
          subcategory: sql`EXCLUDED.subcategory`,
          province: sql`EXCLUDED.province`,
          serviceType: sql`EXCLUDED.service_type`,
          isProvinceWide: sql`EXCLUDED.is_province_wide`,
          active: sql`true`,
          updatedAt: new Date(),
        },
      });
    console.log(`  ✓ ${p.name}`);
  }

  console.log(`\nDone. ${PLATFORMS.length} rental platforms inserted/updated in the housing category.`);
  process.exit(0);
}

main().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
