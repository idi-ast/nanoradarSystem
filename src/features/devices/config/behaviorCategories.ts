/** Stable classifier keys: changing a display name must never split learned prototypes. */
export const BEHAVIOR_ORDER = ['lancha', 'bolla', 'ola', 'pajaro', 'sin_clasificar', 'persona', 'vehiculo', 'animal', 'dron', 'otro'];
const aliases: Record<string, string> = {
  boat: 'lancha', barco: 'lancha', embarcacion: 'lancha', embarcaciones: 'lancha',
  boya: 'bolla', buoy: 'bolla', ave: 'pajaro', aves: 'pajaro', bird: 'pajaro',
  wave: 'ola', human: 'persona', vehicle: 'vehiculo', drone: 'dron', other: 'otro',
  unclassified: 'sin_clasificar', unknown: 'sin_clasificar', desconocido: 'sin_clasificar',
  neutral: 'sin_clasificar', none: 'sin_clasificar', null: 'sin_clasificar', undefined: 'sin_clasificar',
};
export function behaviorKey(value?: string | null): string {
  const key = (value ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim().toLowerCase().replace(/[\s-]+/g, '_');
  return aliases[key] ?? (key || 'sin_clasificar');
}
export function behaviorLabel(value?: string | null): string {
  const key = behaviorKey(value);
  const labels: Record<string, string> = { lancha: 'Embarcación', bolla: 'Boya', ola: 'Ola', pajaro: 'Aves', sin_clasificar: 'Sin clasificar', persona: 'Persona', vehiculo: 'Vehículo', animal: 'Animal', dron: 'Dron', otro: 'Otro' };
  return labels[key] ?? key.charAt(0).toUpperCase() + key.slice(1).replace(/_/g, ' ');
}
export function behaviorCriticality(value?: string | null): 'Alta' | 'Menor' | null {
  const key = behaviorKey(value);
  return ['lancha', 'bolla'].includes(key) ? 'Alta' : ['ola', 'pajaro'].includes(key) ? 'Menor' : null;
}
export function orderedBehaviorKeys(values: string[]): string[] {
  return [...new Set(values.map(behaviorKey))].sort((a, b) => {
    const ai = BEHAVIOR_ORDER.indexOf(a), bi = BEHAVIOR_ORDER.indexOf(b);
    return (ai < 0 ? 100 : ai) - (bi < 0 ? 100 : bi) || a.localeCompare(b, 'es');
  });
}
export type BehaviorVisibility = Record<string, boolean>;
export function isBehaviorVisible(value: string | null | undefined, visibility: BehaviorVisibility): boolean {
  const key = behaviorKey(value);
  return visibility[key] ?? BEHAVIOR_ORDER.slice(0, 5).includes(key);
}
/** Unclassified radar tracks can still carry a coarse native category. */
export function targetBehaviorKey(target: { behaviorClass?: string; category?: string }): string {
  return behaviorKey(target.behaviorClass || target.category);
}

/** 3D assets exist only for these classes. Zone/default icons cannot classify a track. */
export function behaviorModelCategory(value?: string | null, confidence = 0): number | null {
  if (confidence < 0.6) return null;
  const models: Record<string, number> = { lancha: 2, persona: 1, vehiculo: 3, animal: 4, dron: 5 };
  return models[behaviorKey(value)] ?? null;
}
