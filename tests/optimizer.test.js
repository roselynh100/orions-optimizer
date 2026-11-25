import test from "node:test";
import assert from "node:assert/strict";
import { optimizeInventory } from "../src/optimizer.js";
import { ITEM_RARITIES } from "../src/data/gems.js";

const zeroInventory = () => ({
  sapphire: 0,
  ruby: 0,
  emerald: 0,
  diamond: 0,
  "black-diamond": 0,
  moonstone: 0,
});

test("2 sapphires and 3 rubies make one item at most", () => {
  const inventory = { ...zeroInventory(), sapphire: 2, ruby: 3 };
  const result = optimizeInventory(inventory, [], "quantity");

  assert.equal(result.status, "success");
  assert.equal(result.itemCount, 1);
  assert.equal(result.isOptimal, true);
});

test("more-items priority breaks a roll-count tie toward the higher item rarity by default", () => {
  const inventory = { ...zeroInventory(), sapphire: 2, ruby: 3 };
  const result = optimizeInventory(inventory, [], "quantity");

  assert.equal(result.itemCount, 1);
  assert.deepEqual(result.recipes.map(({ code, rarity }) => ({ code, rarity })), [
    { code: "222", rarity: "very-rare" },
  ]);
});

test("lower-gem preference does not change the output rarity", () => {
  const inventory = { ...zeroInventory(), sapphire: 2, ruby: 3 };
  const withoutPreference = optimizeInventory(inventory, [], "quantity");
  const result = optimizeInventory(inventory, [], "quantity", true);

  assert.equal(result.itemCount, 1);
  assert.deepEqual(result.itemsByRarity, withoutPreference.itemsByRarity);
  assert.equal(result.itemsByRarity["very-rare"], 1);
});

test("lower-gem preference chooses a lower-tier recipe with the same output rarity", () => {
  const inventory = { ...zeroInventory(), sapphire: 1, ruby: 2, moonstone: 1 };
  const withoutPreference = optimizeInventory(inventory, [], "quantity");
  const result = optimizeInventory(inventory, [], "quantity", true);

  assert.deepEqual(result.itemsByRarity, withoutPreference.itemsByRarity);
  assert.deepEqual(result.recipes.map(({ code, count }) => ({ code, count })), [
    { code: "126", count: 1 },
  ]);
});

test("higher-rarity priority keeps 222 even when lower-gem preference is on", () => {
  const inventory = { ...zeroInventory(), sapphire: 2, ruby: 3 };
  const result = optimizeInventory(inventory, [], "rarity", true);

  assert.equal(result.itemCount, 1);
  assert.deepEqual(result.recipes.map(({ code, rarity }) => ({ code, rarity })), [
    { code: "222", rarity: "very-rare" },
  ]);
});

test("the 24, 12, 6, 2, 9, 4 inventory yields 14 ultra-rare items when rare tiers are skipped", () => {
  const inventory = {
    sapphire: 24,
    ruby: 12,
    emerald: 6,
    diamond: 2,
    "black-diamond": 9,
    moonstone: 4,
  };
  const maxed = ["rare", "very-rare"];

  for (const goal of ["quantity", "rarity", "balanced"]) {
    const result = optimizeInventory(inventory, maxed, goal, true);
    assert.equal(result.status, "success", goal);
    assert.equal(result.itemCount, 14, goal);
    assert.equal(result.itemsByRarity["ultra-rare"], 14, goal);
    for (const rarity of ITEM_RARITIES) {
      if (maxed.includes(rarity.id)) assert.equal(result.itemsByRarity[rarity.id], 0, `${goal}: ${rarity.id}`);
    }
    for (const [gem, used] of Object.entries(result.used)) {
      assert.ok(used <= inventory[gem], `${goal}: used too many ${gem}s`);
    }
  }
});

test("optimizer reports no result when fewer than three usable gems remain", () => {
  const inventory = { ...zeroInventory(), sapphire: 2, ruby: 0 };
  assert.equal(optimizeInventory(inventory, [], "quantity").status, "no-solution");
});

test("optimizer reports no recipes when every item rarity is skipped", () => {
  const inventory = { ...zeroInventory(), sapphire: 5, ruby: 5, emerald: 5 };
  assert.equal(
    optimizeInventory(inventory, ITEM_RARITIES.map(({ id }) => id), "quantity").status,
    "no-recipes",
  );
});

test("four diamonds produce one legendary when rare tiers and ultra rare are skipped", () => {
  const inventory = { ...zeroInventory(), diamond: 4 };
  const result = optimizeInventory(inventory, ["rare", "very-rare", "ultra-rare"], "quantity");

  assert.equal(result.status, "success");
  assert.equal(result.itemCount, 1);
  assert.equal(result.itemsByRarity.legendary, 1);
  assert.deepEqual(result.recipes.map(({ code, count }) => ({ code, count })), [
    { code: "444", count: 1 },
  ]);
});
