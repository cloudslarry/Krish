type HealthResponse = {
  success: boolean;
  message: string;
  data: {
    status: string;
    timestamp: string;
  };
};

const backendUrl = process.env.BACKEND_URL ?? "http://localhost:4000";

async function getBackendHealth() {
  try {
    const response = await fetch(`${backendUrl}/api/health`, {
      cache: "no-store",
    });

    if (!response.ok) {
      throw new Error(`Backend returned ${response.status}`);
    }

    return (await response.json()) as HealthResponse;
  } catch {
    return null;
  }
}

export default async function Home() {
  const health = await getBackendHealth();
  const connected = Boolean(health?.success && health.data?.status === "ok");

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(26,160,137,0.18),_transparent_34%),linear-gradient(180deg,#f7fbfa_0%,#eef4f2_100%)] px-6 py-10 text-slate-950">
      <section className="mx-auto flex min-h-[calc(100vh-5rem)] w-full max-w-6xl items-center justify-center">
        <div className="grid w-full gap-6 lg:grid-cols-[1.2fr_0.8fr]">
          <div className="rounded-[2rem] border border-white/70 bg-white/80 p-8 shadow-[0_24px_80px_rgba(15,23,42,0.12)] backdrop-blur xl:p-12">
            <div className="inline-flex items-center rounded-full border border-emerald-200 bg-emerald-50 px-4 py-1 text-sm font-medium text-emerald-900">
              Frontend + Backend connected
            </div>
            <h1 className="mt-6 max-w-2xl text-4xl font-semibold tracking-tight text-slate-950 sm:text-5xl">
              Next.js is reading live data from the Express API.
            </h1>
            <p className="mt-4 max-w-2xl text-base leading-7 text-slate-600 sm:text-lg">
              The frontend renders the backend health response on the server,
              so you can verify the apps are wired together before layering in
              auth or product data.
            </p>

            <div className="mt-8 grid gap-4 sm:grid-cols-3">
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <div className="text-sm text-slate-500">Frontend</div>
                <div className="mt-1 text-lg font-semibold">localhost:3000</div>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <div className="text-sm text-slate-500">Backend</div>
                <div className="mt-1 text-lg font-semibold">localhost:4000</div>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <div className="text-sm text-slate-500">API</div>
                <div className="mt-1 text-lg font-semibold">/api/health</div>
              </div>
            </div>
          </div>

          <aside className="rounded-[2rem] border border-slate-200 bg-slate-950 p-6 text-slate-50 shadow-[0_24px_80px_rgba(15,23,42,0.18)]">
            <div className="flex items-center justify-between gap-4">
              <div>
                <div className="text-sm uppercase tracking-[0.3em] text-slate-400">
                  Live status
                </div>
                <div className="mt-2 text-2xl font-semibold">Backend handshake</div>
              </div>
              <div
                className={`rounded-full px-3 py-1 text-sm font-medium ${connected ? "bg-emerald-400/15 text-emerald-300" : "bg-rose-400/15 text-rose-300"}`}
              >
                {connected ? "Connected" : "Offline"}
              </div>
            </div>

            <div className="mt-6 rounded-3xl border border-white/10 bg-white/5 p-5">
              <div className="text-sm text-slate-400">Response</div>
              <div className="mt-3 font-mono text-sm leading-7 text-slate-200">
                {health ? (
                  <>
                    <div>message: {health.message}</div>
                    <div>status: {health.data.status}</div>
                    <div>timestamp: {health.data.timestamp}</div>
                  </>
                ) : (
                  <div>Unable to reach {backendUrl}/api/health.</div>
                )}
              </div>
            </div>

            <div className="mt-6 space-y-3 text-sm text-slate-300">
              <p>Next step: wire auth forms to /api/auth/register and /api/auth/login.</p>
              <p>Backend URL source: BACKEND_URL or http://localhost:4000.</p>
            </div>
          </aside>
        </div>
      </section>
    </main>
  );
}
