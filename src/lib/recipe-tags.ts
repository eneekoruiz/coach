import type { Recipe } from '@/lib/schema';

function includesAny(text: string, words: string[]) {
  return words.some((word) => text.includes(word));
}

export function deriveRecipeTags(recipe: Pick<Recipe, 'name' | 'instructions' | 'ingredients_json' | 'total_protein' | 'total_kcal'>) {
  const source = [
    recipe.name,
    recipe.instructions,
    ...recipe.ingredients_json.map((ingredient) => ingredient.name),
  ]
    .join(' ')
    .toLowerCase();

  const tags = new Set<string>();

  if (recipe.total_protein >= 25) tags.add('Alto en Proteína');
  if (recipe.total_kcal <= 450) tags.add('Cena Ligera');
  if (includesAny(source, ['batido', 'avena', 'huevos', 'tostada', 'café', 'yogur'])) tags.add('Desayuno');
  if (includesAny(source, ['pollo', 'arroz', 'pasta', 'carne', 'ternera', 'salmón'])) tags.add('Comida Fuerte');
  if (includesAny(source, ['ensalada', 'verdura', 'crema', 'pescado'])) tags.add('Cena Ligera');
  if (includesAny(source, ['whey', 'plátano', 'banana', 'yogur griego', 'proteína'])) tags.add('Post-Entreno');
  if (includesAny(source, ['horno', 'saltear', 'mezcla', 'monta', 'sirve'])) tags.add('Preparación Clara');
  if (recipe.ingredients_json.length <= 4) tags.add('Pocos Ingredientes');
  if (recipe.instructions.length > 0 && recipe.instructions.length <= 120) tags.add('Menos de 15 min');

  return Array.from(tags);
}
