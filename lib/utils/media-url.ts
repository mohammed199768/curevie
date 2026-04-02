const DEFAULT_API_BASE_URL = "http://localhost:5000/api/v1";

function getBackendOrigin() {
  const configuredApiUrl = (process.env.NEXT_PUBLIC_API_URL || DEFAULT_API_BASE_URL).trim();

  try {
    const parsedUrl = new URL(configuredApiUrl);
    parsedUrl.pathname = parsedUrl.pathname.replace(/\/api\/v1\/?$/, "");
    parsedUrl.search = "";
    parsedUrl.hash = "";
    return parsedUrl.toString().replace(/\/$/, "");
  } catch {
    return configuredApiUrl.replace(/\/api\/v1\/?$/, "").replace(/\/$/, "");
  }
}

export function resolveMediaUrl(value?: string | null) {
  const normalizedValue = value?.trim();

  if (!normalizedValue) {
    return null;
  }

  if (
    /^(?:[a-z][a-z0-9+.-]*:)?\/\//i.test(normalizedValue)
    || normalizedValue.startsWith("blob:")
    || normalizedValue.startsWith("data:")
  ) {
    return normalizedValue;
  }

  return new URL(
    normalizedValue.startsWith("/") ? normalizedValue : `/${normalizedValue}`,
    `${getBackendOrigin()}/`,
  ).toString();
}
