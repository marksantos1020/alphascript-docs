Buys an oversold bounce and sells when RSI recovers.

**Entry.** RSI crosses back up through *Buy below*: it was oversold and is turning. The strategy buys *Size % equity*
with a 1 % price limit. Entry bars are shaded and marked.

**Exit.** RSI crosses above *Exit above*, or the price falls *Stop %* below the average entry price. The stop is
checked at every bar's close in `onCandle`, and on every block in `onBlock` where blocks are delivered (precise, 1B,
live), so it reacts sooner there.

**Plots.** RSI goes to its own pane (`pane: 1`) with the two levels as dashed lines.

**What to try.** Compare a quick and a precise run: the difference is the block-level stop.
