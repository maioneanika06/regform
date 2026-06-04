import { appendFile, mkdir } from "fs/promises";
import os from "os";
import path from "path";
import { supabase, supabaseAdmin } from "@/lib/supabase";

type LatencyStatus = "success" | "failed";

type LatencyEntry = {
    timestamp?: string;
    process: string;
    latencySec: number;
    status?: LatencyStatus;
    metadata?: Record<string, unknown>;
};

const LOG_DIR = process.env.VENDY_LATENCY_LOG_DIR || path.join(process.cwd(), "latency_logs");
const FALLBACK_LOG_DIR = path.join(os.tmpdir(), "vendy_latency_logs");
const LOG_FILE = path.join(LOG_DIR, "regform_latency.jsonl");
const FALLBACK_LOG_FILE = path.join(FALLBACK_LOG_DIR, "regform_latency.jsonl");
const APP_NAME = "regform";

export async function writeLatencyLog(entry: LatencyEntry) {
    const normalizedEntry = {
            timestamp: entry.timestamp || new Date().toISOString(),
            process: entry.process,
            latencySec: Number(entry.latencySec.toFixed(3)),
            status: entry.status || "success",
            metadata: entry.metadata || {},
        };
    const line = `${JSON.stringify(normalizedEntry)}\n`;

    try {
        const client = supabaseAdmin || supabase;
        const { error } = await client.from("latency_logs").insert({
            app_name: APP_NAME,
            process: normalizedEntry.process,
            latency_sec: normalizedEntry.latencySec,
            status: normalizedEntry.status,
            metadata: normalizedEntry.metadata,
        });
        if (error) {
            console.warn("Supabase latency log insert failed:", error.message);
        }
    } catch (error) {
        console.warn("Supabase latency log insert failed:", error);
    }

    try {
        await mkdir(LOG_DIR, { recursive: true });
        await appendFile(LOG_FILE, line, "utf8");
    } catch (error) {
        console.warn("Primary latency log write failed:", error);
        try {
            await mkdir(FALLBACK_LOG_DIR, { recursive: true });
            await appendFile(FALLBACK_LOG_FILE, line, "utf8");
        } catch (fallbackError) {
            console.warn("Fallback latency log write failed:", fallbackError);
        }
    }
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
