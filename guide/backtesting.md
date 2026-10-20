# Backtesting

Adding a strategy to the chart runs it over the chart's history right away. The **Strategy tester** tab under the
chart shows the result, and every change to the code, the inputs or the settings reruns it.

## Settings

Open the strategy's settings from its row in the chart legend. **Inputs** holds the script's inputs; **Properties**
holds the run's settings:

| Setting | |
| --- | --- |
| Initial capital (τ) | starting cash; empty uses the script's `capital` (default 100 TAO) |
| Fill model | **Quick**, **Precise** or **1B**, see below |
| Keep running on new blocks | after the history, keep running on the live stream as a forward test |

The tester also has a **date range** (7D, 30D, 90D, 1Y, all, or custom). Bars before the start still feed the
indicators, so the strategy starts warmed up, but it cannot trade before the start: `trade.buy()`, `trade.sell()`,
`trade.closePosition()` and the conditional orders return `null` there, and the equity curve begins at the first bar
inside the range.

Fees, latency and risk limits come from the script's `strategy({...})` call; the Properties tab shows the values in
use.

## Fill models

| | Quick | Precise | 1B |
| --- | --- | --- | --- |
| Data | bars | every block, folded into bars | every block, each one a bar |
| `onCandle` | every bar | every bar | every block |
| `onBlock`, `onTrade` | not called | every block / trade | every block / trade |
| An intent from `onCandle` fills at | the next bar's open | `latencyBlocks` blocks after the bar's last block | `latencyBlocks` blocks later |
| Conditional orders checked | bar open, low, high, close | every block | every block |
| History | up to 100,000 bars | up to 40 days | up to 14 days |
| Speed | instant | slower: downloads and replays blocks | slower: downloads and replays blocks |

**Quick** is the default and fits the interactive loop: change a number, see the result. It assumes you trade at the
next bar's opening reserves.

**Precise** replays the history block by block, the way the live stream would have delivered it. A bar opens with its
first block and grows block by block; handlers never see a bar's future. Use it before you trust a result, for
strategies with `onBlock` logic, and to see which of a stop and a target the market reached first.

**1B** treats each block as a bar of its own, for strategies that work at block resolution.

## Reading the results

| Tab | Shows |
| --- | --- |
| Overview | net profit, closed trades, percent profitable, profit factor, max drawdown, average trade, buy & hold, open P&L; the equity curve |
| Performance summary | the full statistics, fees, average price impact, and the capacity curve |
| List of trades | every round trip from flat to flat: entry and exit, P&L, run-up and drawdown, reasons |
| Journal | everything the engine did, in order |
| Properties | script, market, fill mode, date range, bars and warm-up, capital, fees, fill latency, data, run hash, runtime version |

### Capacity

After the main run the tester reruns the strategy with the capital and every order scaled by 2×, 5×, 10× and 20×,
with the pool impact of the larger trades included. If returns fall quickly as the size grows, the pool is too thin
for the strategy at that size. That is the number to look at before putting more capital behind a strategy.

### The journal

Every run writes a journal of typed events: `run.started`, `bar.confirmed`, `signal` (your `log` and `alert` calls),
`intent.created`, `intent.submitted`, `intent.filled`, `intent.partial`, `intent.rejected`, `intent.expired`,
`intent.cancelled`, `conditional.created`, `conditional.triggered`, `conditional.cancelled`, `position.opened`,
`position.updated`, `position.closed`, `reorg`, `run.error` and `run.summary`.

When a result surprises you, the journal says why: an intent that expired because the rate limit held it back, a buy
cut by the price limit, a stop that triggered and filled lower.

## Reproducibility

A run is deterministic: the same script, inputs, data, settings and runtime version produce the same journal, byte for
byte. The run hash on the Properties tab identifies that combination, so two results with the same hash are the
same run.

## Forward testing

With **Keep running on new blocks** on (the default), the strategy goes on after the history with the live stream:
each new block arrives as it is produced, `onBlock` runs, bars form block by block, and intents fill on the live
reserves. Nothing is traded on the chain; this is paper trading of the script itself.
