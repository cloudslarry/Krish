export const backendUrl =
  process.env.NEXT_PUBLIC_BACKEND_URL ?? "http://localhost:4000";

export async function getBackendHealth() {
  const response = await fetch(`${backendUrl}/api/health`, {
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(`Backend returned ${response.status}`);
  }

  return response.json() as Promise<{
    success: boolean;
    message: string;
    data: {
      status: string;
      timestamp: string;
    };
  }>;
}