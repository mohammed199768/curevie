const DISABLED_VALUES = new Set(["false", "0", "off", "no"]);

function readBookingsFlag(value: string | undefined): boolean {
  if (value === undefined) {
    return true;
  }

  const normalized = value.trim().toLowerCase();
  return normalized === "" || !DISABLED_VALUES.has(normalized);
}

/** Ordering is live unless NEXT_PUBLIC_BOOKINGS_ENABLED is explicitly set to false/0/off/no. */
export const BOOKINGS_ENABLED = readBookingsFlag(process.env.NEXT_PUBLIC_BOOKINGS_ENABLED);
