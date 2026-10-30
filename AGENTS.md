# Expo HAS CHANGED

Read the exact versioned docs at https://docs.expo.dev/versions/v56.0.0/ before writing any code.

## Design System

Visual source of truth: `design-system/MY_GROOMER_DESIGN_SYSTEM_v1.0.md`.
Use `design-system/tokens/`, `design-system/components/` (`MG*`), and `design-system/patterns/` for new UI.
`BoameBtn`, `Input`, `BookingCard`, and `StatusBadge` wrap MG/patterns for legacy screens only.
Dev showcase: Profile → Design System (`__DEV__`).

## Mandatory UI/UX review and Playwright

For every change to a screen, visual navigation, a component consumed by a screen,
tokens or theme, follow the shared MyGroomer kit in the parent directory:
`../.agents/skills/ui-review/SKILL.md` and `../.agents/skills/ui-e2e/SKILL.md`.
Skills and their references are shared by Codex and Cursor; resolve their paths
from the MyGroomer root containing `.specdev/project.json`, even when the editor
opens this app repository alone. If the kit is unavailable, report that blocker.

Inspect the current rendered UI, record `../Plans/<plan>/UI-REVIEW.md`, screenshots
and Playwright logs, fix all valid in-scope findings (including visual polish),
then review and run affected checks again until approved. Do not mark the screen,
plan or ticket complete or deliver it as ready while a required check is blocked,
evidence is missing, or a valid in-scope finding remains open. A passing typecheck
or Playwright run alone does not approve UI/UX. Web tests do not prove native
behavior. Keep the existing MG design system, Inter, pt-BR and light theme only.
