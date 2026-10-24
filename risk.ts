export type Stock = { t: string; name: string; sigma: number; drift: number; seed: number; start: number };

export const STOCKS: Stock[] = [
  { t: "AAPL", name: "Apple Inc.", sigma: 0.013, drift: 0.0006, seed: 3, start: 120 },
  { t: "TSLA", name: "Tesla Inc.", sigma: 0.034, drift: 0.0004, seed: 7, start: 210 },
  { t: "RELIANCE", name: "Reliance Industries", sigma: 0.016, drift: 0.0004, seed: 11, start: 2100 },
  { t: "TCS", name: "Tata Consultancy", sigma: 0.012, drift: 0.0003, seed: 5, start: 3200 },
  { t: "NVDA", name: "NVIDIA Corp.", sigma: 0.028, drift: 0.0012, seed: 13, start: 40 },
  { t: "CRYPTO", name: "BTC Index", sigma: 0.042, drift: 0.0007, seed: 17, start: 30000 },
];

export type Window = { key: string; label: string; days: number; blurb: string };
export const WINDOWS: Window[] = [
  { key: "1M", label: "1 Month", days: 21, blurb: "Very recent data. Reacts instantly to news, earnings and shocks — but can over-react to one wild week." },
  { key: "3M", label: "3 Months", days: 63, blurb: "One earnings quarter. Captures the current trend while smoothing out single-day noise." },
  { key: "6M", label: "6 Months", days: 126, blurb: "The default engine window. A balance between staying current and seeing a full mini-cycle." },
  { key: "1Y", label: "1 Year", days: 252, blurb: "All four seasons of trading. Includes every earnings cycle and most macro events of the year." },
  { key: "5Y", label: "5 Years", days: 1260, blurb: "Long memory. Remembers crashes and bull runs — slow to change, best for long-term investors." },
];

export const TOTAL_DAYS = 1260;

function rng(seed: number) {
  let a = seed * 2654435761;
  return () => {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const cache = new Map<string, number[]>();
/** Deterministic demo price history (5 years of trading days). */
export function prices(s: Stock): number[] {
  const hit = cache.get(s.t);
  if (hit) return hit;
  const r = rng(s.seed);
  const out = [s.start];
  for (let i = 1; i < TOTAL_DAYS; i++) {
    const regime = 1 + 0.6 * Math.sin(i / 90 + s.seed);
    const z = Math.sqrt(-2 * Math.log(r() + 1e-9)) * Math.cos(2 * Math.PI * r());
    out.push(out[i - 1]! * Math.exp(s.drift + s.sigma * regime * z));
  }
  cache.set(s.t, out);
  return out;
}

export const riskIndex = (vol: number, dd: number) => Math.round(vol * 0.6 + dd * 0.4);

export function analyze(series: number[]) {
  const rets = series.slice(1).map((p, i) => Math.log(p / series[i]!));
  const mean = rets.reduce((a, b) => a + b, 0) / rets.length;
  const sd = Math.sqrt(rets.reduce((a, b) => a + (b - mean) ** 2, 0) / rets.length);
  const annVol = sd * Math.sqrt(252);
  let peak = series[0]!, maxDd = 0;
  for (const p of series) { peak = Math.max(peak, p); maxDd = Math.max(maxDd, (peak - p) / peak); }
  const vol = Math.min(100, Math.round(annVol * 130));
  const dd = Math.round(maxDd * 100);
  const change = (series[series.length - 1]! / series[0]! - 1) * 100;
  const last20 = series.slice(-20);
  const momentum = (last20[last20.length - 1]! / last20[0]! - 1) * 100;
  const move = Math.round(momentum * 0.6 * 10) / 10;
  return { vol, dd, score: riskIndex(vol, dd), annVol: Math.round(annVol * 1000) / 10, change: Math.round(change * 10) / 10, move };
}

export function windowSeries(s: Stock, days: number, endOffset = 0) {
  const all = prices(s);
  const end = all.length - endOffset;
  return all.slice(Math.max(0, end - days), end);
}

export const level = (s: number) =>
  s < 35 ? { label: "Low Risk", sub: "Stable", dot: "🟢", cls: "bg-low-soft text-low", bar: "bg-low" }
  : s < 60 ? { label: "Moderate Risk", sub: "Mediocre", dot: "🟡", cls: "bg-mid-soft text-mid", bar: "bg-mid" }
  : { label: "High Risk", sub: "Unstable", dot: "🔴", cls: "bg-high-soft text-high", bar: "bg-high" };
  
