import type { AxiosResponse } from "axios";
import { isAxiosError } from "axios";
import { triggerBlobDownload } from "@/lib/utils";

function readFileName(response: AxiosResponse<Blob>, fallback: string) {
  const header = String(response.headers?.["content-disposition"] || "");
  const match = /filename\*?=(?:UTF-8'')?"?([^";]+)"?/i.exec(header);
  if (!match?.[1]) return fallback;

  try {
    return decodeURIComponent(match[1]);
  } catch {
    return match[1];
  }
}

/** Error responses of blob requests arrive as a Blob; read the backend { message, code } out of it. */
export async function readBlobErrorCode(error: unknown): Promise<string | null> {
  if (!isAxiosError(error)) return null;
  const data = error.response?.data;

  if (data instanceof Blob) {
    try {
      const parsed = JSON.parse(await data.text()) as { code?: string };
      return parsed.code || null;
    } catch {
      return null;
    }
  }

  return (data as { code?: string } | undefined)?.code || null;
}

/** Fetches a protected file with the bearer token and saves it. */
export async function downloadProtectedFile(request: () => Promise<AxiosResponse<Blob>>, fallbackName: string) {
  const response = await request();
  triggerBlobDownload(response.data, readFileName(response, fallbackName));
}

/** Fetches a protected file and returns an object URL (caller revokes it). */
export async function fetchProtectedObjectUrl(request: () => Promise<AxiosResponse<Blob>>) {
  const response = await request();
  return URL.createObjectURL(response.data);
}
