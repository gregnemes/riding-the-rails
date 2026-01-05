## Dev: SCSS watch + CSS live injection

### One-time install

From the project root:

```bash
npm install
```

If you see a `node-sass` “Missing binding … binding.node” error:

```bash
npm rebuild node-sass
```

If that still won’t cooperate, the Gruntfile will automatically fall back to Dart Sass (`sass`).

If you want to avoid node-sass entirely (most reliable), do a clean install so `optionalDependencies` can be skipped if it fails:

```bash
rm -rf node_modules package-lock.json
npm install
```

### Build CSS once

```bash
npx grunt build
```

### Watch + live CSS injection (no full page reload)

```bash
grunt
```

This starts a BrowserSync static server rooted at the repo (`baseDir: "."`) and injects changes when `static/css/main.css` updates.

If you prefer the explicit task name:

```bash
grunt serve
```

### Undo / restore CSS

Backups were created next to the file:
- `static/css/main.css.bak-*`
- `static/css/main.css.map.bak-*` (if present)

Restore the most recent backup:

```bash
cp -p "$(ls -t static/css/main.css.bak-* | head -n 1)" static/css/main.css
```


