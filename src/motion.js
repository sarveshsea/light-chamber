const clamp = (value, low, high) => Math.max(low, Math.min(high, value));

export function pointerPosition(x, y, width, height) {
  if (width <= 0 || height <= 0) return { x: 0, y: 0 };
  return { x: clamp(x / width * 2 - 1, -1, 1), y: clamp(1 - y / height * 2, -1, 1) };
}

export function advance(current, target, elapsed, reducedMotion) {
  const blend = reducedMotion ? 1 : 1 - Math.exp(-Math.max(0, elapsed) / 110);
  return Object.fromEntries(Object.keys(target).map(key => {
    const value = current[key] + (target[key] - current[key]) * blend;
    return [key, Math.abs(value - target[key]) < .0001 ? target[key] : value];
  }));
}

export function changeDepth(depth, delta) {
  return Number.isFinite(delta) ? clamp(depth + delta * .0012, -1, 1) : depth;
}
