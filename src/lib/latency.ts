type LatencyStatus = "success" | "failed";

type LatencyEntry = {
    timestamp: string;
    process: string;
    latencySec: number;
    status: LatencyStatus;
    metadata?: Record<string, unknown>;
};

const STORAGE_KEY = "vendy_regform_latency";

declare global {
    interface Window {
        vendyRegformLatencySummary?: () => ReturnType<typeof getLatencySummary>;
        vendyRegformLatencyClear?: () => void;
    }
}

function readEntries(): LatencyEntry[] {
    if (typeof window === "undefined") return [];
    try {
        return JSON.parse(window.localStorage.getItem(STORAGE_KEY) || "[]") as LatencyEntry[];
    } catch {
        return [];
    }
}

function writeEntries(entries: LatencyEntry[]) {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
}

export function logLatency(
    process: string,
    startedAt: number,
    status: LatencyStatus = "success",
    metadata?: Record<string, unknown>
) {
    if (typeof window === "undefined") return;

    const entry: LatencyEntry = {
        timestamp: new Date().toISOString(),
        process,
        latencySec: Number(((performance.now() - startedAt) / 1000).toFixed(3)),
        status,
        metadata,
    };
    const entries = [...readEntries(), entry];
    writeEntries(entries);
    if (navigator.sendBeacon) {
        navigator.sendBeacon(
            "/api/latency-log",
            new Blob([JSON.stringify(entry)], { type: "application/json" })
        );
    } else {
        void fetch("/api/latency-log", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(entry),
        }).catch(() => undefined);
    }
    console.info(`[LATENCY] ${process}: ${entry.latencySec}s (${status})`, metadata || "");
}

export function getLatencySummary() {
    const grouped = new Map<string, number[]>();
    for (const entry of readEntries().filter((item) => item.status === "success")) {
        grouped.set(entry.process, [...(grouped.get(entry.process) || []), entry.latencySec]);
    }

    const summary = Array.from(grouped.entries()).map(([process, values]) => ({
        process,
        trials: values.length,
        average: Number((values.reduce((sum, value) => sum + value, 0) / values.length).toFixed(3)),
        fastest: Math.min(...values),
        slowest: Math.max(...values),
    }));

    console.table(summary);
    return summary;
}

export function clearLatencyLog() {
    if (typeof window === "undefined") return;
    window.localStorage.removeItem(STORAGE_KEY);
    console.info("[LATENCY] Registration latency log cleared.");
}

if (typeof window !== "undefined") {
    window.vendyRegformLatencySummary = getLatencySummary;
    window.vendyRegformLatencyClear = clearLatencyLog;
}
