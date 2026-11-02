/** A proxy, expired session or failed server function may return HTML or no body. */
export async function readDeviceResponse(response: Response): Promise<Record<string, unknown>> {
  if (response.redirected || response.status === 401) throw new Error("Your session has expired. Sign in again and reopen Device Activity.");
  const text = await response.text();
  let data: Record<string, unknown>;
  try {
    const parsed: unknown = JSON.parse(text);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) throw new Error();
    data = parsed as Record<string, unknown>;
  } catch {
    throw new Error(response.ok
      ? "The device server returned an invalid response. Refresh the page; if it continues, check the deployment logs."
      : `Device service returned HTTP ${response.status} without a valid response. Check the deployment logs and database connection.`);
  }
  if (!response.ok) throw new Error(typeof data.error === "string" ? data.error : `Device request failed (HTTP ${response.status}).`);
  return data;
}

export function deviceServiceFailure(error: unknown): { status: number; code: string; error: string } {
  const code = error && typeof error === "object" && "code" in error ? String(error.code) : "";
  if (code === "P2021" || code === "P2022") return {
    status: 503, code: "DEVICE_SCHEMA_NOT_READY",
    error: "Device storage is not initialized. The server administrator must run npm run db:migrate on the deployed database, then redeploy if needed.",
  };
  if (code === "P2025") return { status: 404, code: "DEVICE_NOT_FOUND", error: "This device no longer exists. Refresh the device list." };
  return { status: 503, code: "DEVICE_SERVICE_UNAVAILABLE", error: "Device service is temporarily unavailable. Check the server database connection and deployment logs, then retry." };
}
