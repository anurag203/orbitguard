# Route Spec — The Sky (`/sky`)

> Chapter: **See** (explore). The unified "what's up there" screen.
> **Merges** the old `MissionRoute` (3D cockpit) **and** `CatalogRoute` (object browser) into ONE
> route with two views: **Globe** (default) and **List** (doc 03 §2, §8).
> Obeys: doc 01, doc 02, doc 03, doc 04, doc 05, doc 07.
> Replaces: `frontend/src/routes/MissionRoute.tsx` + `frontend/src/routes/CatalogRoute.tsx`.

---

## 1. Purpose & the ONE job (Law 1)

**The one job:** let anyone *explore what's in orbit* and *understand any single object* in plain
language — the live catalog made cinematic instead of a spreadsheet.

**The one thing to look at:** the cinematic 3D Earth with its satellites and debris (Globe view).

**The single primary action:** **select an object** (click a satellite on the globe, or a row in
the list) → a clean side panel explains it. The panel's own forward action is **`Is it in danger?`**
→ `/threats` (or `/threats/:id` if that object has a close approach).

> View toggle (Globe ↔ List) is a *view of the same data*, not a second job — both answer "what's up
> there." The filter is a *refinement*, not a competing task. This is how we honor Law 1 while
> merging two old routes: one mental model, one focal element, one selection action.

What we deliberately **drop** from the old routes (they move elsewhere): the mission "decision
drawer", phase stepper, burn preview, scenario deck, and event list → `/threats/:id` + `/avoidance`
(doc 03 §8). The catalog's "lens grid", 4-stat signal strip, and chip console → collapsed into one
thin filter bar.

---

## 2. Who it serves & the emotional beat (doc 01 §6)

| | |
|---|---|
| **Primary** | Non-space judge exploring; student being curious |
| **Secondary** | Technical judge auditing source objects (wants TLE / catalog number); operator scanning the catalog |
| **Emotional beat** | Continuation of **Hook** → quiet wonder + control: "I can poke at this, and it explains itself." |
| **Leave with** | "These are real tracked objects; I can see exactly what each one is and where the data came from." |

---

## 3. ASCII wireframe — first viewport (desktop, Globe view)

```text
┌──────────────────────────────────────────────────────────────────────────────┐
│  ORBITGUARD     [Sky]  Threats  Safe Move  Report     Learn  [Simple|Pro]  ▶   │
├──────────────────────────────────────────────────────────────────────────────┤
│  ⌕ Find an object…   ▸ All ▾  ▸ Satellites ▾  ▸ Debris ▾        ◐Globe |≣List  │ ← thin filter + view toggle
├──────────────────────────────────────────────────────────────────────────────┤
│                                                                                │
│                       · ✦ ·   star field   · ✦ ·                               │
│                                ╭──────────╮                                    │
│                               ◜  ◉ ←CARTOSAT-2F (glowing)                      │
│                              ◜    EARTH    ◞    · debris (dim red)             │
│                               ◞          ◞                                      │
│                                ╰──────────╯                                    │
│                                                                                │
│                                                  ⌁ Offline demo data · 4 shown │
│                                                                                │
│            (no object selected → globe is the whole stage, nothing else)       │
└──────────────────────────────────────────────────────────────────────────────┘

       ── after a click on an object, a side panel slides in from the right ──

┌──────────────────────────────────────────────────────────────────────────────┐
│  ⌕ Find an object…   ▸ filters…                                ◐Globe |≣List   │
├───────────────────────────────────────────────┬────────────────────────────────┤
│                                                │  CARTOSAT-2F                    │
│              ╭──────────╮                       │  ◷ Satellite · India (ISRO)    │
│             ◜  ◉ selected (cyan ring)           │  Low orbit                     │
│            ◜    EARTH    ◞                       │  ─────────────────────────     │
│             ◞          ◞                         │  An Earth-watching satellite   │
│              ╰──────────╯                        │  run by India's space agency.  │
│                                                 │                                │
│                                                 │  Catalog number   43111        │
│                                                 │  Type             Satellite    │
│                                                 │  Orbit            Low orbit    │
│                                                 │                                │
│                                                 │  ▸ Show raw data (orbit data)  │ ← ShowDetails → TLE
│                                                 │                                │
│                                                 │  ┌──────────────────────────┐  │
│                                                 │  │  Is it in danger?      → │  │ ← single CTA
│                                                 │  └──────────────────────────┘  │
└───────────────────────────────────────────────┴────────────────────────────────┘
```

Breathing room: with nothing selected, the globe owns the entire stage. The side panel only exists
*after* a selection, and it is a calm glass panel (doc 02 §5), not a bordered data dump.

---

## 4. Section-by-section breakdown (top → bottom)

### 4.1 Filter + view bar (one thin row)
- Left: `<SearchInput>` ("Find an object…") + up to 3 quiet `<FilterDropdown>`s
  (Type, Owner, Orbit). Replaces the old catalog "lens grid" + 4-input toolbar + chip console.
- Right: `<ViewToggle value="globe|list">` (segmented, Radix-styled). Persists in `?view=`.
- The bar is `bg-surface/60 + backdrop-blur`, one hairline beneath, no glow.
- Source control (Offline ↔ Live) lives as a small menu item inside "All ▾", not a loud toggle.

```tsx
<SkyToolbar>
  <SearchInput value={q} onChange={setQ} placeholder="Find an object…" />
  <FilterDropdown label="Type"  options={["All","Satellites","Debris","Rocket bodies"]} />
  <FilterDropdown label="Owner" options={owners} />
  <FilterDropdown label="Orbit" options={["Any","Low orbit","Other"]} />
  <ViewToggle value={view} onChange={setView} options={[
    { id:"globe", icon:<Globe/>, label:"Globe" },
    { id:"list",  icon:<List/>,  label:"List"  },
  ]}/>
</SkyToolbar>
```

### 4.2 Globe view (default) — the focal element
- `<EarthCanvas variant="explore" objects={catalog.objects} highlightedId={objectId}
  onSelect={selectObject} threatIds={threatObjectIds} />` (doc 07).
- Objects render as glowing points; **protected assets** = cyan, **debris** = dim `--danger`,
  satellites = `--text-base`, anything currently in a close approach gets a subtle risk-colored halo.
- Hover shows a tiny `<Html>` label (name). Click selects → opens `<ObjectPanel>` + writes
  `?object=<id>`. Camera eases toward the selected object.
- Keyboard: arrow keys cycle objects, `Enter` selects (doc 02 §9 / doc 07 — 3D must have keyboard
  equivalents). A small "⌁ Offline demo data · N shown" `<Chip>` floats bottom-right.

### 4.3 List view (the catalog, calmed down)
- `<ObjectList>` of `<ObjectRow>`s — replaces the old `object-list-clean`. Each row:
  icon + name + one plain descriptor line + a right-side tag. Selected row syncs with the globe.

```text
 ◉  CARTOSAT-2F          Earth-watching satellite · India (ISRO) · Low orbit      [Protected]
 ✖  Demo Debris 001      Tracked debris · Low orbit                               [Debris]
 ◷  RISAT-2BR1           Radar-imaging satellite · India (ISRO) · Low orbit       [Watchlist]
 ◷  Sentinel Compare…    Satellite · Low orbit                                    [Satellite]
```
- Row component:
```tsx
<ObjectRow
  object={obj}
  selected={obj.object_id === objectId}
  threat={threatByObject[obj.object_id]}   // optional RiskBadge if in a close approach
  onSelect={() => selectObject(obj.object_id)}
/>
```

### 4.4 Object side panel (`components/domain/ObjectPanel`) — the payoff
Shown when an object is selected (in either view). Glass panel, right side (Globe) or full-width
sheet below filters (List on narrow widths). Plain-first, progressive disclosure:

1. **Header:** object name (`h2`), one-line plain type + owner + orbit, class icon.
   If the object is in an active close approach, a `<RiskBadge level=…>` sits here.
2. **Plain description:** one human sentence (see §5).
3. **Key facts** as `<Stat>` pairs: Catalog number, Type, Orbit, Owner.
4. **`<ShowDetails label="Show raw data">`** disclosure → the `<Term k="tle">orbit data</Term>`
   (TLE) in a mono block. Collapsed by default (Law 4). Replaces the old always-open `<Disclosure>`.
5. **Single CTA:** `<Button variant="primary">Is it in danger? →</Button>` → `/threats/:id` if a
   conjunction exists for this object, else `/threats` (the list, scrolled/filtered to it).

```tsx
<ObjectPanel object={selected} threat={threatForSelected} mode={mode}>
  <ObjectPanel.Header />
  <ObjectPanel.Plain />
  <Stat label="Catalog number" value={<Term k="norad-id">{selected.norad_id ?? "—"}</Term>} />
  <Stat label="Type"  value={plainType(selected.object_type)} />
  <Stat label="Orbit" value={<Term k="leo">Low orbit</Term>} />
  <Stat label="Owner" value={selected.owner ?? "Unlabelled"} />
  <ShowDetails label="Show raw data">
    <p className="text-muted text-caption">
      <Term k="tle">Orbit data</Term> (TLE) — the standard text describing this object's orbit.
    </p>
    <pre className="font-mono text-mono">{tle.line1}{"\n"}{tle.line2}</pre>
  </ShowDetails>
  <Button variant="primary" to={threatLink}>Is it in danger?</Button>
</ObjectPanel>
```

### 4.5 Empty selection state
- No object selected = **intended default**: globe alone, with a one-line hint near the chip:
  "Tap any glowing object to learn what it is." No empty card.

### 4.6 Data hooks (`features/`) → real endpoints (`api.ts`)
| Hook | Backend call | Feeds |
|---|---|---|
| `useCatalog(filters)` | `GET /api/catalogs/full?source=…&q=…&owner=…&object_type=…&orbit_class=…&limit=120` | Globe objects + List rows + side-panel facts + TLE |
| `useRefreshLiveCatalog()` | `POST /api/catalogs/live/refresh` (`{group:"active",limit:120}`) | "Live data" source switch |
| `useScenarioRun(scenarioId)` | `POST /api/scenarios/:id/run` | Which object is the protected/hero asset to highlight |
| `useThreats(scenarioId)` | `POST /api/conjunctions/screen` | Mark objects that are in a close approach (halo + RiskBadge + correct CTA target) |

State: `objectId` (selected) and `view` mirror to the URL (`?object=…&view=…`, doc 03 §7) so deep
links cold-boot into a selected object. Filters live in `useCatalog`'s query key (React Query owns
loading/error, replacing the store's `busy:"catalog"` flag — doc 04 §5).

> Mapping note: a "threat for this object" is found by matching `object_id` against
> `conjunction.primary_object_id` / `secondary_object_id` from `useThreats`. CARTOSAT-2F →
> `conj-protect-isro-001`.

---

## 5. Plain-language copy (real strings)

```text
Toolbar:        Find an object…        Type ▾   Owner ▾   Orbit ▾        ◐ Globe | ≣ List
Globe hint:     Tap any glowing object to learn what it is.
Source chip:    Offline demo data · 4 shown        (or "Live data · 120 shown")

— Object panel: CARTOSAT-2F (isro-cartosat-2f) —
Title:          CARTOSAT-2F
Sub:            Satellite · India (ISRO) · Low orbit
Plain:          An Earth-watching satellite run by India's space agency, in a low orbit a few
                hundred kilometres up.
Facts:          Catalog number 43111  ·  Type Satellite  ·  Orbit Low orbit  ·  Owner ISRO
RiskBadge:      DANGER — in a close approach        (only because conj-protect-isro-001 exists)
Show raw data:  ▸ Show raw data (orbit data)
CTA:            Is it in danger?  →                 (→ /threats/conj-protect-isro-001)

— Object panel: Demo Debris Object 001 (debris-demo-001) —
Plain:          A tracked piece of debris in a low orbit — the object that comes dangerously
                close to CARTOSAT-2F in this scenario.
CTA:            See the close approach  →

— Object panel: a calm object (Sentinel Comparison Demo Object) —
Plain:          A tracked satellite in a low orbit. No close approaches right now.
CTA:            Is it in danger?  →   (→ /threats, no specific row)
```

Jargon wrapped: `<Term k="norad-id">catalog number</Term>`, `<Term k="tle">orbit data</Term>`,
`<Term k="leo">low orbit</Term>`, `<Term k="conjunction">close approach</Term>`.

---

## 6. Simple vs Pro differences

| Element | Simple (default) | Pro |
|---|---|---|
| Orbit fact | "Low orbit" | "LEO" + altitude band note |
| Catalog number | "43111" labelled "Catalog number" | "NORAD ID 43111" |
| Raw data | hidden behind "Show raw data" | TLE block **expanded by default**; adds `source_catalog`, `fetched_at_utc`, lineage line |
| Object type | "Satellite" / "Debris" (plain) | raw `object_type` + tags row |
| Globe labels | name only on hover | name + catalog number always-on for highlighted object |
| List columns | icon · name · plain line · tag | adds NORAD ID + source columns (becomes a denser `<DataTable>`) |

Pro turns the side panel into an auditable source record; Simple keeps it to a sentence + four
facts. Mode from `missionStore.mode`.

---

## 7. Loading / empty / error states (doc 03 §5)

| State | Trigger | Treatment & copy |
|---|---|---|
| **Loading (globe)** | `useCatalog` pending | Earth renders immediately (no objects yet) + plain line "Loading the latest orbit data…". No "source sync armed" copy. |
| **Loading (list)** | same | 6 `<Skeleton>` rows shimmer. |
| **Loading (panel)** | object selected, facts pending | Header shows instantly from list data; facts/TLE area shows skeleton lines. |
| **Empty (filter)** | `useCatalog` returns 0 | `<EmptyState>`: "No objects match that filter. [Clear filters]". (Globe shows bare Earth + same message as overlay.) |
| **Empty (selection)** | nothing selected | Intended default — globe + hint, not an error. |
| **Error (catalog)** | `useCatalog` errors | `<ErrorState>`: "We couldn't load the orbit catalog. [Try again]" (retry = `refetch`). |
| **Error (live refresh)** | `useRefreshLiveCatalog` errors | Inline toast: "Live source unavailable — showing offline demo data." Auto-falls back to fixture; never blanks the globe. |
| **Source** | `useCatalog().mode` | Chip: "Offline demo data" (`fixture`) / "Live data" (`live-celestrak`). |

---

## 8. Motion (doc 02 §6)

- **Globe ambient:** slow auto-rotate; highlighted/selected object pulses softly (the live pulse).
- **Selection:** camera eases toward the object (`spring`), selected object gains a cyan ring that
  scales in (`base` 250ms); the `<ObjectPanel>` slides in from the right + fades (`slow`, 8px).
- **Globe ↔ List toggle:** cross-fade (`base`); list rows stagger-rise ~30ms each on first show.
- **ShowDetails:** height auto-expand + fade for the TLE block (`base`), chevron rotates.
- **Hover:** rows lift 2px; globe object label fades in (`fast`).
- **Reduced motion:** no auto-rotate, no camera ease (snap), no slide; panel appears instantly,
  ShowDetails toggles without animation (doc 02 §6.3).

---

## 9. Mobile layout notes

- Toolbar wraps: search full-width row 1; filters become a single "Filters" sheet button; view
  toggle stays inline.
- **Globe view:** Earth fills the viewport; selecting an object opens `<ObjectPanel>` as a bottom
  sheet (`vaul`-style) covering ~60% height, draggable to dismiss.
- **List view:** full-width rows; selecting opens the same bottom sheet panel.
- Default to **List view on small phones** (easier than 3D selection) — but respect `?view=`.
- TLE block is horizontally scrollable (mono, no wrap). EarthCanvas low-power profile.

---

## 10. Acceptance criteria (reviewer checklist)

- [ ] One route at `/sky` renders both Globe and List of the **same** catalog data; legacy
      `/mission`, `/mission-control`, `/catalog` redirect here (doc 03 §2 redirects).
- [ ] First viewport (Globe, nothing selected) shows **only** the Earth + thin toolbar — no decision
      drawer, phase stepper, burn preview, lens grid, or 4-stat strip (regression vs old routes).
- [ ] Clicking a globe object **or** a list row selects it, opens `<ObjectPanel>`, and writes
      `?object=<id>`; deep-linking that URL cold-boots into the selection (doc 03 §7).
- [ ] `<ObjectPanel>` shows a plain sentence + 4 facts first; raw TLE is **collapsed** behind
      "Show raw data" in Simple mode (Law 4).
- [ ] Globe ↔ List toggle persists in `?view=` and keeps the current selection.
- [ ] Objects in a close approach show a `<RiskBadge>` in the panel and route the CTA to the correct
      `/threats/:id` (CARTOSAT-2F → `conj-protect-isro-001`).
- [ ] Source chip reflects fixture vs live; live-refresh failure falls back to fixture gracefully.
- [ ] All jargon via `<Term>`; tooltips keyboard-accessible; globe selection has keyboard equivalents.
- [ ] Loading uses skeletons + plain sentences (no "sync armed"); empty/error use `<EmptyState>` /
      `<ErrorState>` with working retry.
- [ ] Simple/Pro toggle changes panel density (sentence+4 facts ↔ full source record) live.
- [ ] `prefers-reduced-motion` disables rotation, camera ease, and slide-ins.
- [ ] Mobile: panel is a draggable bottom sheet; small phones default to List.
- [ ] Tokens only; risk color is consistent with `/threats` and the globe (doc 02 §2.4).
