A block-by-block dip buyer with a fixed take-profit and stop.

::: warning Needs the 1B fill model
All of its logic is in `event.onBlock`, which does not run in a quick backtest. Set **Fill model** to **1B** in the
strategy's Properties (Precise works too).
:::

**Entry.** On a block whose price is *Dip from high %* below the highest price of the last *Lookback blocks* blocks,
it buys up to half its equity, capped at `pool.capacity(Max impact %)`. It waits *Blocks between entries* blocks
before the next entry and never stacks entries.

**Exit.** Each buy fill places a take-profit *Take profit %* above and a stop *Stop %* below its fill price, in
`onFill`.

**Reorgs.** `lastEntryBlock` is the script's own state, so `onReorg` resets it when the chain replaces the block it
was set in: the pattern from [Events and execution order](/guide/events#reorgs).
