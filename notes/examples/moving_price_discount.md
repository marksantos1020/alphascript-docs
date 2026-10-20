Buys alpha when the pool trades at a discount to the protocol's moving price, and targets the moving price.

**Background.** The moving price is the chain's smoothed price of the subnet's alpha. When the pool price falls well
below it, the gap tends to close; this strategy bets on that.

**Entry.** The discount (moving price over close, minus 1) is at least *Min discount %* and RSI is below *RSI below*.

**Exit.** Whichever comes first:

- a take-profit at the moving price seen at entry;
- a stop *Stop below entry low %* below the entry bar's low;
- the close crossing back above the moving price.

The take-profit and stop are [conditional orders](/guide/orders-and-risk), placed in `onPositionOpened` once the buy
has filled. Placed next to the buy they would be cancelled before it fills.
