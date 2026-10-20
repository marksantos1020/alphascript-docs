A trend-following starting point: buy when a fast EMA crosses above a slow one, sell when it crosses back.

**Entry.** On a closed bar where the fast EMA crosses above the slow EMA, the strategy buys *Size % of equity*, but
only if `pool.impact(size)` says the trade stays under 0.25 % impact (half the 0.5 % risk limit, so the exit fits
too), and with a `maxPrice` 1 % above the current
price.

**Exit.** On the cross back down it closes the position. Independently, `onBlock` watches every block and closes the
position if the price falls *Stop loss %* below the entry. That stop only runs where blocks are delivered: in a
[precise or 1B backtest](/guide/backtesting#fill-models) and on the live stream. In a quick backtest only the EMA
exit applies.

**What to try.** Lengthen both EMAs on short intervals to cut whipsaw trades, and compare the quick and precise
results to see how much the block-level stop changes.
