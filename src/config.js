export const PHYSICS = {
  gravity: [0, -9.81, 0],
  chassis: {
    mass: 5.2,
    size: [1.8, 0.78, 3.05],
    restitution: 0.08,
    linearDamping: 0.08,
    angularDamping: 0.6,
    centerOfMass: [0, -0.45, 0.05],
  },
  wheels: {
    radius: 0.42,
    width: 0.35,
    suspensionRestLength: 0.4,
    maxSuspensionTravel: 0.5,
    suspensionStiffness: 52,
    dampingCompression: 5.2,
    dampingRelaxation: 6.4,
    frictionSlip: 3.1,
    rollInfluence: 0.75,
  },
  engineForce: 55,
  reverseForce: 18,
  brakeForce: 26,
  maxSteer: 0.52,
  steerSpeed: 5.5,
  boostImpulse: 30,
  boostUp: 0.6,
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
