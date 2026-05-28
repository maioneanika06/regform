import { NextResponse } from "next/server";
import { writeLatencyLog } from "@/lib/server-latency";

export const runtime = "nodejs";

export async function POST(request: Request) {
    try {
        const entry = await request.json();
        if (!entry?.process || typeof entry.latencySec !== "number") {
            return NextResponse.json({ error: "Invalid latency entry." }, { status: 400 });
        }

        await writeLatencyLog(entry);
        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("Latency log error:", error);
        return NextResponse.json({ error: "Failed to write latency log." }, { status: 500 });
    }
}
