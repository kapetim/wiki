export function approx(a, b, tol = 5) {
  return a !== null && b !== null && Math.abs(a - b) <= tol;
}
