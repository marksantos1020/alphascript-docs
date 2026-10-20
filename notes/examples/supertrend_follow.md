Follows Supertrend's direction: long while it points up, flat while it points down.

**Entry and exit.** `ta.supertrend` returns a line and a direction (−1 up, 1 down). The strategy turns the flips into
signals with `ta.crossunder(st.direction, 0)` (turned up) and `ta.crossover(st.direction, 0)` (turned down): buy on
the first, close on the second.

**What to try.** A higher *Factor* makes the trend slower to flip: fewer trades, later exits.
