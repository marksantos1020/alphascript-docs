Uses two playbooks and picks one by volatility: mean reversion in calm markets, trend following in volatile ones.

**Regime.** On each closed bar, ATR as a percentage of price decides: below *Calm if ATR/price below %* is calm,
above is volatile. *Mode* can force either regime.

**Calm: mean reversion.** Buy when the low pierces the lower Bollinger band; exit when the close crosses back above the
middle band, or falls 3 % below the lower band.

**Volatile: trend.** Buy when Supertrend turns up; exit when it turns down.

**State.** The script remembers which regime opened the position (`entryRegime`), so a trade entered as a reversion
trade is exited by the reversion rules even if the regime changes meanwhile.

**Risk.** `maxDrawdownPct: 30` stops the whole run if equity falls 30 % below its peak.
