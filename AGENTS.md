# Repository Guidelines

## Project Structure & Module Organization
Savora is a Next.js 14 app. Route handlers and pages live in `app/`, with API handlers under `app/api/` and UI routes like `app/search`. Reusable components sit in `components/`, grouped by feature and under `components/ui/` for shadcn primitives. Custom hooks belong in `hooks/`, shared utilities in `lib/`, and shape definitions in `types/`. Static assets are in `public/`; global Tailwind config lives in `app/globals.css` and `styles/`.

## Build, Test, and Development Commands
Install dependencies with `pnpm install`. Run the dev server via `pnpm dev` (hot reload on http://localhost:3000). Build production assets with `pnpm build`, and start the compiled app using `pnpm start`. Enforce lint rules and type-aware checks through `pnpm lint`; resolve errors before committing.

## Coding Style & Naming Conventions
Write TypeScript-first React components with 2-space indentation and single quotes disabled in favor of double quotes (Next.js default). Use `PascalCase` for components and file names inside `components/`, `camelCase` for hooks (`usePreferences`) and helper functions, and `kebab-case` for route folders. Keep Tailwind utility classes expressive but concise; prefer composing reusable styles via `cn` helpers in `lib`. Always type props and API responses explicitly, leaning on models in `types/` to avoid `any`.

## Testing Guidelines
Testing is not yet scaffolded; when adding coverage, colocate files under `__tests__/` next to the code under test and favor `@testing-library/react` for UI and lightweight integration tests for API routes. Strive for meaningful business assertions (personalization, location fallbacks). Until a dedicated runner is added, rely on `pnpm lint` and manual verification, and document any gaps in the PR.

## Commit & Pull Request Guidelines
Follow Conventional Commits (`feat:`, `fix:`, `chore:`) as seen in `6525668` and `078f902`. Keep messages imperative and scoped to one concern. PRs should include: clear summary, linked issue or tracking ticket, screenshots or screen recordings for UI changes, and explicit test notes (e.g., "pnpm lint"). Request a review before merging; avoid force pushes after review without notification.

## Environment & Configuration
APIs require `TOMTOM_API_KEY` and an optional `NEXT_PUBLIC_BASE_URL`. Reference the provided `.env.example` if added; otherwise document new variables in the PR. Never commit secrets—use Vercel project settings or local `.env.local`.
