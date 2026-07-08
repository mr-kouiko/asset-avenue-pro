# Studio AI — New Visual System Rollout

Apply the "Obsidian navy + aurora" design language across every Studio AI tool page (12 pages) through a small set of shared, reusable components. Header, footer, and all business logic (API calls, generation, upload flow, model calls) are strictly untouched.

## Scope

**In scope (visual only):**
- Page background + ambient aurora glow
- Tool identity section (title / subtitle / icon)
- Control panel (prompt textarea + filter selectors + primary CTA)
- Output/results grid + empty states
- Typography (Inter for UI, Space Grotesk for tool titles)

**Out of scope:**
- `Header`, `Footer`, navbar, credits badge, search bar, account menu
- Any hook, API call, edge function call, upload logic, generation logic
- Route definitions, data shapes, filter values

## Design tokens (added to `src/index.css`)

New CSS variables scoped under a `.studio-ai` wrapper class so they don't leak into the rest of the site:

```
--sai-bg-base: #0A0E1A
--sai-bg-elevated: #0E1424
--sai-surface: #12172A
--sai-border-hairline: rgba(255,255,255,0.08)
--sai-border-strong: rgba(255,255,255,0.16)
--sai-text-primary: #F3F4F8
--sai-text-secondary: #8B92A8
--sai-text-muted: #5B6178
--sai-accent-violet: #6D5EF5
--sai-accent-cyan: #00D9FF
--sai-accent-magenta: #C084FC
--sai-gradient-cta: linear-gradient(135deg, #6D5EF5 0%, #8B5CF6 45%, #00D9FF 100%)
```

Fonts loaded via Google Fonts link in `index.html`: Inter (400/500/600) + Space Grotesk (500/600/700).

## Shared components (new)

Created under `src/components/studio-ai/`:

1. **`StudioPage.tsx`** — wraps a tool page: renders `<Header/>`, dark background, aurora glow (violet/cyan | magenta/violet | cyan/teal based on `category` prop), children, `<Footer/>`. Accepts `title`, `subtitle`, `icon`, `category`.
2. **`ControlPanel.tsx`** — glassmorphism card container for the left-side controls. Just a styled wrapper — children stay owned by each page.
3. **`PromptTextarea.tsx`** — styled textarea with focus ring.
4. **`PillGroup.tsx`** — labeled group (uppercase muted label + horizontal wrap of children).
5. **`Pill.tsx`** — selectable option with `active` prop; renders the exact active/inactive styling from the spec.
6. **`GenerateButton.tsx`** — the gradient CTA. Only one per page.
7. **`OutputGrid.tsx`** + **`OutputCard.tsx`** + **`EmptyStateCard.tsx`** — results grid with configurable aspect ratio (`video` | `square` | `audio`).

All components use the `--sai-*` tokens; no hard-coded colors in tool pages.

## Per-page rollout

Each tool page is edited to:
1. Replace the outer background wrapper + Header/Footer with `<StudioPage category=… title=… subtitle=… icon=…>`.
2. Wrap the existing controls column in `<ControlPanel>`; swap the prompt `<textarea>` for `<PromptTextarea>`; swap each existing filter row (aspect / resolution / duration / voice / etc.) for `<PillGroup label=…><Pill active=…/></PillGroup>`.
3. Swap the primary "Generate / Enhance / Convert / Resize" button for `<GenerateButton>` (secondary buttons remain ghost/outline via existing shadcn `variant="outline"`).
4. Wrap the results/preview column in `<OutputGrid aspect=…>` with `<EmptyStateCard>` for the empty state.

**Category → aurora hue map:**
- Video (ImageToVideo, TextToVideoAI, VideoUpscale, ReframeVideo) → `violet-cyan`
- Image (AIImageGenerator, AIUpscaler, FaceEnhancer, RemoveBackground, ImageConverter, ImageResizer) → `magenta-violet`
- Audio (TextToSpeech, AdjustMusicDuration) → `cyan-teal`

**Output aspect map:**
- Video pages → `video` (16:9)
- Image pages → `square`
- Audio pages → `audio` (compact waveform placeholder card)

No page's state, effects, handlers, or generation calls are modified — only JSX wrappers and className/style values.

## Verification

After each batch, run the dev build and open the tool in the preview via Playwright to confirm:
- No console errors
- Prompt input, pills, generate button render with the new styling
- Existing generation flow still triggers (button click reaches the same handler)

## File list

New: `src/components/studio-ai/{StudioPage,ControlPanel,PromptTextarea,PillGroup,Pill,GenerateButton,OutputGrid,OutputCard,EmptyStateCard}.tsx`, plus token additions to `src/index.css` and a Google Fonts `<link>` in `index.html`.

Edited (JSX/styling only): the 12 tool pages listed in the request.
