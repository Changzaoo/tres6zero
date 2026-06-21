// Barrel de todos os módulos de efeito do motor. Cada efeito novo é importado
// aqui e adicionado ao array `fxModules`, que alimenta o registro.

import type { FxModule } from '../types';
import { auraEnergyFx } from './auraEnergy';
import { rimNeonFx } from './rimNeon';
import { speedClonesFx } from './speedClones';
import { ghostEchoFx } from './ghostEcho';
import { lightTrailsFx } from './lightTrails';
import { freezeBackgroundFx } from './freezeBackground';
import { backgroundFocusFx } from './backgroundFocus';
import { backgroundReplaceFx } from './backgroundReplace';
import { particleDissolveFx } from './particleDissolve';
import { portalFx } from './portal';
import { ambientParticlesFx } from './ambientParticles';
import { lightLeaksFx } from './lightLeaks';
import { godRaysFx } from './godRays';
import { glitchVhsFx } from './glitchVhs';
import { beatPulseFx } from './beatPulse';

export const fxModules: FxModule[] = [
  auraEnergyFx as FxModule,
  rimNeonFx as FxModule,
  speedClonesFx as FxModule,
  ghostEchoFx as FxModule,
  lightTrailsFx as FxModule,
  freezeBackgroundFx as FxModule,
  backgroundFocusFx as FxModule,
  backgroundReplaceFx as FxModule,
  particleDissolveFx as FxModule,
  portalFx as FxModule,
  ambientParticlesFx as FxModule,
  lightLeaksFx as FxModule,
  godRaysFx as FxModule,
  glitchVhsFx as FxModule,
  beatPulseFx as FxModule,
];
