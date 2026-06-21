// Registro id → FxModule. O renderer consulta `isEngineEffect`/`getFxModule`
// para decidir se um efeito é tratado pelo motor novo ou pelo caminho legado.

import type { FxModule } from './types';
import { fxModules } from './fx';

const registry = new Map<string, FxModule>(fxModules.map((module) => [module.id, module]));

export function getFxModule(id: string): FxModule | null {
  return registry.get(id) ?? null;
}

export function isEngineEffect(id: string | undefined | null): boolean {
  return Boolean(id && registry.has(id));
}

export function engineEffectIds(): string[] {
  return Array.from(registry.keys());
}
