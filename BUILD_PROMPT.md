# MONSTER RUSH — Monster Truck Racing (Build Spec)

Build a polished, physics-driven 3D monster truck racing game for mobile-first web,
using Vite + React + Three.js (R3F) + @react-three/rapier (physics). This is a racing
game with REAL vehicle dynamics — suspension, wheel contact, engine force, steering,
jumps, boosts, rollovers — racing laps around circuits against AI opponents.

## Tech Stack
- Vite + React (vanilla JSX or TypeScript — pick TS, it's the standard)
- three + @react-three/fiber + @react-three/rapier (v2.x)
- zustand for game state
- NO Tailwind needed (custom CSS for HUD is fine, or Tailwind if you prefer)
- Deploy target: Cloudflare Pages (static, `dist/` output)

## CRITICAL: Vehicle Physics (the heart of the game)

Use Rapier's **DynamicRayCastVehicleController** — NOT plain rigid bodies. This gives
physically correct monster truck behaviour: suspension, wheels that roll on terrain,
engine force, braking, steering, jumps that leave the ground, and rollovers that
matter. The vehicle body is a rigid body with a chassis collider; 4 wheels are
raycast wheels (connection points, suspension rest length, spring stiffness, damping,
wheel radius/width). Drive with `setWheelEngineForce` (rear or all wheels),
steer with `setWheelSteering` (front wheels), brake with `setWheelBrake`.

Key physics parameters to expose in a config file (`src/config.js`) so they can be tuned:
- chassis: mass ~4-6 (trucks are heavy but not tanks), suspension stiffness ~30-50,
  suspension rest length ~0.4, wheel radius ~0.42, wheel width ~0.35
- engine force: enough to feel punchy (~30-45), brake force high (~20)
- steering: front wheels, max angle ~0.5 rad, steering speed smooth
- center of mass slightly low so trucks don't flip constantly but CAN flip on hard
  impacts/landings — rollovers should be possible and recoverable
- restitution on chassis ~0.15 (monster trucks bounce a little, not a lot)
- friction on wheels handled by the vehicle controller; track friction normal

Rollover recovery: if the truck ends upside down and is mostly stationary for >2s,
show a "FLIP" prompt; tapping/spacebar applies an angular impulse to right the truck
(can be abused — limit to 1 free flip per 5s or a small cooldown).

## Game Design

### Core loop
- 4 circuits (levels). Each is a closed loop track. Race 2-3 laps against 3 AI trucks.
- Finish position (1st-4th) earns stars (1st=3, 2nd=2, 3rd=1, 4th=0). Stars unlock
  next circuit (need ≥1 star). Victory screen after 4th circuit.
- Each circuit has a distinct theme/colour:
  1. "Dust Bowl" — dirt oval with a few small ramps. Teaches driving.
  2. "Jumper Yard" — big jumps, tabletop ramps, boost pads. Air time heaven.
  3. "Crush Zone" — parked cars to crush, tighter turns, obstacles.
  4. "Overlord Peak" — alpine: long straights, steep ramps, boosters, narrow cliff edges.
- Track surfaces: flat dirt/sand look; jumps are raised ramp meshes with colliders;
  track edges have low barriers (visible + colliders) so trucks don't fly off easily
  but CAN go over on huge jumps.

### Circuits (procedural, closed loops)
Build each circuit as a closed loop of track sections. Recommended approach:
- Define a list of waypoints forming a closed loop per circuit (e.g. 10-14 waypoints).
- Between consecutive waypoints, place track segment meshes (boxes) that follow the
  path. Each segment: length ~6-10, width ~10 (wide enough for 4 trucks), thickness ~0.5.
- Segments must OVERLAP by ~0.3-0.5 so there are no gaps.
- Turns are wide/gentle (monster trucks don't corner like F1). Banked turns optional.
- Ramps: short segments with a slope (rotate the box up ~25-35°) placed at intervals,
  with a "lip" so trucks launch. After a ramp, the track continues at the same height
  (tabletop) or drops back to ground (kickout). Land far enough that trucks don't
  clip the next section.
- Boost pads: flat glowing pads (thin box + emissive texture) on track surface;
  when a truck's wheel/body overlaps, apply forward impulse along the truck's forward
  direction (e.g. 25-40 impulse) and play boost FX. Pads are on a 2-3s recharge (visual
  dims).
- Crush cars: on circuit 3, place 6-10 low cars (box bodies with wheels visual) on the
  track path or just off it. When a truck hits one hard (relative speed > threshold),
  the car is "crushed" (scale squashes, particles burst, score +250, car becomes a low
  flat obstacle that stays). Crushing is THE fun of that level.
- Checkpoints: invisible sensor triggers at each waypoint; must pass in order to count
  a lap (anti-cheat: if you skip a checkpoint you don't get the lap). Use Rapier
  sensors or manual distance checks between waypoints — pick whichever is reliable.
- Start/finish line: a gantry (two posts + banner) at waypoint 0. Countdown (3-2-1-GO)
  at race start; trucks held at start (kinematic or locked) until GO.
- Lap counting: track lap per truck; positions computed by (lap * waypoints) +
  current waypoint index + fractional progress to next waypoint.

### AI opponents (3 trucks)
- Each AI truck: same vehicle controller as player, different colour/decal.
- Steering: point toward the NEXT waypoint (steer = angle error * gain), throttle
  full on straights, brake slightly on sharp turns, accelerate on ramps.
- Speed rubber-band: if AI is far behind player, give it a mild speed boost
  (multiplier up to ~1.15); if far ahead, slow it slightly (down to ~0.9). Keeps races
  close and fun without rubber-banding being obvious.
- AI trucks CAN crash/flip but the game helps them: after >2s mostly stationary
  upside-down, they self-right (same flip logic as player, automatic).
- AI names: fun names ("Big Bess", "Thunderfoot", "Megawatt").

### Player controls (mobile-first)
- **Touch**: LEFT/RIGHT steer buttons (bottom-left) — hold to steer that way.
  GAS (hold to accelerate) and BRAKE/REVERSE buttons (bottom-right).
  BOOST button when boost meter is full (earn boost by driving well: air time,
  crushing cars, near-misses; or just a recharge bar).
  FLIP button when upside-down recovery is available.
- **Desktop**: WASD/Arrows — W/Up gas, S/Down brake/reverse, A/D or Left/Right steer,
  Space boost, F flip.
- Touch buttons: large, thumb-friendly, semi-transparent, `touch-action: none`,
  pointer events with `{ passive: false }`. No scrolling/zooming.

### Camera
- Chase cam: behind + above player truck, smooth lerp follow. Look slightly ahead
  of the truck's velocity (not just position) so jumps feel right.
- Camera FOV ~70-80; on boost slightly widen FOV or add a subtle speed effect.
- Small screen shake on hard landings and crashes (amplitude by impact velocity).
- Optional: a slight camera pitch up when airborne (feel the jump).

### Juice (critical — this is what makes it FUN)
- **Dust/dirt particles** from wheels when on ground and accelerating (small emitter
  behind each rear wheel, spawn on speed threshold). Bigger dust cloud on landings.
- **Boost flames** (additive orange sprites/cones) from exhaust when boosting.
- **Exhaust smoke** light puff trail at high speed.
- **Crush explosion** when car is crushed: orange/grey particle burst + score popup.
- **Landing puff** + shake when landing after a jump.
- **Air time HUD**: when airborne >0.6s show "AIR +250" popup (reward for jumping).
- **Speed lines** at very high speed (subtle, optional).
- Engine sound: Web Audio API procedural — oscillator (sawtooth) with pitch mapped to
  speed + low noise for rumble; boost adds higher harmonic; crash = noise burst;
  crush = metallic crunch; pickup/boost pad = chime. Mute button.
- Score: finish position stars + air time bonuses + crush bonuses + lap time. Show
  total score on results screen.

### HUD (DOM overlay, mobile-safe)
- Top-left: position ("1st/4th") + lap ("LAP 2/3")
- Top-right: speed (km/h-ish, e.g. "87") + boost meter bar
- Top-center: countdown 3-2-1-GO at start; "FINAL LAP" warning on last lap
- Bottom: steer buttons (left), gas/brake/boost/flip buttons (right)
- Center: small crosshair NOT needed — this is a driving game; instead show a subtle
  "air" indicator when airborne
- Results screen: position, stars, score, time, "NEXT CIRCUIT" / "RETRY" buttons
- Star progress on circuit select screen (locked circuits greyed with lock icon)

## Project Structure
```
monster-rush/
├── index.html
├── package.json
├── vite.config.js
├── wrangler.toml          (name = "monster-rush", pages_build_output_dir = "dist")
├── public/_headers        (Cache-Control no-cache for assets)
├── src/
│   ├── main.jsx           — bootstrap, canvas, renderer settings
│   ├── App.jsx            — screen router (title → select → race → results → victory)
│   ├── config.js          — ALL tunable physics/game parameters
│   ├── store.js           — zustand game state (phase, score, stars, positions)
│   ├── Vehicle.jsx        — truck: chassis + 4 wheels + DynamicRayCastVehicleController
│   ├── Track.jsx          — circuit builder from waypoints (segments, ramps, pads, cars)
│   ├── circuits.js        — waypoint/level definitions for all 4 circuits
│   ├── AIDriver.jsx       — AI steering/throttle logic
│   ├── CameraRig.jsx      — chase camera
│   ├── Particles.jsx      — dust/boost/crush particle system (pooled)
│   ├── Audio.js           — Web Audio engine/boost/crash/crush sounds
│   ├── HUD.jsx            — all DOM HUD
│   └── styles.css
```

## Implementation Notes (Rapier specifics)
- @react-three/rapier v2.x: `world.createDynamicRayCastVehicleController(chassisBody)`.
  Wheels added via `vehicle.addWheel({...})`; per wheel: connectionPoint (local offset),
  direction (0,-1,0), axle (1,0,0), suspensionRestLength, radius, maxSuspensionTravel,
  suspensionStiffness, wheelsDampingCompression/Relaxation, frictionSlip.
- Steer: `vehicle.setWheelSteering(i, angle)`; drive: `vehicle.setWheelEngineForce(i, f)`;
  brake: `vehicle.setWheelBrake(i, b)`; update: `vehicle.updateVehicle(dt)`.
- Chassis: RigidBody with `colliders="cuboid"`, mass props, `linearDamping` low,
  `angularDamping` ~0.3-0.5 (keeps flips controllable), `canSleep=false`.
- To avoid tunneling at speed, keep speeds sane (~20-35 units/s) and consider
  `ccd: true` on chassis if needed.
- Track: static RigidBodies with colliders="cuboid" per segment. Track friction
  ~0.8 (dirt). Use a safety net plane below the track (y=-20) that respawns trucks
  that fall off (teleport to last checkpoint, small penalty 0.5s).
- Sensors/checkpoints: simplest reliable approach = manual distance checks to
  waypoint centers in useFrame (no sensor API dependency). For each truck, if within
  radius 3 of current target waypoint, advance target index; on reaching index 0 after
  last → lap++. This avoids @react-three/rapier sensor quirks entirely.

## Wrangler/Deploy Notes
- wrangler.toml: `name = "monster-rush"`, `pages_build_output_dir = "dist"`, NO `[build]` section.
- public/_headers: `/assets/*` → `Cache-Control: no-cache, no-store, must-revalidate`
- index.html title: "MONSTER RUSH — Monster Truck Racing"

## Acceptance Criteria (make these true)
1. `npm install && npm run build` succeeds, zero errors
2. Title screen → circuit select (4 circuits, stars show unlock state) → countdown → race
3. Player truck drives with gas/brake/steer; feels weighty, not floaty
4. Wheels visibly roll; suspension visibly compresses on bumps/landings
5. Ramps launch the truck into the air; landing has dust + shake; air bonus popup
6. Boost pads give a clear speed surge with flames + sound
7. Crush cars explode/squash on hard contact with score popup (circuit 3)
8. AI trucks drive the loop, don't get stuck forever, race is close (rubber-band)
9. Lap counting + positions work; finish triggers results with stars/score
10. Flip recovery works when upside down (auto for AI, button for player)
11. Mobile controls: steer/gas/brake/boost buttons work with touch; desktop WASD works
12. Engine/boost/crush sounds work; mute button works
13. Runs smoothly on mid-range phone (no shadows or minimal, pixel ratio ≤1.5)
14. Checkpoints prevent lap skipping

Build it. When done run `npm run build` and fix errors until clean.
