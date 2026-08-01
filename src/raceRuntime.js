export const truckState = new Map();
export const boostPadHits = new Map();

export function resetRuntime() {
  truckState.clear();
  boostPadHits.clear();
}

export function setTruckState(id, patch) {
  truckState.set(id, { ...(truckState.get(id) ?? {}), ...patch });
}
