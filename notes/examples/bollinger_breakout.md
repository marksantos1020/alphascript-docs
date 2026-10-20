Buys a breakout above the upper Bollinger band when volume confirms it, then rides it with an ATR trailing stop.

**Entry.** The close crosses above the upper band on a bar whose alpha volume is at least *Volume x avg* times its
average. The strategy buys 40 % of its equity with a 1 % price limit.

**Exit.** A trailing level starts *ATR stop x* ATRs below the entry close and only moves up. The position closes when
a bar closes below the trail, or below the middle band, whichever comes first.

**State.** The trail is a plain top-level variable (`let trail`), updated in `onCandle`: the AlphaScript equivalent of
Pine Script's `var`.

**What to try.** Raise *Volume x avg* to keep only the strongest breakouts; a tighter *ATR stop x* locks in profit
sooner but exits more often on noise.
