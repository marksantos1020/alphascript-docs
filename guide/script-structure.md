# Script structure

A script is one file. Its top level runs **once**, when the script loads; it declares what the script is, its settings,
its series and its plots, and registers handlers. The handlers then run many times, once per bar, block or fill.

```js
// 1. Declaration: exactly one strategy() or indicator() call
strategy({ name: "RSI dip", version: "0.1", market: "ALPHA:1", resolution: "1h", capital: { tao: 100 } });

// 2. Inputs: the script's settings
const length = input.int("RSI length", 14, { min: 2 });
const buyBelow = input.float("Buy below", 30, { min: 1, max: 99 });

// 3. Series: computed by the runtime on every bar
const rsi = ta.rsi(candle.close, length);
const oversold = ta.crossunder(rsi, buyBelow);

// 4. Output
plot(rsi, { title: "RSI", pane: 1, color: "#7e57c2" });
hline(buyBelow, { pane: 1, style: "dashed" });

// 5. State: plain variables, kept between handler calls
let entries = 0;

// 6. Handlers: run when something happens
event.onCandle(() => {
  if (oversold.value && account.position().alpha === 0) {
    trade.buy({ tao: account.cash() * 0.5, reason: "rsi dip" });
    entries += 1;
  }
  if (rsi.value > 70) trade.closePosition({ reason: "rsi high" });
});

event.onStop(() => log("entries:", entries));
```

## What must be at the top level

The runtime builds the script's indicator graph while the top level runs, then freezes it. So these calls belong at
the top level and fail inside a handler:

| Call | Inside a handler |
| --- | --- |
| `strategy()` / `indicator()` | error: `strategy()/indicator() called twice` |
| `input.*` | error: `input.* must be declared at top level` |
| `ta.*` | error: `ta.* series must be declared at top level, not inside a handler` |
| `plot()`, `fill()` | error: `plot must be declared at top level` |
| `event.*` | error: `event.onCandle must be registered at top level` |

The `ta.*` rule is the one people hit. This **fails** on the first bar:

```js
event.onCandle(() => {
  if (ta.crossover(fast, slow).value) trade.buy({ tao: 10 });   // a new series inside a handler
});
```

Declare the series once, at the top level, and read it in the handler:

```js
const crossUp = ta.crossover(fast, slow);
event.onCandle(() => {
  if (crossUp.value) trade.buy({ tao: 10 });
});
```

A series declared at the top level has the whole history behind it; one created inside a handler would start empty and
be evaluated after the code that reads it. Calling the same `ta.*` function with the same arguments again returns the
same series, so repeating a declaration costs nothing.

Each `event.*` handler can be registered once. Registering `onCandle` twice is an error; put both pieces of logic in
one handler.

## Keeping state

Variables declared at the top level live for the whole run, so a handler can count, remember a level or track a
streak:

```js
let lastEntry = NaN;
event.onFill((f) => { if (f.side === "buy") lastEntry = f.price; });
```

This is AlphaScript's equivalent of Pine Script's `var`. Two things to keep in mind:

- Series are rolled back when the chain reorganizes recent blocks; your own variables are not. In a forward test that
  matters only if the script keeps state from blocks that are not final yet; see
  [`event.onReorg`](/reference/event#event-onreorg).
- The state must come only from what the script sees. There is no clock, no randomness except the seeded
  `math.random()`, and no I/O, so a run is reproducible.

## Errors

- **Load errors** (syntax, a forbidden name, a top-level rule) stop the script before it runs. The editor shows the
  message with its line number.
- **Runtime errors** inside a handler stop the run at that point. The journal records `run.error` with the handler's
  name and the message, and the tester shows the result up to there.

## The JavaScript you can use

AlphaScript is JavaScript (ES2020) in strict mode: `const`/`let`, arrow functions, objects and arrays, template
strings, destructuring, `Math.*` (except `Math.random`). Not available: `import`/`export`, classes, `async`/`await`,
generators, `Date`, timers, `fetch` and anything else that reaches outside the script. The full list is in
[Sandbox and limits](./limits).
