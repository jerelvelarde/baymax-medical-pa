# Baymax launch presentation

An editable, approximately 88-second landscape launch video built with React components in Remotion. The demos are frame-driven UI scenes, so text stays sharp and every interaction can be adjusted without re-recording footage.

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

Sequence: Baymax introduction → medical appointment preparation and daily check-in → notification cards → travel preparation → prescription review → shared computer → doctor brief and email review → closing.

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

The Baymax adaptation keeps its approximately 88-second sequence, sage/cream/forest palette, original sprite assets, and component-based interactions. Feature-specific compositions replace the shared full-width app shell: a compact conversation, a checklist with its action, centered energy and travel cards, a vertical refill card, and wider document review. Headlines sit beside focused tasks or above centered cards, with no changing footer captions. The opening and closing center the Baymax wordmark and sprite. Short frame-driven entrances establish each chapter, then the camera holds steady during the interaction.

Claims remain limited to the example UI: conversation, daily care steps, travel preparation, simulated refill review, and a health-brief email draft. No backend execution is implied. TypeScript and representative intro/demo/outro frames were checked in Studio; no video export was rendered.

The reminder card scene recreates the user-supplied Baymax reminder UI as editable components. Medication, refill, and movement notifications enter in sequence over eight seconds. The appointment example uses symptoms, medication review, and questions for a doctor; no hackathon scenario remains. The positioning describes security and compliance as design intent, not a certification claim.

Prescription browsing now uses three distinct product cards for a type 2 diabetes and marathon-preparation example. See the product notes below. Selected packaging carries into the review card; pharmacy names, availability, and prices remain illustrative.

Reminders are presented as large standalone cards with staggered entrances; the device frame and lock-screen chrome have been removed.

Onboarding now opens with selectable care-goal cards, followed by adding a PDF and prescription image, reviewing extracted medical details, and a completion state. Files and extraction results are illustrative local UI states; no upload or OCR backend runs. `src/demo/OnboardingDemo.tsx` contains this sequence.

## Shared computer and refreshed daily care

The presentation includes editable component demonstrations based on [PR #29](https://github.com/jerelvelarde/baymax-medical-pa/pull/29) and [PR #39](https://github.com/jerelvelarde/baymax-medical-pa/pull/39). Source components and desktop screenshots were inspected. No screenshots are embedded in the video.

- `src/demo/ComputerDemo.tsx` and `computer-demo.css`: a new 18-second chapter before the doctor brief. Shared chat, cyan workspace, Browser/Terminal/Files dock, and control handoff follow PR #29. The session begins unlocked. A request leads to a public guide, a terminal command creates visit-notes.txt, and the user takes over to edit, save, and return control.
- `src/demo/TodayDemo.tsx` and `today-demo.css`: replaces the old care chapter within its 381-frame slot. Dark sidebar, warm ivory, peach check-in, ink-blue actions, and sky/lavender cards follow PR #39. Select Good, save the check-in, log water and a walk, then review medical appointment preparation. State carries into Plan; the walk also updates its completion count.

Both demos are deterministic illustrations with local example data, not recordings of backend execution. No live browser, terminal, persistence, device sync, or patient data is used. The browser card simplifies and paraphrases [MedlinePlus: Talking With Your Doctor](https://medlineplus.gov/talkingwithyourdoctor.html), inspected October 4, 2026. No third-party logo is bundled. The doctor-visit context replaces the hackathon example in the source screenshots.

| Scene | Local-frame actions |
| --- | --- |
| Today / Plan | Good 28; save 65; confirmation 78; water 120; walk 175; open Plan 235; medication list 280; questions 325. |
| Computer | Send 30; browser result 60; Terminal 155; file written 220; Files 245; take over 325; ownership granted 335; edit 360; save 408; return control 460; hold to 539. |

Cursor cues use the same event constants as the visible state. Edits wait for handoff; save confirmation follows text entry, and the final note preserves changes after returning control. Representative frames were checked in Studio and TypeScript passes. No video export was rendered. Previews: `docs/today-refresh-preview.png` and `docs/computer-demo-preview.png`.

## Diabetes and marathon product cards

The prescription chapter uses an adult example with an existing type 2 diabetes care plan:

- Metformin ER 500 mg, 30 extended-release tablets: an existing prescription refill, with quantity fixed to the example prescription. Example price $9.00.
- Glucose tablets, 10-tablet travel tube: low-glucose supplies, separate from ordinary race fuel. Example price $2.49.
- Blood glucose test strips, 50 strips: compatibility with the person's existing meter must be checked. Example price $19.99.

These are illustrative catalog entries, not a personal treatment plan, medication recommendation, live availability, or insurance quote. The flow selects glucose tablets, adds a second tube, and reviews the $4.98 example total. No prescription quantity or medication dose is changed. Marathon training, fueling, monitoring, and medication plans should be individualized with the diabetes care team; the demo provides no dosing or exercise thresholds.

Generic product photos were generated for this presentation, then bundled as JPEGs in `public/medicines/marathon/`. They are illustrative packaging, not manufacturer images or product-identification references. Medical context checked against [ADA exercise guidance](https://diabetes.org/health-wellness/fitness/getting-started-safely) and [ADA blood glucose and exercise](https://diabetes.org/health-wellness/fitness/why-does-exercise-sometimes-raise-blood-sugar). No external image runtime dependency. The browse and review states were checked in Studio; no video export rendered.
