# Introduction

AlphaScript is the scripting language of AlphaForge, the trading terminal for Bittensor subnet alpha markets. With it you write:

- **Indicators** that draw on the chart: moving averages, bands, oscillators, anything computed from candles, blocks
  and the pool's reserves.
- **Strategies** that trade: they read the same data, ask to buy or sell, and are backtested against the real
  history of the subnet's pool, block by block if you want.

A script is plain JavaScript with a small API on top. If you have used TradingView's Pine Script, most ideas carry
over, and [Coming from Pine Script](./from-pine) maps one to the other.

## How AlphaScript differs from a stock-market language

Subnet alpha does not trade on an order book. Every subnet has an automated market maker (AMM) pool that holds TAO and
the subnet's alpha, and every trade swaps one for the other against that pool. AlphaScript is built around that:

- **The block is the clock.** A new block arrives about every 12 seconds. Bars are made of blocks, events are caused by
  blocks, and every timestamp a script sees is a block timestamp.
- **Reserves are ground truth.** The price is the ratio of the pool's reserves. How much a trade moves the price, and
  what it fills at, follows from the reserves and the trade's size, not from a fixed slippage setting.
- **Scripts emit intents.** `trade.buy()` does not buy. It asks; the engine fills the order at a later block against
  the pool, or rejects it, and tells the script either way.
- **Long only.** You hold alpha or you hold TAO. There is no shorting and no leverage.

## What you need

An AlphaForge account (or the public showcase, which runs scripts on a data snapshot but cannot save them). Scripts are
written in the **AlphaScript editor**, opened from the icon rail on the right of the terminal.

## Where to go next

| If you want to | Read |
| --- | --- |
| Write and run your first script | [Getting started](./getting-started) |
| Understand how a script is put together | [Script structure](./script-structure) |
| Understand bars, blocks and series | [Series and the block clock](./series) |
| Know when your code runs | [Events and execution order](./events) |
| Trade | [Trading on the pool](./trading), then [Conditional orders and risk](./orders-and-risk) |
| Draw on the chart | [Writing indicators](./indicators) |
| Test a strategy | [Backtesting](./backtesting) |
| Know what a script cannot do | [Sandbox and limits](./limits) |
| Look up a function | the [API reference](/reference/) |
