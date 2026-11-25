import React, { useEffect, useMemo, useRef, useState } from "react";
import { GEMS, ITEM_RARITIES } from "./data/gems.js";
import { MISSING_RECIPES } from "./data/recipes.js";
import { formatRecipe, optimizeInventory } from "./optimizer.js";

function GemIcon({ gem }) {
  return <img className="gem-icon" src={gem.image} alt="" aria-hidden="true" draggable="false" />;
}

function App() {
  const [inventory, setInventory] = useState(Object.fromEntries(GEMS.map((gem) => [gem.id, "0"])));
  const [maxedRarities, setMaxedRarities] = useState([]);
  const [goal, setGoal] = useState("quantity");
  const [preferLowerGems, setPreferLowerGems] = useState(false);
  const [results, setResults] = useState(null);
  const [isOptimizing, setIsOptimizing] = useState(false);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [optimizationError, setOptimizationError] = useState("");
  const workerRef = useRef(null);
  const timerRef = useRef(null);
  const totalGems = useMemo(
    () => Object.values(inventory).reduce((sum, count) => sum + (Number(count) || 0), 0),
    [inventory],
  );

  useEffect(() => () => {
    workerRef.current?.terminate();
    if (timerRef.current) window.clearInterval(timerRef.current);
  }, []);

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
    if (isOptimizing || MISSING_RECIPES.length > 0) return;
    setResults(null);
    setOptimizationError("");
    setElapsedSeconds(0);
    setIsOptimizing(true);

    const startedAt = Date.now();
    let worker;
    try {
      worker = new Worker(new URL("./optimizer.worker.js", import.meta.url), { type: "module" });
    } catch (error) {
      setIsOptimizing(false);
      setOptimizationError(error instanceof Error ? error.message : "The optimizer could not start.");
      return;
    }
    workerRef.current = worker;
    timerRef.current = window.setInterval(() => {
      setElapsedSeconds(Math.floor((Date.now() - startedAt) / 1000));
    }, 250);

    const finish = () => {
      if (timerRef.current) window.clearInterval(timerRef.current);
      timerRef.current = null;
      worker.terminate();
      workerRef.current = null;
      setIsOptimizing(false);
    };

    worker.onmessage = ({ data }) => {
      finish();
      if (data.type === "error") setOptimizationError(data.message);
      else setResults(data.result);
    };
    worker.onerror = (event) => {
      finish();
      setOptimizationError(event.message || "The optimizer could not complete.");
    };
    worker.postMessage({ inventory, maxedRarities, goal, preferLowerGems });
  }

  return (
    <div className="shell">
      <main id="top">
        <h1 className="page-title">Orion Optimizer</h1>

        <section className="planner" aria-labelledby="inventory-heading" aria-busy={isOptimizing}>
          <div className="section-heading">
            <div>
              <h2 id="inventory-heading">How many gems do you have?</h2>
            </div>
            <div className="gem-total"><span>{totalGems.toLocaleString()}</span><small>gems total</small></div>
          </div>

          <div className="gem-grid">
            {GEMS.map((gem) => (
              <label className={`gem-card ${gem.id}`} htmlFor={`count-${gem.id}`} key={gem.id} style={{ "--gem": gem.color }} onClick={(event) => {
                const input = event.currentTarget.querySelector("input");
                input?.focus();
                input?.select();
              }}>
                <span className="gem-art"><GemIcon gem={gem} /></span>
                <span className="gem-info"><strong>{gem.name}</strong><small>{gem.rarity}</small></span>
                <span className="count-wrap">
                  <input id={`count-${gem.id}`} type="number" min="0" step="1" inputMode="numeric" value={inventory[gem.id]} onChange={(event) => updateCount(gem.id, event.target.value)} onFocus={(event) => event.currentTarget.select()} aria-label={`${gem.name} count`} disabled={isOptimizing} />
                  <span>×</span>
                </span>
              </label>
            ))}
          </div>

          <div className="next-section">
            <h2>Skip combinations that give you these</h2>
            <div className="rarity-grid" role="group" aria-label="Item rarities already maxed">
              {ITEM_RARITIES.map((rarity) => (
                <label className={`rarity-choice ${maxedRarities.includes(rarity.id) ? "checked" : ""}`} key={rarity.id} style={{ "--rarity-color": rarity.color }}>
                  <input type="checkbox" checked={maxedRarities.includes(rarity.id)} onChange={() => toggleRarity(rarity.id)} disabled={isOptimizing} />
                  <span className="checkmark" aria-hidden="true">✓</span>
                  <span>{rarity.name}</span>
                </label>
              ))}
            </div>
          </div>

          <div className="next-section priority-section">
            <h2>What do you want more of?</h2>
            <div className="goal-grid" role="radiogroup" aria-label="Optimization priority">
              <label className={`goal-card ${goal === "quantity" ? "selected" : ""}`}>
                <input type="radio" name="goal" value="quantity" checked={goal === "quantity"} onChange={() => { setGoal("quantity"); setResults(null); }} disabled={isOptimizing} />
                <span className="goal-icon">✳</span><span><strong>More items</strong><small>Maximize roll count</small></span><span className="radio-dot" />
              </label>
              <label className={`goal-card ${goal === "rarity" ? "selected" : ""}`}>
                <input type="radio" name="goal" value="rarity" checked={goal === "rarity"} onChange={() => { setGoal("rarity"); setResults(null); }} disabled={isOptimizing} />
                <span className="goal-icon sparkle">✦</span><span><strong>Higher rarity</strong><small>Maximize combined rarity score</small></span><span className="radio-dot" />
              </label>
              <label className={`goal-card ${goal === "balanced" ? "selected" : ""}`}>
                <input type="radio" name="goal" value="balanced" checked={goal === "balanced"} onChange={() => { setGoal("balanced"); setResults(null); }} disabled={isOptimizing} />
                <span className="goal-icon balance">◒</span><span><strong>A little of both</strong><small>Balance roll count and rarity</small></span><span className="radio-dot" />
              </label>
            </div>
            <div className="preference-control">
              <label className="preference-toggle">
                <input type="checkbox" checked={preferLowerGems} onChange={(event) => { setPreferLowerGems(event.target.checked); setResults(null); }} disabled={isOptimizing} />
                <span className="toggle-track" aria-hidden="true"><span /></span>
                <span>Use up less rare gems first</span>
              </label>
              <small>Keeps the same rarity results; prefers combinations that use lower rarity gems</small>
            </div>
          </div>

          <div className="action-row">
            <button type="button" onClick={handleOptimize} disabled={isOptimizing || MISSING_RECIPES.length > 0}>
              {isOptimizing ? <>Optimizing… <span className="spinner button-spinner" aria-hidden="true" /></> : <>Find my best combinations <span className="button-icon" aria-hidden="true">✦</span></>}
            </button>
          </div>

          {isOptimizing && <div className="progress-status" role="status" aria-live="polite">
            <span className="spinner" aria-hidden="true" />
            <span>Searching gem combinations</span>
            <span className="elapsed-time">{elapsedSeconds}s</span>
          </div>}
          {optimizationError && <p className="optimizer-error" role="alert">{optimizationError}</p>}

          {results && <section className="results-panel" aria-live="polite" aria-labelledby="results-heading">
            <div className="results-heading">
              <div><h2 id="results-heading">{results.status === "success" && results.itemCount > 0 ? (results.isOptimal ? "Best gem combinations" : "Gem combination plan") : "No usable rolls found"}</h2></div>
              {results.status === "success" && results.itemCount > 0 && <span className="result-count">{results.itemCount} {results.itemCount === 1 ? "item" : "items"}</span>}
            </div>
            {results.status === "success" && !results.isOptimal && <p className="results-summary">Time limit reached. This is the best valid plan found so far.</p>}
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
      </main>
    </div>
  );
}

export default App;
