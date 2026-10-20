# Events and execution order

Handlers are functions the runtime calls when something happens. Register each one once, at the top level.

| Handler | Runs | Typical use |
| --- | --- | --- |
| `onStart()` | once, before the first bar | set up state |
| `onCandle(bar)` | once per bar, when it closes (or is finalized with `actOn: "final"`) | decide and trade |
| `onBarUpdate(bar)` | on every update of the open bar, only with `calcOnEveryBlock: true` | react inside the bar |
| `onBlock(block)` | on every block, when the run has block data | stops on the block price, pool watching |
| `onTrade(trade)` | for every pool trade by anyone, after the block's `onBlock` | follow large trades |
| `onFill(fill)` | when one of your intents fills, fully or partly | place stops, log |
| `onReject(rejection)` | when an intent is rejected | log, retry smaller |
| `onExpire(intent)` | when an intent waited past its `ttlBlocks` | retry |
| `onPositionOpened(position)` | when a buy opens a position from flat | place a stop |
| `onPositionClosed({ position, realizedTao })` | when a sell takes the position back to flat | record the result |
| `onReorg({ fromBlock, toBlock })` | when the chain replaced blocks you had seen | reset your own state |
| `onStop()` | once, after the last bar | final log |

## Which handlers run where

What a run can deliver depends on its data:

| | Quick backtest | Precise backtest | 1B backtest | Live stream |
| --- | --- | --- | --- | --- |
| `onCandle` | every bar | every bar | every block (each block is a bar) | every bar |
| `onBlock` | **never** | every block | every block | every block |
| `onTrade` | never | every pool trade | every pool trade | every pool trade |
| `onBarUpdate` | once per bar | every block | every block | every block |

A quick backtest processes whole bars and has no blocks, so `onBlock` and `onTrade` never run there. Logic that must
run on every block (a stop on the block price, say) needs a precise or 1B backtest to be tested, or an engine-managed
[conditional order](./orders-and-risk), which works in every mode.

Trade data is loaded only for scripts that register `onTrade`, so leave it out if you do not need it.

## Order within one block

When a block arrives the runtime does, in this order:

0. If the block is the first of a new bar, the previous bar is confirmed and `onCandle(bar)` runs for it.
1. Advance the block series and apply the block's pool state; fold the block into the open bar and recompute the bar
   series. Handlers now see `candle.*` up to this block.
2. `onBlock(block)`.
3. `onTrade(trade)` for each pool trade in the block, in chain order.
4. `onBarUpdate(bar)`, if `calcOnEveryBlock` is on.
5. Settlement: intents that are due fill, are rejected or expire; `onFill`, `onReject`, `onExpire`,
   `onPositionOpened` and `onPositionClosed` run.

An intent created in any handler is queued. It fills no earlier than `fill.latencyBlocks` blocks later (default 2),
never in the block that created it. See [Trading on the pool](./trading#timing).

## Errors stop the run

If a handler throws, the run stops there: the journal records `run.error` with the handler's name and the message, and
no further handler runs. Guard against missing values (`NaN`, an empty position) instead of letting the handler throw.

## Reorgs

Blocks that are not final yet can be replaced by the chain. When that happens on the live stream the runtime rewinds
everything it owns (series, the open bar, the account, open intents) to the last common block, marks the journal
events after it as superseded, calls `onReorg({ fromBlock, toBlock })` and then processes the replacement blocks.

A script whose state lives only in series needs to do nothing. A script that keeps its own variables should forget
what it learned above `toBlock`. Backtests run on final blocks and never see a reorg.
