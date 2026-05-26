/** Devuelve dos strings en orden lexicográfico estable, sin mutar arrays. */
export function lexicographicPair<T extends string>(a: T, b: T): [T, T] {
  return a.localeCompare(b) <= 0 ? [a, b] : [b, a];
}

/** Clave estable para comparar listas de IDs (copia antes de ordenar). */
export function lexicographicKey(values: readonly string[], separator = ','): string {
  return [...values].sort((left, right) => left.localeCompare(right)).join(separator);
}
