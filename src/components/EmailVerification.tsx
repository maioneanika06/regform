"use client";

import React, { useState } from "react";
import { logLatency } from "@/lib/latency";

interface EmailVerificationProps {
    email: string;
    token: string;
    onBack: () => void;
    onResend: () => Promise<void>;
    onVerified: (verificationToken: string) => void;
}

export default function EmailVerification({
    email,
    token,
    onBack,
    onResend,
    onVerified,
}: EmailVerificationProps) {
    const [code, setCode] = useState("");
    const [error, setError] = useState("");
    const [submitting, setSubmitting] = useState(false);
    const [resending, setResending] = useState(false);

    async function handleSubmit(event: React.FormEvent) {
        event.preventDefault();
        const verificationStart = performance.now();
        setError("");
        setSubmitting(true);

        try {
            const response = await fetch("/api/verify-email", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    action: "confirm",
                    token,
                    code,
                }),
            });
            const result = await response.json().catch(() => null);

            if (!response.ok || !result?.verificationToken) {
                logLatency("OTP Verification", verificationStart, "failed", {
                    reason: result?.error || "Email verification failed.",
                });
                setError(result?.error || "Email verification failed.");
                return;
            }

            logLatency("OTP Verification", verificationStart);
            onVerified(result.verificationToken);
        } catch (err) {
            console.error("Email code verification failed:", err);
            logLatency("OTP Verification", verificationStart, "failed", {
                reason: err instanceof Error ? err.message : String(err),
            });
            setError("Email verification failed. Please try again.");
        } finally {
            setSubmitting(false);
        }
    }

    async function handleResend() {
        setError("");
        setResending(true);

        try {
            await onResend();
        } catch (err) {
            console.error("Email code resend failed:", err);
            setError("Could not resend the verification code.");
        } finally {
            setResending(false);
        }
    }

    return (
        <form onSubmit={handleSubmit} className="space-y-5 animate-fadeIn">
            <div>
                <h2 className="text-xl font-semibold text-white">Verify Email</h2>
                <p className="text-sm text-white/45 mt-2 break-words">
                    Enter the 6-digit code sent to {email}.
                </p>
            </div>

            <div>
                <label
                    htmlFor="emailCode"
                    className="block text-[11px] font-semibold uppercase tracking-[0.12em] text-white/35 mb-2"
                >
                    Verification Code
                </label>
                <input
                    id="emailCode"
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    pattern="[0-9]*"
                    maxLength={6}
                    value={code}
                    onChange={(event) =>
                        setCode(event.target.value.replace(/\D/g, "").slice(0, 6))
                    }
                    className="w-full px-4 py-3 rounded-lg bg-white/[0.025] border border-white/[0.08] text-white text-lg placeholder:text-white/20 focus:outline-none focus:border-purple-500/35 focus:ring-1 focus:ring-purple-500/15"
                    placeholder="000000"
                />
                {error && <p className="text-red-400 text-xs mt-2">{error}</p>}
            </div>

            <button
                type="submit"
                disabled={submitting || code.length !== 6}
                className="w-full py-3.5 rounded-lg font-semibold text-white bg-purple-600 hover:bg-purple-500 disabled:opacity-40 disabled:cursor-not-allowed transition-all duration-200 shadow-lg shadow-purple-600/15"
            >
                {submitting ? "Checking Code..." : "Continue to Face Capture"}
            </button>

            <div className="grid grid-cols-2 gap-3">
                <button
                    type="button"
                    onClick={onBack}
                    className="py-3 rounded-lg border border-white/[0.08] text-sm font-medium text-white/65 hover:bg-white/[0.04] transition-colors"
                >
                    Edit Details
                </button>
                <button
                    type="button"
                    onClick={handleResend}
                    disabled={resending}
                    className="py-3 rounded-lg border border-white/[0.08] text-sm font-medium text-white/65 hover:bg-white/[0.04] disabled:opacity-40 transition-colors"
                >
                    {resending ? "Sending..." : "Resend Code"}
                </button>
            </div>
        </form>
    );
}
