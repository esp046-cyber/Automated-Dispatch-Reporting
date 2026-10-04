# Automated Dispatch & Reporting (PWA)
Field data to customer report. Automatically. No servers, no integrations: everything runs in the browser.

## Deploy on GitHub (no Codespaces, no CLI)
1. Unzip this file.
2. On github.com click **New repository**, name it, keep it Public, create it.
3. **Add file > Upload files**, drag in ALL unzipped files and folders (including `.nojekyll`), commit.
4. **Settings > Pages > Deploy from a branch > main / (root) > Save**.
5. Wait about a minute. Your app is at `https://USERNAME.github.io/REPO/`.
6. Optional, for the Messenger preview: in `index.html` replace `USERNAME` and `REPO` in the 3 lines containing `github.io` (og:url, og:image, twitter:image) using the pencil icon on GitHub.

## Install
Android Chrome: menu > Install app. iOS Safari: Share > Add to Home Screen.

## Workflow
Office creates tickets (Tickets tab), exports the workspace JSON and sends it to the engineer. The engineer imports it (Settings), does the visit offline, taps **Submit site visit**: the payload is validated, the ticket, maintenance log and audit trail are updated, and a PDF report is generated and saved. Share the PDF, and export the workspace JSON back to the office to import there (visit payloads are reprocessed on import).

## Messenger preview
Share the live URL in Messenger. If the card is stale, refresh it at the Facebook Sharing Debugger.

## Files
index.html, styles.css, manifest.webmanifest, sw.js, 404.html, .nojekyll, LICENSE, js/ (app, db, automation, validator, pdf), icons/ (5 PNGs), social/og-image.png
