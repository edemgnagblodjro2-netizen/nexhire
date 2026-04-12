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
};
