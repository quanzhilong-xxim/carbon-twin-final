# CarbonTwin — competition prototype

Project: C:\Users\23242\Desktop\CarbonTwin_App

## Run

Double-click START.cmd, or run npm.cmd run dev in this folder. Open http://localhost:3000.
Production: npm.cmd run build, then npm.cmd run start.
The requested latest initializer installed Next.js 16 / React 19 / Tailwind 4.
Production uses webpack to preserve server chunks in Windows Vercel local builds.

## Experience

- Three identities change the palette, copy, emissions chart, scenario baseline and AI context.
- Three.js renders a seeded 14,000-particle galaxy, wireframe globe, instanced city, orbital rings and moving nodes. Mobile uses fewer particles. GPU resources are disposed on unmount.
- GSAP SplitText animates the heading. Lenis shares the GSAP ticker. Story sections pin and scrub on sufficiently large screens; smaller screens use normal scrolling and reveals so controls stay reachable. Reduced-motion mode disables pinned animations and animated video.
- ECharts draws a custom perspective ring and glowing bars. The charts grow with scrolling and respond to hover.
- A pointer spotlight and perspective card tilt use pointer events without React frame-by-frame rerenders.
- Four local video backgrounds crossfade over 1000ms. Deep Woods adds a #182C41 atmospheric tint. The soundtrack starts muted; the sound button enables it.
- The camera is requested only after a user click. All tracks stop after the three-second scan, cancellation or unmount. Images are never uploaded or recorded. The report is explicitly simulated, not real device recognition.
- The future slider uses a transparent linear reduction calculation from a sample baseline.

## Real DeepSeek chat

Server endpoint: app/api/chat/route.ts. Uses Vercel AI SDK with OpenAI-compatible chat completions at https://api.deepseek.com/v1, default model deepseek-chat.

Set DEEPSEEK_API_KEY in .env.local, then restart locally. Never use NEXT_PUBLIC_ for a secret. Optional DEEPSEEK_MODEL changes the server model name. The API key is currently empty; the interface honestly reports this and never substitutes a canned AI answer.

For a public deployment, configure DEEPSEEK_API_KEY in Vercel Project Settings > Environment Variables and redeploy. Local .env.local is excluded from the deployment bundle. The route injects identity context, validates requests, streams text, handles missing credentials/provider errors, and accepts cancellation. Switching identity clears and aborts the previous conversation.

## Verification

TypeScript, ESLint and webpack production build passed. Playwright checked desktop/mobile/reduced-motion layout, identity and atmosphere switching, charts, missing-key state, scenario arithmetic, camera allow/deny/cancel and track cleanup. A test-only mocked provider verified the actual AI SDK request shape, all three identity system contexts and incremental streaming. Separate browser test transport verified incremental UI rendering, abort and role reset. A real DeepSeek generation cannot be tested until an actual key is configured.

Test scripts and screenshots: work/qa-v2.mjs, work/qa-interactions.mjs, work/chat-contract.mjs and work/v2-*.png. Test-only transports are never included in the application.

## Media and data

All carbon figures and coordinates are illustrative. This prototype is not a measured carbon inventory, real-time city feed or image recognition service.

Four 4K originals are retained locally in public/media/originals. Public playback uses silent 12-second H.264 clips at 1920px width plus posters. Original raw media is excluded from deployment. Sources: Andre Carrotflower and Acabashi (CC BY-SA 4.0), Vladislav Sanikovich (CC BY 3.0), NASA Kennedy Space Center (public domain). Music: T. Schürger / SoundHelix Song 1, 48-second excerpt. Font files and OFL licenses are local. Full source URLs, authors, licenses and transformations are in public/media/credits.json, linked in the footer.

## Deployment

This computer has no Vercel account credentials. The ordinary vercel --yes command returns a login requirement. DEPLOY-TEMPORARY.cmd / work/deploy.ps1 publishes an anonymous temporary preview that must be claimed in a Vercel account before expiry to retain it. The deployment wrapper keeps local environment files and raw 4K originals out of the public build, restoring them afterward. The private claim link and expiry are reported in the final handoff, never embedded in the website.

Project downloads, npm cache, temporary data and working files stay inside this Desktop directory. Credentials, .env.local, raw originals, caches and work/ are excluded from uploads.
