export const PHYSICS = {
  gravity: [0, -9.81, 0],
  chassis: {
    mass: 5.2,
    size: [1.8, 0.78, 3.05],
    restitution: 0.15,
    linearDamping: 0.08,
    angularDamping: 0.42,
    centerOfMass: [0, -0.34, 0.05],
  },
  wheels: {
    radius: 0.42,
    width: 0.35,
    suspensionRestLength: 0.42,
    maxSuspensionTravel: 0.55,
    suspensionStiffness: 42,
    dampingCompression: 4.6,
    dampingRelaxation: 5.4,
    frictionSlip: 2.8,
    rollInfluence: 0.65,
  },
  engineForce: 39,
  reverseForce: 18,
  brakeForce: 22,
  maxSteer: 0.52,
  steerSpeed: 5.8,
  boostImpulse: 34,
  boostDuration: 0.9,
  flipCooldown: 5,
  upsideDownSeconds: 2,
};

export const GAME = {
  laps: 3,
  aiNames: ["Big Bess", "Thunderfoot", "Megawatt"],
  checkpointRadius: 5.2,
  boostPadRecharge: 2.4,
  airBonusSeconds: 0.6,
  score: {
    air: 250,
    crush: 250,
    finishBase: [3000, 2000, 1000, 500],
  },
};

export const COLORS = {
  player: "#f4d03f",
  ai: ["#e4572e", "#3ddc97", "#4d96ff"],
  rubber: "#111111",
};
