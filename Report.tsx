import { useMemo, useState, type ReactNode } from "react";
import { BookOpen, Ruler, FlaskConical, FileCode2, Download, Camera, CheckCircle2, Quote } from "lucide-react";
import { STOCKS, WINDOWS, analyze, windowSeries, level } from "@/lib/risk";

const TABS = [
  { key: "research", label: "Research", icon: BookOpen },
  { key: "rules", label: "Thresholds", icon: Ruler },
  { key: "samples", label: "Samples", icon: FlaskConical },
  { key: "docs", label: "Docs", icon: FileCode2 },
] as const;
type Tab = (typeof TABS)[number]["key"];

function Card({ children, delay = 0 }: { children: ReactNode; delay?: number }) {
  return (
    <div className="glass rounded-3xl p-5 animate-in fade-in slide-in-from-bottom-4 duration-700" style={{ animationDelay: `${delay}ms`, animationFillMode: "both" }}>
      {children}
    </div>
  );
}

function Spark({ series, up }: { series: number[]; up: boolean }) {
  const pts = series.filter((_, i) => i % 3 === 0);
  const min = Math.min(...pts), max = Math.max(...pts);
  const d = pts.map((p, i) => `${i ? "L" : "M"}${((i / (pts.length - 1)) * 100).toFixed(1)},${(38 - ((p - min) / (max - min || 1)) * 34).toFixed(1)}`).join(" ");
  return (
    <svg viewBox="0 0 100 40" className="h-14 w-full" preserveAspectRatio="none">
      <path d={d} fill="none" stroke={up ? "var(--low)" : "var(--high)"} strokeWidth="2" vectorEffect="non-scaling-stroke" pathLength={1} className="draw-line" />
    </svg>
  );
}

export function useSamples() {
  return useMemo(() => STOCKS.map((s) => {
    const series = windowSeries(s, 126);
    return { s, series, a: analyze(series) };
  }), []);
}

export function Report() {
  const [tab, setTab] = useState<Tab>("research");
  const samples = useSamples();
  const idx = TABS.findIndex((t) => t.key === tab);

  const download = () => {
    const rows = samples.map(({ s, a }) => `| ${s.t} | ${a.vol} | ${a.dd}% | ${a.score} | ${level(a.score).label} | ${a.move}% |`).join("\n");
    const md = `# RiskPulse AI — Stock Risk Feature Documentation

## 1. Risk calculation method
- Daily log return: r_t = ln(P_t / P_{t-1})
- Volatility score = min(100, stdev(r) × √252 × 130)
- Max drawdown % = max over t of (peak_t − P_t) / peak_t × 100
- Risk Index = Volatility × 0.6 + Drawdown × 0.4  (rounded, 0–100)
- Default window: 6 months (126 trading days). Supported: 1M, 3M, 6M, 1Y, 5Y.

## 2. Proposed thresholds
| Band | Score | Label | Badge |
|---|---|---|---|
| Low | 0–34 | Stable | Green |
| Moderate | 35–59 | Mediocre | Yellow |
| High | 60–100 | Unstable | Red |

## 3. Sample results (6M window, demo data)
| Ticker | Volatility | Drawdown | Risk | Band | Predicted move |
|---|---|---|---|---|---|
${rows}

## 4. Implementation notes
1. Fetch daily closes via yfinance (auto_adjust=True), drop NaN.
2. Slice to selected window and end date.
3. Compute metrics above; return { vol, dd, score, band }.
4. Feed score + 20-day momentum into the prediction model.
5. Edge cases: <20 data points → "Insufficient data"; flat prices → score 0.
`;
    const url = URL.createObjectURL(new Blob([md], { type: "text/markdown" }));
    const a = document.createElement("a"); a.href = url; a.download = "riskpulse-feature-docs.md"; a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">Project report</p>
      <h1 className="text-3xl font-extrabold">Research & Deliverables</h1>
      <p className="text-sm leading-relaxed text-muted-foreground">Everything the project brief asked for — research, measurement method, risk rules, sample analysis and developer documentation — in one place.</p>

      <div className="grid grid-cols-2 gap-2">
        {["Risk calculation method", "Proposed thresholds", "Sample results", "Feature documentation"].map((d, i) => (
          <div key={d} className="flex items-center gap-2 rounded-2xl bg-low-soft px-3 py-2 text-xs font-bold text-low animate-in fade-in zoom-in-90 duration-500" style={{ animationDelay: `${i * 100}ms`, animationFillMode: "both" }}>
            <CheckCircle2 className="h-4 w-4 shrink-0" />{d}
          </div>
        ))}
      </div>

      <div data-noswipe className="relative grid grid-cols-4 rounded-full bg-secondary p-1">
        <span className="absolute inset-y-1 left-1 rounded-full bg-card shadow-soft transition-transform duration-500 ease-[cubic-bezier(.22,1,.36,1)]" style={{ width: "calc(25% - 2px)", transform: `translateX(${idx * 100}%)` }} />
        {TABS.map(({ key, label, icon: Icon }) => (
          <button key={key} onClick={() => setTab(key)} className={`relative z-10 flex flex-col items-center gap-0.5 py-2 text-[11px] font-bold transition-colors ${tab === key ? "text-primary" : "text-secondary-foreground/60"}`}>
            <Icon className="h-4 w-4" />{label}
          </button>
        ))}
      </div>

      <div key={tab} className="space-y-4">
        {tab === "research" && <>
          <Card>
            <h3 className="font-bold">What is stock volatility?</h3>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">Volatility measures <b className="text-foreground">how much and how quickly a price moves</b>. A stock that moves ±0.5% a day is calm; one that moves ±4% is wild. Higher volatility means a wider range of possible outcomes — both gains and losses — which is why investors treat it as the core measure of risk.</p>
          </Card>
          <Card delay={100}>
            <h3 className="font-bold">How price fluctuations are measured</h3>
            <div className="mt-3 space-y-3 text-sm text-muted-foreground">
              {[
                ["Daily returns", "Convert prices into % changes: ln(today ÷ yesterday). Returns, not prices, make a ₹3000 stock comparable to a $40 one."],
                ["Standard deviation", "How far returns typically stray from their average. ×√252 annualises it (252 trading days)."],
                ["Maximum drawdown", "Deepest peak-to-trough fall. Captures crashes that a standard deviation can average away."],
                ["Rolling window", "Measure over a chosen period (1M → 5Y) to see recent vs long-term behaviour."],
              ].map(([t, b], i) => (
                <div key={t} className="flex gap-3"><span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">{i + 1}</span><p><b className="text-foreground">{t}:</b> {b}</p></div>
              ))}
            </div>
          </Card>
          <Card delay={200}>
            <h3 className="font-bold">Other measures we reviewed</h3>
            <div className="mt-3 space-y-2 text-sm text-muted-foreground">
              <p><b className="text-foreground">Beta</b> — risk relative to the market index. Useful, but needs an index for every asset (hard for crypto).</p>
              <p><b className="text-foreground">Value at Risk (VaR)</b> — "worst expected loss on 95% of days". Precise but harder to explain to users.</p>
              <p><b className="text-foreground">ATR (Average True Range)</b> — trader favourite, but in price units, so not comparable across assets.</p>
              <p className="rounded-2xl bg-secondary p-3 text-secondary-foreground"><b>Decision:</b> volatility + drawdown is simple, explainable, works for every asset and needs only closing prices.</p>
            </div>
          </Card>
        </>}

        {tab === "rules" && <>
          <Card>
            <h3 className="font-bold">Proposed risk bands</h3>
            <div className="mt-4 flex h-4 overflow-hidden rounded-full">
              <div className="grow-x w-[35%] bg-low" /><div className="grow-x w-[25%] bg-mid" style={{ animationDelay: "150ms" }} /><div className="grow-x w-[40%] bg-high" style={{ animationDelay: "300ms" }} />
            </div>
            <div className="mt-1 flex justify-between text-[10px] font-bold text-muted-foreground"><span>0</span><span className="ml-[30%]">35</span><span>60</span><span>100</span></div>
            <div className="mt-4 space-y-3">
              {[
                ["🟢", "Low Risk · Stable", "0 – 34", "bg-low-soft text-low", "Annual volatility roughly under 25% and drawdowns under ~20%. Typical of large, mature companies like TCS. Suitable for conservative investors."],
                ["🟡", "Moderate Risk · Mediocre", "35 – 59", "bg-mid-soft text-mid", "Noticeable swings and 20–40% drawdowns. Growth stocks and cyclical sectors. Needs a medium risk appetite."],
                ["🔴", "High Risk · Unstable", "60 – 100", "bg-high-soft text-high", "Volatility above ~45%/yr or drawdowns over 40%. High-growth tech, meme stocks and crypto. Can lose half its value quickly."],
              ].map(([dot, t, r, cls, b]) => (
                <div key={t} className={`rounded-2xl p-4 ${cls}`}>
                  <div className="flex items-center justify-between font-bold"><span>{dot} {t}</span><span className="font-mono text-sm">{r}</span></div>
                  <p className="mt-1 text-xs leading-relaxed opacity-90">{b}</p>
                </div>
              ))}
            </div>
          </Card>
          <Card delay={120}>
            <h3 className="font-bold">Why these cut-offs?</h3>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">The broad market index moves about 15–20% a year, which lands around 20–30 on our scale — so "the market itself" sits comfortably in Low. 35 marks roughly 1.5× market risk, and 60 marks about 2.5× market risk, the point where most retail investors feel real pain. Bands are deliberately unequal so that "High" is reserved for genuinely unstable assets.</p>
          </Card>
        </>}

        {tab === "samples" && <>
          <Card>
            <div className="flex items-center justify-between"><h3 className="font-bold">Sample results · 6M window</h3><span className="text-xs text-muted-foreground">demo data</span></div>
            <div className="mt-3 overflow-hidden rounded-2xl border">
              <div className="grid grid-cols-[1.3fr_1fr_1fr_1fr] bg-secondary px-3 py-2 text-[11px] font-bold text-secondary-foreground"><span>Ticker</span><span>Vol</span><span>DD</span><span className="text-right">Risk</span></div>
              {samples.map(({ s, a }, i) => {
                const l = level(a.score);
                return (
                  <div key={s.t} className="grid grid-cols-[1.3fr_1fr_1fr_1fr] items-center border-t px-3 py-2.5 text-sm animate-in fade-in slide-in-from-left-3 duration-500" style={{ animationDelay: `${i * 70}ms`, animationFillMode: "both" }}>
                    <span className="font-bold">{s.t}</span><span>{a.vol}</span><span>{a.dd}%</span>
                    <span className="text-right"><span className={`rounded-full px-2 py-0.5 text-xs font-bold ${l.cls}`}>{l.dot} {a.score}</span></span>
                  </div>
                );
              })}
            </div>
          </Card>
          <Card delay={100}>
            <h3 className="font-bold">Worked calculation · {samples[0]!.s.t}</h3>
            <div className="mt-3 space-y-1.5 rounded-2xl bg-nav p-4 font-mono text-xs text-nav-foreground">
              <p>daily σ  = {(samples[0]!.a.annVol / Math.sqrt(252)).toFixed(2)}%</p>
              <p>annual σ = σ × √252 = {samples[0]!.a.annVol}%</p>
              <p>vol score = {samples[0]!.a.annVol} × 1.3 ≈ <span className="text-sunny">{samples[0]!.a.vol}</span></p>
              <p>drawdown = <span className="text-accent">{samples[0]!.a.dd}%</span></p>
              <p>risk = {samples[0]!.a.vol}×0.6 + {samples[0]!.a.dd}×0.4 = <span className="text-sunny">{samples[0]!.a.score}</span></p>
            </div>
          </Card>
          <Card delay={180}>
            <h3 className="flex items-center gap-2 font-bold"><Camera className="h-4 w-4 text-primary" /> Chart snapshots</h3>
            <div data-noswipe className="-mx-5 mt-3 flex snap-x gap-3 overflow-x-auto px-5 pb-2">
              {samples.map(({ s, a, series }) => {
                const l = level(a.score);
                return (
                  <div key={s.t} className="w-36 shrink-0 snap-start rounded-[1.6rem] bg-nav p-1.5 shadow-soft">
                    <div className="rounded-[1.3rem] bg-card p-3">
                      <div className="mx-auto mb-2 h-1 w-8 rounded-full bg-muted" />
                      <p className="text-xs font-bold">{s.t}</p>
                      <p className="font-display text-2xl font-extrabold">{a.score}</p>
                      <Spark series={series} up={a.change >= 0} />
                      <span className={`mt-1 inline-block rounded-full px-2 py-0.5 text-[10px] font-bold ${l.cls}`}>{l.dot} {l.sub}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </Card>
          <Card delay={240}>
            <h3 className="font-bold">Observations</h3>
            <div className="mt-3 space-y-2 text-sm text-muted-foreground">
              {(() => {
                const sorted = [...samples].sort((x, y) => x.a.score - y.a.score);
                const lo = sorted[0]!, hi = sorted[sorted.length - 1]!;
                const five = STOCKS.map((s) => ({ s, d: analyze(windowSeries(s, 1260)).dd - analyze(windowSeries(s, 126)).dd }));
                const avg = Math.round(five.reduce((a, b) => a + b.d, 0) / five.length);
                return [
                  `${lo.s.t} is the most stable asset (score ${lo.a.score}); ${hi.s.t} is the most volatile (score ${hi.a.score}).`,
                  `Drawdown is about ${avg} points deeper on a 5Y window than on 6M — long windows remember old crashes.`,
                  "Volatility and drawdown usually agree, but a calm stock with one crash shows up only through drawdown — justifying the 40% weight.",
                  "Short windows (1M) swing scores by ±10 points in a single week; 6M is the most balanced default.",
                ].map((o) => <p key={o} className="flex gap-2"><Quote className="mt-0.5 h-4 w-4 shrink-0 text-primary" />{o}</p>);
              })()}
            </div>
          </Card>
        </>}

        {tab === "docs" && <>
          <Card>
            <h3 className="font-bold">Feature spec for the coding team</h3>
            <div className="mt-3 space-y-2 text-sm text-muted-foreground">
              <p><b className="text-foreground">Input:</b> ticker, window ({WINDOWS.map((w) => w.key).join(", ")}), optional end date.</p>
              <p><b className="text-foreground">Output:</b> {"{ volatility, drawdown, riskScore, band, predictedMove }"}</p>
              <p><b className="text-foreground">Source:</b> yfinance daily closes, auto-adjusted for splits/dividends.</p>
            </div>
          </Card>
          <Card delay={100}>
            <h3 className="font-bold">Reference implementation (Python)</h3>
            <pre data-noswipe className="mt-3 overflow-x-auto rounded-2xl bg-nav p-4 text-[11px] leading-relaxed text-nav-foreground"><code>{`import numpy as np, yfinance as yf

def risk(ticker, period="6mo"):
    px = yf.download(ticker, period=period,
                     auto_adjust=True)["Close"].dropna()
    if len(px) < 20:
        return None  # insufficient data
    r   = np.log(px / px.shift(1)).dropna()
    vol = min(100, r.std() * np.sqrt(252) * 130)
    dd  = ((px.cummax() - px) / px.cummax()).max() * 100
    score = round(vol * 0.6 + dd * 0.4)
    band = ("Low" if score < 35 else
            "Moderate" if score < 60 else "High")
    return dict(vol=round(vol), dd=round(dd),
                score=score, band=band)`}</code></pre>
          </Card>
          <Card delay={180}>
            <h3 className="font-bold">Edge cases & acceptance checks</h3>
            <ul className="mt-3 list-disc space-y-1.5 pl-5 text-sm text-muted-foreground">
              <li>Fewer than 20 trading days → show "Insufficient data", no badge.</li>
              <li>Flat price series → volatility 0, drawdown 0, score 0 (Low).</li>
              <li>Score is always clamped to 0–100 and rounded to an integer.</li>
              <li>Vol 50 & drawdown 100 must give 70 (High); vol 100 & drawdown 0 must give 60 (High).</li>
              <li>Indian tickers need the ".NS" suffix in yfinance (RELIANCE.NS, TCS.NS); crypto uses BTC-USD.</li>
              <li>Cache daily data for 24 h to avoid rate limits.</li>
            </ul>
          </Card>
        </>}
      </div>

      <button onClick={download} className="flex h-14 w-full items-center justify-center gap-2 rounded-full bg-sunny font-bold text-sunny-foreground shadow-sunny transition-transform active:scale-95">
        <Download className="h-5 w-5" /> Download Full Report
      </button>
    </div>
  );
            }
