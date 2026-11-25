import solver from "javascript-lp-solver";
import { GEMS, ITEM_RARITIES } from "./data/gems.js";
import { RECIPES, RARITY_BY_ID } from "./data/recipes.js";

const GEM_IDS_BY_TIER = Object.fromEntries(GEMS.map((gem) => [gem.tier, gem.id]));
const SOLVE_TIME_LIMIT_MS = 5000;

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

function lowerGemPreference(counts) {
  return GEMS.reduce((score, gem) => score + counts[gem.id] * (GEMS.length - gem.tier), 0);
}

export function optimizeInventory(inventory, maxedRarities, goal, preferLowerGems = false) {
  const allowedRecipes = RECIPES.filter((recipe) => !maxedRarities.includes(recipe.rarity));
  if (allowedRecipes.length === 0) return { status: "no-recipes" };

  const available = Object.fromEntries(GEMS.map((gem) => [
    gem.id,
    { max: Math.max(0, Math.floor(Number(inventory[gem.id]) || 0)) },
  ]));
  const possibleRecipes = allowedRecipes.map((recipe) => {
    const counts = recipeGemCounts(recipe.code);
    const maxCount = Math.min(...GEMS
      .filter((gem) => counts[gem.id] > 0)
      .map((gem) => Math.floor(available[gem.id].max / counts[gem.id])));
    return { ...recipe, counts, maxCount };
  }).filter((recipe) => recipe.maxCount > 0);
  if (possibleRecipes.length === 0) return { status: "no-solution" };

  const deadline = Date.now() + SOLVE_TIME_LIMIT_MS;
  const totalInventory = GEMS.reduce((sum, gem) => sum + available[gem.id].max, 0);
  const primaryMultiplier = totalInventory * 2 + 1;
  const primary = solveRecipes({
    recipes: possibleRecipes,
    available,
    goal,
    scoreRecipe: (recipe) => recipeWeight(recipe.rarity, goal) * primaryMultiplier
      + (goal === "quantity" ? RARITY_BY_ID[recipe.rarity].rank : 0),
    deadline,
  });

  if (!primary.recipes.length) return { status: "no-solution" };

  let selectedRecipes = primary.recipes;
  let isOptimal = primary.isOptimal;

  if (preferLowerGems && Date.now() < deadline) {
    const targetCounts = Object.fromEntries(ITEM_RARITIES.map(({ id }) => [id, 0]));
    primary.recipes.forEach((recipe) => { targetCounts[recipe.rarity] += recipe.count; });
    const secondary = solveRecipes({
      recipes: possibleRecipes,
      available,
      goal,
      scoreRecipe: (recipe) => lowerGemPreference(recipe.counts),
      targetCounts,
      deadline,
    });

    // Keep the untoggled outcome exactly. The preference can only choose
    // different recipes when every item rarity count stays the same.
    if (secondary.recipes.length) {
      selectedRecipes = secondary.recipes;
      isOptimal = primary.isOptimal && secondary.isOptimal;
    }
  }

  return makeResult(inventory, goal, selectedRecipes, isOptimal);
}

function solveRecipes({ recipes, available, goal, scoreRecipe, targetCounts, deadline }) {
  const remainingTime = Math.max(1, deadline - Date.now());
  const constraints = { ...available };
  const variables = {};
  const ints = {};

  if (targetCounts) {
    ITEM_RARITIES.forEach(({ id }) => {
      constraints[`rarity_${id}`] = { equal: targetCounts[id] };
    });
  }

  recipes.forEach((recipe) => {
    const variable = `recipe_${recipe.code}`;
    variables[variable] = {
      score: scoreRecipe(recipe),
      ...recipe.counts,
      ...(targetCounts ? { [`rarity_${recipe.rarity}`]: 1 } : {}),
    };
    ints[variable] = 1;
  });

  const startedAt = Date.now();
  const solution = solver.Solve({
    optimize: "score",
    opType: "max",
    constraints,
    variables,
    ints,
    timeout: remainingTime,
  });

  let selectedRecipes = solution.feasible ? recipes
    .map((recipe) => ({ ...recipe, count: Math.max(0, Math.round(solution[`recipe_${recipe.code}`] || 0)) }))
    .filter((recipe) => recipe.count > 0)
    .sort((a, b) => RARITY_BY_ID[b.rarity].rank - RARITY_BY_ID[a.rarity].rank || a.code.localeCompare(b.code)) : [];
  const isOptimal = Boolean(solution.feasible && solution.isIntegral)
    && Date.now() - startedAt < remainingTime - 50;

  if (!selectedRecipes.length || !isFeasibleSelection(selectedRecipes, available)) {
    selectedRecipes = targetCounts ? [] : greedySelection(recipes, available, goal);
  }

  return { recipes: selectedRecipes, isOptimal };
}

function greedySelection(recipes, available, goal) {
  const remaining = Object.fromEntries(GEMS.map((gem) => [gem.id, available[gem.id].max]));
  const selected = [];
  while (true) {
    const candidates = recipes.map((recipe) => {
      const possibleCount = Math.min(...GEMS
        .filter((gem) => recipe.counts[gem.id] > 0)
        .map((gem) => Math.floor(remaining[gem.id] / recipe.counts[gem.id])));
      return { ...recipe, possibleCount };
    }).filter((recipe) => recipe.possibleCount > 0);
    if (!candidates.length) break;

    candidates.sort((a, b) => recipeWeight(b.rarity, goal) - recipeWeight(a.rarity, goal)
      || b.possibleCount - a.possibleCount
      || a.code.localeCompare(b.code));
    const chosen = candidates[0];
    selected.push({ code: chosen.code, rarity: chosen.rarity, count: chosen.possibleCount });
    GEMS.forEach((gem) => {
      remaining[gem.id] -= chosen.count * chosen.counts[gem.id];
    });
  }
  return selected;
}

function isFeasibleSelection(recipes, available) {
  const used = Object.fromEntries(GEMS.map((gem) => [gem.id, 0]));
  recipes.forEach((recipe) => {
    const counts = recipeGemCounts(recipe.code);
    GEMS.forEach((gem) => { used[gem.id] += counts[gem.id] * recipe.count; });
  });
  return GEMS.every((gem) => used[gem.id] <= available[gem.id].max);
}

function makeResult(inventory, goal, selectedRecipes, isOptimal) {
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
    isOptimal,
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
