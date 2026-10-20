# Sandbox and limits

A script runs in a sandbox: a separate worker in your browser, with the AlphaScript API as the only thing in scope. It
cannot reach your keys, the network, storage or the page. That is also what makes a run reproducible.

## Not available

The loader checks the script before running it and stops with an error, and the line number, on any of these:

| | |
| --- | --- |
| Modules | `import`, `export`, `require` |
| Asynchronous code | `async` functions, `await`, `Promise`, generators |
| Time | `Date`, `setTimeout`, `setInterval` and the other timers, `performance` |
| Randomness | `Math.random`; use the seeded `math.random()` |
| Code from strings | `eval`, `Function` |
| The outside world | `fetch`, `XMLHttpRequest`, `WebSocket`, `Worker`, `localStorage`, `indexedDB`, `window`, `document`, `globalThis` |
| Language features | classes, `with`, labels, `debugger` |
| Reflection | `Reflect`, `Proxy`, `Symbol`, and property names such as `constructor`, `__proto__`, `prototype` |

Everything else in plain JavaScript (ES2020) works: functions and closures, objects, arrays and their methods,
destructuring, template strings, `Math.*` and `JSON`.

## Determinism

A script sees no wall clock and no randomness it did not ask for:

- time comes from the blocks (`block.time`, `candle.time`, the `time` of events);
- `math.random()` is seeded per run, so it repeats exactly.

The same script with the same inputs, data, settings and runtime version therefore produces the same journal every
time.

## Limits

| | Limit |
| --- | --- |
| `log()` and `alert()` entries | 2,000 per run together; later ones are dropped |
| Journal | the newest 50,000 events are kept in memory; the summary counts the dropped ones |
| Trades listed in the tester | the most recent 5,000 round trips (the statistics cover all of them) |
| Quick backtest | up to 100,000 bars |
| Precise backtest | up to 40 days of blocks |
| 1B backtest | up to 14 days of blocks |

## What v0.1 does not have

- **Other markets.** A script sees one subnet, the one it runs on; there is no `request.security`-style access to
  another subnet's series.
- **Short selling and leverage.** Positions are long only.
- **Drawings.** Scripts plot series, levels, fills, shapes and backgrounds, but cannot draw lines, labels or tables.
- **Libraries.** A script cannot import another script.
