import { useEffect, useRef, useState, type PointerEvent } from 'react';

/**
 * Cena animada da tela de login, reproduzindo o video de referencia:
 * - entrada: as formas caem/tombam do alto e se montam em sequencia;
 * - idle: respiracao dessincronizada + olhos seguindo o cursor;
 * - typing: todos se esticam e inclinam em direcao ao formulario, "espiando";
 * - shy: senha visivel -> desviam o olhar (azul fecha os olhos, violeta fica
 *   preocupado, o "passaro" vira o bico, o grafite continua encarando);
 * - error: shake curto; success: reacao positiva breve.
 *
 * Formas e comportamento seguem a referencia; as cores seguem a marca SIX3
 * (laranja -> brand blue, amarelo -> brand-300, roxo -> violeta do gradiente).
 */
export type CharacterMood = 'idle' | 'hover' | 'focus' | 'typing' | 'shy' | 'error' | 'success';

type AnimatedLoginCharactersProps = {
  mood?: CharacterMood;
  activeField?: 'email' | 'password' | null;
};

const reduceMotionQuery = '(prefers-reduced-motion: reduce)';

export function AnimatedLoginCharacters({ mood = 'idle', activeField = null }: AnimatedLoginCharactersProps) {
  const areaRef = useRef<HTMLDivElement>(null);
  const frameRef = useRef<number>();
  const currentRef = useRef({ x: 0, y: 0 });
  const targetRef = useRef({ x: 0, y: 0 });
  const [isHovering, setIsHovering] = useState(false);
  const [reduceMotion, setReduceMotion] = useState(false);

  const activeMood: CharacterMood = mood !== 'idle' ? mood : isHovering ? 'hover' : 'idle';

  useEffect(() => {
    const media = window.matchMedia(reduceMotionQuery);
    const update = () => setReduceMotion(media.matches);
    update();
    media.addEventListener('change', update);
    return () => media.removeEventListener('change', update);
  }, []);

  useEffect(() => () => {
    if (frameRef.current) window.cancelAnimationFrame(frameRef.current);
  }, []);

  function writePointerVars(x: number, y: number) {
    if (!areaRef.current) return;
    areaRef.current.style.setProperty('--px', x.toFixed(4));
    areaRef.current.style.setProperty('--py', y.toFixed(4));
  }

  function tick() {
    const current = currentRef.current;
    const target = targetRef.current;
    current.x += (target.x - current.x) * 0.16;
    current.y += (target.y - current.y) * 0.16;
    writePointerVars(current.x, current.y);

    if (Math.abs(target.x - current.x) > 0.002 || Math.abs(target.y - current.y) > 0.002) {
      frameRef.current = window.requestAnimationFrame(tick);
      return;
    }

    current.x = target.x;
    current.y = target.y;
    writePointerVars(current.x, current.y);
    frameRef.current = undefined;
  }

  function requestTick() {
    if (frameRef.current || reduceMotion) return;
    frameRef.current = window.requestAnimationFrame(tick);
  }

  function handlePointerMove(event: PointerEvent<HTMLDivElement>) {
    if (reduceMotion || !areaRef.current || event.pointerType !== 'mouse') return;
    const rect = areaRef.current.getBoundingClientRect();
    targetRef.current = {
      x: ((event.clientX - rect.left) / rect.width) * 2 - 1,
      y: ((event.clientY - rect.top) / rect.height) * 2 - 1,
    };
    requestTick();
  }

  function handlePointerEnter() {
    setIsHovering(true);
  }

  function handlePointerLeave() {
    setIsHovering(false);
    targetRef.current = { x: 0, y: 0 };
    requestTick();
  }

  return (
    <div
      ref={areaRef}
      className="animated-login-characters"
      data-mood={activeMood}
      data-field={activeField || 'none'}
      data-reduced={reduceMotion ? 'true' : 'false'}
      onPointerEnter={handlePointerEnter}
      onPointerMove={handlePointerMove}
      onPointerLeave={handlePointerLeave}
      aria-hidden="true"
    >
      <style>{charactersCss}</style>
      <div className="alc-shake">
        <div className="alc-stage">
          {/* Ordem do DOM segue a ordem de entrada do video: preto -> roxo -> amarelo -> laranja */}
          <div className="alc-character alc-black">
            <div className="alc-enter">
              <div className="alc-depth">
                <div className="alc-react">
                  <div className="alc-loop">
                    <div className="alc-body" />
                    <div className="alc-face">
                      <span className="alc-eye black-eye-a" />
                      <span className="alc-eye black-eye-b" />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="alc-character alc-purple">
            <div className="alc-enter">
              <div className="alc-depth">
                <div className="alc-react">
                  <div className="alc-loop">
                    <div className="alc-body" />
                    <div className="alc-face">
                      <span className="alc-eye purple-eye-a" />
                      <span className="alc-eye purple-eye-b" />
                      <span className="alc-mouth purple-mouth" />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="alc-character alc-yellow">
            <div className="alc-enter">
              <div className="alc-depth">
                <div className="alc-react">
                  <div className="alc-loop">
                    <div className="alc-body" />
                    <div className="alc-face">
                      <span className="alc-eye yellow-eye" />
                      <span className="alc-beak yellow-beak" />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="alc-character alc-orange">
            <div className="alc-enter">
              <div className="alc-depth">
                <div className="alc-react">
                  <div className="alc-loop">
                    <div className="alc-body" />
                    <div className="alc-face">
                      <span className="alc-eye orange-eye-a" />
                      <span className="alc-eye orange-eye-b" />
                      <span className="alc-mouth orange-mouth" />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

const charactersCss = `
.animated-login-characters {
  --px: 0;
  --py: 0;
  --eye-mx: 0px;
  --eye-my: 0px;
  display: flex;
  width: 100%;
  height: 100%;
  align-items: center;
  justify-content: center;
}

.alc-shake {
  transform: translate3d(0, 0, 0);
}

.animated-login-characters[data-mood="error"] .alc-shake {
  animation: alc-scene-error 520ms ease-in-out both;
}

.alc-stage {
  position: relative;
  width: 300px;
  height: 240px;
  max-width: 100%;
  transform: translateZ(0);
}

.alc-character {
  position: absolute;
  will-change: transform, opacity;
}

.alc-enter,
.alc-depth,
.alc-react,
.alc-loop {
  position: relative;
  width: 100%;
  height: 100%;
}

.alc-enter {
  opacity: 0;
  transform-origin: bottom center;
  will-change: transform, opacity;
}

.alc-body {
  position: absolute;
  inset: 0;
  will-change: transform;
}

.alc-face {
  position: absolute;
  inset: 0;
  pointer-events: none;
}

/* ---- Posicoes (composicao do video, escala 300x240, chao em 30px) ---- */

.alc-purple {
  left: 52px;
  bottom: 30px;
  z-index: 2;
  width: 76px;
  height: 138px;
}

.alc-black {
  left: 130px;
  bottom: 30px;
  z-index: 3;
  width: 50px;
  height: 102px;
}

.alc-yellow {
  left: 180px;
  bottom: 30px;
  z-index: 4;
  width: 58px;
  height: 88px;
}

.alc-orange {
  left: 6px;
  bottom: 30px;
  z-index: 5;
  width: 142px;
  height: 74px;
}

/* ---- Corpos (formas fieis ao video, cores da marca SIX3) ---- */

/* Meia-bola grande na frente: o mais calmo */
.alc-orange .alc-body {
  border-radius: 999px 999px 0 0;
  background: #3b6dff;
  transform-origin: bottom center;
  transition: transform 800ms cubic-bezier(0.16, 1, 0.3, 1);
}

/* Retangulo alto atras: o personagem principal e mais reativo */
.alc-purple .alc-body {
  border-radius: 4px;
  background: #8b5cf6;
  transform-origin: bottom center;
  transition: transform 800ms cubic-bezier(0.16, 1, 0.3, 1);
}

/* Bloco observador, levemente inclinado */
.alc-black .alc-body {
  border-radius: 4px;
  background: #1d212e;
  box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.1);
  transform: rotate(-3deg);
  transform-origin: bottom center;
  transition: transform 800ms cubic-bezier(0.16, 1, 0.3, 1);
}

/* "Passaro" de topo arredondado, espiando da direita */
.alc-yellow .alc-body {
  border-radius: 999px 999px 4px 4px;
  background: #8fb0ff;
  transform-origin: bottom center;
  transition: transform 800ms cubic-bezier(0.16, 1, 0.3, 1);
}

/* ---- Entrada: queda/montagem em sequencia (frames do video) ---- */

.alc-black .alc-enter {
  animation: alc-enter-black 900ms cubic-bezier(0.16, 1, 0.3, 1) 420ms both;
}

.alc-purple .alc-enter {
  animation: alc-enter-purple 950ms cubic-bezier(0.16, 1, 0.3, 1) 520ms both;
}

.alc-yellow .alc-enter {
  animation: alc-enter-yellow 900ms cubic-bezier(0.16, 1, 0.3, 1) 640ms both;
}

.alc-orange .alc-enter {
  animation: alc-enter-orange 800ms cubic-bezier(0.16, 1, 0.3, 1) 760ms both;
}

/* ---- Parallax (corpo) ---- */

.alc-orange .alc-depth {
  transform: translate3d(calc(var(--px) * 3px), calc(var(--py) * 1.5px), 0);
  transition: transform 420ms ease-out;
}

.alc-purple .alc-depth {
  transform: translate3d(calc(var(--px) * 10px), calc(var(--py) * 6px), 0);
  transition: transform 360ms ease-out;
}

.alc-black .alc-depth {
  transform: translate3d(calc(var(--px) * 5px), calc(var(--py) * 3px), 0);
  transition: transform 380ms ease-out;
}

.alc-yellow .alc-depth {
  transform: translate3d(calc(var(--px) * 7px), calc(var(--py) * 4px), 0);
  transition: transform 380ms ease-out;
}

/* ---- Loops idle dessincronizados ---- */

.alc-orange .alc-loop {
  animation: alc-orange-idle 5.8s ease-in-out 1700ms infinite;
  transform-origin: bottom center;
}

.alc-purple .alc-loop {
  animation: alc-purple-idle 6.6s ease-in-out 1550ms infinite;
  transform-origin: bottom center;
}

.alc-black .alc-loop {
  animation: alc-black-idle 3.7s ease-in-out 1400ms infinite;
}

/* olhada lateral rapida do grafite, em ciclo proprio */
.alc-black .alc-face {
  animation: alc-glance 8.4s ease-in-out 3400ms infinite;
}

.alc-yellow .alc-loop {
  animation: alc-yellow-idle 5.4s ease-in-out 1620ms infinite;
  transform-origin: bottom center;
}

/* ---- Reacoes por estado (camada .alc-react) ---- */

.alc-react {
  transition: transform 800ms cubic-bezier(0.16, 1, 0.3, 1);
}

/* hover: sobressalto rapido ao notar o cursor, escalonado por personagem */
.animated-login-characters[data-mood="hover"] .alc-react {
  animation: alc-perk 420ms cubic-bezier(0.34, 1.56, 0.64, 1) both;
}

.animated-login-characters[data-mood="hover"] .alc-purple .alc-react { animation-delay: 0ms; }
.animated-login-characters[data-mood="hover"] .alc-black .alc-react { animation-delay: 50ms; }
.animated-login-characters[data-mood="hover"] .alc-yellow .alc-react { animation-delay: 95ms; }
.animated-login-characters[data-mood="hover"] .alc-orange .alc-react { animation-delay: 140ms; }

/* foco: inclinam de leve na direcao do formulario */
.animated-login-characters[data-mood="focus"] {
  --eye-mx: 2.5px;
  --eye-my: -0.5px;
}

.animated-login-characters[data-mood="focus"] .alc-react {
  transition: transform 360ms cubic-bezier(0.34, 1.56, 0.64, 1);
}

.animated-login-characters[data-mood="focus"] .alc-purple .alc-react {
  transform: translate3d(4px, 0, 0) rotate(2deg);
}

.animated-login-characters[data-mood="focus"] .alc-black .alc-react {
  transform: translate3d(2px, 0, 0) rotate(1.5deg);
}

.animated-login-characters[data-mood="focus"] .alc-yellow .alc-react {
  transform: translate3d(1px, -2px, 0);
}

.animated-login-characters[data-mood="focus"] .alc-orange .alc-react {
  transform: translate3d(1px, -1px, 0);
}

/* digitando: todos se esticam para "espiar" o formulario (reacao forte do video) */
.animated-login-characters[data-mood="typing"] {
  --eye-mx: 5px;
  --eye-my: -2px;
}

/* ida com overshoot elastico (snap), volta macia */
.animated-login-characters[data-mood="typing"] .alc-react {
  transition: transform 380ms cubic-bezier(0.34, 1.56, 0.64, 1) 150ms;
}

.animated-login-characters[data-mood="typing"] .alc-body {
  transition: transform 380ms cubic-bezier(0.34, 1.56, 0.64, 1) 150ms;
}

.animated-login-characters[data-mood="typing"] .alc-purple .alc-react {
  transform: translate3d(10px, 0, 0) rotate(7deg);
}

.animated-login-characters[data-mood="typing"] .alc-purple .alc-body {
  transform: scaleY(1.16) skewX(-3deg);
}

/* olhos arregalados de curiosidade */
.animated-login-characters[data-mood="typing"] .alc-purple .alc-eye {
  --eye-mx: 7px;
  --eye-my: -15px;
  animation: none;
  transform: translate3d(calc(var(--px) * 1.6px + var(--eye-mx)), calc(var(--py) * 1.1px + var(--eye-my)), 0) scale(1.25);
}

/* boca abre em "O" de surpresa */
.animated-login-characters[data-mood="typing"] .alc-purple .purple-mouth {
  --eye-mx: 8px;
  --eye-my: -14px;
  width: 9px;
  height: 9px;
  border-radius: 999px;
}

.animated-login-characters[data-mood="typing"] .alc-black .alc-react {
  transform: translate3d(4px, 0, 0) rotate(4deg);
}

.animated-login-characters[data-mood="typing"] .alc-yellow .alc-react {
  transform: translate3d(2px, -2px, 0) rotate(5deg);
}

.animated-login-characters[data-mood="typing"] .alc-orange .alc-react {
  transform: translate3d(1px, -1px, 0);
}

/* senha visivel: desviam o olhar com um snap rapido (gag do video) */
.animated-login-characters[data-mood="shy"] .alc-react {
  transition: transform 340ms cubic-bezier(0.34, 1.56, 0.64, 1);
}

.animated-login-characters[data-mood="shy"] .alc-purple .alc-react {
  transform: translate3d(-4px, 0, 0) rotate(-3deg);
}

.animated-login-characters[data-mood="shy"] .alc-purple .alc-eye {
  animation: none;
  --eye-mx: -3px;
  --eye-my: 2px;
  transform: translate3d(var(--eye-mx), var(--eye-my), 0) scaleY(0.7);
}

/* boca pequena e aberta de preocupacao */
.animated-login-characters[data-mood="shy"] .alc-purple .purple-mouth {
  --eye-mx: -3px;
  --eye-my: 3px;
  width: 6px;
  height: 6px;
  border-radius: 999px;
  transform: translate3d(var(--eye-mx), var(--eye-my), 0);
}

/* azul fecha os olhos */
.animated-login-characters[data-mood="shy"] .alc-orange .alc-eye {
  animation: none;
  transform: translate3d(-2px, 1px, 0) scaleY(0.14);
}

/* o "passaro" vira para o outro lado */
.animated-login-characters[data-mood="shy"] .alc-yellow .alc-react {
  transform: translate3d(-3px, 0, 0) rotate(-6deg);
}

.animated-login-characters[data-mood="shy"] .yellow-beak {
  transform: translate3d(-34px, 0, 0) scaleX(-1);
}

.animated-login-characters[data-mood="shy"] .yellow-eye {
  --eye-mx: -6px;
  --eye-my: 0px;
}

/* o grafite tambem desvia o olhar para o lado oposto */
.animated-login-characters[data-mood="shy"] .alc-black .alc-react {
  transform: translate3d(-2px, 0, 0) rotate(-3deg);
}

.animated-login-characters[data-mood="shy"] .alc-black .alc-eye {
  animation: none;
  transform: translate3d(-4.5px, -1px, 0);
}

/* erro: desconfianca + shake */
.animated-login-characters[data-mood="error"] {
  --eye-mx: -1px;
}

/* roxo leva um susto: pula e encolhe desconfiado */
.animated-login-characters[data-mood="error"] .alc-purple .alc-react {
  animation: alc-purple-startle 560ms ease-out both;
}

/* boca tensa, esticada de desconfianca */
.animated-login-characters[data-mood="error"] .alc-purple .purple-mouth {
  --eye-mx: -2px;
  width: 15px;
  height: 2.5px;
}

.animated-login-characters[data-mood="error"] .alc-black .alc-react {
  animation: alc-black-error 520ms ease-in-out both;
}

.animated-login-characters[data-mood="error"] .alc-black .alc-eye {
  animation: alc-blink-fast 520ms ease-in-out both;
}

.animated-login-characters[data-mood="error"] .alc-yellow .alc-react {
  animation: alc-yellow-error 520ms ease-in-out both;
}

/* sucesso: reacao positiva curta */
.animated-login-characters[data-mood="success"] .alc-purple .alc-react {
  animation: alc-purple-success 620ms ease-out both;
}

.animated-login-characters[data-mood="success"] .alc-black .alc-react {
  transform: translate3d(0, -3px, 0);
  transition: transform 300ms cubic-bezier(0.34, 1.56, 0.64, 1);
}

.animated-login-characters[data-mood="success"] .alc-yellow .alc-react {
  animation: alc-yellow-success 700ms ease-out 80ms both;
}

/* sorrisos no sucesso */
.animated-login-characters[data-mood="success"] .alc-orange .orange-mouth {
  --eye-mx: -3px;
  width: 22px;
  height: 11px;
}

.animated-login-characters[data-mood="success"] .alc-purple .purple-mouth {
  width: 12px;
  height: 6px;
  border-radius: 0 0 10px 10px;
}

/* ---- Olhos, bocas e bico ---- */

.alc-eye,
.alc-mouth,
.alc-beak {
  position: absolute;
  display: block;
  pointer-events: none;
  transition: transform 300ms ease-out, width 300ms ease-out, height 300ms ease-out, border-radius 300ms ease-out;
}

.alc-eye {
  width: 5px;
  height: 5px;
  border-radius: 999px;
  transform: translate3d(calc(var(--px) * 1.6px + var(--eye-mx)), calc(var(--py) * 1.1px + var(--eye-my)), 0);
}

.alc-mouth {
  transform: translate3d(calc(var(--px) * 1px + var(--eye-mx)), calc(var(--py) * 0.6px + var(--eye-my)), 0);
}

/* Azul (meia-bola): dois olhos + sorriso */
.orange-eye-a { left: 62px; top: 20px; width: 6px; height: 6px; background: rgba(255, 255, 255, 0.95); }
.orange-eye-b { left: 88px; top: 20px; width: 6px; height: 6px; background: rgba(255, 255, 255, 0.95); }

.orange-mouth {
  left: 68px;
  top: 30px;
  width: 16px;
  height: 9px;
  background: transparent;
  border-bottom: 2.5px solid rgba(255, 255, 255, 0.95);
  border-radius: 0 0 12px 12px;
}

/* Violeta: olhos escuros no topo (como no video) */
.purple-eye-a { left: 20px; top: 20px; width: 5px; height: 6px; background: rgba(16, 18, 26, 0.85); }
.purple-eye-b { left: 46px; top: 20px; width: 5px; height: 6px; background: rgba(16, 18, 26, 0.85); }

.purple-mouth {
  left: 28px;
  top: 38px;
  width: 12px;
  height: 3px;
  border-radius: 999px;
  background: rgba(16, 18, 26, 0.8);
}

/* Grafite: dois olhos brancos juntos */
.black-eye-a { left: 15px; top: 22px; background: rgba(255, 255, 255, 0.95); }
.black-eye-b { left: 29px; top: 22px; background: rgba(255, 255, 255, 0.95); }

/* Passaro: um olho + bico de linha que passa da borda */
.yellow-eye { left: 18px; top: 24px; background: rgba(16, 18, 26, 0.9); }

.yellow-beak {
  left: 28px;
  top: 32px;
  width: 38px;
  height: 3px;
  border-radius: 999px;
  background: rgba(16, 18, 26, 0.9);
  transform: translate3d(0, 0, 0);
  /* o bico vira de supetao */
  transition: transform 240ms cubic-bezier(0.34, 1.56, 0.64, 1);
}

/* ---- Piscadas (cadencias e delays diferentes) ---- */

.alc-orange .alc-eye {
  animation: alc-blink 150ms ease-in-out 4.4s infinite;
  animation-delay: 2600ms;
}

.alc-purple .alc-eye {
  animation: alc-blink 150ms ease-in-out 4.8s infinite;
  animation-delay: 1900ms;
}

.alc-black .alc-eye {
  animation: alc-blink 150ms ease-in-out 5.2s infinite;
  animation-delay: 3200ms;
}

.animated-login-characters[data-mood="focus"] .alc-black .alc-eye {
  animation: alc-blink-once 360ms ease-in-out both;
}

/* ---- Keyframes ---- */

/* Quedas com impacto: squash na aterrissagem + rebote elastico */
@keyframes alc-enter-black {
  0% { opacity: 0; transform: translate3d(8px, -150px, 0) rotate(-55deg); }
  48% { opacity: 1; transform: translate3d(0, 6px, 0) rotate(-9deg) scaleY(0.82) scaleX(1.14); }
  64% { transform: translate3d(0, -6px, 0) rotate(2deg) scaleY(1.08) scaleX(0.96); }
  80% { transform: translate3d(0, 2px, 0) rotate(-1.5deg) scaleY(0.97) scaleX(1.02); }
  100% { opacity: 1; transform: translate3d(0, 0, 0) rotate(0deg) scale(1); }
}

@keyframes alc-enter-purple {
  0% { opacity: 0; transform: translate3d(-80px, -100px, 0) rotate(50deg); }
  50% { opacity: 1; transform: translate3d(2px, 5px, 0) rotate(-6deg) scaleY(0.84) scaleX(1.12); }
  68% { transform: translate3d(0, -7px, 0) rotate(3deg) scaleY(1.1) scaleX(0.95); }
  84% { transform: translate3d(0, 2px, 0) rotate(-1.5deg) scaleY(0.98) scaleX(1.01); }
  100% { opacity: 1; transform: translate3d(0, 0, 0) rotate(0deg) scale(1); }
}

@keyframes alc-enter-yellow {
  0% { opacity: 0; transform: translate3d(50px, -110px, 0) rotate(30deg); }
  52% { opacity: 1; transform: translate3d(-2px, 5px, 0) rotate(-7deg) scaleY(0.8) scaleX(1.15); }
  70% { transform: translate3d(1px, -6px, 0) rotate(4deg) scaleY(1.09) scaleX(0.95); }
  85% { transform: translate3d(0, 1px, 0) rotate(-2deg) scaleY(0.98) scaleX(1.01); }
  100% { opacity: 1; transform: translate3d(0, 0, 0) rotate(0deg) scale(1); }
}

@keyframes alc-enter-orange {
  0% { opacity: 0; transform: translate3d(0, 70px, 0) scaleY(0.6) scaleX(1.2); }
  55% { opacity: 1; transform: translate3d(0, -8px, 0) scaleY(1.1) scaleX(0.95); }
  75% { transform: translate3d(0, 2px, 0) scaleY(0.94) scaleX(1.05); }
  100% { opacity: 1; transform: translate3d(0, 0, 0) scale(1); }
}

/* respiracao calma + jiggle gelatinoso brusco no fim do ciclo */
@keyframes alc-orange-idle {
  0%, 100% { transform: translate3d(0, 0, 0) scale(1); }
  38% { transform: translate3d(0, -4px, 0) scale(1); }
  72% { transform: translate3d(0, 0, 0) scale(1); }
  78% { transform: translate3d(0, -2px, 0) scaleY(0.93) scaleX(1.06); }
  84% { transform: translate3d(0, -3px, 0) scaleY(1.05) scaleX(0.97); }
  90% { transform: translate3d(0, 0, 0) scale(1); }
}

/* balanco lento + pulinho subito */
@keyframes alc-purple-idle {
  0%, 100% { transform: translate3d(0, 0, 0) rotate(-1deg); }
  34% { transform: translate3d(0, -4px, 0) rotate(1deg); }
  66% { transform: translate3d(0, 0, 0) rotate(-0.5deg); }
  73% { transform: translate3d(0, -9px, 0) rotate(2deg) scaleY(1.06); }
  79% { transform: translate3d(0, 1px, 0) rotate(-1.5deg) scaleY(0.94) scaleX(1.04); }
  85% { transform: translate3d(0, -2px, 0) rotate(0deg) scale(1); }
  92% { transform: translate3d(0, 0, 0) rotate(-1deg); }
}

@keyframes alc-black-idle {
  0%, 100% { transform: translate3d(0, 0, 0); }
  50% { transform: translate3d(0, -2px, 0); }
}

/* olhada lateral rapida (dispara e volta) */
@keyframes alc-glance {
  0%, 62%, 100% { transform: translate3d(0, 0, 0); }
  66%, 76% { transform: translate3d(-3.5px, 0, 0); }
  80% { transform: translate3d(0, 0, 0); }
}

/* balanco horizontal + tique de cabeca brusco */
@keyframes alc-yellow-idle {
  0%, 100% { transform: translate3d(-3px, 0, 0) rotate(0deg); }
  36% { transform: translate3d(3px, -2px, 0) rotate(0deg); }
  64% { transform: translate3d(0, 0, 0) rotate(0deg); }
  70% { transform: translate3d(1px, -1px, 0) rotate(-8deg); }
  76% { transform: translate3d(1px, -1px, 0) rotate(-8deg); }
  82% { transform: translate3d(0, 0, 0) rotate(2deg); }
  88% { transform: translate3d(-1px, 0, 0) rotate(0deg); }
}

@keyframes alc-scene-error {
  0%, 100% { transform: translate3d(0, 0, 0); }
  15% { transform: translate3d(-6px, 0, 0); }
  32% { transform: translate3d(6px, 0, 0); }
  50% { transform: translate3d(-4px, 0, 0); }
  68% { transform: translate3d(3px, 0, 0); }
  84% { transform: translate3d(-1px, 0, 0); }
}

/* susto do roxo: salto + encolhida desconfiada */
@keyframes alc-purple-startle {
  0% { transform: translate3d(0, 0, 0) rotate(0deg); }
  22% { transform: translate3d(-1px, -10px, 0) rotate(-7deg) scaleY(1.08); }
  48% { transform: translate3d(-2px, 1px, 0) rotate(-4deg) scaleY(0.93) scaleX(1.05); }
  70% { transform: translate3d(-2px, -1px, 0) rotate(-5.5deg) scale(1); }
  100% { transform: translate3d(-2px, 0, 0) rotate(-5deg); }
}

/* sobressalto curto ao notar o cursor */
@keyframes alc-perk {
  0% { transform: translate3d(0, 0, 0) scaleY(1); }
  45% { transform: translate3d(0, -5px, 0) scaleY(1.04); }
  75% { transform: translate3d(0, 1px, 0) scaleY(0.98); }
  100% { transform: translate3d(0, -1px, 0) scaleY(1); }
}

@keyframes alc-black-error {
  0%, 100% { transform: translate3d(0, 0, 0); }
  25% { transform: translate3d(-3px, 0, 0) rotate(-3deg); }
  50% { transform: translate3d(3px, 0, 0) rotate(2deg); }
  75% { transform: translate3d(-2px, 0, 0) rotate(-2deg); }
}

@keyframes alc-yellow-error {
  0%, 100% { transform: translate3d(0, 0, 0); }
  25% { transform: translate3d(-4px, 0, 0); }
  50% { transform: translate3d(4px, -1px, 0); }
  75% { transform: translate3d(-2px, 0, 0); }
}

/* dois pulinhos animados do passaro */
@keyframes alc-yellow-success {
  0%, 100% { transform: translate3d(0, 0, 0); }
  22% { transform: translate3d(0, -8px, 0) scaleY(1.06); }
  44% { transform: translate3d(0, 0, 0) scaleY(0.95) scaleX(1.04); }
  64% { transform: translate3d(0, -4px, 0) scaleY(1.03); }
  82% { transform: translate3d(0, 0, 0) scaleY(0.98); }
}

/* salto de comemoracao do roxo com squash na volta */
@keyframes alc-purple-success {
  0% { transform: translate3d(0, 0, 0) rotate(0deg); }
  30% { transform: translate3d(0, -12px, 0) rotate(-3deg) scaleY(1.08); }
  60% { transform: translate3d(0, 1px, 0) rotate(-1deg) scaleY(0.93) scaleX(1.05); }
  80% { transform: translate3d(0, -4px, 0) rotate(-2deg) scale(1); }
  100% { transform: translate3d(0, -3px, 0) rotate(-2deg); }
}

@keyframes alc-blink {
  0%, 96%, 100% { transform: translate3d(calc(var(--px) * 1.6px + var(--eye-mx)), calc(var(--py) * 1.1px + var(--eye-my)), 0) scaleY(1); }
  98% { transform: translate3d(calc(var(--px) * 1.6px + var(--eye-mx)), calc(var(--py) * 1.1px + var(--eye-my)), 0) scaleY(0.1); }
}

@keyframes alc-blink-once {
  0%, 100% { transform: translate3d(calc(var(--px) * 1.6px + var(--eye-mx)), calc(var(--py) * 1.1px + var(--eye-my)), 0) scaleY(1); }
  45% { transform: translate3d(calc(var(--px) * 1.6px + var(--eye-mx)), calc(var(--py) * 1.1px + var(--eye-my)), 0) scaleY(0.1); }
}

@keyframes alc-blink-fast {
  0%, 26%, 52%, 100% { transform: translate3d(calc(var(--px) * 1.6px + var(--eye-mx)), calc(var(--py) * 1.1px + var(--eye-my)), 0) scaleY(1); }
  13%, 39% { transform: translate3d(calc(var(--px) * 1.6px + var(--eye-mx)), calc(var(--py) * 1.1px + var(--eye-my)), 0) scaleY(0.1); }
}

/* Mobile: cena mais compacta, ancorada na base do painel */
@media (max-width: 640px) {
  .alc-stage {
    width: 260px;
    height: 196px;
    transform: scale(0.88);
    transform-origin: center bottom;
  }
}

@media (max-width: 380px) {
  .alc-stage {
    transform: scale(0.8);
  }
}

@media (prefers-reduced-motion: reduce) {
  .animated-login-characters *,
  .animated-login-characters *::before,
  .animated-login-characters *::after {
    animation-duration: 0.001ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.001ms !important;
  }

  .alc-depth,
  .alc-react,
  .alc-loop,
  .alc-eye,
  .alc-mouth,
  .alc-beak {
    transform: none !important;
  }
}
`;
