export function assertValidMovementSteps(steps) {
  if (!Number.isInteger(steps) || steps <= 0) {
    throw new Error('Movement steps must be a positive integer.');
  }
}
