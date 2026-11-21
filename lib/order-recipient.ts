import type { RecipientAgeGroup, RecipientGender } from "@/lib/api/cases";
import { RECIPIENT_AGE_GROUPS, RECIPIENT_GENDERS } from "@/lib/api/cases";

/** Under this age the care recipient counts as a child (backend `CHILD`). */
export const CHILD_AGE_LIMIT = 18;

export function isRecipientGender(value: unknown): value is RecipientGender {
  return typeof value === "string" && (RECIPIENT_GENDERS as readonly string[]).includes(value);
}

export function isRecipientAgeGroup(value: unknown): value is RecipientAgeGroup {
  return typeof value === "string" && (RECIPIENT_AGE_GROUPS as readonly string[]).includes(value);
}

/** Profile gender is stored lower-case ("male" | "female" | "other"); only male/female map to a recipient gender. */
export function recipientGenderFromProfile(gender?: string | null): RecipientGender | null {
  const value = gender?.trim().toUpperCase();
  return isRecipientGender(value) ? value : null;
}

/** CHILD when the person is under 18 today, ADULT otherwise; null when the birth date is missing or invalid. */
export function recipientAgeGroupFromBirthDate(dateOfBirth?: string | null, now: Date = new Date()): RecipientAgeGroup | null {
  const match = dateOfBirth?.trim().match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!match) return null;

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  if (!year || month < 1 || month > 12 || day < 1 || day > 31) return null;

  let age = now.getFullYear() - year;
  const beforeBirthday = now.getMonth() + 1 < month || (now.getMonth() + 1 === month && now.getDate() < day);
  if (beforeBirthday) age -= 1;
  if (age < 0 || age > 130) return null;

  return age < CHILD_AGE_LIMIT ? "CHILD" : "ADULT";
}
