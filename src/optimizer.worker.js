import { optimizeInventory } from "./optimizer.js";

self.onmessage = ({ data }) => {
  try {
    const result = optimizeInventory(data.inventory, data.maxedRarities, data.goal, data.preferLowerGems);
    self.postMessage({ type: "complete", result });
  } catch (error) {
    console.error("Optimizer failed:", error);
    self.postMessage({
      type: "error",
      message: "Something went wrong while finding combinations. Please try again.",
    });
  }
};
