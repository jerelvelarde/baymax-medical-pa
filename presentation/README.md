# Baymax launch presentation

An editable, approximately 57-second landscape launch video built with React components in Remotion. The demos are frame-driven UI scenes, so text stays sharp and every interaction can be adjusted without re-recording footage.

## Open Remotion Studio

```sh
cd presentation
npm ci --cache /tmp/baymax-remotion-npm-cache
npm run studio
```

Open http://localhost:3100/Baymax-Launch. No exported video is included.

## Source

- `src/LaunchVideo.tsx`: intro, chapters, captions, and closing card.
- `src/scene-data.json`: chapter timing and captions.
- `src/demo/DemoApp.tsx`: onboarding, daily care, travel, and doctor brief scenes.
- `src/demo/PrescriptionShoppingCard.tsx`: prescription UI adapted from the app with deterministic demo state.
- `src/demo/demo-app.css` and `src/video.css`: large UI typography and presentation layout.
- `public/mascot/`: Baymax sprite assets.

Sequence: Baymax introduction → care plan and daily check-in → travel preparation → prescription review → doctor brief and email review → closing.

The scenes use local example data and do not call the app backend, place orders, or send email. UI steps advance according to the composition frame. The prescription and email flows show review and confirmation boundaries.

## Check source

```sh
npm run typecheck
```

Visual direction: minimal wording, clean component demos, sage Baymax branding, and animated mascot sprites. Reference supplied by the user: https://x.com/ataiiam/status/2102400431519592581/video/1 (video playback unavailable during editing).

## Interaction choreography

`src/demo/Interaction.tsx` defines the scene-local click schedule. Cursor cues are anchored inside their target controls. Typing, checkbox changes, pharmacy selection, quantity changes, and confirmation states follow frame-based events. These are illustrative interactions, not live backend operations.

Production guidance: [launch-video](https://github.com/jerelvelarde/demo-skills/blob/main/skills/launch-video/SKILL.md) and [ui-mockup-video](https://github.com/jerelvelarde/demo-skills/blob/main/skills/ui-mockup-video/SKILL.md), reviewed at commit `b7410ac`. Review is in Studio; no video export was rendered.
