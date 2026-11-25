import React, { useMemo, useState } from "react";
import { GEMS, ITEM_RARITIES } from "./data/gems.js";
import {
  CONFIGURED_RECIPE_COUNT,
  MISSING_RECIPES,
  TOTAL_RECIPE_COUNT,
} from "./data/recipes.js";
import { formatRecipe, optimizeInventory } from "./optimizer.js";

const DEFAULT_MAXED = ["rare", "very-rare"];
const GOAL_METHODS = {
  quantity: "Each roll counts equally; the plan maximizes your total number of items.",
  rarity: "Each item is worth its rarity rank (Rare = 1 through Otherworldly = 6); the plan maximizes the combined score.",
  balanced: "Each item adds 1 point for the roll plus its rarity rank, balancing item count with item quality.",
};

function GemIcon({ gem }) {
  if (gem.shape === "heart") {
    return <span className="gem-icon moonstone-icon" aria-hidden="true">♥</span>;
  }
  return (
    <svg className={`gem-icon ${gem.shape}`} viewBox="0 0 64 64" aria-hidden="true">
      <defs>
        <linearGradient id={`gem-${gem.id}`} x1="0" y1="1" x2="1" y2="0">
          <stop stopColor={gem.color} />
          <stop offset=".52" stopColor="white" stopOpacity=".68" />
          <stop offset="1" stopColor={gem.color} />
        </linearGradient>
      </defs>
      <path className="gem-shape" fill={`url(#gem-${gem.id})`} d={gem.shape === "kite"
        ? "M32 4 49 21 42 51 32 60 22 51 15 21Z"
        : gem.shape === "cut"
          ? "M7 13 57 13 49 50 32 60 15 50Z"
          : gem.shape === "square"
            ? "M14 6 50 6 59 16 56 50 48 58 16 58 8 50 5 16Z"
            : "M32 4 52 12 60 32 52 52 32 60 12 52 4 32 12 12Z"} />
      <path className="gem-facet" d="M32 5 32 58 15 21Z" />
      <path className="gem-facet facet-light" d="m32 5 20 7-20 20Z" />
      <path className="gem-facet facet-dark" d="m52 12 8 20-28 0Z" />
      <path className="gem-facet" d="m60 32-8 20-20-20Z" />
      <path className="gem-shine" d="m19 17 10-7-3 15-8 7Z" />
    </svg>
  );
}

function App() {
  const [inventory, setInventory] = useState(Object.fromEntries(GEMS.map((gem) => [gem.id, "0"])));
  const [maxedRarities, setMaxedRarities] = useState(DEFAULT_MAXED);
  const [goal, setGoal] = useState("quantity");
  const [results, setResults] = useState(null);
  const totalGems = useMemo(
    () => Object.values(inventory).reduce((sum, count) => sum + (Number(count) || 0), 0),
    [inventory],
  );

  function toggleRarity(id) {
    setResults(null);
    setMaxedRarities((current) => current.includes(id)
      ? current.filter((rarity) => rarity !== id)
      : [...current, id]);
  }

  function updateCount(id, value) {
    setResults(null);
    const normalized = value === "" ? "" : String(Math.max(0, Math.floor(Number(value) || 0)));
    setInventory((current) => ({ ...current, [id]: normalized }));
  }

  function handleOptimize() {
    setResults(optimizeInventory(inventory, maxedRarities, goal));
  }

  return (
    <div className="shell">
      <header className="topbar">
        <a className="brand" href="#top" aria-label="Gemwise home"><span className="brand-mark">✦</span><span>gemwise</span></a>
        <span className="top-note"><span className="status-dot" />Combination planner</span>
      </header>

      <main id="top">
        <section className="intro">
          <div className="eyebrow"><span />MAKE EVERY GEM COUNT</div>
          <h1>Your gems.<br /><em>Your game plan.</em></h1>
          <p>Tell us what you have, then choose what matters most. We’ll find the smartest way to roll.</p>
        </section>

        <section className="planner" aria-labelledby="inventory-heading">
          <div className="section-heading">
            <div>
              <div className="step-label">01 <span>YOUR INVENTORY</span></div>
              <h2 id="inventory-heading">How many gems do you have?</h2>
              <p className="section-subtitle">Enter a count for each. Leave it at zero if you don’t have any.</p>
            </div>
            <div className="gem-total"><span>{totalGems.toLocaleString()}</span><small>gems total</small></div>
          </div>

          <div className="gem-grid">
            {GEMS.map((gem) => (
              <label className={`gem-card ${gem.id}`} htmlFor={`count-${gem.id}`} key={gem.id}>
                <span className="gem-art"><GemIcon gem={gem} /></span>
                <span className="gem-info"><strong>{gem.name}</strong><small>{gem.rarity}</small></span>
                <span className="count-wrap">
                  <input id={`count-${gem.id}`} type="number" min="0" step="1" inputMode="numeric" value={inventory[gem.id]} onChange={(event) => updateCount(gem.id, event.target.value)} aria-label={`${gem.name} count`} />
                  <span>×</span>
                </span>
              </label>
            ))}
          </div>

          <div className="next-section">
            <div className="step-label">02 <span>ITEMS YOU’VE MAXED</span></div>
            <h2>Skip combinations that give you these</h2>
            <p className="section-subtitle">Select any item rarity you no longer need. Rare and Very rare start selected.</p>
            <div className="rarity-grid" role="group" aria-label="Item rarities already maxed">
              {ITEM_RARITIES.map((rarity) => (
                <label className={`rarity-choice ${maxedRarities.includes(rarity.id) ? "checked" : ""}`} key={rarity.id} style={{ "--rarity-color": rarity.color }}>
                  <input type="checkbox" checked={maxedRarities.includes(rarity.id)} onChange={() => toggleRarity(rarity.id)} />
                  <span className="checkmark" aria-hidden="true">✓</span>
                  <span>{rarity.name}</span>
                </label>
              ))}
            </div>
          </div>

          <div className="next-section priority-section">
            <div className="step-label">03 <span>YOUR PRIORITY</span></div>
            <h2>What do you want more of?</h2>
            <div className="goal-grid" role="radiogroup" aria-label="Optimization priority">
              <label className={`goal-card ${goal === "quantity" ? "selected" : ""}`}>
                <input type="radio" name="goal" value="quantity" checked={goal === "quantity"} onChange={() => { setGoal("quantity"); setResults(null); }} />
                <span className="goal-icon">✳</span><span><strong>More items</strong><small>Maximize roll count</small></span><span className="radio-dot" />
              </label>
              <label className={`goal-card ${goal === "rarity" ? "selected" : ""}`}>
                <input type="radio" name="goal" value="rarity" checked={goal === "rarity"} onChange={() => { setGoal("rarity"); setResults(null); }} />
                <span className="goal-icon sparkle">✦</span><span><strong>Higher rarity</strong><small>Maximize combined rarity score</small></span><span className="radio-dot" />
              </label>
              <label className={`goal-card ${goal === "balanced" ? "selected" : ""}`}>
                <input type="radio" name="goal" value="balanced" checked={goal === "balanced"} onChange={() => { setGoal("balanced"); setResults(null); }} />
                <span className="goal-icon balance">◒</span><span><strong>A little of both</strong><small>Balance roll count and rarity</small></span><span className="radio-dot" />
              </label>
            </div>
            <p className="goal-method">{GOAL_METHODS[goal]}</p>
          </div>

          <div className="action-row">
            <button type="button" onClick={handleOptimize} disabled={MISSING_RECIPES.length > 0}>Find my best combinations <span>↗</span></button>
            <p className="waiting-note"><span>✧</span> {MISSING_RECIPES.length === 0 ? "Combinations are sorted for your selected priority" : "Add the remaining recipe outcomes to enable recommendations"}</p>
          </div>

          <aside className="setup-note">
            <span className="note-icon">i</span>
            <p><strong>{MISSING_RECIPES.length === 0 ? "All recipe outcomes are mapped" : "Recipe data is still incomplete"}</strong><br />{CONFIGURED_RECIPE_COUNT} of {TOTAL_RECIPE_COUNT} possible combinations are entered.{MISSING_RECIPES.length > 0 ? ` The ${MISSING_RECIPES.length} unknown outcomes are listed below.` : " Recommendations will skip the item rarities you’ve maxed."}</p>
            <span className="note-sparkle">✦</span>
          </aside>

          {MISSING_RECIPES.length > 0 && <details className="missing-recipes">
            <summary>Still needed: {MISSING_RECIPES.length} combinations</summary>
            <p>Tell me which item rarity each combination produces. Digits are gem values in ascending order; order does not matter.</p>
            <div className="missing-code-list">{MISSING_RECIPES.map((code) => <code key={code}>{code}</code>)}</div>
          </details>}

          {results && <section className="results-panel" aria-live="polite" aria-labelledby="results-heading">
            <div className="results-heading">
              <div><div className="step-label">04 <span>YOUR PLAN</span></div><h2 id="results-heading">{results.status === "success" && results.itemCount > 0 ? "Best gem combinations" : "No usable rolls found"}</h2></div>
              {results.status === "success" && results.itemCount > 0 && <span className="result-count">{results.itemCount} {results.itemCount === 1 ? "item" : "items"}</span>}
            </div>
            {results.status === "no-recipes" ? <p className="empty-results">Every item rarity is marked as maxed, so there are no eligible recipes. Unselect a rarity to see combinations.</p>
              : results.status === "no-solution" || results.itemCount === 0 ? <p className="empty-results">There aren’t enough gems in your inventory for any non-maxed combination.</p>
                : <>
                  <p className="results-summary">Uses {results.totalUsed} gems and leaves {Object.values(results.leftover).reduce((sum, value) => sum + value, 0)} unused.</p>
                  <div className="rarity-totals">{ITEM_RARITIES.filter((rarity) => results.itemsByRarity[rarity.id] > 0).map((rarity) => <span key={rarity.id} style={{ "--rarity-color": rarity.color }}><strong>{results.itemsByRarity[rarity.id]}</strong> {rarity.name}</span>)}</div>
                  <div className="recipe-results">{results.recipes.map((recipe) => <div className="recipe-result" key={recipe.code}>
                    <span className="recipe-combo">{formatRecipe(recipe.code)}</span>
                    <span className="recipe-arrow">→</span>
                    <span className="recipe-outcome" style={{ "--rarity-color": ITEM_RARITIES.find((rarity) => rarity.id === recipe.rarity).color }}>{ITEM_RARITIES.find((rarity) => rarity.id === recipe.rarity).name}</span>
                    <strong className="recipe-times">× {recipe.count}</strong>
                  </div>)}</div>
                  <details className="leftover-details"><summary>Unused gems</summary><p>{GEMS.filter((gem) => results.leftover[gem.id] > 0).map((gem) => `${gem.name}: ${results.leftover[gem.id]}`).join(" · ") || "None"}</p></details>
                </>}
          </section>}
        </section>
        <footer>Made for better rolls <span>✦</span></footer>
      </main>
    </div>
  );
}

export default App;
