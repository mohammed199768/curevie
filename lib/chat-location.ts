/**
 * Chat location sharing helpers.
 *
 * We persist locations in the chat as plain text messages that contain a
 * Google Maps link. This keeps the backend contract unchanged — Socket.IO
 * `send_message` still receives `{ room_id, content }` — while letting us
 * render a rich location card on the client by detecting the link with a
 * regex.
 */

export const LOCATION_LINK_REGEX =
  /https?:\/\/www\.google\.com\/maps\?q=(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?)/i;

export interface LocationInfo {
  latitude: string;
  longitude: string;
  googleMapsUrl: string;
  appleMapsUrl: string;
  googleDirectionsUrl: string;
  appleDirectionsUrl: string;
  displayText: string;
}

/**
 * Extract coordinates and build provider-specific map links from a raw
 * chat message. Returns `null` if the message does not contain a
 * recognised location link.
 */
export function extractLocationInfo(content: string | null): LocationInfo | null {
  if (!content) return null;

  const match = content.match(LOCATION_LINK_REGEX);
  if (!match) return null;

  const latitude = match[1];
  const longitude = match[2];

  return {
    latitude,
    longitude,
    googleMapsUrl: `https://www.google.com/maps?q=${latitude},${longitude}`,
    appleMapsUrl: `https://maps.apple.com/?ll=${latitude},${longitude}&q=${latitude},${longitude}`,
    googleDirectionsUrl: `https://www.google.com/maps/dir/?api=1&destination=${latitude},${longitude}`,
    appleDirectionsUrl: `https://maps.apple.com/?daddr=${latitude},${longitude}&dirflg=d`,
    displayText: content.replace(match[0], "").trim(),
  };
}

/** Detect Apple devices (iOS, iPadOS, macOS) via user agent. SSR-safe. */
export function isAppleDevice(): boolean {
  if (typeof navigator === "undefined") return false;
  const ua = navigator.userAgent || "";
  // iPadOS 13+ reports as Macintosh, but we still prefer Apple Maps there.
  return /iPhone|iPad|iPod|Macintosh|Mac OS X/i.test(ua);
}

/**
 * Format a coordinates pair into the chat message body that the renderer
 * recognises as a location share.
 */
export function formatLocationMessage(
  latitude: number,
  longitude: number,
  prefix?: string,
): string {
  const lat = latitude.toFixed(6);
  const lng = longitude.toFixed(6);
  const url = `https://www.google.com/maps?q=${lat},${lng}`;
  return prefix ? `${prefix} ${url}` : url;
}

export interface ShareLocationResult {
  latitude: number;
  longitude: number;
  accuracy: number;
}

export interface ShareLocationOptions {
  /** How long to keep watching for a better fix. Default: 8000 ms. */
  durationMs?: number;
  /** Stop early once accuracy reaches this value (in meters). Default: 15. */
  targetAccuracy?: number;
  /** Hard stop for the whole operation (in ms). Default: 15000. */
  timeoutMs?: number;
  /** Notified on every incoming fix — useful for showing live accuracy. */
  onProgress?: (reading: ShareLocationResult) => void;
}

export type ShareLocationErrorCode =
  | "UNSUPPORTED"
  | "PERMISSION_DENIED"
  | "TIMEOUT"
  | "NO_POSITION"
  | "GEOLOCATION_ERROR";

export class ShareLocationError extends Error {
  code: ShareLocationErrorCode;
  accuracy?: number;

  constructor(code: ShareLocationErrorCode, message?: string, accuracy?: number) {
    super(message || code);
    this.code = code;
    this.accuracy = accuracy;
    this.name = "ShareLocationError";
  }
}

/**
 * Watch position for up to `durationMs` and resolve with the reading that
 * had the lowest accuracy value (i.e. the most precise). Short-circuits as
 * soon as we hit `targetAccuracy` or better — typically 1-3 seconds on a
 * modern phone with GPS enabled.
 *
 * Requires HTTPS (already the case for www.curevie.net) and a user grant
 * for the geolocation permission. On iOS Safari, `enableHighAccuracy: true`
 * is required to engage GPS instead of falling back to Wi-Fi triangulation.
 */
export function shareLocationWithBestAccuracy(
  options: ShareLocationOptions = {},
): Promise<ShareLocationResult> {
  const {
    durationMs = 8000,
    targetAccuracy = 15,
    timeoutMs = 15000,
    onProgress,
  } = options;

  return new Promise((resolve, reject) => {
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      reject(new ShareLocationError("UNSUPPORTED"));
      return;
    }

    let best: ShareLocationResult | null = null;
    let watchId: number | null = null;
    let durationTimer: ReturnType<typeof setTimeout> | null = null;
    let hardTimeoutTimer: ReturnType<typeof setTimeout> | null = null;
    let settled = false;

    const cleanup = () => {
      if (watchId !== null) {
        navigator.geolocation.clearWatch(watchId);
        watchId = null;
      }
      if (durationTimer) {
        clearTimeout(durationTimer);
        durationTimer = null;
      }
      if (hardTimeoutTimer) {
        clearTimeout(hardTimeoutTimer);
        hardTimeoutTimer = null;
      }
    };

    const settle = (action: () => void) => {
      if (settled) return;
      settled = true;
      cleanup();
      action();
    };

    const finishWithBest = () => {
      settle(() => {
        if (best) {
          resolve(best);
        } else {
          reject(new ShareLocationError("NO_POSITION"));
        }
      });
    };

    watchId = navigator.geolocation.watchPosition(
      (position) => {
        const reading: ShareLocationResult = {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: position.coords.accuracy,
        };

        if (!best || reading.accuracy < best.accuracy) {
          best = reading;
        }

        onProgress?.(reading);

        if (best.accuracy <= targetAccuracy) {
          finishWithBest();
        }
      },
      (error) => {
        if (error.code === error.PERMISSION_DENIED) {
          settle(() => reject(new ShareLocationError("PERMISSION_DENIED")));
          return;
        }
        if (error.code === error.TIMEOUT) {
          if (best) {
            settle(() => resolve(best!));
          } else {
            settle(() => reject(new ShareLocationError("TIMEOUT")));
          }
          return;
        }
        // POSITION_UNAVAILABLE or other transient errors: keep watching
        // — the next callback may still deliver a reading before our
        // durationTimer fires. Only give up if we never saw one.
      },
      {
        enableHighAccuracy: true,
        maximumAge: 0,
        timeout: timeoutMs,
      },
    );

    durationTimer = setTimeout(finishWithBest, durationMs);
    hardTimeoutTimer = setTimeout(() => {
      settle(() => {
        if (best) resolve(best);
        else reject(new ShareLocationError("TIMEOUT"));
      });
    }, timeoutMs);
  });
}
