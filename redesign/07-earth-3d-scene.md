# 07 — The 3D Earth Scene

The complete rebuild spec for OrbitGuard's 3D Earth: **correct "grab-the-globe" controls,
satellites that read as real glowing objects, a cinematic starfield, and tasteful bloom** — all
offline-safe, performant, and with a reduced-motion fallback. This doc obeys docs 01–04; where it
references the look, motion, or stack it is implementing those contracts, not redefining them.

> Owner: Agent D. Output lives in `frontend/src/components/earth/`. We migrate the existing
> imperative `EarthScene.tsx` (466 lines) to declarative **React Three Fiber (R3F)** + **drei** +
> **@react-three/postprocessing** (added in doc 04 §1).

---

## 0. The "before" — what we are replacing (current `EarthScene.tsx`)

The current scene is a single 466-line `useEffect` that builds three.js imperatively. It works but
has three confirmed, demo-killing problems (also called out in `redesign/README.md`). Every line
number below refers to `frontend/src/components/EarthScene.tsx` unless noted.

| Problem | Root cause in current code | Lines |
|---|---|---|
| **Drag feels reversed + laggy** | Custom pointer handler adds `targetYaw += dx * 0.0065` and `targetPitch += dy * 0.0045` — opposite sign vs. standard OrbitControls. Then a *double* lerp (targets→current, then `camera.position.lerp`) adds heavy latency. | `341–349` (handler), `345–346` (signs), `380–382` + `390` (double lerp) |
| **Satellites look like dots** | `BoxGeometry(0.07 * scale, …)` body at orbit `radius` ~1.9–2.38 with camera ~5.35 away → ~2–3px on screen. Glow sphere opacity only `0.18`. Billboarded with `model.lookAt(camera.position)`. No bloom to make emissive pop. | `71–103` (model), `74` (size), `99` (glow), `411` (billboard) |
| **No real space background** | `scene.background = #01040a` flat fill, `THREE.Fog(#01040a, 7, 14)` washes everything, faint `THREE.Points` starfields. No skybox / nebula / bloom. | `261` (bg), `262` (fog), `152–166` + `294–295` (stars) |

Other things being replaced:

| Current element | Lines | Replaced by |
|---|---|---|
| `createOrbit()` 1px `LineLoop` + `LineBasicMaterial` | `56–69`, `64` | `OrbitTrail` (drei `<Line>` / Line2, world-unit width, fading + risk color) — §5 |
| `createSatellite()` / `createDebris()` | `71–124` | `Satellite` component with constant-screen scale, emissive material, halo sprite, optional model — §4 |
| `createLabel()` canvas `Sprite` | `126–150` | drei `<Html>` billboard labels — §4 |
| `createAtmosphere()` fixed-direction rim shader | `168–192` | `Atmosphere` Fresnel + sun-aware shader (2 layers) — §8 |
| `cameraPose()` + per-frame `camera.position.lerp` | `194–208`, `379–393` | `CameraRig` framing presets + damped transitions, drei `<OrbitControls>` — §3, §9 |
| Manual lights | `297–302` | Kept (key/rim/ambient) but tuned for ACESFilmic + bloom — §7 |
| Manual `pointerdown/move/wheel` listeners | `333–364` | drei `<OrbitControls>` (fixes drag for free) + `SceneControls` overlay — §3 |
| Manual `scene.traverse` dispose | `423–441` | R3F auto-dispose + `useTexture` cache — §10 |
| Keyboard handler `handleKeyDown` | `246–254` | Kept, re-implemented against the `OrbitControls` ref — §3 |
| On-screen zoom/reset buttons | `444–463`, `earth.css` `19–73` | Kept as a Tailwind glass overlay, wired to controls ref — §3 |

The Earth texture path stays the same: `/textures/earth-blue-marble-june-5400x2700.jpg`
(confirmed present, 2.38 MB, loaded today at line `276`). Loading it via drei `useTexture` keeps
the demo **offline-safe** (no runtime CDN).

---

## 1. Goals & non-goals

### Goals
1. **Cinematic.** A near-black space, a real deep starfield, a softly glowing atmosphere, and neon
   satellites that bloom — the "lean in" moment from doc 01 §1 and `README.md`.
2. **Intuitive.** Dragging the globe moves the surface *with* the cursor ("grab the globe"). Zoom,
   reset, keyboard, and touch all behave the way people expect from Google Earth / map apps.
3. **Performant.** 60 fps target on a typical laptop integrated GPU; capped pixel ratio; one WebGL
   context; lazy-loaded 3D chunk.
4. **Offline-safe.** All assets (Earth texture, fonts, optional models) are self-hosted under
   `frontend/public/`. No runtime network for the scene.
5. **Accessible & reduced-motion-safe.** Honors `prefers-reduced-motion` (no idle drift / pulses),
   keyboard-operable, and degrades to a static render or CSS globe when WebGL is unavailable / the
   device is low-power (doc 02 §9, doc 04 §6).

### Non-goals
- **Not** a physically accurate orbital propagator in the view layer. Orbits are visual; real
  numbers come from the API (doc 04 §5) and are shown in panels, not computed in the shader.
- **Not** a full GIS globe (no tiles, no terrain LOD). One textured sphere is enough.
- **Not** multiple simultaneous canvases. Exactly one `<Canvas>` is mounted at a time (doc 04 §6).
- **Not** photoreal city lights / clouds in v1 (optional later via extra maps; keep the chunk small).

---

## 2. Architecture: imperative three.js → declarative R3F

We replace the single 466-line `useEffect` with a small tree of focused components. Scene objects
become React components; animation lives in `useFrame`; resources are memoized and auto-disposed.

### 2.1 Component tree (`frontend/src/components/earth/`)

```
earth/
  EarthCanvas.tsx        # <Canvas> + providers + lights + postprocessing + Suspense  (public entry)
  Earth.tsx              # textured day-map sphere (+ slow spin), hosts <Atmosphere>
  Atmosphere.tsx         # Fresnel rim + sun-aware scattering halo (2 shader layers)
  Starfield.tsx          # drei <Stars> + optional <Nebula> gradient backdrop
  Nebula.tsx             # large inverted gradient sphere (subtle colored deep-space haze)
  Satellite.tsx          # one object: model + emissive material + halo sprite + <Html> label
  OrbitTrail.tsx         # drei <Line> (Line2) glowing, risk-colored, fading trail
  ConjunctionMarker.tsx  # pulsing TCA marker + danger connector line
  CameraRig.tsx          # per-route/phase framing + damped transitions + idle auto-rotate gate
  SceneControls.tsx      # drei <OrbitControls> config + keyboard + on-screen zoom/reset overlay
  EarthFallback.tsx      # static/CSS globe for no-WebGL / low-power / reduced-data
  scene.config.ts        # framing presets, quality tiers, scenario→objects map, risk colors
  types.ts               # OrbitObject, CameraFraming, Quality
```

`EarthCanvas` is the only component routes import (plus a back-compat `EarthScene` adapter, §11).

### 2.2 Data model & public props

Routes pass **data**, not three.js objects. The scene derives geometry from a declarative model.

```tsx
// earth/types.ts
export type Risk = "safe" | "watch" | "warning" | "danger";

export type OrbitObject = {
  id: string;                 // stable id (NORAD id or name)
  name: string;               // display name, e.g. "CARTOSAT-2F"
  kind: "satellite" | "debris";
  risk: Risk;                 // drives color + emphasis (doc 02 §2.4)
  orbit: {
    radius: number;           // scene units (Earth radius = 1.5; LEO band ~1.9–2.4)
    inclination: number;      // radians (tilt of the orbital plane)
    raan: number;             // radians (longitude of ascending node / yaw)
    phase: number;            // 0..1 starting position along the orbit
    speed: number;            // visual angular speed
  };
  showLabel?: boolean;        // force label on (selected/threat always on)
};

export type Quality = "auto" | "high" | "low";

export type CameraFraming = {
  distance: number;           // camera distance from target
  target: [number, number, number];
  polar?: number;             // initial polar angle (radians)
  azimuth?: number;           // initial azimuth (radians)
  fov?: number;
  autoRotate?: boolean;       // gentle idle drift (paused on user interaction)
};
```

```tsx
// earth/EarthCanvas.tsx — public API routes consume
export type EarthCanvasProps = {
  objects: OrbitObject[];                 // what to render
  selected?: string;                      // selected object id (emphasis + label + camera focus)
  phase: MissionPhase;                    // "alert" | "planned" | "applied" | "report"
  scenarioId: string;                     // "protect-isro" | "2009-replay" | "kessler-sandbox"
  interactive?: boolean;                  // default true; false = view-only hero (Home)
  quality?: Quality;                      // default "auto" (capability/route based)
  framing?: Partial<CameraFraming>;       // per-route override (else preset from scenario/phase)
  showThreatLine?: boolean;               // draw the danger connector (threat detail / avoidance)
  onSelect?: (id: string) => void;        // click an object → route updates ?object=<id> (doc 03 §7)
};
```

`MissionPhase` is the existing union from `state/missionStore.ts:19`
(`"alert" | "planned" | "applied" | "report"`). `scenarioId` matches the three scenarios used
today (`protect-isro`, `2009-replay`, `kessler-sandbox`).

### 2.3 The canvas shell

```tsx
// earth/EarthCanvas.tsx (structure)
import { Canvas } from "@react-three/fiber";
import { Suspense } from "react";
import * as THREE from "three";

export function EarthCanvas(props: EarthCanvasProps) {
  const quality = useQualityTier(props.quality);     // §10
  const reducedMotion = usePrefersReducedMotion();    // §10
  if (!hasWebGL()) return <EarthFallback {...props} />; // §10

  return (
    <div className="earth-scene">                      {/* keeps existing container class */}
      <Canvas
        dpr={quality === "low" ? 1 : [1, 2]}           // replaces line 268 pixel-ratio cap
        gl={{
          antialias: quality !== "low",
          powerPreference: "high-performance",
          toneMapping: THREE.ACESFilmicToneMapping,    // §7
          toneMappingExposure: 1.05,
        }}
        camera={{ fov: 33, position: [0, 0.4, 6], near: 0.1, far: 200 }}
        frameloop={reducedMotion ? "demand" : "always"} // §10
      >
        <color attach="background" args={["#05070E"]} /> {/* --bg-void; replaces #01040a line 261 */}
        <SceneLights />                                  {/* key/rim/ambient, §7 */}
        <Suspense fallback={null}>
          <Starfield quality={quality} reducedMotion={reducedMotion} />
          <Earth reducedMotion={reducedMotion} />
          <SceneContent {...props} reducedMotion={reducedMotion} />
        </Suspense>
        <CameraRig {...props} reducedMotion={reducedMotion} />
        <SceneControls {...props} reducedMotion={reducedMotion} />
        <PostFX quality={quality} />                     {/* EffectComposer, §7 */}
      </Canvas>
      <SceneControlsOverlay {...props} />                {/* DOM zoom/reset buttons, §3 */}
    </div>
  );
}
```

`SceneContent` maps `props.objects` to `<Satellite>` + `<OrbitTrail>` and renders
`<ConjunctionMarker>` when relevant — pure declarative composition replacing the imperative
`TRACKS.map(...)` loop at lines `304–310`.

---

## 3. CONTROLS FIX — intuitive "grab the globe"

**The core fix is replacing the hand-rolled pointer math (lines `333–364`) with drei
`<OrbitControls>`.** OrbitControls orbits the *camera* around a fixed `target` using standard
azimuth/polar conventions, so dragging right rotates the globe so its surface follows the cursor —
the universally expected "grab the globe" feel. This **deletes the reversed-sign bug** at lines
`345–346` (`targetYaw += dx*0.0065`, `targetPitch += dy*0.0045`) because we no longer invert or
hand-roll the mapping at all. It also **removes the double-lerp lag** (lines `380–382` and `390`):
OrbitControls' own `enableDamping` provides a single, frame-rate-independent smoothing pass.

```tsx
// earth/SceneControls.tsx
import { OrbitControls } from "@react-three/drei";
import * as THREE from "three";

export const SceneControls = forwardRef<OrbitControlsImpl, Props>(function SceneControls(
  { interactive = true, reducedMotion, ... }, ref
) {
  return (
    <OrbitControls
      ref={ref}
      makeDefault
      enabled={interactive}
      target={[0, 0, 0]}              // Earth center — orbit around the globe, never pan off it
      enableDamping
      dampingFactor={0.08}            // single, correct smoothing (replaces lines 380–382, 390)
      rotateSpeed={0.55}              // calm, not twitchy
      zoomSpeed={0.7}
      enablePan={false}              // no panning — the globe stays centered
      minDistance={3.2}              // zoom-in limit (replaces MIN_ZOOM line 33)
      maxDistance={9}                // zoom-out limit (replaces MAX_ZOOM line 34)
      minPolarAngle={0.25}           // don't flip over the poles (replaces MIN/MAX_PITCH 35–36)
      maxPolarAngle={Math.PI - 0.25}
      autoRotate={!reducedMotion && idle}   // gentle idle drift; gated in §9
      autoRotateSpeed={0.35}
      // touch: one finger rotate, two-finger pinch = dolly (pan disabled)
      touches={{ ONE: THREE.TOUCH.ROTATE, TWO: THREE.TOUCH.DOLLY_ROTATE }}
    />
  );
});
```

### 3.1 Keyboard + on-screen buttons (kept, re-wired)

We keep the arrow-key controls (today at lines `246–254`) and the zoom/reset overlay (today at
lines `444–463`), but drive them through the controls ref instead of the custom interaction object.

```tsx
// helpers operating on the OrbitControls ref
function rotateBy(c: OrbitControlsImpl, dAz: number, dPolar: number) {
  c.setAzimuthalAngle(c.getAzimuthalAngle() + dAz);
  c.setPolarAngle(THREE.MathUtils.clamp(c.getPolarAngle() + dPolar, 0.25, Math.PI - 0.25));
  c.update();
}
function dolly(c: OrbitControlsImpl, factor: number) {          // zoom buttons / +,- keys
  const dir = c.object.position.clone().sub(c.target);
  const d = THREE.MathUtils.clamp(dir.length() * factor, c.minDistance, c.maxDistance);
  c.object.position.copy(c.target).add(dir.setLength(d));
  c.update();
}
// reset: call c.reset() after c.saveState() was set to the route's framing on mount.

// key map (mirrors current handleKeyDown lines 247–253):
// ←/→ rotateBy(±0.18, 0) · ↑/↓ rotateBy(0, ∓0.14) · +/- dolly(0.88 / 1.12) · 0 or R → reset()
```

The DOM overlay (`SceneControlsOverlay`) is a Tailwind **glass** panel (doc 02 §5) bottom-right,
replacing the `.earth-controls` CSS in `styles/earth.css:19–73`. Buttons keep `lucide-react`
`ZoomIn` / `ZoomOut` / `RotateCcw`, ≥44px hit targets (doc 02 §9), and lowercase labels (kill the
`text-transform: uppercase` + `font-weight: 900` at `earth.css:40–41`, per doc 02 §3.2).

### 3.2 Touch & a11y notes
- **Touch:** one finger rotates, two-finger pinch zooms (no pan). `touch-action: none` stays on the
  canvas (today set at line `272`) so the browser doesn't steal the gesture.
- **Keyboard:** the container keeps `tabIndex={0}` and a visible cyan focus ring (doc 02 §9); the
  scene is fully operable without a pointer (acceptance gate, doc 09).
- **Right-click:** OrbitControls' default right-drag pan is disabled via `enablePan={false}`.

---

## 4. Satellites that look REAL

Today a satellite is a ~0.07-unit box (line `74`) at orbit radius ~2 with the camera ~5.35 away
(line `265`) → **2–3 px**, plus a glow at opacity `0.18` (line `99`) and a `lookAt(camera)`
billboard (line `411`). We make them read as deliberate, glowing objects at any zoom.

### 4.1 Constant on-screen size (the key fix)
Scale each satellite by its distance to the camera every frame so it holds a roughly **constant
pixel size** regardless of zoom — small objects never vanish, close ones never balloon.

```tsx
// earth/Satellite.tsx
useFrame(({ camera }) => {
  group.current.position.copy(orbitPosition(obj.orbit, t));        // declarative orbit (no lookAt billboard)
  const d = camera.position.distanceTo(group.current.position);
  const base = obj.id === selected ? 0.05 : 0.034;                 // selected/threat larger
  group.current.scale.setScalar(THREE.MathUtils.clamp(d * base, 0.06, 0.42));
});
```

### 4.2 Emissive neon + a glowing halo that "pops"
- **Material:** `meshStandardMaterial` with `emissive = riskColor`, `emissiveIntensity ≈ 2.2`
  (3.0 for the threat). High emissive is what the bloom pass (§7) turns into a glow — this is the
  real reason today's satellites look dead (no bloom + emissive `0.45` at line `78`).
- **Halo:** an additive `<sprite>` (soft radial-gradient texture, generated once) sized ~2.4× the
  body, colored by risk, `opacity ≈ 0.7`. Replaces the dim glow sphere at line `99`. The halo is a
  billboard sprite (always faces camera) so the "dot" becomes a soft glowing point that bloom
  smears tastefully.

```tsx
const color = RISK_COLOR[obj.risk];                 // doc 02 §2.4 tokens
return (
  <group ref={group}>
    <SatelliteModel kind={obj.kind} />              {/* §4.3 */}
    <meshStandardMaterial attach="...body..." emissive={color} emissiveIntensity={2.2}
      color="#dfffff" metalness={0.6} roughness={0.3} toneMapped={false} />
    <sprite scale={[2.4, 2.4, 1]}>
      <spriteMaterial map={haloTexture} color={color} blending={THREE.AdditiveBlending}
        depthWrite={false} transparent opacity={0.7} toneMapped={false} />
    </sprite>
    {showLabel && <Label name={obj.name} risk={obj.risk} />}  {/* §4.4 */}
  </group>
);
```

> `toneMapped={false}` on emissive/halo keeps neon colors true under ACESFilmic so they pop and
> bloom predictably.

### 4.3 The model (simple, swappable)
- **Default (procedural):** a small body box + two solar panels — the same silhouette as today's
  `createSatellite` (lines `71–103`) but scaled by §4.1 so it's readable. Debris uses an
  icosahedron + shard like `createDebris` (lines `105–124`), with a slow tumble.
- **Optional (GLTF):** a single low-poly satellite model self-hosted at
  `public/models/satellite.glb`, loaded with `useGLTF` and **lazy/Suspense-wrapped** with the
  procedural model as the fallback. Keep it <100 KB to protect the chunk budget (doc 04 §6).

### 4.4 Labels via drei `<Html>` (replaces canvas sprites)
Replace the `createLabel` canvas `Sprite` (lines `126–150`) with drei `<Html>` billboards — crisp
DOM text, Tailwind-styled glass chips, and accessible:

```tsx
import { Html } from "@react-three/drei";
<Html center distanceFactor={8} occlude="blending" wrapperClass="earth-label">
  <span className="label-chip" data-risk={risk}>{name}</span>
</Html>
```

- Shown for **selected** and **threat** objects always; others on hover/selection only (mirrors the
  current visibility rule at line `415`, but data-driven via `showLabel`). This honors doc 02's
  "neon marks the one thing that matters" — we don't label everything.
- `occlude` hides labels behind the globe; `distanceFactor` keeps them sane across zoom.

### 4.5 Emphasis & lighting
- **Selected / threat:** larger base scale (§4.1), brighter emissive + halo, a subtle 2 s pulse
  (disabled under reduced motion), label forced on. The protected asset (e.g. `CARTOSAT-2F`) gets
  the **safe** color; the threat (e.g. `DEBRIS-001`) gets **danger** (doc 02 §2.4).
- **Lighting:** rely on **bloom + emissive**, not many lights. At most **one** `pointLight` on the
  selected/threat object for a local kick; the scene key/rim lights (§7) do the rest. Avoid a light
  per satellite (kills perf for Kessler's large counts — use instancing there, §10).

---

## 5. Orbit trails

Replace the 1 px `LineLoop` + `LineBasicMaterial` (lines `56–69`, material at `64` — which ignores
`linewidth` on most platforms) with drei `<Line>` (Line2 / `LineMaterial`) that supports real
width and a fading, risk-colored gradient.

```tsx
// earth/OrbitTrail.tsx
import { Line } from "@react-three/drei";

const points = useMemo(() => ringPoints(obj.orbit, 256), [obj.orbit]); // same ring as createOrbit
const colors = useMemo(() => fadeGradient(RISK_COLOR[obj.risk], 256), [obj.risk]); // bright→dim tail

<Line
  points={points}
  vertexColors={colors}
  lineWidth={obj.risk === "danger" ? 2.4 : 1.4}  // px width (world-unit option for true 3D girth)
  transparent
  opacity={obj.risk === "danger" ? 0.95 : 0.55}  // threat brighter (cf. opacity arg at line 305)
  toneMapped={false}
  rotation={[obj.orbit.inclination, obj.orbit.raan, 0]} // matches tilt/yaw at lines 66–67
/>
```

- **Fade:** vertex colors run bright near the satellite's current position to dim around the loop,
  reading as a trail of motion rather than a flat ring.
- **Threat emphasis:** the danger trail is wider, brighter, and bloom-lit; safe/watch trails recede.
- **Maneuver path:** the planned "after" orbit (today the hidden `maneuver` ring at lines `322–323`)
  becomes a second `OrbitTrail` in **warning** amber that animates in when `phase !== "alert"`
  (replaces the opacity toggling at lines `400–401`).
- **Upgrade option:** for the hero, a `TubeGeometry`/ribbon trail with an additive shader gives a
  thicker glow; `<Line>` with `worldUnits` is the simpler default and is bloom-friendly.

---

## 6. Cinematic space background

Remove the flat fill + washing fog and build real depth.

- **Stars:** drei `<Stars>` replaces both `THREE.Points` fields (lines `152–166`, `294–295`).

```tsx
// earth/Starfield.tsx
import { Stars } from "@react-three/drei";
<Stars radius={120} depth={60} count={quality === "low" ? 2500 : 6000}
       factor={4} saturation={0} fade speed={reducedMotion ? 0 : 0.4} />
```

- **Nebula (subtle):** a large inverted sphere with a soft gradient shader (cyan→violet→void, very
  low intensity ~8–14%) behind the stars, OR a couple of large additive planes. Tasteful, never
  noisy — it should read as faint deep-space color, not a poster. `Nebula.tsx` owns this.
- **Background:** `--bg-void` `#05070E` (doc 02 §2.1) instead of `#01040a` (line `261`).
- **Fog:** **remove** `THREE.Fog(#01040a, 7, 14)` (line `262`) — it grays out the stars and the
  atmosphere. If any depth cue is wanted, push it far (`near 40, far 120`) so it never touches the
  globe or starfield.

---

## 7. Postprocessing / bloom

The single biggest "wow" lever. Add `@react-three/postprocessing` `<EffectComposer>` so emissive
satellites, halos, trails, and the atmosphere limb glow.

```tsx
// earth/PostFX.tsx
import { EffectComposer, Bloom, Vignette } from "@react-three/postprocessing";

export function PostFX({ quality }: { quality: Quality }) {
  if (quality === "low") return null;                 // skip on low tier (perf)
  return (
    <EffectComposer disableNormalPass multisampling={quality === "high" ? 4 : 0}>
      <Bloom
        intensity={0.9}
        luminanceThreshold={0.22}   // tuned so the daymap doesn't bloom but neon emissives do
        luminanceSmoothing={0.9}
        mipmapBlur
        radius={0.6}
      />
      <Vignette offset={0.28} darkness={0.7} eskil={false} />  {/* optional, subtle */}
    </EffectComposer>
  );
}
```

- **Tone mapping:** `ACESFilmicToneMapping` + `toneMappingExposure ≈ 1.05` (set on the `<Canvas>`
  `gl`, §2.3). Replaces the default tone mapping implied by the raw renderer at line `267`. Keep
  `outputColorSpace = SRGB` (R3F default; matches line `270`).
- **Why emissives must be `toneMapped={false}`:** so neon stays at full luminance and crosses the
  bloom `luminanceThreshold` reliably (§4.2, §5).
- **Starting params:** `intensity 0.9`, `threshold 0.22`, `smoothing 0.9`, `radius 0.6`. Tune
  threshold up if the Earth daymap blooms; tune intensity down if it looks "hazy."
- **Upgrade option:** *selective* bloom (drei `<Selection>`/`<Select>` + `selection` on `<Bloom>`)
  to bloom **only** satellites/atmosphere and never the Earth — do this only if the threshold
  approach can't separate them cleanly.

---

## 8. Atmosphere

Replace the fixed-direction rim (lines `168–192`, which uses a hard-coded `vec3(0,0,1)` so the glow
doesn't track the camera or sun) with a proper **view-space Fresnel** + **sun-aware scattering**,
in two layers.

- **Outer halo:** `BackSide`, additive, `rim = pow(1.0 - dot(viewDir, normal), 2.4)`, graded
  cyan→deep blue, modulated by `max(dot(normal, sunDir), 0)` so the **lit limb** glows brightest
  (day side scatters more). This is the part bloom catches at the edge.
- **Inner glow:** `FrontSide`, very subtle, adds a soft blue terminator near the day/night line.
- **Sun direction:** a single `sunDirection` uniform shared with the Earth's key light (§7), so the
  atmosphere, the day-map shading, and (optionally) a specular ocean highlight all agree.

```tsx
// earth/Atmosphere.tsx (uniforms)
uniforms = {
  uColor: { value: new THREE.Color("#38E8FF") },   // --neon-cyan, doc 02 §2.3
  uSun:   { value: sunDirection },                  // shared with key light
  uPower: { value: 2.4 },
  uIntensity: { value: 0.9 },
};
// outer: side: BackSide, blending: Additive, depthWrite:false, transparent:true (≈ scale 1.025× Earth)
// inner: side: FrontSide, blending: Additive, depthWrite:false               (≈ scale 1.005× Earth)
```

Earth itself stays a `meshStandardMaterial` with the day map (texture from line `276`), slightly
lower `roughness` than today's `0.72` (line `287`) for a subtle ocean sheen under the key light.
The drei `<Sphere>`/`useTexture` combo replaces the manual `SphereGeometry(1.52, 128, 128)` at
line `281` (keep radius **1.5** as the scene's Earth-radius unit).

---

## 9. Camera & cinematics

`CameraRig` owns framing; it sets the OrbitControls `target` and animates the camera distance/angle
toward a **preset per route + phase**, then hands control back to the user. This replaces the
imperative `cameraPose()` switch (lines `194–208`) and the per-frame `camera.position.lerp` block
(lines `379–393`).

### 9.1 Framing presets (`scene.config.ts`)

| Route / phase | Feel | distance | autoRotate | Notes |
|---|---|---|---|---|
| **Home** (`phase="alert"`, view-only) | wide hero, the globe is the star | ~7.0 | yes (slow) | `interactive={false}` or limited; threat object pulses (doc 03 §4 Home) |
| **Sky** (explore) | medium, full catalog, free orbit | ~5.5 | yes until user drags | click selects → `onSelect` → `?object=` (doc 03 §7) |
| **Threat detail** | focused mini-globe on the encounter pair | ~5.0 | no | frame midpoint of protected + threat; `showThreatLine` |
| **Avoidance** | tight on the encounter geometry | ~4.5 | no | before/after maneuver animates (red→green, doc 02 §6.2) |
| phase `planned` | bias toward the maneuver arc | −0.4 dist | no | mirrors current planned pose (line `201–203`) |
| phase `applied`/`report` | calmer, centered | reset | no | mirrors current applied/report pose (line `204–206`) |

These reproduce the *intent* of today's scenario/phase poses (e.g. `2009-replay` and
`kessler-sandbox` framings at lines `195–199`) but as data, with smooth transitions.

### 9.2 Smooth transitions
When `scenarioId`, `phase`, or `selected` changes, lerp/damp the controls `target` and the camera
distance over ~`400 ms` (doc 02 §6.1 `slow`) using a damped `useFrame` step (or `maath/easing`'s
`damp3`). Don't snap.

```tsx
useFrame((_, dt) => {
  easing.damp3(controls.target, framing.target, 0.4, dt);
  easing.damp(camera, "position-distance", framing.distance, 0.4, dt); // via helper
  controls.update();
});
```

### 9.3 Idle auto-rotate that pauses on drag
Gentle idle drift is the **only** always-on motion (doc 02 §6.2), and it must pause while the user
interacts. Listen to the controls `start`/`end` events:

```tsx
useEffect(() => {
  const c = controlsRef.current; if (!c) return;
  const onStart = () => setIdle(false);
  const onEnd = () => { clearTimeout(t.current); t.current = setTimeout(() => setIdle(true), 4000); };
  c.addEventListener("start", onStart); c.addEventListener("end", onEnd);
  return () => { c.removeEventListener("start", onStart); c.removeEventListener("end", onEnd); };
}, []);
// autoRotate = framing.autoRotate && idle && !reducedMotion   (passed to <OrbitControls>, §3)
```

This is strictly better than today's `earth.rotation.y += 0.0012` (line `397`), which spins the mesh
even mid-drag.

---

## 10. Performance & fallback

| Concern | Approach |
|---|---|
| **Pixel ratio** | `dpr={[1, 2]}` (1 on low tier). Replaces `setPixelRatio(min(dpr, 2))` (line `268`). |
| **Lazy load** | `const EarthCanvas = React.lazy(() => import("./earth/EarthCanvas"))`. R3F + drei + postprocessing land in a separate chunk, only on Home/Sky/Threat detail/Avoidance (doc 04 §6). |
| **Single context** | Exactly one `<Canvas>` mounted at a time; never two routes' canvases live together (doc 04 §6). |
| **Frameloop** | `frameloop="always"` for hero/auto-rotate; `"demand"` (+ `invalidate()` on interaction) for static-ish views and reduced motion to save battery. |
| **Instancing** | Kessler (many objects) renders satellites/debris via `<Instances>`/`InstancedMesh`; trails capped or sampled. Avoid per-object lights. |
| **Dispose** | R3F auto-disposes geometries/materials on unmount; `useTexture`/`useGLTF` are cached. This replaces the manual `scene.traverse(... dispose)` block (lines `423–441`). |
| **Quality tiers** | `useQualityTier`: detect cores/`deviceMemory`/`save-data`; `low` → no bloom, dpr 1, fewer stars, no nebula, procedural model only. |

### 10.1 Reduced motion (doc 02 §6.3, §9)
On `prefers-reduced-motion`: disable idle auto-rotate, satellite/marker pulses, star twinkle
(`speed=0`), and orbit animation drift; set `frameloop="demand"` and render a **single static
frame**. The scene is still draggable (motion is user-initiated, which is allowed).

### 10.2 No-WebGL / low-power fallback (`EarthFallback.tsx`)
If WebGL is unavailable or the tier is too low, render a **static, offline-safe** view instead of a
black box:
- a still image of the globe (a pre-rendered PNG under `public/`), **or**
- a pure-CSS globe: a radial-gradient sphere using the Earth texture as a `background-image` plus a
  cyan rim glow (doc 02 tokens), with the same DOM overlay (controls hidden, or a "3D view
  unavailable" note). This guarantees the demo never shows a broken canvas.

---

## 11. Integration & migration

### 11.1 Keep the existing `EarthScene` prop shape (zero route churn)
Today three routes import `EarthScene` with `{ phase, scenarioId, selectedObject }`:
`HomeRoute.tsx:36`, `MissionRoute.tsx:106` (→ becomes `/sky`, doc 03), `AvoidanceRoute.tsx:270`.
We keep a thin adapter at the **same path** so nothing breaks during the transition:

```tsx
// components/EarthScene.tsx  (back-compat adapter; old import path preserved)
import { lazy, Suspense } from "react";
import type { MissionPhase } from "../state/missionStore";
import { scenarioObjects, framingFor } from "./earth/scene.config";

const EarthCanvas = lazy(() => import("./earth/EarthCanvas"));

export type EarthSceneProps = {            // identical to the current shape (EarthScene.tsx:8–12)
  phase: MissionPhase;
  scenarioId: string;
  selectedObject?: string;
};

export function EarthScene({ phase, scenarioId, selectedObject }: EarthSceneProps) {
  const objects = scenarioObjects(scenarioId);          // maps the 4 TRACKS today (lines 26–31)
  return (
    <Suspense fallback={<div className="earth-scene" aria-busy="true" />}>
      <EarthCanvas
        objects={objects}
        selected={selectedObject}
        phase={phase}
        scenarioId={scenarioId}
        framing={framingFor(scenarioId, phase, selectedObject)}
        showThreatLine={phase === "alert" || phase === "planned"}  // cf. threat.visible line 399
      />
    </Suspense>
  );
}
```

`scenarioObjects()` seeds from the current hardcoded `TRACKS` (lines `26–31`) so visuals match on
day one: `CARTOSAT-2F` → `safe`, `DEBRIS-001` → `danger` (debris/threat), `RISAT-2BR1` → `watch`,
`SENTINEL` → `warning` (risk colors per doc 02 §2.4). Later it reads from the API/catalog
(doc 04 §5) without touching routes.

### 11.2 How each route configures it
- **Home (`/`):** `phase="alert"`, `scenarioId="protect-isro"`, `selectedObject={protectedAsset}`,
  `interactive={false}`, Home framing (wide hero, auto-rotate). (Matches `HomeRoute.tsx:36`.)
- **Sky (`/sky`):** interactive, full `objects`, `onSelect` updates `?object=` (doc 03 §7), Globe ↔
  List toggle lives in the route, not the scene. (Replaces `MissionRoute.tsx:106`.)
- **Threat detail (`/threats/:id`):** pass only the encounter pair (protected + threat),
  `showThreatLine`, focused framing.
- **Avoidance (`/avoidance`):** `phase`-driven; render the maneuver `OrbitTrail` and animate
  before/after on apply. (Matches `AvoidanceRoute.tsx:270`.)

### 11.3 Step-by-step migration (keep the build green — doc 04 §7)
1. **Install** (doc 04 §1): `@react-three/fiber`, `@react-three/drei`, `@react-three/postprocessing`.
   `npm run build` ✅.
2. **Scaffold** `components/earth/` with `types.ts`, `scene.config.ts`, and stubs for each component.
3. **Build `EarthCanvas`** bottom-up: `Earth` + `Atmosphere` + `Starfield` first (static), verify
   the texture loads via `useTexture` (offline).
4. **Add `SceneControls`** (OrbitControls) → confirm drag direction is correct and the reversed-axis
   bug (lines `345–346`) is gone; wire keyboard + overlay buttons.
5. **Add `Satellite` + `OrbitTrail` + `ConjunctionMarker`**, seeded from `TRACKS` (lines `26–31`).
6. **Add `PostFX`** (bloom/ACES) and tune §7 params; add `CameraRig` framings (§9).
7. **Swap the adapter:** rename the current file to `EarthSceneLegacy.tsx`, add the §11.1 adapter as
   `EarthScene.tsx`. Routes are unchanged. `npm run build` ✅, capture screenshots per route.
8. **Add reduced-motion + `EarthFallback`** (§10); verify on a forced-no-WebGL run.
9. **Delete** `EarthSceneLegacy.tsx` and trim `styles/earth.css` to just the container/overlay (most
   moves to Tailwind, doc 02/04). `npm run build` ✅.

---

## 12. Acceptance criteria

The scene passes when **all** of these hold (feeds the demo gate in doc 09):

1. **Drag direction** matches "grab the globe": dragging right rotates the visible surface right;
   up/down tilt is natural. No inverted axis (the lines `345–346` behavior is gone), no perceptible
   lag (single damping, not the double lerp at `380–382`/`390`).
2. **Zoom / reset / keyboard / touch** all work: scroll + buttons + `+`/`-` zoom within
   `minDistance/maxDistance`; `R`/`0` and the reset button restore the route framing; pinch zooms on
   touch; arrows rotate; focus ring visible.
3. **Satellites read as real glowing objects** at any zoom (constant on-screen size, never 2–3 px
   dots), risk-colored emissive + halo, with **glowing trails** behind them; the threat is clearly
   emphasized; labels show for selected/threat via `<Html>`.
4. **Cinematic background present:** a real deep `<Stars>` field (no flat `#01040a` fill, no washing
   fog), subtle nebula, and visible **bloom** on emissives + the atmosphere limb under ACESFilmic.
5. **Performance:** holds ~60 fps on a typical laptop iGPU at the Home framing; the 3D code is a
   lazy chunk; only one WebGL context exists at a time.
6. **Reduced-motion & fallback:** with `prefers-reduced-motion` the scene is static but still
   draggable; with no WebGL / low-power, `EarthFallback` shows a static globe (offline-safe), never a
   broken/black canvas.
7. **Routes unchanged during migration:** Home, Sky, Threat detail, and Avoidance render via the
   back-compat `EarthScene` prop shape; switching scenarios (Protect ISRO / 2009 / Kessler) and
   phases reframes smoothly.

---

## Appendix A — drei / postprocessing primitives used

| Need | Primitive | Source |
|---|---|---|
| Controls (fixes drag) | `<OrbitControls>` | `@react-three/drei` |
| Starfield | `<Stars>` | `@react-three/drei` |
| Labels | `<Html>` | `@react-three/drei` |
| Texture (offline) | `useTexture` | `@react-three/drei` |
| Thick trails | `<Line>` (Line2) | `@react-three/drei` |
| Optional model | `useGLTF` | `@react-three/drei` |
| Instancing (Kessler) | `<Instances>` | `@react-three/drei` |
| Bloom / vignette | `<EffectComposer>`, `<Bloom>`, `<Vignette>` | `@react-three/postprocessing` |
| Damped transitions | `easing.damp3` | `maath/easing` (tiny) |

## Appendix B — risk → color (single source, doc 02 §2.4)

```ts
export const RISK_COLOR: Record<Risk, string> = {
  safe:    "#34F5C5",  // protected / nominal
  watch:   "#6EE7FF",
  warning: "#FFC24B",
  danger:  "#FF5470",  // the threat
};
```

These are the same tokens used by lists, meters, and reports — "risk color is sacred" (doc 02 §2.4).
The scene must import them, never re-hardcode the old ad-hoc hexes (`#75ffe5`, `#ff6673`, … at
lines `26–31`).
