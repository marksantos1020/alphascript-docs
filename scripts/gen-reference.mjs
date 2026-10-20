import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import ts from "typescript";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const pkg = resolve(root, process.env.ALPHASCRIPT_DIR ?? "../alphaforge-frontend/packages/alphascript");
const dts = join(pkg, "types/alphascript.d.ts");
const check = process.argv.includes("--check");
if (!existsSync(dts)) {
  console.error(`alphascript.d.ts not found at ${dts}; set ALPHASCRIPT_DIR to the alphascript package`);
  process.exit(1);
}
const runtimeVersion = /RUNTIME_VERSION = "([^"]+)"/.exec(readFileSync(join(pkg, "src/runtime.ts"), "utf8"))?.[1] ?? "?";
const src = ts.createSourceFile(dts, readFileSync(dts, "utf8").replace(/\r\n/g, "\n"), ts.ScriptTarget.ES2020, true);

const PAGES = [
  { file: "script", title: "Script declaration", intro: "Every script starts with exactly one `strategy()` or `indicator()` call at the top level.",
    globals: ["strategy", "indicator"], types: ["StrategyConfig", "IndicatorConfig", "FillConfig", "FeeConfig", "RiskConfig"] },
  { file: "input", title: "Inputs", intro: "Inputs become the script's settings form. Declare them at the top level; each call returns the value the user chose.",
    globals: ["input"], types: ["InputMeta", "NumberInputOptions", "Source"] },
  { file: "series", title: "Data series", intro: "`candle.*` series advance once per bar, `block.*` series once per block. Read the current value with `.value` and older values with `.at(k)`.",
    globals: ["candle", "block"], types: ["Series", "BoolSeries", "SeriesLike"] },
  { file: "ta", title: "ta", intro: "Technical analysis functions. Each takes and returns series and is declared once at the top level; the runtime advances it on every bar.",
    globals: ["ta"], groups: {
      "Moving averages": ["sma", "ema", "rma", "wma", "vwma", "vwap"],
      "Oscillators and momentum": ["rsi", "macd", "stoch", "cci", "mfi", "wpr", "adx", "roc", "mom", "change"],
      "Volatility and bands": ["bbands", "atr", "tr", "stdev", "variance", "dev", "supertrend"],
      "Volume": ["obv"],
      "Ranges and pivots": ["highest", "lowest", "pivothigh", "pivotlow"],
      "Conditions": ["crossover", "crossunder", "cross", "rising", "falling", "barssince", "valuewhen"],
      "Utilities": ["cum", "sum", "na", "nz", "calc"],
    } },
  { file: "math", title: "math", intro: "Deterministic math helpers. `math.random()` is seeded per run, so a backtest repeats exactly.", globals: ["math"] },
  { file: "pool", title: "pool", intro: "The subnet's AMM pool at the current block: price, reserves and what a trade of a given size would do.",
    globals: ["pool"], types: ["Reserves", "Quote"] },
  { file: "account", title: "account", intro: "The script's own account: cash, position, fills and open orders.",
    globals: ["account"], types: ["Position", "Fill", "Intent", "Conditional"] },
  { file: "trade", title: "trade", intro: "Trades are intents: the script asks, the engine fills at a later block against the pool reserves, or rejects.",
    globals: ["trade"], types: ["BuyOptions", "SellOptions", "ConditionalOptions", "Rejection"] },
  { file: "event", title: "event", intro: "Handlers run when something happens: a new block, a closed bar, a fill. Register them at the top level.",
    globals: ["event"], types: ["Bar", "Block", "PoolTrade"] },
  { file: "output", title: "Output", intro: "Plots, shapes, levels and fills drawn on the chart, plus alerts and the log.",
    globals: ["plot", "plotShape", "hline", "fill", "bgcolor", "alert", "log"], types: ["PlotOptions", "ShapeOptions"] },
  { file: "state", title: "barstate and runtime", intro: "Where the script is in the data, and how it was started.", globals: ["barstate", "runtime"] },
  { file: "types", title: "Types", intro: "Value types used across the API.", globals: [] },
];

const clean = (s) => s.replace(/\s+/g, " ").trim();
const docOf = (n) => clean(ts.getJSDocCommentsAndTags(n)
  .map((j) => (typeof j.comment === "string" ? j.comment : j.comment?.map((c) => c.text).join("") ?? ""))
  .filter(Boolean).join(" "));
const proseEscape = (s) => s.split(/(`[^`]*`)/).map((part, i) => (i % 2 ? part : part.replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/\{\{/g, "&#123;&#123;"))).join("");
const cell = (s) => s.replace(/\|/g, "\\|");
const firstSentence = (s) => (/^(.+?[.!?])(\s|$)/.exec(s)?.[1] ?? s);
const anchor = (s) => s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

const globals = new Map();
const types = new Map();
for (const st of src.statements) {
  if (ts.isModuleDeclaration(st)) continue;
  if (ts.isVariableStatement(st)) {
    for (const d of st.declarationList.declarations) {
      const name = d.name.getText(src);
      const members = [];
      if (d.type && ts.isTypeLiteralNode(d.type)) {
        for (const m of d.type.members) {
          const mName = m.name?.getText(src);
          if (!mName) continue;
          const isFn = ts.isMethodSignature(m);
          const text = clean(m.getText(src)).replace(/^readonly /, "").replace(/;$/, "");
          members.push({ name: mName, full: `${name}.${mName}${isFn ? "()" : ""}`, sig: `${name}.${text}`, doc: docOf(m), kind: isFn ? "function" : "property" });
        }
      }
      globals.set(name, { name, doc: docOf(st), members });
    }
  } else if (ts.isFunctionDeclaration(st) && st.name) {
    const name = st.name.getText(src);
    globals.set(name, { name, doc: docOf(st), fn: { name, full: `${name}()`, sig: clean(st.getText(src)).replace(/^declare function /, "").replace(/;$/, ""), doc: docOf(st), kind: "function" } });
  } else if (ts.isInterfaceDeclaration(st) || ts.isTypeAliasDeclaration(st)) {
    types.set(st.name.getText(src), st);
  }
}

const typePage = new Map();
for (const p of PAGES) for (const t of p.types ?? []) typePage.set(t, p.file);
const typesPage = PAGES.find((p) => p.file === "types");
typesPage.types = [...types.keys()].filter((t) => !typePage.has(t));
for (const t of typesPage.types) typePage.set(t, "types");
for (const p of PAGES) for (const t of p.types ?? []) if (!types.has(t)) throw new Error(`type ${t} on page ${p.file} is not declared`);

const typeLinks = (text, page) => {
  const seen = [...new Set([...text.matchAll(/\b[A-Z][A-Za-z]+\b/g)].map((m) => m[0]))].filter((t) => types.has(t));
  return seen.map((t) => `[${t}](${typePage.get(t) === page ? "" : `./${typePage.get(t)}`}#${anchor(t)})`);
};

const missing = [];
function memberBlock(m, page) {
  if (!m.doc) missing.push(m.full);
  const links = typeLinks(m.sig, page);
  return [
    `### ${m.full} {#${anchor(m.full)}}`,
    "",
    "```ts",
    m.sig,
    "```",
    "",
    ...(m.doc ? [proseEscape(m.doc), ""] : []),
    ...(links.length ? [`Types: ${links.join(", ")}`, ""] : []),
  ];
}

function typeBlock(name, page) {
  const n = types.get(name);
  const out = [`### ${name} {#${anchor(name)}}`, ""];
  const doc = docOf(n);
  if (doc) out.push(proseEscape(doc), "");
  if (ts.isTypeAliasDeclaration(n)) {
    out.push("```ts", clean(n.getText(src)).replace(/;$/, ""), "```", "");
    return out;
  }
  const heritage = n.heritageClauses?.map((h) => clean(h.getText(src))).join(" ");
  if (heritage) out.push(`\`${name} ${heritage}\``, "");
  if (!n.members.length) return out;
  out.push("| Field | Type | Description |", "| --- | --- | --- |");
  for (const m of n.members) {
    const mName = m.name?.getText(src);
    if (!mName) continue;
    let type;
    if (ts.isMethodSignature(m)) type = clean(m.getText(src)).replace(/;$/, "").slice(mName.length);
    else type = m.type ? clean(m.type.getText(src)) : "";
    const opt = m.questionToken ? "?" : "";
    const ro = m.modifiers?.some((x) => x.kind === ts.SyntaxKind.ReadonlyKeyword) ? " (read-only)" : "";
    const named = /^([A-Z]\w*)(\[\])?$/.exec(type);
    const typeCell = named && types.has(named[1])
      ? `[\`${type}\`](${typePage.get(named[1]) === page ? "" : `./${typePage.get(named[1])}`}#${anchor(named[1])})`
      : `\`${cell(type)}\``;
    out.push(`| \`${mName}${opt}\` | ${typeCell} | ${cell(proseEscape(docOf(m)))}${ro} |`);
  }
  out.push("");
  return out;
}

function summaryTable(items, page) {
  return [
    "| Name | Description |",
    "| --- | --- |",
    ...items.map((m) => `| [\`${m.full}\`](#${anchor(m.full)}) | ${cell(proseEscape(firstSentence(m.doc) || ""))} |`),
    "",
  ];
}

const header = `<!-- GENERATED by scripts/gen-reference.mjs from alphascript.d.ts. Do not edit; run npm run gen. -->`;
const files = new Map();
for (const p of PAGES) {
  const lines = [header, "", `# ${p.title}`, "", p.intro, ""];
  const items = [];
  for (const g of p.globals) {
    const gl = globals.get(g);
    if (!gl) throw new Error(`global ${g} on page ${p.file} is not declared`);
    if (gl.fn) items.push(gl.fn);
    else items.push(...gl.members);
  }
  const placed = new Set();
  if (items.length) lines.push(...summaryTable(items, p.file));
  if (p.groups) {
    const g0 = p.globals[0];
    for (const [title, names] of Object.entries(p.groups)) {
      const ms = names.map((n) => items.find((m) => m.name === n && m.full.startsWith(`${g0}.`))).filter(Boolean);
      if (!ms.length) continue;
      lines.push(`## ${title}`, "");
      for (const m of ms) { lines.push(...memberBlock(m, p.file)); placed.add(m); }
    }
    const rest = items.filter((m) => !placed.has(m));
    if (rest.length) { lines.push("## Other", ""); for (const m of rest) lines.push(...memberBlock(m, p.file)); }
  } else {
    for (const g of p.globals) {
      const gl = globals.get(g);
      if (p.globals.length > 1 && !gl.fn) lines.push(`## ${g}`, "", ...(gl.doc ? [proseEscape(gl.doc), ""] : []));
      for (const m of gl.fn ? [gl.fn] : gl.members) lines.push(...memberBlock(m, p.file));
    }
  }
  if (p.types?.length) {
    lines.push(p.file === "types" ? "" : "## Types", "");
    for (const t of p.types) lines.push(...typeBlock(t, p.file));
  }
  files.set(`reference/${p.file}.md`, lines.join("\n").replace(/\n{3,}/g, "\n\n").trimEnd() + "\n");
}

const covered = new Set(PAGES.flatMap((p) => p.globals));
const unplaced = [...globals.keys()].filter((g) => !covered.has(g));
if (unplaced.length) throw new Error(`globals without a page: ${unplaced.join(", ")} (add them to PAGES)`);

const appLinks = join(pkg, "../../src/docs.ts");
if (existsSync(appLinks)) {
  const body = /REFERENCE_PAGE[^=]*=\s*\{([\s\S]*?)\};/.exec(readFileSync(appLinks, "utf8"))?.[1] ?? "";
  const app = Object.fromEntries([...body.matchAll(/(\w+): "(\w+)"/g)].map(([, g, f]) => [g, f]));
  const ours = Object.fromEntries(PAGES.flatMap((p) => p.globals.map((g) => [g, p.file])));
  const diff = [...new Set([...Object.keys(app), ...Object.keys(ours)])].filter((g) => app[g] !== ours[g]);
  if (diff.length) throw new Error(`alphaforge-frontend src/docs.ts REFERENCE_PAGE disagrees with PAGES for: ${diff.join(", ")}`);
}

const index = [header, "", "# API reference", "",
  `Everything a script can use. AlphaScript language v0.1, runtime ${runtimeVersion}. The reference is generated from the`,
  "type declarations that also drive the editor's autocomplete and the loader's whitelist, so it lists exactly the",
  "names a script can see.", "",
  "| Page | Contents |", "| --- | --- |",
  ...PAGES.map((p) => {
    const names = p.globals.length ? p.globals.map((g) => `\`${g}${globals.get(g).fn ? "()" : ""}\``).join(", ") : "value types";
    return `| [${p.title}](./${p.file}) | ${names} |`;
  }), ""].join("\n");
files.set("reference/index.md", index);

const sidebar = { version: runtimeVersion, items: PAGES.map((p) => ({ text: p.title, link: `/reference/${p.file}` })) };
files.set("reference/sidebar.json", JSON.stringify(sidebar, null, 2) + "\n");

let stale = 0;
for (const [rel, body] of files) {
  const path = join(root, rel);
  const old = existsSync(path) ? readFileSync(path, "utf8").replace(/\r\n/g, "\n") : null;
  if (old === body) continue;
  if (check) { console.error(`out of date: ${rel}`); stale++; continue; }
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, body);
}
if (check && stale) { console.error("run npm run gen"); process.exit(1); }
console.log(`reference: ${files.size} files, runtime ${runtimeVersion}, ${missing.length} entries without a description`);
if (missing.length && process.argv.includes("--missing")) console.log(missing.join("\n"));
