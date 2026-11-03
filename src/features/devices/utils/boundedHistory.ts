/** Copia solo los puntos que se conservarán, sin concatenaciones temporales grandes. */
export function appendBoundedHistory<T>(previous: T[], incoming: T[], limit: number): T[] {
  const max = Math.max(1, Math.floor(limit));
  const incomingStart = Math.max(0, incoming.length - max);
  const keptIncoming = incoming.length - incomingStart;
  const previousStart = Math.max(0, previous.length - (max - keptIncoming));
  const result = previous.slice(previousStart);
  for (let i = incomingStart; i < incoming.length; i++) result.push(incoming[i]);
  return result;
}
