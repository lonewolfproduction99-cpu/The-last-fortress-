// Combined movement intent from keyboard and the touch joystick.
// The UI scene writes the joystick vector; the game scene reads `vector()`.

const state = { joyX: 0, joyY: 0 };

export const InputState = {
  setJoystick(x, y) {
    state.joyX = x;
    state.joyY = y;
  },
  clearJoystick() {
    state.joyX = 0;
    state.joyY = 0;
  },
  get joystick() {
    return state;
  },
};

/**
 * Returns a movement vector with length <= 1, combining keyboard and joystick.
 * Keyboard diagonals are normalised so diagonal movement is not faster.
 */
export function readMovement(keys, out) {
  let kx = 0;
  let ky = 0;
  if (keys) {
    if (keys.left.isDown || keys.a.isDown) kx -= 1;
    if (keys.right.isDown || keys.d.isDown) kx += 1;
    if (keys.up.isDown || keys.w.isDown) ky -= 1;
    if (keys.down.isDown || keys.s.isDown) ky += 1;
  }
  let x = kx + state.joyX;
  let y = ky + state.joyY;
  const len = Math.hypot(x, y);
  if (len > 1) {
    x /= len;
    y /= len;
  }
  out.x = x;
  out.y = y;
  return out;
}
