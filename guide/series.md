# Series and the block clock

## Blocks and bars

The chain produces a block about every 12 seconds. Each block carries the pool's state after it: the price, the
reserves, the moving price, and the trades that went through the pool.

A **bar** (candle) of a given resolution is every block whose timestamp falls into one time bucket of that length,
aligned to UTC. A 15-minute bar holds about 75 blocks; resolution `"1B"` makes every block its own bar.

- The bar **opens** with the first block of its bucket: `open` is the price at that block.
- Each later block **updates** it: `high`, `low`, `close`, volume and trade count.
- The bar is **confirmed** when the first block of the next bucket arrives. This is when `event.onCandle` runs.
- The bar is **final** when its last block is finalized by the chain and can no longer be replaced. A strategy with
  `actOn: "final"` waits for that instead.

## Series

A **series** is a sequence of numbers, one per bar or one per block, that grows as the run advances. The data series
are built in, and every `ta.*` function returns a new one:

```js
const close = candle.close;                // one value per bar
const basis = ta.sma(close, 20);           // also one value per bar
const pool = block.taoIn;                  // one value per block
```

Read a series with:

| | |
| --- | --- |
| `s.value` | the current value |
| `s.at(k)` | the value `k` steps ago; `s.at(0)` is `s.value`, `s.at(1)` the previous bar |
| `s.length` | how many values exist so far |

```js
event.onCandle(() => {
  const rising = candle.close.value > candle.close.at(1);
  const gapPct = 100 * (candle.close.value - basis.value) / basis.value;
  log("rising", rising, "distance from SMA %", gapPct.toFixed(2));
});
```

Inside a handler, arithmetic on `.value` gives plain numbers. To get a new *series* from others (to plot it or feed it
to another `ta.*` function), use `ta.calc` at the top level:

```js
const atr = ta.atr(14);
const upper = ta.calc([basis, atr], (b, a) => b + 2 * a);
plot(upper, { title: "upper" });
```

The function passed to `ta.calc` runs once per bar with the inputs' current values. Keep it pure: no state, no side
effects.

## Missing values: NaN

A series has no value before it has enough history: `ta.sma(close, 20)` is `NaN` for the first 19 bars. `NaN` is the
missing value everywhere:

- arithmetic with `NaN` gives `NaN`, and every comparison with `NaN` is `false`;
- `ta.crossover` and the other conditions are `0` while either input is `NaN`;
- `s.at(k)` past the start of the history is `NaN`.

So a strategy usually needs no special warm-up code: its conditions are simply false until the indicators have data.
Use `ta.nz(s)` to replace `NaN` by 0 and `ta.na(s)` to test for it. The tester reports the warm-up, the number of bars
before every plotted series has a value.

## Bar series and block series

`candle.*` series and everything computed from them advance once per **bar**. `block.*` series advance once per
**block** when the run has block data: in [precise and 1B backtests](./backtesting#fill-models) and on the live
stream. In a quick backtest there are only bars, so `block.*` advance once per bar, holding the values at the bar's
first block.

A `ta.*` function evaluates all its inputs at the same step, so its inputs must share one alignment. This is an error:

```js
ta.crossover(candle.close, block.movingPrice);   // a bar series and a block series
```

Use the bar-aligned version where one exists: `candle.movingPrice` is the moving price at each bar's first block.

## The open bar

On the live stream and in precise backtests a bar is built block by block, like on the chart. While it is open,
`candle.close`, `candle.high`, `candle.low` and the volume reflect the blocks so far, and every `ta.*` series is
recomputed on each update. `event.onCandle` runs once the bar is complete, so a strategy that trades in `onCandle`
never sees a bar's future. A strategy that wants to react inside the bar sets `calcOnEveryBlock: true` and handles
`event.onBarUpdate`, or handles `event.onBlock`.

## Inputs as series

`input.source()` lets the user choose which price a script works on, the way TradingView's source input does. It
returns a series:

```js
const src = input.source("Source", "close");      // close, open, hl2, hlc3, ohlc4, volume, movingPrice, ...
const ma = ta.ema(src, input.int("Length", 20));
```
