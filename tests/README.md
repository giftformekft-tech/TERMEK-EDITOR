# Studio UI smoke test

Run from the repository root with Node.js, Playwright and Chrome installed:

```powershell
$env:PLAYWRIGHT_MODULE = 'path/to/node_modules/playwright'
$env:FABRIC_JS_PATH = 'path/to/fabric-5.3.0.min.js'
node tests/studio-smoke.cjs
node tests/appearance-preview.cjs
```

`PLAYWRIGHT_MODULE` is optional when `playwright` resolves normally. `CHROME_PATH` optionally selects a Chrome executable. Fabric is the same 5.3.0 browser dependency already loaded by the plugin.

The test runs the actual frontend template, stylesheets and editor code in a browser with an in-memory product/catalog and mocked REST responses. It checks tools, text, layers, history, both sides, cart failure recovery, theme colors and responsive access at 1440, 1024, 768, 390 and 320 pixels. Screenshots go to the ignored `tmp/ui-qa` directory. No live shop or customer data is accessed.

This does not replace a WordPress/WooCommerce integration test of admin persistence, live product data, pricing, or successful checkout.

Mobile regression coverage also checks cold-start prices (including numeric-only data without the desktop price container), two-sided surcharges, the header below the canvas, the visible scroll hint, centered SVG controls under theme button padding, and the bottom cart button opening a panel with final cart submission and bulk ordering, including failure recovery and a mocked successful redirect.

The appearance test uses the real admin preview markup and script with form fixtures. It verifies changing primary/secondary colors, square corners, and restoring defaults without submitting a form.
