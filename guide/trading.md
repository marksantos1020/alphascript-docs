# Trading on the pool

## The pool

Every subnet has one AMM pool holding TAO and the subnet's alpha. Its price is the ratio of the reserves:

```
price (TAO per alpha) = taoIn / alphaIn
```

Buying alpha puts TAO into the pool and takes alpha out, so each unit costs more than the last: the larger the trade
relative to the pool, the worse its average price. That difference is the **price impact**. A strategy never sets a
slippage percentage; the impact follows from the reserves and the trade's size.

The `pool` namespace answers "what would this trade do right now?":

```js
event.onCandle(() => {
  const q = pool.quoteBuy(10);                 // spend 10 TAO
  log("get", q.alpha, "alpha at", q.price, "impact", (q.impact * 100).toFixed(2), "%");
  const size = pool.capacity(0.005);           // largest TAO size within 0.5 % impact
});
```

| | |
| --- | --- |
| `pool.price()` | current pool price |
| `pool.reserves()` | `{ taoIn, alphaIn, alphaOut }` |
| `pool.impact(tao)` | impact of buying `tao` TAO, as a fraction (0.005 = 0.5 %) |
| `pool.quoteBuy(tao)` / `pool.quoteSell(alpha)` | what you would receive, the average price, impact and fee |
| `pool.capacity(maxImpact)` | the largest TAO size whose impact stays within `maxImpact` |

## Intents

`trade.buy()` and `trade.sell()` do not trade on the spot. They create an **intent**, and the engine settles it at a
later block against that block's reserves:

```
queued ──(latency)──▶ submitted ──▶ filled | partial | rejected | expired
            └── cancelled (trade.cancel)
```

```js
const id = trade.buy({ tao: 20, maxPrice: pool.price() * 1.01, ttlBlocks: 3, reason: "breakout" });
```

| Option | Meaning | Default |
| --- | --- | --- |
| `tao` / `alpha` | size: TAO to spend (fee included) or alpha to buy | (one is required) |
| `maxPrice` (buy) / `minPrice` (sell) | worst acceptable **average** price | pool price ± 1 % |
| `ttlBlocks` | blocks the intent may wait before it expires | 3 |
| `partialOk` | fill what fits the limit (or the cash) instead of rejecting | `true` |
| `reason` | a label for the journal and the trade list | — |

The result arrives in a handler: `onFill` when it fills, `onReject` with a reason when it does not, `onExpire` when it
ran out of time.

### Timing

An intent created at block N can fill at block N + `latencyBlocks` (default 2, set in `strategy({ fill })`) and expires
after N + `ttlBlocks`. The two numbers work together: with the defaults an intent has two blocks in which it can fill.
Raise `ttlBlocks` if the strategy is waiting for the rate limit below.

In a **quick** backtest the engine works in bars: an intent created in `onCandle` fills at the **open of the next
bar**, against that bar's opening reserves. [Precise and 1B backtests](./backtesting#fill-models) settle block by
block, as the live stream does.

The chain allows one stake operation per market every few blocks. The engine applies that as
`fill.rateLimitBlocks` (default: the chain's value): a due intent waits until enough blocks have passed since your last
fill, while its TTL keeps running.

### Price limits and partial fills

`maxPrice` and `minPrice` limit the fill's **average** price, the price you pay over the whole trade, fee excluded.
The engine computes the largest size that respects the limit:

- the whole order fits: it fills;
- it does not fit and `partialOk` is `true` (the default): the part that fits fills, with status `partial`;
- it does not fit and `partialOk` is `false`: the intent is rejected with reason `price-limit`.

A buy larger than your cash is cut to the cash when `partialOk` is `true`, and rejected with `insufficient-cash`
otherwise.

Without a limit the engine uses the pool price at settlement ± `fill.defaultToleranceBps` (default 100 = 1 %). Set an
explicit limit relative to the price your signal saw, for example `pool.price() * 1.01`, so that a pool that moved
during the latency does not fill you at a worse price than you planned.

### Fees

The fee is taken in TAO: from the TAO you spend on a buy, from the TAO you receive on a sell. Its rate is the chain's
protocol fee plus an optional platform fee (`strategy({ fees: { protocolBps, platformBps } })`); the tester's
Properties tab shows the rate a run used.

| | Buy | Sell |
| --- | --- | --- |
| `fill.tao` | TAO spent, fee included | TAO received before the fee |
| `fill.price` | average price, fee excluded | average price, fee excluded |
| `fill.fee` | fee in TAO | fee in TAO |

The position's `avgPrice` includes the fees you paid to buy, so it is the price at which a sale would break even
before the selling fee.

### Your own trades move the pool

In a backtest the history's reserves do not know about your trades. The engine keeps a record of how your own fills
changed the reserves and applies it to every later fill, so a strategy that buys repeatedly pays the impact of its
earlier buys too. That is what makes the tester's **capacity** curve meaningful: rerun with 2×, 5×, 10× and 20× the
size and see where the returns fade.

## Long only

A strategy holds alpha or TAO. `trade.sell()` without a position is rejected with `no-position`, and a sell larger
than the position sells the whole position. `trade.closePosition()` sells everything and returns `null` when there
is nothing to sell.

## Rejection reasons

| Reason | When |
| --- | --- |
| `price-limit` | the limit cannot be met (or the whole size cannot, with `partialOk: false`) |
| `insufficient-cash` | a buy larger than the cash, with `partialOk: false` |
| `no-position` | a sell with nothing to sell |
| `empty` | a size of 0 |
| `no-price` | the pool had no price at that block |
| `risk:<rule>` | a [risk limit](./orders-and-risk#risk-limits) |

## A complete example

```js
strategy({ name: "Breakout", version: "0.1", market: "ALPHA:1", resolution: "1h", capital: { tao: 100 },
           risk: { maxPriceImpactPct: 1, maxPositionTao: 60 } });

const lookback = input.int("Lookback", 24, { min: 5 });
const high = ta.highest(candle.high, lookback);
const ema = ta.ema(candle.close, 50);

event.onCandle(() => {
  const flat = account.position().alpha === 0;
  if (flat && candle.close.value > high.at(1) && account.openIntents().length === 0) {
    const size = Math.min(account.cash() * 0.5, pool.capacity(0.005));
    if (size > 0.1) trade.buy({ tao: size, maxPrice: pool.price() * 1.01, reason: "breakout" });
  }
  if (!flat && candle.close.value < ema.value) trade.closePosition({ reason: "below EMA" });
});

event.onReject((r) => log("rejected", r.reason, r.intent.tao));
```
