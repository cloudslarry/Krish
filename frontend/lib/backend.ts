export const backendUrl =
  process.env.NEXT_PUBLIC_BACKEND_URL ?? "https://krish-ss9t.onrender.com";

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