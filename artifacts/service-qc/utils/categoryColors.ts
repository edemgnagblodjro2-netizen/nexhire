import type { Category } from "@/data/services";

type Colors = {
  categoryHousing: string;
  categoryFood: string;
  categoryMentalHealth: string;
  categoryHealth: string;
  categoryImmigration: string;
  categoryEmployment: string;
  categoryFamily: string;
  categorySocial: string;
  categoryChildcare: string;
  categoryRealestate: string;
  categoryBanking: string;
  categoryTransport: string;
  categoryTourism: string;
  categoryMoving: string;
  categoryHypermarche: string;
  categoryPharmacie: string;
};

export function getCategoryColor(category: Category, colors: Colors): string {
  const map: Record<Category, string> = {
    housing: colors.categoryHousing,
    food: colors.categoryFood,
    mentalHealth: colors.categoryMentalHealth,
    health: colors.categoryHealth,
    immigration: colors.categoryImmigration,
    employment: colors.categoryEmployment,
    family: colors.categoryFamily,
    social: colors.categorySocial,
    childcare: colors.categoryChildcare,
    realestate: colors.categoryRealestate,
    administrative: colors.categorySocial,
    legal: colors.categoryFamily,
    banking: colors.categoryBanking,
    transport: colors.categoryTransport,
    tourism: colors.categoryTourism,
    moving: colors.categoryMoving,
    hypermarche: colors.categoryHypermarche,
    pharmacie: colors.categoryPharmacie,
  };
  return map[category];
}

export const CATEGORY_ICONS: Record<Category, string> = {
  housing: "home",
  food: "shopping-bag",
  mentalHealth: "heart",
  health: "activity",
  immigration: "globe",
  employment: "briefcase",
  family: "users",
  social: "share-2",
  childcare: "sun",
  realestate: "key",
  administrative: "file-text",
  legal: "shield",
  banking: "credit-card",
  transport: "navigation",
  tourism: "camera",
  moving: "truck",
  hypermarche: "shopping-cart",
  pharmacie: "plus-square",
};
