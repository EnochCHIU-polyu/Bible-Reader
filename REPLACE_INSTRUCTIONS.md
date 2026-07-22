# GitHub Pages replacement pack

Copy these files into the repository root, preserving their folders.

## Apply

```bash
cp -R github-pages-replacement-files/. /path/to/Bible-Reader/
cd /path/to/Bible-Reader
node scripts/apply-static-data-fix.mjs
npm run build
```

The build must contain:

```text
dist/index.html
dist/bible/manifest.json
dist/bible/GEN/1.json
```

For a custom domain at `enochchiu.xyz`, keep `VITE_BASE_PATH=/`.
For `username.github.io/Bible-Reader/`, change it to `VITE_BASE_PATH=/Bible-Reader/` in both `.env.production` and the workflow.

In GitHub: Settings > Pages > Source > GitHub Actions.
