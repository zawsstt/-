# 502 Bad Gateway — Server Emergency Room (DevOps Rhythm)

**Game Concept & Technical Blueprint**

Turn "saving a patient" into "saving a crashed production server." Every beat represents one load-balancer forward; on the 7th beat you press **Space** to execute **[Garbage Collection / Memory Release]**. The patients are the **Memory Leak Monster**, the **Deadlock Ghost**, and the **DDoS Flood**.

Hardcore command-line terminal plus a live monitoring dashboard. The boss fight's visual interference: red **Error Modals** popping up all over the screen and blocking the beat track, and the interface "lagging" with fake frame drops — but the underlying audio beat stays perfectly precise, testing the player's ability to resist distraction. Programmer judges will definitely smirk when they see "press Space to clear memory on the beat and withstand fake frame drops" — maximum dramatic effect.

---

## Core Modules — Vibe Coding Implementation Tips (Zero External Asset Dependency)

### 1. Zero Audio Files: Pure Code-Synthesized Music (Procedural Audio)

Use the browser's native `AudioContext` + `OscillatorNode` directly. Synthesize the ECG "beep" with sine/triangle waves, the snare with white noise + a filter, and the 808 kick and defibrillator shock with low-frequency sine sweeps. Zero file size — and you can even change BPM dynamically in real time.

### 2. Millisecond-Accurate Judgment (Lookahead Scheduler)

Never use `setInterval` to count beats (it drifts when rendering drops frames). Use `audioCtx.currentTime` — the hardware clock — as the single source of truth, with judgment windows of:

| Window | Grade | Meaning |
| --- | --- | --- |
| ±40 ms | **Perfect** | Perfect defibrillation |
| ±90 ms | **Good** | Barely holding on |
| Anything else | **Miss** | Cardiac failure |

### 3. Beatmap & Interference Engine (Beatmap & VFX Spec)

Define levels with a clean JSON structure:

```json
{ "bpm": 120, "pattern": "x-x-x-X", "gimmick": "glitch_blind" }
```

In specific bars, automatically attach CSS glitch filters to the outer container (e.g. `filter: invert(1)`, `transform: rotate(3deg)`, RGB chromatic aberration).

---

## Core Conclusion & Tech Selection (Recommended Action)

To achieve "god-tier pixel art" with zero external assets, don't have the AI draw complex vector graphics stroke by stroke on Canvas. Instead use the three-in-one approach of **2D character-matrix sprites (ASCII Pixel Matrix) + retro CRT scanline filter + pixel-level CSS UI**.

| Visual Module | Pure-Code Approach (Zero External Images) | Visual Effect & Advantage |
| --- | --- | --- |
| Characters & Monsters (patients / on-call engineer) | Render 16×16 or 24×24 two-dimensional character arrays | Define pixel points with string matrices, support 2–4 frame breathing/twitching animation; edges stay absolutely sharp when scaled up. |
| Scene & UI Borders (ER monitoring console) | Stepped `box-shadow` pixel borders + bitmap font | Goodbye rounded corners — every modal, health bar and button gets authentic NES / retro-terminal pixel feel. |
| Soul Filter (instantly 10× the quality) | CRT phosphor scanlines + RGB chromatic aberration shader | Even if the pixel art inside is simple, slight-curvature scanlines and glow make the art quality jump instantly. |

---

## 🎨 Reveal: How Does Pure Code "Draw" the *Rhythm Doctor* Pixel Style?

Using the following 4 core code techniques, we can have the AI generate complete pixel-art assets directly.

### Technique 1 — String-matrix sprites (Matrix Sprite Engine)

Use a 16×16 string array to represent the pixel grid (e.g. `.` = transparent, `R` = red error, `G` = green glow, `W` = chassis shell), then write a ~20-line render function using `ctx.fillRect(x * scale, y * scale, scale, scale)` to scale it up.

**Concrete use in *Server Emergency Room*:** we can have code generate 3 animated pixel bosses directly:

- **Memory Leak Slime** — swells one ring larger with every leaked beat
- **Two-headed Deadlock Ghost** — two chains tangled around each other, flickering
- **DDoS Flood Beast** — a wave made of countless tiny pixel skulls

### Technique 2 — Hardware-level sharp scaling (Pixelated Rendering)

Force `image-rendering: pixelated;` on the Canvas and container, and `ctx.imageSmoothingEnabled = false;`.

**Concrete use:** draw on a tiny 160×90 canvas first, then scale it 6× to fill the screen — even the ECG polyline and particle explosions get authentic pixel jaggedness.

### Technique 3 — Procedural pixel particles & screen cracks (Pixel VFX)

When Space is pressed on the 7th beat for a Perfect, spawn 30 4×4-pixel squares at the judgment point with random initial velocity and gravity, scattering outward.

**Concrete use:** on a successful defibrillation, the server rack erupts in emerald-green pixel sparks; on a Miss, the screen cracks with jagged red pixel fissures.

### Technique 4 — Pixel-level glitch staging (Boss Gimmicks)

Use Canvas `getImageData` / `putImageData` slice offsets, or CSS `steps(4)` stepped animation.

**Concrete use:** simulate server-overload **"pixel block tearing (Glitch Tear)"**, a **"fake blue-screen-of-death (BSOD) pixel modal"**, or even shrink the entire game view into a tiny pixel terminal window.

---

## 🖥️ Screen Layout Blueprint: *Server Emergency Room* in One Screen

To let you intuitively feel how it will look, we can design the whole game screen as a classic top/bottom split-screen pixel workstation.

| Screen Area | Pixel Visual Elements (all code-generated) | Core Interaction Feedback |
| --- | --- | --- |
| **Top half: Pixel Server ER (The Ward)** | Left: a pixel on-call engineer in a white coat with a stethoscope (raises the defibrillator / yanks the network cable when Space is pressed); center: a blade server rack smoking pixel-black smoke and flashing red lights; right: the pixel bug monster currently causing trouble. | On the beat, the server indicator lights blink in a 1–6 pattern; on the 7th beat the doctor clasps both hands and discharges — a thick pixel lightning bolt strikes the rack! |
| **Bottom half: ECG & beat track** | The classic *Rhythm Doctor* pixel ECG strip. The first 6 beats are small green pulse blocks advancing forward; the 7th beat is a highlighted, flashing **[GC Release]** pixel block. | Supports dual/triple parallel tracks (e.g. resuscitating the Nginx gateway and the MySQL primary simultaneously); different tracks get different pixel color schemes and beat patterns. |
| **Top overlay: visual interference layer (Gimmick Layer)** | Pixel-art Windows 95 classic error modals (Out of Memory!, 502 Bad Gateway), pixel snow noise, CPU-temperature-critical red alarm glow. | During specific bars of the boss fight they suddenly pop up and block your view — the player must blind-type by ear, following the pure-code-synthesized chiptune (8-bit) beat. |

---

## ⚠️ Pixel-Art Vibe Coding Pitfalls (Watch Out For)

| Common Mistake | How to Avoid It |
| --- | --- |
| Having the AI write thousands of lines of SVG paths to draw a character | AI hand-written complex vector coordinates easily go off-model. Use "low-resolution character grids (e.g. 16×16 ASCII art)" + symmetry-generation algorithms — AI is extremely good at drawing these blocky pixels, and changing colors or making frame animations only requires editing a few characters. |
| Chinese fonts ruining the pixel feel | Dropping ordinary Microsoft YaHei into a pixel game looks badly out of place. We can directly import open-source pixel fonts (such as **Zpix** or Google Fonts' **Press Start 2P / VT323**), or use a CSS threshold filter to pixelate the text edges. |
