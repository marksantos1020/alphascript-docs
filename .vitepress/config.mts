import { readFileSync } from "node:fs";
import { defineConfig } from "vitepress";

const reference = JSON.parse(readFileSync(new URL("../reference/sidebar.json", import.meta.url), "utf8")) as {
  version: string;
  items: { text: string; link: string }[];
};
const examples = JSON.parse(readFileSync(new URL("../examples/sidebar.json", import.meta.url), "utf8"));
const siteUrl = process.env.DOCS_URL?.replace(/\/$/, "");
const appUrl = process.env.APP_URL;

export default defineConfig({
  lang: "en-US",
  title: "AlphaScript",
  description: "The strategy language of AlphaForge: indicators and strategies for Bittensor subnet alpha markets.",
  cleanUrls: true,
  lastUpdated: true,
  srcExclude: ["README.md", "scripts/**", "notes/**"],
  sitemap: siteUrl ? { hostname: siteUrl } : undefined,
  head: [
    ["link", { rel: "icon", href: "/favicon.ico", sizes: "any" }],
    ["link", { rel: "apple-touch-icon", href: "/logo-128.png" }],
    ["meta", { name: "theme-color", content: "#2962ff" }],
  ],
  themeConfig: {
    logo: { src: "/logo-128.webp", alt: "AlphaScript" },
    nav: [
      { text: "Guide", link: "/guide/", activeMatch: "^/guide/" },
      { text: "Reference", link: "/reference/", activeMatch: "^/reference/" },
      { text: "Examples", link: "/examples/", activeMatch: "^/examples/" },
      ...(appUrl ? [{ text: "Open AlphaForge", link: appUrl }] : []),
      { text: `v0.1 · runtime ${reference.version}`, items: [{ text: "Language v0.1 (current)", link: "/reference/" }] },
    ],
    sidebar: {
      "/guide/": [
        {
          text: "Start here",
          items: [
            { text: "Introduction", link: "/guide/" },
            { text: "Getting started", link: "/guide/getting-started" },
            { text: "Script structure", link: "/guide/script-structure" },
          ],
        },
        {
          text: "Concepts",
          items: [
            { text: "Series and the block clock", link: "/guide/series" },
            { text: "Events and execution order", link: "/guide/events" },
          ],
        },
        {
          text: "Trading",
          items: [
            { text: "Trading on the pool", link: "/guide/trading" },
            { text: "Conditional orders and risk", link: "/guide/orders-and-risk" },
            { text: "Backtesting", link: "/guide/backtesting" },
          ],
        },
        {
          text: "More",
          items: [
            { text: "Writing indicators", link: "/guide/indicators" },
            { text: "Sandbox and limits", link: "/guide/limits" },
            { text: "Coming from Pine Script", link: "/guide/from-pine" },
          ],
        },
      ],
      "/reference/": [{ text: "API reference", link: "/reference/", items: reference.items }],
      "/examples/": examples,
    },
    outline: { level: [2, 3], label: "On this page" },
    search: { provider: "local" },
    footer: { message: `AlphaScript language v0.1 · runtime ${reference.version}` },
    docFooter: { prev: "Previous", next: "Next" },
  },
});
