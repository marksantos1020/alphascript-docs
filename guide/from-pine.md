# Coming from Pine Script

AlphaScript borrows Pine Script's ideas (series, `ta.*` functions, inputs, plots) but it is JavaScript, and it trades
against an AMM pool instead of an exchange. This page maps the two.

## Side by side

::: code-group

```txt [Pine Script]
//@version=6
strategy("EMA cross", overlay = true)
fastLen = input.int(9, "Fast EMA")
slowLen = input.int(21, "Slow EMA")
fast = ta.ema(close, fastLen)
slow = ta.ema(close, slowLen)
plot(fast, color = color.green)
plot(slow, color = color.orange)
if ta.crossover(fast, slow)
    strategy.entry("Long", strategy.long)
if ta.crossunder(fast, slow)
    strategy.close("Long")
```

```js [AlphaScript]
strategy({ name: "EMA cross", version: "0.1", market: "ALPHA:1", resolution: "15m", capital: { tao: 100 } });
const fastLen = input.int("Fast EMA", 9);
const slowLen = input.int("Slow EMA", 21);
const fast = ta.ema(candle.close, fastLen);
const slow = ta.ema(candle.close, slowLen);
const crossUp = ta.crossover(fast, slow);
const crossDown = ta.crossunder(fast, slow);
plot(fast, { color: "#2bb889" });
plot(slow, { color: "#f2b544" });
event.onCandle(() => {
  if (crossUp.value) trade.buy({ tao: account.cash() * 0.5 });
  if (crossDown.value) trade.closePosition();
});
```

:::

## The main differences

**The script runs once, then handlers run per event.** Pine runs the whole script on every bar. In AlphaScript the top
level runs once and declares the series; the code that decides runs in handlers such as `event.onCandle`. So `ta.*`
calls go at the top level and handlers read `.value` ([why](./script-structure#what-must-be-at-the-top-level)).

**History is `.at(k)`, not `[k]`.** `close[1]` is `candle.close.at(1)`, and `close` itself is `candle.close.value`
inside a handler.

**State is a plain variable.** Pine's `var x = 0` is a `let x = 0` at the top level, changed inside handlers.

**Orders are intents.** `strategy.entry` fills at the next bar's open in Pine's default model. `trade.buy` creates an
intent that fills a set number of blocks later against the pool's reserves, at a price that depends on its size, and
can be cut or rejected by its price limit. See [Trading on the pool](./trading).

**Long only.** There is no `strategy.short`.

**Arguments are objects.** Options are passed as one object: `plot(s, { title: "x", color: "#fff" })`, and inputs take
the name first: `input.int("Length", 14)`.

## Names

| Pine Script | AlphaScript |
| --- | --- |
| `indicator("Name", overlay = true)` | `indicator({ name: "Name", overlay: true })` |
| `strategy("Name")` | `strategy({ name: "Name", version: "0.1", market: "ALPHA:1", resolution: "15m" })` |
| `open`, `high`, `low`, `close`, `volume` | `candle.open`, `candle.high`, `candle.low`, `candle.close`, `candle.volume` (alpha) |
| `hl2`, `hlc3`, `ohlc4` | `input.source("Source", "hlc3")`, or `ta.calc([...], fn)` |
| `close[1]` | `candle.close.at(1)` |
| `na(x)`, `nz(x)` | `ta.na(x)`, `ta.nz(x)` (series); `Number.isNaN(v)` for a number |
| `ta.sma`, `ta.ema`, `ta.rsi`, `ta.macd`, `ta.atr`, `ta.stoch`, … | the same names in `ta.*`; `ta.bb` is `ta.bbands` |
| `input.int`, `input.float`, `input.bool`, `input.source`, `input.color` | the same, name first |
| `input.string(..., options = [...])` | `input.select("Name", "A", ["A", "B"])` |
| `plot`, `hline`, `fill`, `bgcolor` | the same, with an options object |
| `plotshape(cond, style = shape.triangleup)` | `plotShape(cond, { shape: "triangleUp" })` |
| `strategy.entry("L", strategy.long)` | `trade.buy({ tao: size })` |
| `strategy.close("L")`, `strategy.close_all()` | `trade.closePosition()` |
| `strategy.exit(stop = s, limit = l)` | `trade.stop({ price: s })`, `trade.takeProfit({ price: l })` |
| `strategy.exit(trail_offset = ...)` | `trade.trailingStop({ pct })` |
| `strategy.position_size` | `account.position().alpha` |
| `strategy.position_avg_price` | `account.position().avgPrice` |
| `strategy.equity` | `account.equity()` |
| `barstate.isconfirmed`, `bar_index` | `barstate.isConfirmed`, `barstate.index` |
| `alert("msg")` | `alert("name", "msg")` |
| `log.info(...)` | `log(...)` |
| `math.abs`, `math.max`, … | `math.abs`, `math.max`, …, or `Math.*` |
| `request.security(...)` | not available in v0.1 |

## New things to use

What an exchange-based language cannot give you:

- `pool.price()`, `pool.reserves()`, `pool.impact(tao)`, `pool.quoteBuy(tao)` and `pool.capacity(maxImpact)`: the pool
  as it is now, and what your trade would do to it.
- `candle.movingPrice` and `block.movingPrice`: the protocol's smoothed price.
- `candle.turnover`: volume in TAO next to `candle.volume` in alpha.
- `event.onBlock` and `event.onTrade`: every block and every pool trade, in precise backtests and on the live stream.
- The tester's capacity curve: how the strategy's return holds up at 2× to 20× the size.
