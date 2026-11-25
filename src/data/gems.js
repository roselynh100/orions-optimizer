import { GEM_COLORS } from "../constants/gemColors.js";

export const GEMS = [
  { id: "sapphire", name: "Sapphire", rarity: "Rare", tier: 1, color: GEM_COLORS.sapphire, shape: "kite" },
  { id: "ruby", name: "Ruby", rarity: "Very rare", tier: 2, color: GEM_COLORS.ruby, shape: "cut" },
  { id: "emerald", name: "Emerald", rarity: "Ultra rare", tier: 3, color: GEM_COLORS.emerald, shape: "square" },
  { id: "diamond", name: "Diamond", rarity: "Legendary", tier: 4, color: GEM_COLORS.diamond, shape: "round" },
  { id: "black-diamond", name: "Black diamond", rarity: "Mythical", tier: 5, color: GEM_COLORS["black-diamond"], shape: "round" },
  { id: "moonstone", name: "Moonstone", rarity: "Otherworldly", tier: 6, color: GEM_COLORS.moonstone, shape: "heart" },
];

export const ITEM_RARITIES = [
  { id: "rare", name: "Rare", rank: 1, color: GEM_COLORS.sapphire },
  { id: "very-rare", name: "Very rare", rank: 2, color: GEM_COLORS.ruby },
  { id: "ultra-rare", name: "Ultra rare", rank: 3, color: GEM_COLORS.emerald },
  { id: "legendary", name: "Legendary", rank: 4, color: GEM_COLORS.diamond },
  { id: "mythical", name: "Mythical", rank: 5, color: GEM_COLORS["black-diamond"] },
  { id: "otherworldly", name: "Otherworldly", rank: 6, color: GEM_COLORS.moonstone },
];
