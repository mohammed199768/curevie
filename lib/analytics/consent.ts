export type ConsentState = {
  necessary: true;
  analytics: boolean;
  marketing: boolean;
  decided: boolean;
  version: string;
};

const CONSENT_STORAGE_KEY = "curevie_consent_v1";
const CONSENT_VERSION = "1.0";

const DEFAULT_CONSENT: ConsentState = {
  necessary: true,
  analytics: false,
  marketing: false,
  decided: false,
  version: CONSENT_VERSION,
};

function normalizeConsent(state?: Partial<ConsentState> | null): ConsentState {
  return {
    necessary: true,
    analytics: Boolean(state?.analytics),
    marketing: Boolean(state?.marketing),
    decided: Boolean(state?.decided),
    version: CONSENT_VERSION,
  };
}

function isBrowser(): boolean {
  return typeof window !== "undefined";
}

function isPartialConsentState(value: unknown): value is Partial<ConsentState> {
  return typeof value === "object" && value !== null;
}

export function getConsent(): ConsentState {
  if (!isBrowser()) {
    return DEFAULT_CONSENT;
  }

  try {
    const stored = window.localStorage.getItem(CONSENT_STORAGE_KEY);
    if (!stored) {
      return DEFAULT_CONSENT;
    }

    const parsed: unknown = JSON.parse(stored);
    if (!isPartialConsentState(parsed)) {
      return DEFAULT_CONSENT;
    }

    const state = parsed;
    if (state.version !== CONSENT_VERSION) {
      return DEFAULT_CONSENT;
    }

    return normalizeConsent(state);
  } catch {
    return DEFAULT_CONSENT;
  }
}

export function setConsent(state: ConsentState): ConsentState {
  const normalized = normalizeConsent(state);

  if (!isBrowser()) {
    return normalized;
  }

  try {
    window.localStorage.setItem(CONSENT_STORAGE_KEY, JSON.stringify(normalized));
  } catch {
    // Ignore storage write failures and keep the in-memory decision flow alive.
  }

  return normalized;
}

export function hasDecided(): boolean {
  return getConsent().decided;
}

export function isAnalyticsAllowed(): boolean {
  const consent = getConsent();
  return consent.decided && consent.analytics;
}

export function isMarketingAllowed(): boolean {
  const consent = getConsent();
  return consent.decided && consent.marketing;
}
