# Writing indicators

An indicator draws; it cannot trade. Every built-in indicator in the chart's picker (press <kbd>/</kbd> on the chart)
is itself an AlphaScript indicator, so anything they do, yours can do too.

## The declaration

```js
indicator({ name: "Bollinger Bands", shortTitle: "BB", overlay: true, precision: 6, titleInputs: ["Length", "StdDev"] });
```

| Option | Effect |
| --- | --- |
| `name` | the name in the picker and the editor |
| `shortTitle` | the title in the chart legend (default: `name`) |
| `overlay` | `true`: draw on the price pane; `false`: in a pane of its own below the chart |
| `precision` | decimals in the legend and on the price scale (default: the market's) |
| `format` | `"price"` (default), `"percent"`, or `"volume"` (k/M suffixes) |
| `titleInputs` | which inputs appear after the title in the legend, e.g. *BB 20 2* (default: every number, source and select input) |

## Inputs

Inputs become the indicator's settings dialog. Each returns the value the user chose, or the default.

```js
const length = input.int("Length", 20, { min: 1 });
const mult = input.float("StdDev", 2, { min: 0.1, step: 0.1 });
const maType = input.select("MA type", "SMA", ["SMA", "EMA", "WMA"]);
const src = input.source("Source", "close");
const showBasis = input.bool("Show basis", true);
const color = input.color("Basis color", "#2962ff", { group: "Style" });
```

`group` puts inputs under a heading, `tooltip` adds a hint, and inputs that share an `inline` key sit on one row. An
input's name is also its key in saved settings: renaming it resets that setting to its default.

Because inputs are plain values at load time, you can branch on them at the top level to build a different graph:

```js
const basis = maType === "EMA" ? ta.ema(src, length) : maType === "WMA" ? ta.wma(src, length) : ta.sma(src, length);
```

## Drawing

### plot

`plot(series, options)` draws one series. Call it at the top level, once per line.

| Option | |
| --- | --- |
| `title`, `color`, `width` | legend label, CSS colour, line width |
| `style` | `line` (default), `step`, `area`, `histogram`, `columns`, `circles`, `cross`, `baseline` |
| `lineStyle` | `solid`, `dashed`, `dotted` |
| `colorUp`, `colorDown`, `colorBy` | two-colour histograms and columns: by the value's sign (default) or, with `colorBy: "candle"`, by the bar's direction |
| `baseValue` | the level a `baseline` plot is coloured above and below |
| `display` | `all` (default), `pane` (no legend value), `legend` (legend only), `none` |
| `pane` | in a strategy: 0 = the price pane, 1 and up = panes below |
| `offset` | shift by whole bars: positive draws ahead of the last bar, negative into the past |
| `palette`, `colorIndex` | a colour per bar: `colorIndex` is a series of indexes into `palette` |

```js
const m = ta.macd(candle.close, 12, 26, 9);
plot(m.hist, { title: "Histogram", style: "columns", colorUp: "#26a69a", colorDown: "#ff5252" });
plot(m.macd, { title: "MACD", color: "#2962ff" });
plot(m.signal, { title: "Signal", color: "#ff6d00" });
```

### Levels, bands and backgrounds

```js
hline(70, { title: "Overbought", color: "#787b86", style: "dashed" });
fill(upper, lower, { color: "rgba(33,150,243,0.08)" });          // between two series
fill(70, 30, { color: "rgba(126,87,194,0.1)" });                  // between two levels
bgcolor(ta.crossover(fast, slow), { color: "rgba(43,184,137,0.15)" });
plotShape(ta.crossunder(fast, slow), { shape: "triangleDown", location: "aboveBar", color: "#f23645", text: "S" });
```

`plotShape` and `bgcolor` mark every bar where their condition series is 1. They need a series: a plain `true` draws
nothing. `plotShape` takes an `offset` of 0 or less to mark a bar found late, such as a pivot confirmed two bars after it.

`fill` takes the same `offset` as `plot`, and `colorDown` to switch colour where the first series drops below the second:

```js
fill(leadA, leadB, { offset: 25, color: "rgba(67,160,71,0.1)", colorDown: "rgba(244,67,54,0.1)" });   // an Ichimoku cloud
```

### Colours per bar, candles and bar colours

```js
const ao = ta.calc([ta.sma(hl2, 5), ta.sma(hl2, 34)], (f, s) => f - s);
plot(ao, { style: "columns", palette: ["#089981", "#f23645"], colorIndex: ta.calc([ta.change(ao, 1)], (d) => (d >= 0 ? 0 : 1)) });

plotCandle(haOpen, haHigh, haLow, haClose, { title: "Heikin Ashi", colorUp: "#26a69a", colorDown: "#ef5350" });
barcolor(ta.crossover(fast, slow), { color: "#2962ff" });                 // recolours the chart's own candles
```

### Lines, labels and boxes

`draw.line`, `draw.label` and `draw.box` place objects at chart coordinates: `x` is a bar time in ms and `y` a price.
Create them in a handler; each call returns an id that `draw.set` moves and `draw.remove` deletes. At most 500 of each
kind are kept, oldest first out.

```js
const ph = ta.pivothigh(5, 5);
let last = 0;
event.onCandle((bar) => {
  const pivot = ph.value;
  if (Number.isNaN(pivot)) return;
  draw.label({ x: candle.time.at(5), y: pivot, text: "H", style: "down" });
  if (last) draw.set(last, { x2: candle.time.at(5), y2: pivot });
  last = draw.line({ x1: candle.time.at(5), y1: pivot, x2: bar.time, y2: pivot, extend: "right", style: "dashed" });
});
```

### Higher timeframes

`request.security(resolution, fn)` builds candles of a higher resolution from the chart's bars and runs `fn` on them.
The result is a series aligned with the chart: on a 15m chart, the value of the 1h bar each 15m bar belongs to.

```js
const dailyEma = request.security("1D", (d) => d.ta.ema(d.candle.close, 20));
const yesterdayHigh = request.security("1D", (d) => d.candle.high, { confirmed: true });   // the last completed day
plot(dailyEma, { title: "Daily EMA 20", style: "step" });
```

Without `{ confirmed: true }` the value follows the higher bar while it forms, as Pine's does on realtime bars.

## A complete indicator

```js
indicator({ name: "EMA ribbon", shortTitle: "Ribbon", overlay: true, titleInputs: ["Fast", "Slow"] });

const src = input.source("Source", "close");
const fastLen = input.int("Fast", 8, { min: 1, inline: "len" });
const slowLen = input.int("Slow", 34, { min: 2, inline: "len" });
const fast = ta.ema(src, fastLen);
const slow = ta.ema(src, slowLen);

plot(fast, { title: "Fast", color: input.color("Fast color", "#2bb889", { group: "Style" }) });
plot(slow, { title: "Slow", color: input.color("Slow color", "#f2b544", { group: "Style" }) });
fill(fast, slow, { color: "rgba(43,184,137,0.08)" });
plotShape(ta.crossover(fast, slow), { shape: "triangleUp", location: "belowBar", color: "#2bb889" });
plotShape(ta.crossunder(fast, slow), { shape: "triangleDown", location: "aboveBar", color: "#f23645" });
```

## Using pool data

Indicators can read everything a strategy can read, including the pool's reserves and the protocol's moving price:

```js
indicator({ name: "Discount to moving price", shortTitle: "MP gap", overlay: false, format: "percent", precision: 2 });

const gap = ta.calc([candle.close, candle.movingPrice], (c, mp) => (mp > 0 ? 100 * (c / mp - 1) : NaN));
plot(gap, { title: "Gap %", style: "baseline", baseValue: 0, colorUp: "#2bb889", colorDown: "#f23645" });
hline(0, { color: "#787b86" });
```
