import type { IngredientItem, Recipe } from '@/lib/schema';

const macroHints: Array<{
  keywords: string[];
  per100: Pick<IngredientItem, 'kcal' | 'protein' | 'carbs' | 'fats'>;
}> = [
  { keywords: ['pollo', 'pechuga'], per100: { kcal: 165, protein: 31, carbs: 0, fats: 4 } },
  { keywords: ['arroz'], per100: { kcal: 130, protein: 3, carbs: 28, fats: 0 } },
  { keywords: ['avena'], per100: { kcal: 389, protein: 17, carbs: 66, fats: 7 } },
  { keywords: ['huevo'], per100: { kcal: 155, protein: 13, carbs: 1, fats: 11 } },
  { keywords: ['atun', 'atún'], per100: { kcal: 130, protein: 29, carbs: 0, fats: 1 } },
  { keywords: ['yogur'], per100: { kcal: 63, protein: 5, carbs: 7, fats: 2 } },
  { keywords: ['platano', 'plátano', 'banana'], per100: { kcal: 89, protein: 1, carbs: 23, fats: 0 } },
];

function estimateIngredientMacros(name: string, amount: number) {
  const normalized = name.toLowerCase();
  const hint = macroHints.find((item) => item.keywords.some((keyword) => normalized.includes(keyword)));
  if (!hint) {
    return { kcal: 0, protein: 0, carbs: 0, fats: 0 };
  }

  const ratio = Math.max(amount, 1) / 100;
  return {
    kcal: Math.round(hint.per100.kcal * ratio),
    protein: Math.round(hint.per100.protein * ratio),
    carbs: Math.round(hint.per100.carbs * ratio),
    fats: Math.round(hint.per100.fats * ratio),
  };
}

export function parseRecipeTextFallback(input: string): Recipe | null {
  const cleaned = input.trim();
  if (!cleaned) {
    return null;
  }

  const parts = cleaned
    .split(/,| y | con /i)
    .map((part) => part.trim())
    .filter(Boolean);

  const ingredients: IngredientItem[] = parts
    .map((part) => {
      const match = part.match(/(?:(\d+(?:[.,]\d+)?)\s*(g|gr|gramos|ml|unidad|unidades))?\s*(.+)/i);
      if (!match) {
        return null;
      }

      const amount = match[1] ? Math.round(Number(match[1].replace(',', '.'))) : 1;
      const rawUnit = match[2]?.toLowerCase() ?? 'unidad';
      const unit = rawUnit === 'gr' || rawUnit === 'gramos' ? 'g' : rawUnit;
      const name = match[3]?.trim();

      if (!name) {
        return null;
      }

      const estimatedAmount = unit === 'unidad' || unit === 'unidades' ? amount * 100 : amount;
      return {
        name,
        amount,
        unit,
        ...estimateIngredientMacros(name, estimatedAmount),
      } satisfies IngredientItem;
    })
    .filter((ingredient): ingredient is IngredientItem => Boolean(ingredient));

  if (ingredients.length === 0) {
    return null;
  }

  const totals = ingredients.reduce(
    (acc, ingredient) => ({
      kcal: acc.kcal + ingredient.kcal,
      protein: acc.protein + ingredient.protein,
      carbs: acc.carbs + ingredient.carbs,
      fats: acc.fats + ingredient.fats,
    }),
    { kcal: 0, protein: 0, carbs: 0, fats: 0 }
  );

  return {
    name: cleaned.length > 42 ? `${cleaned.slice(0, 39)}...` : cleaned,
    ingredients_json: ingredients,
    instructions: 'Preparación rápida: reúne los ingredientes, cocínalos en el orden habitual y ajusta la textura al gusto.',
    total_kcal: totals.kcal,
    total_protein: totals.protein,
    total_carbs: totals.carbs,
    total_fats: totals.fats,
  };
}
