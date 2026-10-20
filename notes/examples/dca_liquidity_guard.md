Dollar-cost averaging that refuses to buy into a thin pool.

**Buying.** Every *Every N bars* bars it buys a fixed *TAO per buy*, unless:

- the pool holds less than *Min TAO in pool* TAO, or
- the buy's impact would exceed *Max impact %*; it then logs the pool's capacity at that impact, from
  `pool.capacity()`.

Each buy uses `partialOk: false`, so it fills completely within the price limit or not at all.

**Selling.** The whole position is sold once the price is *Take profit %* above the average entry price.

**Risk.** `minPoolTao: 500` makes the engine itself reject fills while the pool holds less than 500 TAO, as a second
guard.

**What to read.** The journal shows each skipped buy and why: a record of how often the pool was too thin.
