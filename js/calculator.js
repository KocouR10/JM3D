// Čistá cenová logika kalkulačky — žádná DOM závislost (testuje se přes node --test).

import { PRICING } from './config.js';

export function infillFactor(infillPct, config) {
  return config.shellFactor + (infillPct / 100) * (1 - config.shellFactor);
}

export function estimateGrams(volumeCm3, material, infillPct, pieces, config) {
  return volumeCm3 * config.density[material] * infillFactor(infillPct, config) * pieces;
}

export function estimateHours(bboxZMm, volumeCm3, pieces, config) {
  const secondsPerPiece =
    (bboxZMm / config.layerHeight) * config.secondsPerLayer +
    volumeCm3 * config.secondsPerCm3;
  return (secondsPerPiece * pieces) / 3600;
}

export function validateInputs(input) {
  const { volumeCm3, bboxZMm, material, infillPct, pieces, postProcessing } = input;
  if (!Number.isFinite(volumeCm3) || volumeCm3 <= 0) {
    return 'Objem modelu musí být kladné číslo.';
  }
  if (!Number.isFinite(bboxZMm) || bboxZMm <= 0) {
    return 'Výška modelu musí být kladné číslo.';
  }
  if (!(material in PRICING.density)) {
    return 'Neznámý materiál.';
  }
  if (!Number.isFinite(infillPct) || infillPct < 0 || infillPct > 100) {
    return 'Výplň musí být v rozsahu 0–100 %.';
  }
  if (!Number.isInteger(pieces) || pieces < 1) {
    return 'Počet kusů musí být celé číslo alespoň 1.';
  }
  if (!(postProcessing in PRICING.postProcessing)) {
    return 'Neznámá povrchová úprava.';
  }
  return null;
}

export function calculatePrice(input, config) {
  const error = validateInputs(input);
  if (error) throw new Error(error);

  const { volumeCm3, bboxZMm, material, infillPct, pieces, postProcessing } = input;
  const grams = estimateGrams(volumeCm3, material, infillPct, pieces, config);
  const hours = estimateHours(bboxZMm, volumeCm3, pieces, config);
  const materialCost = grams * config.pricePerGram[material];
  const timeCost = hours * config.hourRate;
  const finishing = config.postProcessing[postProcessing] * pieces;
  const price = Math.ceil(Math.max(config.minOrder, materialCost + timeCost + finishing));
  return { grams, hours, materialCost, timeCost, finishing, price };
}
