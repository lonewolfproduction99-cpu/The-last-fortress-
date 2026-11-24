// Renders the canvas at the device's real pixel density (capped at 2x for
// performance) so text and pixel art stay sharp on phones and tablets.
// The game size always equals the container size x pixel ratio, so the FIT
// scale mode never letterboxes and every aspect ratio is supported.

const MAX_RATIO = 2;

export function getPixelRatio() {
  return Math.min(window.devicePixelRatio || 1, MAX_RATIO);
}

export function getTargetSize(parent) {
  const r = getPixelRatio();
  const w = Math.max(320, parent.clientWidth || window.innerWidth);
  const h = Math.max(200, parent.clientHeight || window.innerHeight);
  return { width: Math.round(w * r), height: Math.round(h * r) };
}

export function watchResize(game, parent) {
  let pending = 0;
  const apply = () => {
    pending = 0;
    const { width, height } = getTargetSize(parent);
    if (width !== game.scale.width || height !== game.scale.height) {
      game.scale.resize(width, height);
    }
  };
  const schedule = () => {
    if (!pending) pending = requestAnimationFrame(apply);
  };
  window.addEventListener('resize', schedule);
  window.addEventListener('orientationchange', () => setTimeout(apply, 250));
  if (window.visualViewport) window.visualViewport.addEventListener('resize', schedule);
  if (window.ResizeObserver) new ResizeObserver(schedule).observe(parent);
  // devicePixelRatio changes (browser zoom, moving between monitors).
  const watchDpr = () => {
    const mq = window.matchMedia(`(resolution: ${window.devicePixelRatio}dppx)`);
    const onChange = () => {
      schedule();
      watchDpr();
    };
    if (mq.addEventListener) mq.addEventListener('change', onChange, { once: true });
  };
  watchDpr();
}
