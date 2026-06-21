// PRNG semeado + ruído leve, usados por auras (turbulência/flicker), partículas
// e light leaks. Tudo determinístico para que preview e export combinem.

export function clamp(value: number, min: number, max: number) {
  return value < min ? min : value > max ? max : value;
}

export function lerp(a: number, b: number, t: number) {
  return a + (b - a) * t;
}

export function smoothstep(t: number) {
  const x = clamp(t, 0, 1);
  return x * x * (3 - 2 * x);
}

/** PRNG mulberry32 — rápido, determinístico, bom o suficiente para efeitos. */
export function createRng(seed: number) {
  let a = seed >>> 0;
  return function rng() {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Hash 1D estável → 0..1. */
function hash1(n: number) {
  const s = Math.sin(n) * 43758.5453123;
  return s - Math.floor(s);
}

/** Ruído de valor 1D suave (interpolação cosseno). */
export function valueNoise1D(x: number) {
  const i = Math.floor(x);
  const f = x - i;
  const u = f * f * (3 - 2 * f);
  return lerp(hash1(i), hash1(i + 1), u);
}

/** Soma de oitavas — turbulência tipo "chama" para auras. */
export function fbm1D(x: number, octaves = 4) {
  let amplitude = 0.5;
  let frequency = 1;
  let sum = 0;
  for (let o = 0; o < octaves; o += 1) {
    sum += amplitude * valueNoise1D(x * frequency);
    frequency *= 2;
    amplitude *= 0.5;
  }
  return sum;
}

/** Ruído de valor 2D suave → 0..1. */
export function valueNoise2D(x: number, y: number) {
  const xi = Math.floor(x);
  const yi = Math.floor(y);
  const xf = x - xi;
  const yf = y - yi;
  const u = xf * xf * (3 - 2 * xf);
  const v = yf * yf * (3 - 2 * yf);
  const h = (a: number, b: number) => hash1(a * 157.31 + b * 311.7);
  const n00 = h(xi, yi);
  const n10 = h(xi + 1, yi);
  const n01 = h(xi, yi + 1);
  const n11 = h(xi + 1, yi + 1);
  return lerp(lerp(n00, n10, u), lerp(n01, n11, u), v);
}
