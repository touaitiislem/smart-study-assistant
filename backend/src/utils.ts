/** Parse du JSON même si le modèle l'a entouré de ```json ou de texte. */
export function extractJson(text: string): unknown {
  const t = text.trim();
  try { return JSON.parse(t); } catch {}
  const fenced = t.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (fenced) { try { return JSON.parse(fenced[1]); } catch {} }
  const start = t.indexOf('{');
  const end = t.lastIndexOf('}');
  if (start >= 0 && end > start) return JSON.parse(t.slice(start, end + 1));
  throw new Error('JSON introuvable');
}

export function clip(text: string, max: number): string {
  return text.length > max ? text.slice(0, max) + '\n[… texte tronqué]' : text;
}
