# Getting started

This page takes you from an empty editor to an indicator on the chart and a backtested strategy.

## Open the editor

Click **AlphaScript editor** in the icon rail on the right of the terminal. The editor opens over the side column;
drag its left edge to resize it. **Minimize** hides it and keeps your script open.

Click the script's name at the top of the editor to open the **script menu**: **New strategy**, **New indicator**,
**Rename…**, **Save a copy**, your saved scripts (**My scripts**) and the built-in **Examples**. The **More** menu
(`⋯`) holds the editor's options.

## Your first indicator

Open the script menu and choose **New indicator**. The editor fills with a short script:

```js
indicator({ name: "My indicator", version: "0.1", overlay: false });

const len = input.int("Length", 14, { min: 1 });
plot(ta.rsi(candle.close, len), { title: "RSI", color: "#7e57c2" });
hline(70, { color: "#5c6878" });
hline(30, { color: "#5c6878" });
```

Line by line:

1. `indicator({...})` declares the script an indicator. `overlay: false` gives it its own pane below the price chart.
2. `input.int("Length", 14, ...)` adds a setting called *Length* with default 14. It returns the number the user
   chose.
3. `ta.rsi(candle.close, len)` is a **series**: the RSI of the closing price, one value per bar. `plot()` draws it.
4. `hline()` draws fixed levels.

Click **Add to chart** (or press <kbd>Ctrl</kbd>+<kbd>Enter</kbd>). The RSI appears under the chart. Change `14` to
`21` and click **Update on chart**; with **⋯ → Update the chart while typing** switched on, the chart follows your
edits as you type.

If the script has an error, the editor's status line shows it with its line number, for example
`Line 4: Syntax error: Unexpected token`.

**Save** stores the script in **My scripts**. Every save is a new version, so you can go back.

## Your first strategy

Open the script menu and choose **New strategy**. This one trades an EMA crossover:

```js
strategy({ name: "My strategy", version: "0.1", market: "ALPHA:1", resolution: "15m",
           capital: { tao: 100 }, actOn: "confirmed", risk: { maxPriceImpactPct: 0.5 } });

const fastLen = input.int("Fast EMA", 9, { min: 2, max: 200 });
const slowLen = input.int("Slow EMA", 21, { min: 2, max: 400 });
const fast = ta.ema(candle.close, fastLen);
const slow = ta.ema(candle.close, slowLen);
const crossUp = ta.crossover(fast, slow);
const crossDown = ta.crossunder(fast, slow);
plot(fast, { title: "fast", color: "#2bb889" });
plot(slow, { title: "slow", color: "#f2b544" });

event.onCandle(() => {
  const size = account.equity() * 0.25;
  if (crossUp.value && pool.impact(size) < 0.0025)
    trade.buy({ tao: size, maxPrice: pool.price() * 1.01, ttlBlocks: 3, reason: "EMA cross up" });
  if (crossDown.value) trade.closePosition({ reason: "EMA cross down" });
});
```

What is new compared to the indicator:

- `strategy({...})` makes the script a strategy: it can trade. `capital` is the starting cash, `risk` sets limits the
  engine enforces (here: never fill with more than 0.5 % price impact).
- `crossUp` and `crossDown` are series too, declared **at the top level** next to the EMAs. Every `ta.*` series must
  be declared there; the handler only reads `.value`. See [Script structure](./script-structure).
- `event.onCandle(fn)` runs `fn` once each time a bar closes. That is where the strategy decides.
- `trade.buy()` asks to spend a quarter of the equity, at most 1 % above the current pool price, and gives the order 3
  blocks to fill. It only buys when the trade's impact is under 0.25 %, half the risk limit, so that selling the
  position again stays within the limit too. `trade.closePosition()` sells everything.

Click **Add to chart**. The strategy runs over the chart's history: its plots appear on the price pane, its fills as
markers, and the **Strategy tester** tab under the chart shows the result: net profit, drawdown, the equity curve, the
list of trades and the journal of everything the engine did.

`market` and `resolution` in the script are defaults: on the chart, the strategy always runs on the chart's subnet and
interval. Switch the chart to another subnet and the backtest reruns there.

## Next steps

- [Script structure](./script-structure): what goes at the top level and what goes in handlers.
- [Trading on the pool](./trading): how intents fill, and why `maxPrice` matters.
- [Backtesting](./backtesting): the fill models, the date range and how to read the tester.
