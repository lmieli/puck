// Runs once when the server starts: begins the timer that retries deliveries
// (webhooks, e-mail) that were waiting when the server last stopped.
export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { ensureWorker, processDeliveries } = await import("./lib/leads");
    ensureWorker();
    void processDeliveries();
  }
}
