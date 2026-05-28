import { NextResponse } from "next/server";
import nodemailer from "nodemailer";
import {
    confirmEmailChallenge,
    createEmailChallenge,
    getVerifiedEmail,
    isEmailFormatValid,
    normalizeEmail,
} from "@/lib/email-verification";
import { measureLatency, writeLatencyLog } from "@/lib/server-latency";

export const runtime = "nodejs";

type VerifyEmailBody = {
    action?: "request" | "confirm" | "validate";
    email?: string;
    fullName?: string;
    token?: string;
    code?: string;
};

function getTransporter() {
    if (!process.env.GMAIL_USER || !process.env.GMAIL_APP_PASSWORD) {
        return null;
    }

    return nodemailer.createTransport({
        service: "gmail",
        auth: {
            user: process.env.GMAIL_USER,
            pass: process.env.GMAIL_APP_PASSWORD,
        },
    });
}

async function requestCode(body: VerifyEmailBody) {
    const email = normalizeEmail(body.email || "");
    if (!isEmailFormatValid(email)) {
        return NextResponse.json(
            { error: "Enter a valid email address." },
            { status: 400 }
        );
    }

    const transporter = getTransporter();
    if (!transporter) {
        console.error("Email verification error: Gmail environment variables are missing.");
        return NextResponse.json(
            { error: "Email verification is not configured." },
            { status: 500 }
        );
    }

    const challenge = createEmailChallenge(email);
    await measureLatency("Send Email Verification OTP", async () => {
        await transporter.sendMail({
            from: `"Vendy Access Portal" <${process.env.GMAIL_USER}>`,
            to: email,
            subject: "Verify your Vendy registration email",
            html: `
                <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; color: #333;">
                    <h2 style="color: #6b21a8;">Verify your email</h2>
                    <p>Hi ${body.fullName || "Attendee"},</p>
                    <p>Enter this code to continue your Vendy registration:</p>
                    <p style="font-size: 32px; font-weight: bold; letter-spacing: 6px;">${challenge.code}</p>
                    <p>This code expires in 10 minutes. The QR code and face registration are created only after this step.</p>
                </div>
            `,
        });
    }, { email });

    return NextResponse.json({ token: challenge.token });
}

async function confirmCode(body: VerifyEmailBody) {
    const startedAt = performance.now();
    if (!body.token || !body.code) {
        return NextResponse.json(
            { error: "Verification token and code are required." },
            { status: 400 }
        );
    }

    const verificationToken = confirmEmailChallenge(
        body.token,
        body.code.trim()
    );

    if (!verificationToken) {
        await writeLatencyLog({
            process: "Accept Email Verification OTP",
            latencySec: (performance.now() - startedAt) / 1000,
            status: "failed",
            metadata: { result: "invalid_or_expired" },
        });
        return NextResponse.json(
            { error: "The verification code is invalid or expired." },
            { status: 400 }
        );
    }

    await writeLatencyLog({
        process: "Accept Email Verification OTP",
        latencySec: (performance.now() - startedAt) / 1000,
        status: "success",
    });
    return NextResponse.json({ verificationToken });
}

function validateVerification(body: VerifyEmailBody) {
    const verifiedEmail = body.token ? getVerifiedEmail(body.token) : null;
    const email = normalizeEmail(body.email || "");

    if (!verifiedEmail || verifiedEmail !== email) {
        return NextResponse.json(
            { error: "Email verification is invalid or expired." },
            { status: 400 }
        );
    }

    return NextResponse.json({ verified: true, email: verifiedEmail });
}

export async function POST(request: Request) {
    try {
        const body = (await request.json()) as VerifyEmailBody;

        if (body.action === "request") {
            return await requestCode(body);
        }

        if (body.action === "confirm") {
            return await confirmCode(body);
        }

        if (body.action === "validate") {
            return validateVerification(body);
        }

        return NextResponse.json(
            { error: "Unknown email verification action." },
            { status: 400 }
        );
    } catch (error) {
        console.error("Email verification error:", error);
        return NextResponse.json(
            { error: "Email verification failed." },
            { status: 500 }
        );
    }
}
