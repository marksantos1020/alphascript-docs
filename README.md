# alphascript-docs

The AlphaScript documentation site: the manual and the API reference for AlphaForge's strategy language.
Built with [VitePress](https://vitepress.dev) into a static site.

```
index.md                  home page
guide/                    the manual (hand-written)
reference/                API reference, GENERATED from alphascript.d.ts (do not edit by hand)
examples/                 examples gallery, GENERATED from the example and indicator sources (do not edit by hand)
notes/examples/           hand-written explanations merged into the example pages
scripts/                  the generators
.vitepress/               site config and theme
public/                   favicon, logo, Cloudflare _headers
.github/workflows/ci.yml  build check on every push and pull request (fails on broken links)
wrangler.jsonc            Cloudflare: serve .vitepress/dist as static assets
```

## Work on it

```bash
npm ci
npm run dev        # http://localhost:5173, reloads on save
```

## Regenerate the reference and the examples

The reference comes from `packages/alphascript/types/alphascript.d.ts` in alphaforge-frontend, the file that also
drives the editor's autocomplete. By default the generator reads it from the sibling checkout
`../alphaforge-frontend/packages/alphascript`; set `ALPHASCRIPT_DIR` to read it from elsewhere.

```bash
npm run gen                 # rewrite reference/ and examples/
npm run gen -- --missing    # also list the entries that have no description yet
npm run gen:check           # exit 1 if either is out of date
```

Descriptions belong in the JSDoc comments of `alphascript.d.ts`, not in the generated pages: the editor shows them too.
The examples come from `packages/alphascript/examples/` and `indicators/`, with their one-line descriptions from
`src/chart/library.ts` (the same text the chart's picker shows); the longer explanation of an example is
`notes/examples/<id>.md` here. Commit the regenerated `reference/` and `examples/` together with the docs change.

## Build

```bash
npm run build      # → .vitepress/dist
npm run preview    # serve the build locally
```

Optional environment: `DOCS_URL` (the site's address) adds a sitemap; `APP_URL` (AlphaForge's address) adds an
"Open AlphaForge" link to the top bar.

## Deploy (Cloudflare, Git integration)

Cloudflare builds and deploys the site itself on every push to `main`, the same way as alpha-chart: no API token,
no deploy job in GitHub Actions. `wrangler.jsonc` tells it to serve `.vitepress/dist` as static assets.

1. Cloudflare dashboard → Workers & Pages → Create → *Import a repository* → connect GitHub and pick
   `alphascript-docs`.
2. Build command `npm run build`; deploy command `npx wrangler deploy` (the default); root directory `/`.
3. Optional build variables: `APP_URL` (AlphaForge's address, adds an "Open AlphaForge" link) and `DOCS_URL` (the
   site's address, adds a sitemap).
4. Save and deploy. The site is at `https://alphascript-docs.<your-subdomain>.workers.dev`; every push to `main`
   redeploys it.
