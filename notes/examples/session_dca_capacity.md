Buys in small pieces during chosen UTC hours, sized to what the pool can absorb, while buyers dominate.

**Buying.** On each closed bar inside the session (*From hour* to *To hour*, UTC) it buys the smallest of:

- *TAO per buy*;
- *Max share of capacity %* of `pool.capacity(Max impact %)`;
- the remaining cash;
- the room left under *Max position TAO*.

It only buys on bars where on-balance volume rose (`ta.rising(ta.obv(), 1)`).

**Selling.** A trailing stop, placed with `trade.trailingStop` in `onPositionOpened`, sells the position after it
falls *Trailing stop %* from its high.

**Output.** Each buy raises an `alert` with its size and price; `onStop` logs the realized and unrealized profit.
