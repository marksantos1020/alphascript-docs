# Conditional orders and risk

## Conditional orders

A stop loss written in `onBlock` only works where blocks are delivered. A **conditional order** is watched by the
engine itself, in every mode:

| | Triggers when |
| --- | --- |
| `trade.stop({ price })` | the price falls to `price` or below |
| `trade.takeProfit({ price })` | the price rises to `price` or above |
| `trade.trailingStop({ pct })` | the price falls `pct` percent below its highest point since the order was placed |

Each returns an id; `trade.cancelConditional(id)` removes the order and `account.conditionals()` lists the active
ones.

```js
event.onPositionOpened((p) => {
  trade.stop({ price: p.avgPrice * 0.95, reason: "stop 5%" });
  trade.takeProfit({ price: p.avgPrice * 1.10, reason: "target 10%" });
});
```

### Place them once the position exists

A conditional order belongs to a position. It is cancelled when the position closes, and also when the engine checks
it while there is no position. An order placed in the same handler as the buy is checked before the buy has filled,
and is cancelled straight away. Place conditional orders in `onPositionOpened` or `onFill`, as above.

### What happens when one triggers

The order becomes an ordinary **sell intent**: by default for the whole position (`alpha: "all"`), with
`partialOk: true`, `ttlBlocks: 3` and the order's `reason`. It fills after the normal latency at the pool price of that
block, **never at the trigger price**. In a fast fall the fill can be well below the stop.

The triggered sell has no `minPrice`, so the default tolerance applies: it sells what it can within 1 % of the pool
price at settlement. In a thin pool that can be only part of the position. Check `account.position()` in `onFill` and
close the rest if you need to be flat:

```js
event.onFill((f) => {
  if (f.side === "sell" && f.partial && account.position().alpha > 0) trade.closePosition({ reason: "rest" });
});
```

### When orders are checked

| | Checked at |
| --- | --- |
| Precise and 1B backtests, live stream | every block, at the block's price |
| Quick backtest | four times per bar: the bar's open, low, high and close |

In a quick backtest a bar that touched both your stop and your target triggers the stop first (low is checked before
high). Precise mode tells you which one the market actually reached first.

## Risk limits

Risk limits are set in `strategy({ risk })`. The engine enforces them; the script cannot change or bypass them during
a run.

```js
strategy({
  name: "Guarded", version: "0.1", market: "ALPHA:1", resolution: "15m", capital: { tao: 100 },
  risk: {
    maxPriceImpactPct: 0.5,   // no fill with more than 0.5 % impact
    maxOrderTao: 25,          // no single buy above 25 TAO
    maxPositionTao: 60,       // never more than 60 TAO invested
    maxIntentsPerHour: 10,    // throttle a runaway loop
    minPoolTao: 500,          // stay out of thin pools
    maxDrawdownPct: 25,       // stop the run 25 % below the equity peak
    maxDailyLossTao: 15,      // stop the run after losing 15 TAO in a UTC day
  },
});
```

| Rule | Checked | Effect |
| --- | --- | --- |
| `killSwitch` | when an intent is created | rejects every intent |
| `maxIntentsPerHour` | when an intent is created | rejects intents past that many in the last hour of blocks |
| `maxOrderTao` | when a buy is created and when it fills | rejects a buy above that many TAO |
| `maxPositionTao` | when a buy is created and when it fills | rejects a buy that would take the position's cost above it |
| `minPoolTao` | when an intent fills | rejects fills while the pool holds less TAO |
| `maxPriceImpactPct` | when an intent fills | rejects a fill with more impact |
| `maxDrawdownPct` | every bar | **stops the run** when equity falls that far below its peak |
| `maxDailyLossTao` | every bar | **stops the run** when equity falls that many TAO below the start of the UTC day |

A rejected intent arrives in `onReject` with the reason `risk:<rule>`, for example `risk:maxOrderTao`. A run stopped
by drawdown or daily loss records `run.error` with `risk:maxDrawdown` or `risk:maxDailyLoss` in the journal; the
tester shows the result up to that point.

`maxOrderTao` and `maxPositionTao` are checked again at fill time with the actual TAO amount, so a buy sized in alpha
cannot get around them.

::: warning maxPriceImpactPct applies to exits too
A sell is checked against the same impact limit as a buy, and selling the position back into a pool your own buy has
already moved costs at least as much impact as the buy did. A strategy that enters close to the limit can find its
exit rejected with `risk:maxPriceImpact` and stay stuck in the position. Size entries well inside the limit (for
example `pool.impact(size) < limit / 2`), or sell in parts.
:::
