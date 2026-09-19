# Project structure

BIG SIGNAL separates the browser experience, server integrations, educational content, and deterministic radio engine. This is an incremental organization: existing lab components remain in place while visual guides and walkthroughs now have feature boundaries.

```text
apps/
  web/src/
    app/navigation.ts       Page identifiers, labels, and navigation groups
    features/
      guides/               Radio introduction, rescue scene, tab stories
      walkthrough/          Guided project tour, styles, and component tests
    ProductApp.tsx          Application composition and page orchestration
    LabWorkspace.tsx        Radio workspace composition
    LabControls.tsx         Radio experiment controls
    TutorPanel.tsx          Optional tutor interface
  server/                   Local optional AI tutor server
  worker/                   Cloudflare server deployment
content/explanations/       Educational copy and walkthrough definitions
packages/                   Shared contracts, radio models, simulation, tutor logic
validation/                 Physics reference checks
docs/                       Architecture, setup, and contributor guidance
```

## Where changes belong

- Add navigation labels and page groups in `apps/web/src/app/navigation.ts`.
- Keep feature-specific components, styles, and tests together. Import guides and walkthroughs through their folder's `index.ts` entry point.
- Keep educational explanations in `content/explanations`, separate from rendering.
- Keep RF calculations in the engine packages, never inside React components. UI displays engine results; illustrations must not imply calculated coverage.
- Keep credentials and provider calls on the server. The optional tutor must not be required to use the core lab.
- Keep application-wide layout and accessibility rules in the existing shared stylesheets; avoid feature styles overriding unrelated controls.

This cleanup does not relocate all legacy components, change simulation contracts, or alter deployment entry points. Move other features incrementally with their tests rather than performing a repository-wide rename.

## Verify a structural change

From the repository root, run `bun run typecheck`, `bun run test`, and `bun run build`. Check navigation and affected controls in the browser at desktop and mobile widths. See [Architecture](ARCHITECTURE.md) for engine boundaries and [Tutor setup](TUTOR_SETUP.md) for optional voice configuration.
