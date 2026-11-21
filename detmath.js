// Deterministic maths for online fights: only + - * / and sqrt (all exactly specified by IEEE 754), so every device gets the same bits.
// The browser's own Math.sin / cos / pow / exp ... differ in the last digit between CPU types, which slowly splits two fights apart.
(function (root) {
  const PI = 3.141592653589793, HALF_PI = 1.5707963267948966, LN2 = 0.6931471805599453;
  const PIO2_1 = 1.57079632673412561417e+00, PIO2_1T = 6.07710050650619224932e-11;
  const S1 = -1.66666666666666324348e-01, S2 = 8.33333333332248946124e-03, S3 = -1.98412698298579493134e-04, S4 = 2.75573137070700676789e-06, S5 = -2.50507602534068634195e-08, S6 = 1.58969099521155010221e-10;
  const C1 = 4.16666666666666019037e-02, C2 = -1.38888888888741095749e-03, C3 = 2.48015872894767294178e-05, C4 = -2.75573143513906633035e-07, C5 = 2.08757232129817482790e-09, C6 = -1.13596475577881948265e-11;
  const ksin = x => { const z = x * x, v = z * x, r = S2 + z * (S3 + z * (S4 + z * (S5 + z * S6))); return x + v * (S1 + z * r); };
  const kcos = x => { const z = x * x, r = z * (C1 + z * (C2 + z * (C3 + z * (C4 + z * (C5 + z * C6))))), hz = .5 * z, w = 1 - hz; return w + (((1 - w) - hz) + z * r); };
  const reduce = x => { const k = Math.round(x / HALF_PI); return [k, (x - k * PIO2_1) - k * PIO2_1T]; }; // Math.round, floor and abs are exact
  function sin(x) { x = +x; if (!(Math.abs(x) < 1e6)) return NaN; const [k, r] = reduce(x), n = ((k % 4) + 4) % 4; return n === 0 ? ksin(r) : n === 1 ? kcos(r) : n === 2 ? -ksin(r) : -kcos(r); }
  function cos(x) { x = +x; if (!(Math.abs(x) < 1e6)) return NaN; const [k, r] = reduce(x), n = ((k % 4) + 4) % 4; return n === 0 ? kcos(r) : n === 1 ? -ksin(r) : n === 2 ? -kcos(r) : ksin(r); }
  function atanAbs(t) { // t >= 0: halve the angle twice with sqrt, then a short series
    let m = 1; if (t > 1) { t = 1 / t; m = -1; }
    t = t / (1 + Math.sqrt(1 + t * t)); t = t / (1 + Math.sqrt(1 + t * t));
    const z = t * t; let s = 0, p = t;
    for (let i = 0; i < 14; i++) { s += p / (2 * i + 1); p = -p * z; }
    s *= 4; return m > 0 ? s : HALF_PI - s;
  }
  function atan(x) { x = +x; if (x !== x) return NaN; return x < 0 ? -atanAbs(-x) : atanAbs(x); }
  function atan2(y, x) {
    y = +y; x = +x; if (y !== y || x !== x) return NaN;
    if (x === 0 && y === 0) return 1 / y < 0 ? -0 : (1 / x < 0 ? PI : 0) * (1 / y < 0 ? -1 : 1);
    if (x === 0) return y > 0 ? HALF_PI : -HALF_PI;
    if (y === 0) return x > 0 ? y : (1 / y < 0 ? -PI : PI);
    const a = atanAbs(Math.abs(y / x));
    if (x > 0) return y > 0 ? a : -a;
    return y > 0 ? PI - a : a - PI;
  }
  function exp(x) {
    x = +x; if (x !== x) return NaN; if (x > 709) return Infinity; if (x < -745) return 0;
    const k = Math.round(x / LN2), r = (x - k * 6.93147180369123816490e-01) - k * 1.90821492927058770002e-10; // ln2 split in high and low part
    let s = 1, t = 1; for (let i = 1; i < 16; i++) { t = t * r / i; s += t; }
    let sc = 1; const a = k < 0 ? -k : k; for (let i = 0; i < a; i++) sc *= 2;
    return k < 0 ? s / sc : s * sc;
  }
  function log(x) {
    x = +x; if (x !== x || x < 0) return NaN; if (x === 0) return -Infinity; if (x === Infinity) return Infinity;
    let k = 0; while (x > 1.4142135623730951) { x /= 2; k++; } while (x < .7071067811865476) { x *= 2; k--; }
    const s = (x - 1) / (x + 1), z = s * s; let sum = 0, p = s;
    for (let i = 0; i < 14; i++) { sum += p / (2 * i + 1); p *= z; }
    return k * 6.93147180369123816490e-01 + (k * 1.90821492927058770002e-10 + 2 * sum);
  }
  function pow(a, b) {
    a = +a; b = +b; if (b === 0) return 1; if (a !== a || b !== b) return NaN; if (b === 1) return a;
    const isInt = b === Math.floor(b) && Math.abs(b) <= 64;
    if (isInt) { let n = Math.abs(b), r = 1, base = a; while (n) { if (n & 1) r *= base; base *= base; n >>= 1; } return b < 0 ? 1 / r : r; }
    if (a === 0) return b > 0 ? 0 : Infinity; if (a < 0) return NaN;
    return exp(b * log(a));
  }
  const hypot = (...v) => { let s = 0; for (const e of v) s += e * e; return Math.sqrt(s); };
  const fns = { sin, cos, atan, atan2, exp, log, pow, hypot, log2: x => log(x) / LN2, log10: x => log(x) / 2.302585092994046 };
  const orig = {}; for (const k in fns) orig[k] = Math[k];
  root.DetMath = { fns, orig, on() { for (const k in fns) Math[k] = fns[k]; }, off() { for (const k in orig) Math[k] = orig[k]; } };
})(typeof window !== 'undefined' ? window : globalThis);
