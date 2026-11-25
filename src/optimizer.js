import solver from "javascript-lp-solver";
import { GEMS, ITEM_RARITIES } from "./data/gems.js";
import { RECIPES, RARITY_BY_ID } from "./data/recipes.js";

const GEM_IDS_BY_TIER = Object.fromEntries(GEMS.map((gem) => [gem.tier, gem.id]));

function recipeGemCounts(code) {
  const counts = Object.fromEntries(GEMS.map((gem) => [gem.id, 0]));
  for (const digit of code) counts[GEM_IDS_BY_TIER[Number(digit)]] += 1;
  return counts;
}

function recipeWeight(rarityId, goal) {
  const rank = RARITY_BY_ID[rarityId].rank;
  if (goal === "rarity") return rank;
  if (goal === "balanced") return rank + 1;
  return 1;
}

export function optimizeInventory(inventory, maxedRarities, goal) {
  const eligibleRecipes = RECIPES.filter((recipe) => !maxedRarities.includes(recipe.rarity));
  if (eligibleRecipes.length === 0) return { status: "no-recipes" };

  const constraints = Object.fromEntries(GEMS.map((gem) => [
    gem.id,
    { max: Math.max(0, Math.floor(Number(inventory[gem.id]) || 0)) },
  ]));
  const variables = {};
  const ints = {};

  eligibleRecipes.forEach((recipe) => {
    const variable = `recipe_${recipe.code}`;
    variables[variable] = {
      score: recipeWeight(recipe.rarity, goal),
      ...recipeGemCounts(recipe.code),
    };
    ints[variable] = 1;
  });

  const model = { optimize: "score", opType: "max", constraints, variables, ints };
  const solution = solver.Solve(model);
  if (!solution.feasible) return { status: "no-solution" };

  const selectedRecipes = eligibleRecipes
    .map((recipe) => ({ ...recipe, count: Math.max(0, Math.round(solution[`recipe_${recipe.code}`] || 0)) }))
    .filter((recipe) => recipe.count > 0)
    .sort((a, b) => RARITY_BY_ID[b.rarity].rank - RARITY_BY_ID[a.rarity].rank || a.code.localeCompare(b.code));

  const used = Object.fromEntries(GEMS.map((gem) => [gem.id, 0]));
  const itemsByRarity = Object.fromEntries(ITEM_RARITIES.map((rarity) => [rarity.id, 0]));
  let itemCount = 0;
  let rarityScore = 0;
  for (const recipe of selectedRecipes) {
    itemCount += recipe.count;
    itemsByRarity[recipe.rarity] += recipe.count;
    rarityScore += recipe.count * RARITY_BY_ID[recipe.rarity].rank;
    const recipeCounts = recipeGemCounts(recipe.code);
    for (const gem of GEMS) used[gem.id] += recipeCounts[gem.id] * recipe.count;
  }

  const leftover = Object.fromEntries(GEMS.map((gem) => [
    gem.id,
    Math.max(0, Math.floor(Number(inventory[gem.id]) || 0) - used[gem.id]),
  ]));
  return {
    status: "success",
    goal,
    recipes: selectedRecipes,
    itemCount,
    rarityScore,
    itemsByRarity,
    used,
    leftover,
    totalUsed: Object.values(used).reduce((sum, count) => sum + count, 0),
  };
}

export function formatRecipe(code) {
  const counts = recipeGemCounts(code);
  return GEMS
    .filter((gem) => counts[gem.id] > 0)
    .map((gem) => `${gem.name}${counts[gem.id] > 1 ? ` × ${counts[gem.id]}` : ""}`)
    .join(" + ");
}
