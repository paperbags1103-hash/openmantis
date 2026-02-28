export async function checkServerConnection(serverUrl: string): Promise<boolean> {
  const normalizedUrl = serverUrl.trim().replace(/\/+$/, "");
  if (!normalizedUrl) {
    return false;
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 5000);

  try {
    const response = await fetch(`${normalizedUrl}/api/health`, {
      method: "GET",
      signal: controller.signal,
    });
    return response.ok;
  } catch {
    return false;
  } finally {
    clearTimeout(timeout);
  }
}
