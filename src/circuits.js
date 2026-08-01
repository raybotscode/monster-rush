const v = (x, z, y = 0) => [x, y, z];

export const circuits = [
  {
    id: "dust-bowl",
    name: "Dust Bowl",
    theme: "dirt",
    color: "#b86f34",
    accent: "#f4c16b",
    laps: 2,
    description: "Wide dirt oval, gentle ramps, forgiving barriers.",
    waypoints: [v(0, -26), v(24, -22), v(40, -6), v(38, 16), v(18, 29), v(-15, 29), v(-38, 14), v(-39, -10), v(-22, -24)],
    ramps: [{ segment: 1, t: 0.5, angle: 0.42 }, { segment: 5, t: 0.45, angle: 0.35 }],
    boosts: [{ segment: 3, t: 0.48 }, { segment: 7, t: 0.42 }],
    cars: [],
  },
  {
    id: "jumper-yard",
    name: "Jumper Yard",
    theme: "yard",
    color: "#9d5f2d",
    accent: "#ff8f3f",
    laps: 3,
    description: "Tabletops, kickers, and boost pads for long air.",
    waypoints: [v(0, -34), v(22, -31), v(44, -14), v(43, 11), v(23, 31), v(-3, 38), v(-27, 28), v(-47, 7), v(-42, -18), v(-21, -33)],
    ramps: [{ segment: 0, t: 0.55, angle: 0.55 }, { segment: 2, t: 0.45, angle: 0.5 }, { segment: 6, t: 0.5, angle: 0.55 }],
    boosts: [{ segment: 1, t: 0.3 }, { segment: 4, t: 0.45 }, { segment: 8, t: 0.55 }],
    cars: [],
  },
  {
    id: "crush-zone",
    name: "Crush Zone",
    theme: "arena",
    color: "#6f6a5a",
    accent: "#f05d23",
    laps: 3,
    description: "Tight arena turns with parked cars to flatten.",
    waypoints: [v(0, -30), v(25, -25), v(42, -4), v(31, 20), v(7, 26), v(-17, 18), v(-39, 23), v(-47, 0), v(-33, -21), v(-12, -28)],
    ramps: [{ segment: 2, t: 0.45, angle: 0.4 }, { segment: 7, t: 0.55, angle: 0.35 }],
    boosts: [{ segment: 5, t: 0.3 }, { segment: 9, t: 0.35 }],
    cars: [
      { segment: 1, t: 0.35, side: -1 }, { segment: 1, t: 0.62, side: 1 }, { segment: 3, t: 0.5, side: 0 },
      { segment: 4, t: 0.35, side: -1 }, { segment: 6, t: 0.5, side: 1 }, { segment: 8, t: 0.42, side: -1 },
      { segment: 9, t: 0.62, side: 1 },
    ],
  },
  {
    id: "overlord-peak",
    name: "Overlord Peak",
    theme: "alpine",
    color: "#536c74",
    accent: "#9ee7ff",
    laps: 3,
    description: "Fast alpine straights, narrow edges, steep launch ramps.",
    waypoints: [v(0, -38, 1), v(30, -35, 3), v(54, -14, 5), v(49, 18, 8), v(27, 40, 9), v(-7, 45, 7), v(-36, 30, 5), v(-56, 5, 3), v(-48, -25, 2), v(-20, -40, 1)],
    ramps: [{ segment: 1, t: 0.5, angle: 0.58 }, { segment: 4, t: 0.4, angle: 0.48 }, { segment: 8, t: 0.5, angle: 0.55 }],
    boosts: [{ segment: 0, t: 0.38 }, { segment: 3, t: 0.5 }, { segment: 6, t: 0.55 }],
    cars: [],
  },
];

export function pointOnSegment(circuit, segment, t, side = 0) {
  const a = circuit.waypoints[segment];
  const b = circuit.waypoints[(segment + 1) % circuit.waypoints.length];
  const x = a[0] + (b[0] - a[0]) * t;
  const y = a[1] + (b[1] - a[1]) * t;
  const z = a[2] + (b[2] - a[2]) * t;
  const dx = b[0] - a[0];
  const dz = b[2] - a[2];
  const len = Math.hypot(dx, dz) || 1;
  return [x + (-dz / len) * side * 2.8, y, z + (dx / len) * side * 2.8];
}
