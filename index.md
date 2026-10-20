---
layout: home

hero:
  name: AlphaScript
  text: Indicators and strategies for subnet alpha markets
  tagline: JavaScript that runs on the block clock, trades through the AMM pool and backtests exactly the way it trades.
  image:
    src: /logo-128.png
    alt: AlphaScript
  actions:
    - theme: brand
      text: Get started
      link: /guide/getting-started
    - theme: alt
      text: API reference
      link: /reference/

features:
  - title: The block is the clock
    details: Every event is caused by a block and every timestamp is a block timestamp. Scripts never see wall-clock time.
  - title: Reserves are ground truth
    details: Price, price impact and fills come from the pool's reserves, never from a fixed slippage percentage.
  - title: Scripts emit intents
    details: A script asks to buy or sell. The engine fills the intent at a later block against the pool, or rejects it, and tells the script either way.
  - title: One script, every mode
    details: The same file draws an indicator, runs a backtest, paper trades on the live stream and trades live.
  - title: Deterministic
    details: The same script, data and settings produce the same journal byte for byte, so every backtest can be reproduced.
  - title: Sandboxed
    details: No network, files, keys or timers. The API in this reference is the only thing a script can see.
---

## A strategy in 20 lines

```js
strategy({ name: "EMA cross", version: "0.1", market: "ALPHA:61", resolution: "15m",
           capital: { tao: 100 }, risk: { maxPriceImpactPct: 0.5, maxPositionTao: 50 } });

const fast = ta.ema(candle.close, input.int("Fast EMA", 9, { min: 2 }));
const slow = ta.ema(candle.close, input.int("Slow EMA", 21, { min: 2 }));
const goLong = ta.crossover(fast, slow);
const goFlat = ta.crossunder(fast, slow);

plot(fast, { title: "EMA fast", color: "#2bb889" });
plot(slow, { title: "EMA slow", color: "#f2b544" });

event.onCandle(() => {
  const size = account.equity() * 0.25;
  if (goLong.value && pool.impact(size) < 0.0025)
    trade.buy({ tao: size, maxPrice: pool.price() * 1.01, ttlBlocks: 3 });
  if (goFlat.value && account.position().alpha > 0) trade.closePosition();
});
```

Series such as `fast` and `goLong` are declared once at the top level and advance on every bar. Handlers read their
current value with `.value` and decide what to trade. [Getting started](/guide/getting-started) walks through it.
