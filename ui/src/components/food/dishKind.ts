export type DishKind = 'dumplings' | 'noodles' | 'tofu' | 'dimsum' | 'soup' | 'rice' | 'wonton';

const kinds: DishKind[] = ['dumplings', 'noodles', 'tofu', 'dimsum', 'soup', 'rice', 'wonton'];

const keywords: Array<[RegExp, DishKind]> = [
  [/dumpling|jiaozi|guotie/, 'dumplings'],
  [/noodle|mein|chow fun|ramen/, 'noodles'],
  [/tofu/, 'tofu'],
  [/bao|dim sum|har gow|siu mai|bun/, 'dimsum'],
  [/soup|hot ?pot/, 'soup'],
  [/rice/, 'rice'],
  [/wonton|pancake/, 'wonton'],
];

// dishKind picks the placeholder art for a dish name: by keyword when it matches,
// otherwise a stable pick derived from the name so the same dish always looks the same.
export function dishKind(name: string): DishKind {
  const lower = name.toLowerCase();
  const match = keywords.find(([pattern]) => pattern.test(lower));
  if (match) return match[1];

  const hash = [...lower].reduce((sum, char) => sum + char.charCodeAt(0), 0);
  return kinds[hash % kinds.length];
}
