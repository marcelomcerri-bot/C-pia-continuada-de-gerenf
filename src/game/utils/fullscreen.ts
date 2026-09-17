/**
 * Universal cross-browser Fullscreen & Orientation helper
 * Handles Desktop, Android Chrome, iOS Safari, WebViews, and Phaser scale manager.
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
    (phaser?.scale?.isFullscreen)
  );
}

export function requestAppFullscreen(): boolean {
  if (typeof document === "undefined") return false;

  const docEl = document.documentElement as any;
  const body = document.body as any;
  const container = document.getElementById("game-container") as any;
  const root = document.getElementById("root") as any;

  let initiated = false;

  // List of elements to attempt fullscreen on (in priority order)
  const targets = [docEl, body, container, root].filter(Boolean);

  for (const el of targets) {
    if (initiated) break;
    try {
      if (typeof el.requestFullscreen === "function") {
        // Direct call without options (options cause TypeErrors in many mobile Chrome versions)
        const res = el.requestFullscreen();
        if (res && typeof res.catch === "function") {
          res.catch((err: any) => {
            console.warn("requestFullscreen promise rejected:", err);
          });
        }
        initiated = true;
      } else if (typeof el.webkitRequestFullscreen === "function") {
        // WebKit (Safari / iOS) does NOT return a Promise; calling .catch() crashes!
        el.webkitRequestFullscreen();
        initiated = true;
      } else if (typeof el.webkitRequestFullScreen === "function") {
        el.webkitRequestFullScreen();
        initiated = true;
      } else if (typeof el.mozRequestFullScreen === "function") {
        el.mozRequestFullScreen();
        initiated = true;
      } else if (typeof el.msRequestFullscreen === "function") {
        el.msRequestFullscreen();
        initiated = true;
      }
    } catch (err) {
      console.warn("Element fullscreen trigger error:", err);
    }
  }

  // Also trigger Phaser 3 Scale Manager fullscreen
  try {
    const phaser = (window as any).phaserGame;
    if (phaser?.scale && typeof phaser.scale.startFullscreen === "function") {
      if (!phaser.scale.isFullscreen) {
        phaser.scale.startFullscreen();
      }
      initiated = true;
    }
  } catch (err) {
    console.warn("Phaser scale startFullscreen error:", err);
  }

  // Attempt screen orientation lock to landscape
  try {
    const ori = screen?.orientation as any;
    if (ori && typeof ori.lock === "function") {
      const lockRes = ori.lock("landscape");
      if (lockRes && typeof lockRes.catch === "function") {
        lockRes.catch(() => {});
      }
    } else if ((screen as any)?.lockOrientation) {
      (screen as any).lockOrientation("landscape");
    } else if ((screen as any)?.webkitLockOrientation) {
      (screen as any).webkitLockOrientation("landscape");
    } else if ((screen as any)?.mozLockOrientation) {
      (screen as any).mozLockOrientation("landscape");
    }
  } catch (err) {
    console.warn("Screen orientation lock error:", err);
  }

  // Collapse mobile browser address bar if possible
  try {
    window.scrollTo(0, 1);
    setTimeout(() => window.scrollTo(0, 0), 100);
  } catch {}

  // Broadcast custom event so React and HUD update immediately
  try {
    window.dispatchEvent(new CustomEvent("appfullscreenchange", { detail: { isFullscreen: true } }));
  } catch {}

  return initiated;
}

export function exitAppFullscreen(): boolean {
  if (typeof document === "undefined") return false;
  const doc = document as any;
  let initiated = false;

  try {
    if (typeof doc.exitFullscreen === "function") {
      const res = doc.exitFullscreen();
      if (res && typeof res.catch === "function") {
        res.catch(() => {});
      }
      initiated = true;
    } else if (typeof doc.webkitExitFullscreen === "function") {
      doc.webkitExitFullscreen();
      initiated = true;
    } else if (typeof doc.mozCancelFullScreen === "function") {
      doc.mozCancelFullScreen();
      initiated = true;
    } else if (typeof doc.msExitFullscreen === "function") {
      doc.msExitFullscreen();
      initiated = true;
    }
  } catch (err) {
    console.warn("Exit fullscreen error:", err);
  }

  try {
    const phaser = (window as any).phaserGame;
    if (phaser?.scale && typeof phaser.scale.stopFullscreen === "function") {
      if (phaser.scale.isFullscreen) {
        phaser.scale.stopFullscreen();
      }
      initiated = true;
    }
  } catch (err) {
    console.warn("Phaser stopFullscreen error:", err);
  }

  try {
    const ori = screen?.orientation as any;
    if (ori && typeof ori.unlock === "function") {
      ori.unlock();
    } else if ((screen as any)?.unlockOrientation) {
      (screen as any).unlockOrientation();
    }
  } catch {}

  try {
    window.dispatchEvent(new CustomEvent("appfullscreenchange", { detail: { isFullscreen: false } }));
  } catch {}

  return initiated;
}

export function toggleAppFullscreen(): boolean {
  if (isAppFullscreen()) {
    return exitAppFullscreen();
  } else {
    return requestAppFullscreen();
  }
}

export function subscribeFullscreenChange(callback: (isFullscreen: boolean) => void): () => void {
  const handler = () => {
    callback(isAppFullscreen());
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
