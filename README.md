# AlphaScript documentation

[![ci](https://github.com/marksantos1020/alphascript-docs/actions/workflows/ci.yml/badge.svg)](https://github.com/marksantos1020/alphascript-docs/actions/workflows/ci.yml)

AlphaScript is the scripting language of AlphaForge, a trading terminal for Bittensor subnet alpha
markets. You write indicators and trading strategies in plain JavaScript. They run on the block clock, trade through the
subnet's AMM pool, and backtest the same way they trade.

**Read the documentation: https://alphascript-docs.mark1020.workers.dev**

This repository holds the source of that site.

```js
strategy({ name: "EMA cross", version: "0.1", market: "ALPHA:61", resolution: "15m",
           capital: { tao: 100 }, risk: { maxPriceImpactPct: 0.5, maxPositionTao: 50 } });

const fast = ta.ema(candle.close, input.int("Fast EMA", 9, { min: 2 }));
const slow = ta.ema(candle.close, input.int("Slow EMA", 21, { min: 2 }));
const goLong = ta.crossover(fast, slow);
const goFlat = ta.crossunder(fast, slow);

event.onCandle(() => {
  const size = account.equity() * 0.25;
  if (goLong.value && pool.impact(size) < 0.0025)
    trade.buy({ tao: size, maxPrice: pool.price() * 1.01, ttlBlocks: 3 });
  if (goFlat.value && account.position().alpha > 0) trade.closePosition();
});
```

## What's in it

**Guide:** the manual, from a first indicator to risk limits.

| Start here | Concepts | Trading | More |
|---|---|---|---|
| [Introduction](guide/index.md) | [Series and the block clock](guide/series.md) | [Trading on the pool](guide/trading.md) | [Writing indicators](guide/indicators.md) |
| [Getting started](guide/getting-started.md) | [Events and execution order](guide/events.md) | [Conditional orders and risk](guide/orders-and-risk.md) | [Sandbox and limits](guide/limits.md) |
| [Script structure](guide/script-structure.md) | | [Backtesting](guide/backtesting.md) | [Coming from Pine Script](guide/from-pine.md) |

**API reference:** every function, property and type a script can use: `ta`, `math`, `candle` and `block` series,
`pool`, `account`, `trade`, `event`, inputs, plots, and the bar and runtime state.

**Examples:** the strategies and indicators built into AlphaForge, each with its full source and an explanation of
how it works and when to use it.

## Questions and corrections

Found a mistake, an unclear page or a missing example?
[Open an issue](https://github.com/marksantos1020/alphascript-docs/issues). Pull requests for the guide are welcome.

## Contributing

```bash
npm ci
npm run dev        # http://localhost:5173, reloads on save
npm run build      # the production build, fails on broken links
```

- **Guide pages** are the Markdown files in `guide/`. Edit them directly.
- **The API reference** (`reference/`) is generated from the type declarations of the AlphaScript runtime, which also
  drive the editor's autocomplete in AlphaForge. Change a description there, not in the generated page, then run
  `npm run gen` with the alphaforge-frontend checkout next to this one (or `ALPHASCRIPT_DIR` pointing at its
  `packages/alphascript`). Commit the regenerated pages with your change; `npm run gen:check` fails when they are stale.
- **Examples** (`examples/`) are generated the same way from AlphaForge's built-in scripts. The explanation of each
  is written by hand in `notes/examples/<id>.md`.

Every push to `main` is built and published by Cloudflare (Workers & Pages, Git integration, configured in
`wrangler.jsonc`). Build variables: `DOCS_URL`, the site's address, adds a sitemap; `APP_URL`, AlphaForge's address,
adds an "Open AlphaForge" link to the top bar.
