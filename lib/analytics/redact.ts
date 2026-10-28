/**
 * Guest tracking links carry a secret token (/{locale}/track/{token}); never send it to analytics.
 * Also matches the URL-encoded form used in ?redirect= parameters.
 */
export const TRACKING_TOKEN_PATTERN_SOURCE = "(/|%2F)track(/|%2F)[^/?#&%]+";

function createPattern() {
  return new RegExp(TRACKING_TOKEN_PATTERN_SOURCE, "gi");
}

export function redactTrackingToken(value: string) {
  return value.replace(createPattern(), "$1track$2redacted");
}

export function isTrackingPath(pathname?: string | null) {
  return Boolean(pathname && createPattern().test(pathname));
}
