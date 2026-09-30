/** Recuperación local de pasajes relevantes; devuelve texto solo al backend del asistente. */
export function searchKnowledge(chunks: any[], q: string) {
  const words =
    q
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .match(/[a-z0-9_]{3,}/g) || [];
  const stop = new Set([
    "que",
    "para",
    "como",
    "los",
    "del",
    "una",
    "por",
    "con",
    "esta",
    "este",
    "las",
    "documento",
    "explica",
    "utiliza",
    "tecnica",
    "nota",
    "cambio",
  ]);
  const terms = [...new Set(words.filter((w) => !stop.has(w)))];
  return chunks
    .map((c) => {
      const t = (c.source + " " + c.text)
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "");
      const score = terms.reduce(
        (s, w) =>
          s +
          (t.includes(w)
            ? 1 +
              Math.min((t.match(new RegExp(w, "g")) || []).length, 6) +
              (/^\d+$/.test(w) && c.source.includes("_" + w + "_") ? 30 : 0)
            : 0),
        0,
      );
      return { ...c, score };
    })
    .filter((c) => c.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 8);
}
