# Baymax launch presentation

An editable, approximately 70-second landscape launch video built with React components in Remotion. The demos are frame-driven UI scenes, so text stays sharp and every interaction can be adjusted without re-recording footage.

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
