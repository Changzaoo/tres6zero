import { useEffect, useRef, useState, type PointerEvent, type ReactNode } from 'react';

export type CharacterMood = 'idle' | 'hover' | 'focus' | 'typing' | 'error' | 'success';

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
          <Character
            name="orange"
            body={<><span className="alc-eye orange-eye-a" /><span className="alc-eye orange-eye-b" /><span className="alc-mouth orange-mouth" /></>}
          />
          <Character
            name="purple"
            body={<><span className="alc-eye purple-eye-a" /><span className="alc-eye purple-eye-b" /><span className="alc-mouth purple-mouth" /></>}
          />
          <Character
            name="black"
            body={<><span className="alc-eye black-eye-a" /><span className="alc-eye black-eye-b" /></>}
          />
          <Character
            name="yellow"
            body={<><span className="alc-eye yellow-eye" /><span className="alc-mouth yellow-mouth" /></>}
          />
        </div>
      </div>
    </div>
  );
}

function Character({ name, body }: { name: 'orange' | 'purple' | 'black' | 'yellow'; body: ReactNode }) {
  return (
    <div className={`alc-character alc-${name}`}>
      <div className="alc-enter">
        <div className="alc-depth">
          <div className="alc-react">
            <div className="alc-loop">
              <div className="alc-body">
                <div className="alc-face">{body}</div>
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
  --field-x: 0px;
  --field-y: 0px;
  --eye-extra-x: 0px;
  --eye-extra-y: 0px;
  display: flex;
  width: 100%;
  height: 100%;
  align-items: center;
  justify-content: center;
  overflow: hidden;
}

.animated-login-characters[data-field="email"] {
  --field-y: -1.5px;
}

.animated-login-characters[data-field="password"] {
  --field-y: 1.2px;
}

.animated-login-characters[data-mood="focus"],
.animated-login-characters[data-mood="typing"] {
  --field-x: 2px;
}

.animated-login-characters[data-mood="typing"] {
  --eye-extra-x: 1.2px;
  --eye-extra-y: -0.5px;
}

.animated-login-characters[data-mood="error"] {
  --eye-extra-x: -1px;
}

.alc-shake {
  transform: translate3d(0, 0, 0);
}

.animated-login-characters[data-mood="error"] .alc-shake {
  animation: alc-scene-error 520ms ease-in-out both;
}

.alc-stage {
  position: relative;
  width: 292px;
  height: 238px;
  max-width: 100%;
  transform: translateZ(0);
}

.alc-character {
  position: absolute;
  transform-style: preserve-3d;
  will-change: transform, opacity;
}

.alc-enter,
.alc-depth,
.alc-react,
.alc-loop,
.alc-body,
.alc-face {
  position: relative;
  width: 100%;
  height: 100%;
}

.alc-enter {
  opacity: 0;
  will-change: transform, opacity;
}

.alc-depth,
.alc-react,
.alc-loop,
.alc-body,
.alc-face,
.alc-eye,
.alc-mouth {
  will-change: transform;
}

.alc-orange {
  left: 24px;
  bottom: 48px;
  z-index: 4;
  width: 134px;
  height: 74px;
}

.alc-purple {
  left: 106px;
  bottom: 78px;
  z-index: 3;
  width: 74px;
  height: 128px;
}

.alc-black {
  left: 166px;
  bottom: 78px;
  z-index: 5;
  width: 58px;
  height: 98px;
}

.alc-yellow {
  right: 22px;
  bottom: 48px;
  z-index: 2;
  width: 64px;
  height: 90px;
}

.alc-orange .alc-enter {
  animation: alc-enter-orange 760ms cubic-bezier(0.16, 1, 0.3, 1) 600ms both;
}

.alc-purple .alc-enter {
  animation: alc-enter-purple 860ms cubic-bezier(0.16, 1, 0.3, 1) 500ms both;
}

.alc-black .alc-enter {
  animation: alc-enter-black 760ms cubic-bezier(0.16, 1, 0.3, 1) 420ms both;
}

.alc-yellow .alc-enter {
  animation: alc-enter-yellow 780ms cubic-bezier(0.16, 1, 0.3, 1) 570ms both;
}

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

.alc-orange .alc-loop {
  animation: alc-orange-idle 4.2s ease-in-out 900ms infinite;
}

.alc-purple .alc-loop {
  animation: alc-purple-idle 4.6s ease-in-out 720ms infinite;
}

.alc-black .alc-loop {
  animation: alc-black-idle 3.7s ease-in-out 1050ms infinite;
}

.alc-yellow .alc-loop {
  animation: alc-yellow-idle 3.9s ease-in-out 820ms infinite;
}

.alc-orange .alc-react,
.alc-purple .alc-react,
.alc-black .alc-react,
.alc-yellow .alc-react {
  transition: transform 420ms cubic-bezier(0.16, 1, 0.3, 1);
}

.animated-login-characters[data-mood="focus"] .alc-orange .alc-react {
  transform: translate3d(1px, -1px, 0);
}

.animated-login-characters[data-mood="focus"] .alc-purple .alc-react {
  transform: translate3d(6px, 0, 0) rotate(3deg) skewX(-1deg);
}

.animated-login-characters[data-mood="focus"] .alc-black .alc-react {
  transform: translate3d(2px, 0, 0) rotate(-2deg);
}

.animated-login-characters[data-mood="focus"] .alc-yellow .alc-react {
  transform: translate3d(0, -2px, 0);
}

.animated-login-characters[data-mood="typing"] .alc-purple .alc-react {
  animation: alc-purple-typing 1650ms cubic-bezier(0.16, 1, 0.3, 1) 200ms both;
}

.animated-login-characters[data-mood="typing"] .alc-black .alc-react {
  transform: translate3d(3px, -1px, 0) rotate(-1deg);
}

.animated-login-characters[data-mood="typing"] .alc-yellow .alc-react {
  transform: translate3d(1px, -1px, 0);
}

.animated-login-characters[data-mood="error"] .alc-purple .alc-react {
  transform: translate3d(-2px, 0, 0) rotate(-5deg) skewX(2deg);
}

.animated-login-characters[data-mood="error"] .alc-black .alc-react {
  animation: alc-black-error 520ms ease-in-out both;
}

.animated-login-characters[data-mood="error"] .alc-yellow .alc-react {
  animation: alc-yellow-error 520ms ease-in-out both;
}

.animated-login-characters[data-mood="success"] .alc-purple .alc-react {
  transform: translate3d(0, -6px, 0) rotate(-2deg);
}

.animated-login-characters[data-mood="success"] .alc-black .alc-react {
  transform: translate3d(0, -2px, 0) rotate(0deg);
}

.animated-login-characters[data-mood="success"] .alc-yellow .alc-react {
  animation: alc-yellow-success 500ms ease-out both;
}

.alc-orange .alc-body {
  overflow: hidden;
  border-radius: 74px 74px 0 0;
  background: #ff8a22;
  transform-origin: bottom center;
}

.alc-purple .alc-body {
  overflow: hidden;
  border-radius: 5px;
  background: #8b5cf6;
  clip-path: polygon(6% 0, 100% 2%, 96% 100%, 0 98%);
  transform-origin: bottom center;
  transition: clip-path 700ms cubic-bezier(0.16, 1, 0.3, 1), border-radius 700ms cubic-bezier(0.16, 1, 0.3, 1);
}

.animated-login-characters[data-mood="typing"] .alc-purple .alc-body {
  animation: alc-purple-body-typing 1650ms cubic-bezier(0.16, 1, 0.3, 1) 200ms both;
}

.alc-black .alc-body {
  overflow: hidden;
  border-radius: 5px;
  background: #151923;
  box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.09);
  transform-origin: bottom center;
}

.alc-yellow .alc-body {
  overflow: hidden;
  border-radius: 30px 999px 999px 30px;
  background: #f4c400;
  transform-origin: center bottom;
}

.alc-eye,
.alc-mouth {
  position: absolute;
  display: block;
  pointer-events: none;
}

.alc-eye {
  width: 5px;
  height: 5px;
  border-radius: 999px;
  transform: translate3d(calc(var(--px) * 1.6px + var(--field-x) + var(--eye-extra-x)), calc(var(--py) * 1.1px + var(--field-y) + var(--eye-extra-y)), 0);
}

.alc-mouth {
  transform: translate3d(calc(var(--px) * 1px + var(--field-x)), calc(var(--py) * 0.6px + var(--field-y)), 0);
}

.orange-eye-a {
  left: 70px;
  top: 33px;
  background: #101010;
}

.orange-eye-b {
  left: 91px;
  top: 34px;
  background: #101010;
}

.orange-mouth {
  left: 80px;
  top: 50px;
  width: 13px;
  height: 3px;
  border-radius: 999px;
  background: #101010;
}

.purple-eye-a {
  left: 25px;
  top: 61px;
  width: 4px;
  height: 6px;
  background: rgba(255, 255, 255, 0.92);
}

.purple-eye-b {
  left: 47px;
  top: 61px;
  width: 4px;
  height: 6px;
  background: rgba(255, 255, 255, 0.92);
}

.purple-mouth {
  left: 31px;
  top: 87px;
  width: 13px;
  height: 3px;
  border-radius: 999px;
  background: rgba(10, 10, 12, 0.78);
}

.black-eye-a {
  left: 22px;
  top: 46px;
  background: rgba(255, 255, 255, 0.92);
}

.black-eye-b {
  left: 42px;
  top: 47px;
  background: rgba(255, 255, 255, 0.92);
}

.yellow-eye {
  left: 21px;
  top: 38px;
  background: #101010;
}

.yellow-mouth {
  left: 27px;
  top: 56px;
  width: 34px;
  height: 2px;
  background: #101010;
}

.alc-purple .alc-eye {
  animation: alc-blink 150ms ease-in-out 4.6s infinite;
  animation-delay: 1600ms;
}

.alc-black .alc-eye {
  animation: alc-blink 150ms ease-in-out 5.1s infinite;
  animation-delay: 2300ms;
}

.animated-login-characters[data-mood="error"] .alc-black .alc-eye {
  animation: alc-blink-fast 520ms ease-in-out both;
}

.animated-login-characters[data-mood="focus"] .alc-black .alc-eye {
  animation: alc-blink-once 360ms ease-in-out both;
}

.animated-login-characters[data-mood="typing"] .purple-eye-a {
  animation: none;
  transform: translate3d(calc(var(--px) * 1.8px + 2px), calc(var(--py) * 1px - 3px), 0) scaleY(1.25);
}

.animated-login-characters[data-mood="typing"] .purple-eye-b {
  animation: none;
  transform: translate3d(calc(var(--px) * 1.8px + 5px), calc(var(--py) * 1px - 1px), 0) scaleY(0.85);
}

.animated-login-characters[data-mood="typing"] .purple-mouth {
  transform: translate3d(4px, -2px, 0) rotate(8deg);
  width: 17px;
}

@keyframes alc-enter-black {
  0% { opacity: 0; transform: translate3d(0, -20px, 0) rotate(-8deg) scale(0.94); }
  100% { opacity: 1; transform: translate3d(0, 0, 0) rotate(-4deg) scale(1); }
}

@keyframes alc-enter-purple {
  0% { opacity: 0; transform: translate3d(0, 20px, 0) rotate(-2deg) scale(0.94); }
  100% { opacity: 1; transform: translate3d(0, 0, 0) rotate(0deg) scale(1); }
}

@keyframes alc-enter-yellow {
  0% { opacity: 0; transform: translate3d(12px, 18px, 0) scale(0.95); }
  100% { opacity: 1; transform: translate3d(0, 0, 0) scale(1); }
}

@keyframes alc-enter-orange {
  0% { opacity: 0; transform: translate3d(0, 18px, 0) scale(0.97); }
  100% { opacity: 1; transform: translate3d(0, 0, 0) scale(1); }
}

@keyframes alc-orange-idle {
  0%, 100% { transform: translate3d(0, 0, 0); }
  50% { transform: translate3d(0, -4px, 0); }
}

@keyframes alc-purple-idle {
  0%, 100% { transform: translate3d(0, 0, 0) rotate(-1deg); }
  50% { transform: translate3d(0, -4px, 0) rotate(1deg); }
}

@keyframes alc-black-idle {
  0%, 100% { transform: translate3d(0, 0, 0) rotate(-4deg); }
  50% { transform: translate3d(0, -2px, 0) rotate(-3.2deg); }
}

@keyframes alc-yellow-idle {
  0%, 100% { transform: translate3d(-3px, 0, 0); }
  50% { transform: translate3d(3px, -2px, 0); }
}

@keyframes alc-purple-typing {
  0% { transform: translate3d(6px, 0, 0) rotate(3deg) skewX(-1deg); }
  34% { transform: translate3d(16px, -4px, 0) rotate(11deg) skewX(-8deg); }
  52% { transform: translate3d(16px, -4px, 0) rotate(11deg) skewX(-8deg); }
  100% { transform: translate3d(5px, 0, 0) rotate(3deg) skewX(-1deg); }
}

@keyframes alc-purple-body-typing {
  0% {
    border-radius: 5px;
    clip-path: polygon(6% 0, 100% 2%, 96% 100%, 0 98%);
  }
  34% {
    border-radius: 8px 4px 7px 5px;
    clip-path: polygon(0 7%, 87% 0, 100% 100%, 20% 96%);
  }
  52% {
    border-radius: 8px 4px 7px 5px;
    clip-path: polygon(0 7%, 87% 0, 100% 100%, 20% 96%);
  }
  100% {
    border-radius: 5px;
    clip-path: polygon(6% 0, 100% 2%, 96% 100%, 0 98%);
  }
}

@keyframes alc-scene-error {
  0%, 100% { transform: translate3d(0, 0, 0); }
  18% { transform: translate3d(-4px, 0, 0); }
  38% { transform: translate3d(4px, 0, 0); }
  58% { transform: translate3d(-2px, 0, 0); }
  78% { transform: translate3d(2px, 0, 0); }
}

@keyframes alc-black-error {
  0%, 100% { transform: translate3d(0, 0, 0) rotate(-2deg); }
  25% { transform: translate3d(-3px, 0, 0) rotate(-5deg); }
  50% { transform: translate3d(3px, 0, 0) rotate(0deg); }
  75% { transform: translate3d(-2px, 0, 0) rotate(-4deg); }
}

@keyframes alc-yellow-error {
  0%, 100% { transform: translate3d(0, 0, 0); }
  25% { transform: translate3d(-4px, 0, 0); }
  50% { transform: translate3d(4px, -1px, 0); }
  75% { transform: translate3d(-2px, 0, 0); }
}

@keyframes alc-yellow-success {
  0%, 100% { transform: translate3d(0, 0, 0); }
  45% { transform: translate3d(0, -3px, 0); }
}

@keyframes alc-blink {
  0%, 96%, 100% { transform: translate3d(calc(var(--px) * 1.6px + var(--field-x) + var(--eye-extra-x)), calc(var(--py) * 1.1px + var(--field-y) + var(--eye-extra-y)), 0) scaleY(1); }
  98% { transform: translate3d(calc(var(--px) * 1.6px + var(--field-x) + var(--eye-extra-x)), calc(var(--py) * 1.1px + var(--field-y) + var(--eye-extra-y)), 0) scaleY(0.1); }
}

@keyframes alc-blink-once {
  0%, 100% { transform: translate3d(calc(var(--px) * 1.6px + var(--field-x) + var(--eye-extra-x)), calc(var(--py) * 1.1px + var(--field-y) + var(--eye-extra-y)), 0) scaleY(1); }
  45% { transform: translate3d(calc(var(--px) * 1.6px + var(--field-x) + var(--eye-extra-x)), calc(var(--py) * 1.1px + var(--field-y) + var(--eye-extra-y)), 0) scaleY(0.1); }
}

@keyframes alc-blink-fast {
  0%, 26%, 52%, 100% { transform: translate3d(calc(var(--px) * 1.6px + var(--field-x) + var(--eye-extra-x)), calc(var(--py) * 1.1px + var(--field-y) + var(--eye-extra-y)), 0) scaleY(1); }
  13%, 39% { transform: translate3d(calc(var(--px) * 1.6px + var(--field-x) + var(--eye-extra-x)), calc(var(--py) * 1.1px + var(--field-y) + var(--eye-extra-y)), 0) scaleY(0.1); }
}

@media (max-width: 520px) {
  .alc-stage {
    transform: scale(0.9);
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
  .alc-mouth {
    transform: none !important;
  }
}
`;
