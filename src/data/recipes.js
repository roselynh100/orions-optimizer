import { ITEM_RARITIES } from "./gems.js";

// Recipe codes are sorted gem-tier digits; order within a recipe does not matter.
// Add newly confirmed combinations under their resulting item rarity.
export const RECIPES_BY_RARITY = {
  rare: ["111", "112", "113", "122"],
  "very-rare": ["123", "222", "223", "124", "125", "116", "114", "115", "133", "134", "224", "233"],
  "ultra-rare": ["126", "226", "234", "235", "236", "333", "135", "136", "144", "145", "146", "155", "225", "244", "245", "334", "335", "344"],
  legendary: ["166", "266", "345", "346", "356", "444", "445", "446", "455", "156", "246", "255", "256", "336", "355"],
  mythical: ["366", "456", "466", "555", "556", "566"],
  otherworldly: ["666"],
};

export const RECIPES = Object.entries(RECIPES_BY_RARITY).flatMap(([rarity, codes]) =>
  codes.map((code) => ({ code, rarity })),
);

export function allPossibleRecipes() {
  const combinations = [];
  for (let first = 1; first <= 6; first += 1) {
    for (let second = first; second <= 6; second += 1) {
      for (let third = second; third <= 6; third += 1) {
        combinations.push(`${first}${second}${third}`);
      }
    }
  }
  return combinations;
}

const knownCodes = new Set(RECIPES.map(({ code }) => code));
export const MISSING_RECIPES = allPossibleRecipes().filter((code) => !knownCodes.has(code));
export const TOTAL_RECIPE_COUNT = allPossibleRecipes().length;
export const CONFIGURED_RECIPE_COUNT = knownCodes.size;
export const RARITY_BY_ID = Object.fromEntries(ITEM_RARITIES.map((rarity) => [rarity.id, rarity]));
