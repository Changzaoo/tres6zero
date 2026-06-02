import { useEffect } from 'react';

export function MouseAura() {
  useEffect(() => {
    if (!window.matchMedia('(pointer: fine)').matches) return;

    let frame = 0;
    function handlePointerMove(event: PointerEvent) {
      if (frame) return;
      frame = window.requestAnimationFrame(() => {
        const x = (event.clientX / window.innerWidth) * 100;
        const y = (event.clientY / window.innerHeight) * 100;
        document.documentElement.style.setProperty('--mx', `${x}%`);
        document.documentElement.style.setProperty('--my', `${y}%`);
        frame = 0;
      });
    }

    window.addEventListener('pointermove', handlePointerMove, { passive: true });
    return () => {
      window.removeEventListener('pointermove', handlePointerMove);
      if (frame) window.cancelAnimationFrame(frame);
    };
  }, []);

  return <div className="six3-aura hidden md:block" aria-hidden="true" />;
}
