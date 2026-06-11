import { useRef } from 'react';
import {
  motion,
  useMotionValue,
  useReducedMotion,
  useSpring,
  useTransform,
  type Variants,
} from 'framer-motion';

/**
 * Cena animada da tela de login: quatro personagens abstratos vivos.
 * Puramente visual — nenhuma logica de autenticacao aqui.
 *
 * mood:
 * - idle: loops normais de respiracao/balanco
 * - focus: personagens "olham" para o formulario (usuario focou um input)
 * - error: shake curto e discreto na cena
 * - success: reacao positiva breve (subida/inclinacao)
 */
export type CharacterMood = 'idle' | 'focus' | 'error' | 'success';

type AnimatedLoginCharactersProps = {
  mood?: CharacterMood;
};

// Paleta alinhada a identidade SIX3 (tailwind.config: brand/surface)
const graphite = '#2a3142';
const brandBlue = '#3b6dff'; // brand-500
const brandViolet = '#8b5cf6'; // violeta do gradient-brand
const brandSky = '#8fb0ff'; // brand-300

const easePremium: [number, number, number, number] = [0.16, 1, 0.3, 1];

const sceneContainer: Variants = {
  hidden: {},
  // Sequencia de entrada: azul -> violeta -> grafite -> claro -> detalhes
  visible: { transition: { staggerChildren: 0.1, delayChildren: 0.15 } },
};

const enterBlue: Variants = {
  hidden: { opacity: 0, y: 34, scale: 0.92 },
  visible: { opacity: 1, y: 0, scale: 1, transition: { duration: 0.75, ease: easePremium } },
};

// Violeta entra subindo com rotacao sutil, como se estivesse "se ajeitando"
const enterViolet: Variants = {
  hidden: { opacity: 0, y: 42, scale: 0.88, rotate: -6 },
  visible: { opacity: 1, y: 0, scale: 1, rotate: 0, transition: { duration: 0.9, ease: easePremium } },
};

const enterGraphite: Variants = {
  hidden: { opacity: 0, y: 20, scale: 0.92 },
  visible: { opacity: 1, y: 0, scale: 1, transition: { duration: 0.75, ease: easePremium } },
};

// Forma clara entra vindo da direita
const enterSky: Variants = {
  hidden: { opacity: 0, x: 34, scale: 0.94 },
  visible: { opacity: 1, x: 0, scale: 1, transition: { duration: 0.8, ease: easePremium } },
};

const enterDetail: Variants = {
  hidden: { opacity: 0, y: 10 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: easePremium } },
};

const moodTransition = { duration: 0.45, ease: easePremium };

// Reacoes por humor — sempre sutis, sem roubar atencao do formulario
const moodBlue: Variants = {
  idle: { x: 0, y: 0, transition: moodTransition },
  focus: { x: 1, y: -2, transition: moodTransition },
  error: { x: 0, y: 0, transition: moodTransition },
  success: { x: 0, y: -4, transition: moodTransition },
};

const moodViolet: Variants = {
  idle: { x: 0, y: 0, rotate: 0, transition: moodTransition },
  // Inclina levemente em direcao ao formulario (a direita)
  focus: { x: 5, y: 0, rotate: 4, transition: moodTransition },
  error: { x: 0, y: 0, rotate: 0, transition: moodTransition },
  success: { x: 0, y: -6, rotate: -3, transition: moodTransition },
};

const moodGraphite: Variants = {
  idle: { x: 0, y: 0, transition: moodTransition },
  focus: { x: 2, y: 0, transition: moodTransition },
  error: { x: 0, y: 0, transition: moodTransition },
  success: { x: 0, y: -3, transition: moodTransition },
};

const moodSky: Variants = {
  idle: { x: 0, y: 0, transition: moodTransition },
  focus: { x: 0, y: -2, transition: moodTransition },
  error: { x: [0, -3, 3, 0], y: 0, transition: { duration: 0.4, ease: 'easeInOut' } },
  // Pequeno salto positivo
  success: { x: 0, y: [0, -7, 0], transition: { duration: 0.5, ease: 'easeOut' } },
};

// Olhos acompanham as reacoes do corpo, com leve "olhar" para o formulario no focus
const moodEyes: Variants = {
  idle: { x: 0, y: 0, transition: moodTransition },
  focus: { x: 2.5, y: 0, transition: moodTransition },
  error: { x: 0, y: 0, transition: moodTransition },
  success: { x: 0, y: -4, transition: moodTransition },
};

export function AnimatedLoginCharacters({ mood = 'idle' }: AnimatedLoginCharactersProps) {
  const reduceMotion = useReducedMotion();
  const areaRef = useRef<HTMLDivElement>(null);
  const parallaxEnabled =
    !reduceMotion && typeof window !== 'undefined' && window.matchMedia('(pointer: fine)').matches;

  const activeMood = reduceMotion ? 'idle' : mood;

  // Posicao normalizada do mouse (-1..1), amortecida por spring para nunca seguir "duro"
  const pointerX = useMotionValue(0);
  const pointerY = useMotionValue(0);
  const springX = useSpring(pointerX, { stiffness: 55, damping: 16, mass: 0.4 });
  const springY = useSpring(pointerY, { stiffness: 55, damping: 16, mass: 0.4 });

  // Deslocamento maximo de parallax por personagem (eixo Y reduzido para manter sutileza)
  const useDepth = (max: number) => ({
    x: useTransform(springX, (v) => v * max),
    y: useTransform(springY, (v) => v * max * 0.6),
  });

  const blueDepth = useDepth(3);
  const violetDepth = useDepth(10);
  const graphiteDepth = useDepth(5);
  const skyDepth = useDepth(7);
  // Olhos com profundidade levemente maior que o corpo: sensacao de "olhar" para o cursor
  const blueEyesDepth = useDepth(4.5);
  const violetEyesDepth = useDepth(12);
  const graphiteEyesDepth = useDepth(6.5);

  function handleMouseMove(event: React.MouseEvent<HTMLDivElement>) {
    if (!parallaxEnabled || !areaRef.current) return;
    const rect = areaRef.current.getBoundingClientRect();
    pointerX.set(((event.clientX - rect.left) / rect.width) * 2 - 1);
    pointerY.set(((event.clientY - rect.top) / rect.height) * 2 - 1);
  }

  function handleMouseLeave() {
    pointerX.set(0);
    pointerY.set(0);
  }

  // Loops de vida (respiracao/balanco). Com prefers-reduced-motion ficam desligados.
  const blueBreathe = reduceMotion
    ? undefined
    : {
        y: [0, -5, 0],
        scaleY: [1, 1.05, 1],
        transition: { duration: 3.6, repeat: Infinity, ease: 'easeInOut' as const },
      };

  const violetSway = reduceMotion
    ? { rotate: 1.5 }
    : {
        rotate: [2, -2, 2],
        x: [0, 3, 0],
        y: [0, -8, 0],
        transition: { duration: 4.2, repeat: Infinity, ease: 'easeInOut' as const, delay: 0.3 },
      };

  // Grafite e o mais estavel da cena: observador
  const graphiteIdle = reduceMotion
    ? { rotate: -2 }
    : {
        rotate: [-2, -1.2, -2],
        y: [0, -3, 0],
        transition: { duration: 3.8, repeat: Infinity, ease: 'easeInOut' as const, delay: 0.9 },
      };

  const skySway = reduceMotion
    ? undefined
    : {
        x: [0, 6, 0],
        y: [0, -3, 0],
        transition: { duration: 3.8, repeat: Infinity, ease: 'easeInOut' as const, delay: 0.6 },
      };

  // Piscadas rapidas (~150ms) e raras, cada personagem com cadencia e atraso proprios
  const blink = (repeatDelay: number, delay: number) =>
    reduceMotion
      ? undefined
      : {
          scaleY: [1, 0.15, 1],
          transition: { duration: 0.15, repeat: Infinity, repeatDelay, delay, ease: 'easeInOut' as const },
        };

  // Loops dos grupos de olhos seguem o corpo do personagem para nao "descolar"
  const followBlue = reduceMotion
    ? undefined
    : { y: [0, -5, 0], transition: { duration: 3.6, repeat: Infinity, ease: 'easeInOut' as const } };
  const followViolet = reduceMotion
    ? undefined
    : {
        x: [0, 3, 0],
        y: [0, -8, 0],
        transition: { duration: 4.2, repeat: Infinity, ease: 'easeInOut' as const, delay: 0.3 },
      };
  const followGraphite = reduceMotion
    ? undefined
    : { y: [0, -3, 0], transition: { duration: 3.8, repeat: Infinity, ease: 'easeInOut' as const, delay: 0.9 } };
  const followSky = reduceMotion
    ? undefined
    : {
        x: [0, 6, 0],
        y: [0, -3, 0],
        scaleX: [1, 1.08, 1],
        transition: { duration: 3.8, repeat: Infinity, ease: 'easeInOut' as const, delay: 0.6 },
      };

  return (
    <div
      ref={areaRef}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      className="flex h-full w-full items-center justify-center"
    >
      {/* Camada de shake: vibra a cena inteira no erro (max 4px) */}
      <motion.div
        animate={!reduceMotion && activeMood === 'error' ? { x: [0, -4, 4, -2, 2, 0] } : { x: 0 }}
        transition={{ duration: 0.45, ease: 'easeInOut' }}
      >
        <motion.div
          variants={sceneContainer}
          initial="hidden"
          animate="visible"
          className="relative h-[238px] w-[292px] max-w-full"
          aria-hidden="true"
        >
          {/* 1. Azul brand: baixo e acolhedor, respira pela base */}
          <motion.div variants={enterBlue} className="absolute bottom-[48px] left-[24px] h-[72px] w-[132px]">
            <motion.div style={blueDepth} className="h-full w-full">
              <motion.div variants={moodBlue} initial={false} animate={activeMood} className="h-full w-full">
                <motion.div
                  animate={blueBreathe}
                  className="h-full w-full origin-bottom rounded-t-full will-change-transform"
                  style={{ backgroundColor: brandBlue }}
                />
              </motion.div>
            </motion.div>
          </motion.div>

          {/* 2. Violeta: personagem principal, danca devagar */}
          <motion.div variants={enterViolet} className="absolute bottom-[78px] left-[106px] h-[124px] w-[72px]">
            <motion.div style={violetDepth} className="h-full w-full">
              <motion.div variants={moodViolet} initial={false} animate={activeMood} className="h-full w-full">
                <motion.div
                  animate={violetSway}
                  className="h-full w-full origin-bottom rounded-[4px] will-change-transform"
                  style={{ backgroundColor: brandViolet }}
                />
              </motion.div>
            </motion.div>
          </motion.div>

          {/* 3. Grafite: sobreposto, serio e estavel */}
          <motion.div variants={enterGraphite} className="absolute bottom-[78px] left-[166px] h-[96px] w-[56px]">
            <motion.div style={graphiteDepth} className="h-full w-full">
              <motion.div variants={moodGraphite} initial={false} animate={activeMood} className="h-full w-full">
                <motion.div
                  animate={graphiteIdle}
                  className="h-full w-full origin-bottom rounded-[4px] ring-1 ring-white/10 will-change-transform"
                  style={{ backgroundColor: graphite }}
                />
              </motion.div>
            </motion.div>
          </motion.div>

          {/* 4. Azul claro: leve, balanca na horizontal */}
          <motion.div variants={enterSky} className="absolute bottom-[48px] right-[22px] h-[88px] w-[62px]">
            <motion.div style={skyDepth} className="h-full w-full">
              <motion.div variants={moodSky} initial={false} animate={activeMood} className="h-full w-full">
                <motion.div
                  animate={skySway}
                  className="h-full w-full rounded-l-[28px] rounded-r-full will-change-transform"
                  style={{ backgroundColor: brandSky }}
                />
              </motion.div>
            </motion.div>
          </motion.div>

          {/* Olhos do azul (3 pontos) */}
          <motion.div variants={enterDetail} className="absolute bottom-[96px] left-[94px]">
            <motion.div style={blueEyesDepth}>
              <motion.div variants={moodEyes} initial={false} animate={activeMood}>
                <motion.div animate={followBlue} className="flex gap-[18px] will-change-transform">
                  <motion.span animate={blink(4.6, 1.2)} className="h-[5px] w-[5px] rounded-full bg-white/95" />
                  <motion.span animate={blink(4.6, 1.2)} className="h-[5px] w-[5px] rounded-full bg-white/95" />
                  <motion.span animate={blink(4.6, 1.2)} className="h-[5px] w-[5px] rounded-full bg-white/95" />
                </motion.div>
              </motion.div>
            </motion.div>
          </motion.div>

          {/* Olhos do violeta */}
          <motion.div variants={enterDetail} className="absolute bottom-[130px] left-[126px]">
            <motion.div style={violetEyesDepth}>
              <motion.div variants={moodEyes} initial={false} animate={activeMood}>
                <motion.div animate={followViolet} className="flex gap-4 will-change-transform">
                  <motion.span animate={blink(4, 0.6)} className="h-[5px] w-[3px] rounded-full bg-white/90" />
                  <motion.span animate={blink(4, 0.6)} className="h-[5px] w-[3px] rounded-full bg-white/90" />
                </motion.div>
              </motion.div>
            </motion.div>
          </motion.div>

          {/* Olhos do grafite */}
          <motion.div variants={enterDetail} className="absolute bottom-[124px] left-[186px]">
            <motion.div style={graphiteEyesDepth}>
              <motion.div variants={moodEyes} initial={false} animate={activeMood}>
                <motion.div animate={followGraphite} className="flex gap-3 will-change-transform">
                  <motion.span animate={blink(5, 2.3)} className="h-[5px] w-[5px] rounded-full bg-white/90" />
                  <motion.span animate={blink(5, 2.3)} className="h-[5px] w-[5px] rounded-full bg-white/90" />
                </motion.div>
              </motion.div>
            </motion.div>
          </motion.div>

          {/* Boca do azul */}
          <motion.div variants={enterDetail} className="absolute bottom-[98px] left-[112px]">
            <motion.div style={blueEyesDepth}>
              <motion.div variants={moodEyes} initial={false} animate={activeMood}>
                <motion.span
                  animate={followBlue}
                  className="block h-[3px] w-[14px] rounded-full bg-white/95 will-change-transform"
                />
              </motion.div>
            </motion.div>
          </motion.div>

          {/* Antena lateral do azul claro: oscila junto com o personagem */}
          <motion.div variants={enterDetail} className="absolute bottom-[96px] right-[24px]">
            <motion.div style={skyDepth}>
              <motion.div variants={moodSky} initial={false} animate={activeMood}>
                <motion.span
                  animate={followSky}
                  className="block h-[2px] w-[34px] origin-left bg-white/60 will-change-transform"
                />
              </motion.div>
            </motion.div>
          </motion.div>
        </motion.div>
      </motion.div>
    </div>
  );
}
