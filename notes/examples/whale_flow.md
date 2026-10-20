Follows large traders: buys when big pool buys outweigh big sells, and exits when the big sellers take over.

::: warning Needs the Precise fill model
The strategy counts individual pool trades in `event.onTrade`, which only runs in precise and 1B backtests and on the
live stream. In a quick backtest it never sees a trade and never buys. Set **Fill model** to **Precise** in the
strategy's Properties.
:::

**Counting.** Every pool trade of at least *Big trade ≥ TAO* adds to that bar's big-buy or big-sell total.

**Entry.** At the bar's close: big buys reach *Buy flow per bar ≥ TAO*, are at least *Buys / sells ≥* times the big
sells, and the close is above the moving price. The buy must stay under 0.25 % impact, half the risk limit, so the exit fits too.

**Exit.** Big sells reach the threshold and exceed big buys, or the trailing stop placed in `onPositionOpened`
triggers.

**Risk.** `maxIntentsPerHour: 12` throttles the strategy if the flow is noisy.
