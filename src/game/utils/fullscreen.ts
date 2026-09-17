/**
 * Universal cross-browser Fullscreen & Orientation helper
 * Handles Desktop, Android Chrome, Brave, iOS Safari, WebViews, and Phaser scale manager.
 */

export function isAppFullscreen(): boolean {
  if (typeof document === "undefined") return false;
  const doc = document as any;
  const phaser = (window as any).phaserGame;

  return !!(
    doc.fullscreenElement ||
    doc.webkitFullscreenElement ||
    doc.mozFullScreenElement ||
    doc.msFullscreenElement ||
    phaser?.scale?.isFullscreen
  );
}

export function lockScreenOrientationLandscape(): void {
  try {
    const ori = screen?.orientation as any;
    if (ori && typeof ori.lock === "function") {
      ori.lock("landscape-primary").catch(() => {
        ori.lock("landscape").catch(() => {});
      });
    } else if ((screen as any)?.lockOrientation) {
      (screen as any).lockOrientation("landscape");
    } else if ((screen as any)?.webkitLockOrientation) {
      (screen as any).webkitLockOrientation("landscape");
    } else if ((screen as any)?.mozLockOrientation) {
      (screen as any).mozLockOrientation("landscape");
    }
  } catch (e) {
    console.warn("Orientation lock not supported:", e);
  }
}

export function requestAppFullscreen(): Promise<boolean> {
  if (typeof document === "undefined") return Promise.resolve(false);

  // Target documentElement first for clean full-page scaling
  const docEl = document.documentElement as any;
  const body = document.body as any;
  const root = document.getElementById("root") as any;

  const target = docEl || body || root;
  if (!target) return Promise.resolve(false);

  const onFullscreenSuccess = () => {
    // Once in fullscreen, the browser allows locking orientation
    lockScreenOrientationLandscape();

    // Trigger Phaser bounds recalculation
    try {
      const phaser = (window as any).phaserGame;
      if (phaser?.scale) {
        phaser.scale.refresh();
        phaser.scale.updateBounds();
      }
    } catch {}

    // Collapse mobile browser address bar
    try {
      window.scrollTo(0, 1);
      setTimeout(() => window.scrollTo(0, 0), 80);
    } catch {}

    // Dispatch app-level event
    try {
      window.dispatchEvent(new CustomEvent("appfullscreenchange", { detail: { isFullscreen: true } }));
    } catch {}
  };

  try {
    if (typeof target.requestFullscreen === "function") {
      const res = target.requestFullscreen();
      if (res && typeof res.then === "function") {
        return res
          .then(() => {
            onFullscreenSuccess();
            return true;
          })
          .catch((err: any) => {
            console.warn("target.requestFullscreen rejected:", err);
            // If documentElement failed, try body as fallback
            if (body && body !== target && typeof body.requestFullscreen === "function") {
              return body.requestFullscreen()
                .then(() => {
                  onFullscreenSuccess();
                  return true;
                })
                .catch(() => {
                  lockScreenOrientationLandscape();
                  return false;
                });
            }
            lockScreenOrientationLandscape();
            return false;
          });
      }
      onFullscreenSuccess();
      return Promise.resolve(true);
    } else if (typeof target.webkitRequestFullscreen === "function") {
      target.webkitRequestFullscreen();
      onFullscreenSuccess();
      return Promise.resolve(true);
    } else if (typeof body?.webkitRequestFullscreen === "function") {
      body.webkitRequestFullscreen();
      onFullscreenSuccess();
      return Promise.resolve(true);
    } else if (typeof target.mozRequestFullScreen === "function") {
      target.mozRequestFullScreen();
      onFullscreenSuccess();
      return Promise.resolve(true);
    } else if (typeof target.msRequestFullscreen === "function") {
      target.msRequestFullscreen();
      onFullscreenSuccess();
      return Promise.resolve(true);
    }
  } catch (err) {
    console.warn("Element fullscreen trigger error:", err);
  }

  // Attempt orientation lock anyway (some mobile browsers support it even without fullscreen)
  lockScreenOrientationLandscape();
  return Promise.resolve(false);
}

export function exitAppFullscreen(): Promise<boolean> {
  if (typeof document === "undefined") return Promise.resolve(false);
  const doc = document as any;

  const onExitSuccess = () => {
    try {
      const ori = screen?.orientation as any;
      if (ori && typeof ori.unlock === "function") {
        ori.unlock();
      } else if ((screen as any)?.unlockOrientation) {
        (screen as any).unlockOrientation();
      }
    } catch {}

    try {
      const phaser = (window as any).phaserGame;
      if (phaser?.scale) {
        phaser.scale.refresh();
        phaser.scale.updateBounds();
      }
    } catch {}

    try {
      window.dispatchEvent(new CustomEvent("appfullscreenchange", { detail: { isFullscreen: false } }));
    } catch {}
  };

  try {
    if (typeof doc.exitFullscreen === "function") {
      const res = doc.exitFullscreen();
      if (res && typeof res.then === "function") {
        return res
          .then(() => {
            onExitSuccess();
            return true;
          })
          .catch(() => false);
      }
      onExitSuccess();
      return Promise.resolve(true);
    } else if (typeof doc.webkitExitFullscreen === "function") {
      doc.webkitExitFullscreen();
      onExitSuccess();
      return Promise.resolve(true);
    } else if (typeof doc.mozCancelFullScreen === "function") {
      doc.mozCancelFullScreen();
      onExitSuccess();
      return Promise.resolve(true);
    } else if (typeof doc.msExitFullscreen === "function") {
      doc.msExitFullscreen();
      onExitSuccess();
      return Promise.resolve(true);
    }
  } catch (err) {
    console.warn("Exit fullscreen error:", err);
  }

  onExitSuccess();
  return Promise.resolve(false);
}

export function toggleAppFullscreen(): Promise<boolean> {
  if (isAppFullscreen()) {
    return exitAppFullscreen();
  } else {
    return requestAppFullscreen();
  }
}

export function subscribeFullscreenChange(callback: (isFullscreen: boolean) => void): () => void {
  const handler = () => {
    const fs = isAppFullscreen();
    if (fs) {
      lockScreenOrientationLandscape();
    }
    callback(fs);
  };

  document.addEventListener("fullscreenchange", handler);
  document.addEventListener("webkitfullscreenchange", handler);
  document.addEventListener("mozfullscreenchange", handler);
  document.addEventListener("MSFullscreenChange", handler);
  window.addEventListener("appfullscreenchange", handler);

  return () => {
    document.removeEventListener("fullscreenchange", handler);
    document.removeEventListener("webkitfullscreenchange", handler);
    document.removeEventListener("mozfullscreenchange", handler);
    document.removeEventListener("MSFullscreenChange", handler);
    window.removeEventListener("appfullscreenchange", handler);
  };
}
