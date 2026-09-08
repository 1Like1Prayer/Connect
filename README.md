# Connect

A React and TypeScript application for discovering, hosting, and joining Connects.
Vite provides the development server and production build.

## Domain naming and local state

The domain model is `Connect`, with list state named `connects`. Authored fixture
data lives in `src/copies/data/connects.json`, and discovery ordering lives in
`src/features/discovery/sortConnects.ts`.

Use descriptive properties such as `categoryKey`, `timeZone`, `whatToBring`,
`publicAreaLabel`, and `connectId`. Include units in numeric names, such as
`distanceKilometers`, `radiusKilometers`, and `defaultRadiusKilometers`; the
future server radius contract remains `radiusMeters`. Keep ordinary readable
names such as `name`, `email`, and `id`, and preserve required React, browser,
and SDK field names. Application action and time-calculation results use
`success`, while native `Response.ok` remains unchanged. See
[Architecture.md](Architecture.md) for the full domain naming, discovery query
keys, theme tokens, and API contracts.

The rename starts fresh local formats: `connect-state-v2` with persistence
version `2`, `connect-host-draft-v2:...`, and `connect-community-feedback-v2`.
Previously saved data is not loaded or migrated; earlier namespaces are neither
read nor deleted, leaving their stored keys physically untouched. Earlier
host-draft migrations have been removed, with no compatibility aliases for
earlier field names. This changes local preview storage only; production
integrations remain unchanged and unconnected.

## Getting started

- **Node.js 24 is recommended.** The installed Vite version supports Node.js
  `^20.19.0 || >=22.12.0`.
- Use npm with the committed `package-lock.json`.

From the project root:

```powershell
npm ci
npm run dev
```

Open the local URL printed by Vite. Stop the server with **Ctrl+C**.

## Project scripts

These commands are defined in `package.json`:

| Command | Runs | Purpose |
| --- | --- | --- |
| `npm run dev` | `vite` | Starts the development server with hot module replacement. Uses port 5173 by default, or another available port. |
| `npm run build` | `tsc -b && vite build` | Type-checks the application and Vite configuration, then produces the static application in `dist`. Vite only runs if TypeScript succeeds. |
| `npm run check:copies` | `node tools/check-copies.cjs` | Looks for application-authored user-facing text outside `src/copies`. Reports locations that need review. |
| `npm run preview` | `vite preview` | Serves the existing `dist` build locally, normally on port 4173. Run the build first. This is not a production hosting or deployment command. |

### Development server options

Arguments after `--` are forwarded to Vite. For example, to use a specific local
port and fail instead of automatically choosing a different one:

```powershell
npm run dev -- --host 127.0.0.1 --port 5178 --strictPort
```

### Inspecting a production build

```powershell
npm run build
npm run preview
```

The preview server serves built files, not live source changes. Rebuild after
changing source files if you want those changes reflected in this server.

## Copy-centralization checker

`tools/check-copies.cjs` is a **read-only development tool** that helps enforce
the project's rule: application-authored user-facing text belongs in
`src/copies`, organized by feature and usage and exported through its `index.ts`.

Run it with:

```powershell
npm run check:copies
```

The equivalent direct command is:

```powershell
node tools\check-copies.cjs
```

### What it does

- Recursively scans `.ts` and `.tsx` files under `src`, excluding declaration
  files and directories named `copies`.
- Uses TypeScript's syntax parser to inspect JSX text, string literals, and
  template literals.
- Flags likely UI copy, including labels, placeholders, accessibility text,
  descriptions, messages, and authored display data.
- Recognizes many technical contexts so imports, routes, CSS values, type
  declarations, schema field identifiers, and similar implementation strings
  can remain in code.
- Checks `index.html` for hardcoded page titles or descriptions, which should
  come from `src/copies/app/metadata.ts`.

When findings exist, it prints the file, line number, and a text excerpt, then
exits with status **1**. Otherwise, it reports the number of scanned modules
and exits successfully.

### Resolving findings

For actual UI copy, add or reuse a value in the relevant copy module, export
new modules through `src/copies/index.ts`, and reference that value in the
component. For example, the signup button uses:

```tsx
<Button>{signupPageCopy.continue}</Button>
```

Do not move technical identifiers into editable copy merely to silence a
finding. For a false positive, inspect the syntax context and make a narrow
adjustment to the checker's technical-context rules if needed.

### Limitations

Detection is heuristic: it can produce false positives or miss some text.
It does not inspect CSS or JSON files, dependencies, or runtime API responses.
Authored JSON content still belongs in `src/copies`; the checker is not proof
that every possible text source follows the rule.

The tool does not move strings, rewrite files, validate wording, translate
content, or run in the browser. It is also **not automatically invoked** by
`dev`, `build`, or `preview`.

## Vite configuration automation

`vite.config.ts` is configuration loaded by Vite, not a separate command-line
script. It:

- Enables the React plugin.
- Registers the `connect-document-copy` HTML transform, which injects the page
  title and description from `metadataCopy` in `src/copies/app/metadata.ts`.

This transform runs when Vite serves the source HTML and when it creates a
production build. The preview server uses the metadata already in that build.

## Optional service configuration

Copy `.env.example` to `.env.local` to configure the standalone API origin and
public Azure Maps account client ID:

```powershell
Copy-Item .env.example .env.local
```

Edit `VITE_API_BASE_URL` and `VITE_AZURE_MAPS_CLIENT_ID`, then restart the
development server or rebuild. Never put subscription keys, client secrets,
or database credentials in `VITE_*` variables: these values are exposed to the
browser.

These scripts build and serve the frontend. They do not provision Azure
resources, deploy the app, or connect authentication, notification delivery,
or payment services. See [Architecture.md](Architecture.md) for the service
boundaries and integration contracts.

## Before submitting changes

```powershell
npm run check:copies
npm run build
```

There are currently no separate test, lint, or deployment commands defined in
`package.json`.
