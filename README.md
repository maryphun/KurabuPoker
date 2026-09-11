# KurabuPoker

A static, responsive poker education dashboard built with Vue 3, TypeScript, Vite, Tailwind CSS 4, and shadcn-vue components. The supplied SVG logo is preserved in `public/kurabu-poker-logo.svg` and used as the brand mark and favicon.

## Development

```sh
npm install
npm run dev
```

`npm run build` runs strict TypeScript validation and produces the production site in `dist`. `npm run preview` serves that build.

## Structure

- `src/components/layout` — application shell components.
- `src/components/dashboard` — independent dashboard panels.
- `src/components/ui` — locally owned shadcn-vue primitives.
- `src/data/dashboard.ts` — sample presentation data, ready to replace with API-backed composables.
- `src/style.css` — brand tokens, layout, and responsive styles.

This first version is deliberately presentation-only: no authentication, routes, API calls, persistence, or working product controls. Sample data is labeled in the header. Future pages can be added with Vue Router; service/composable modules can replace fixtures without rewriting the layout. Use `npx shadcn-vue@latest add <component>` to extend the UI primitives.
