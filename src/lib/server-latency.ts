import { appendFile, mkdir } from "fs/promises";
import path from "path";

type LatencyStatus = "success" | "failed";

type LatencyEntry = {
    timestamp?: string;
    process: string;
    latencySec: number;
    status?: LatencyStatus;
    metadata?: Record<string, unknown>;
};

const LOG_DIR = path.join(process.cwd(), "latency_logs");
const LOG_FILE = path.join(LOG_DIR, "regform_latency.jsonl");

export async function writeLatencyLog(entry: LatencyEntry) {
    await mkdir(LOG_DIR, { recursive: true });
    await appendFile(
        LOG_FILE,
        `${JSON.stringify({
            timestamp: entry.timestamp || new Date().toISOString(),
            process: entry.process,
            latencySec: Number(entry.latencySec.toFixed(3)),
            status: entry.status || "success",
            metadata: entry.metadata || {},
        })}\n`,
        "utf8"
    );
}

export async function measureLatency<T>(
    processName: string,
    action: () => Promise<T>,
    metadata?: Record<string, unknown>
) {
    const startedAt = performance.now();
    try {
        const result = await action();
        await writeLatencyLog({
            process: processName,
            latencySec: (performance.now() - startedAt) / 1000,
            status: "success",
            metadata,
        });
        return result;
    } catch (error) {
        await writeLatencyLog({
            process: processName,
            latencySec: (performance.now() - startedAt) / 1000,
            status: "failed",
            metadata: {
                ...metadata,
                reason: error instanceof Error ? error.message : String(error),
            },
        });
        throw error;
    }
}
