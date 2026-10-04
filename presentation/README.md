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

- `src/LaunchVideo.tsx`: intro, chapter headlines, and closing card.
- `src/scene-data.json`: chapter timing and interaction beat labels (not displayed as captions).
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

## OpenDots reference pass

Visual reference: user-supplied `OpenDots-Storyboard-v3-1080p.mp4` (1920×1080, 30 fps, 86 seconds). Sampled frames were inspected for title hierarchy, demo framing, backgrounds, and mascot placement. The reference video and audio are not bundled or reused.

The Baymax adaptation keeps its approximately 57-second sequence, sage/cream/forest palette, original sprite assets, and component-based interactions. Feature-specific compositions replace the shared full-width app shell: a compact conversation, a checklist with its action, centered energy and travel cards, a vertical refill card, and wider document review. Headlines sit beside focused tasks or above centered cards, with no changing footer captions. The opening and closing center the Baymax wordmark and sprite. Short frame-driven entrances establish each chapter, then the camera holds steady during the interaction.

Claims remain limited to the example UI: conversation, daily care steps, travel preparation, simulated refill review, and a health-brief email draft. No backend execution is implied. TypeScript and representative intro/demo/outro frames were checked in Studio; no video export was rendered.
