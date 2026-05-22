import { createHmac, randomBytes, timingSafeEqual } from "crypto";

const CHALLENGE_TTL_MS = 10 * 60 * 1000;
const VERIFIED_TTL_MS = 30 * 60 * 1000;

type ChallengePayload = {
    type: "email-challenge";
    email: string;
    salt: string;
    codeDigest: string;
    expiresAt: number;
};

type VerifiedPayload = {
    type: "email-verified";
    email: string;
    expiresAt: number;
};

function getSecret() {
    const secret =
        process.env.EMAIL_VERIFICATION_SECRET ||
        process.env.GMAIL_APP_PASSWORD;

    if (!secret) {
        throw new Error(
            "EMAIL_VERIFICATION_SECRET or GMAIL_APP_PASSWORD is required."
        );
    }

    return secret;
}

function encode(value: unknown) {
    return Buffer.from(JSON.stringify(value)).toString("base64url");
}

function decode<T>(value: string): T {
    return JSON.parse(Buffer.from(value, "base64url").toString("utf8")) as T;
}

function sign(value: string) {
    return createHmac("sha256", getSecret()).update(value).digest("base64url");
}

function constantTimeEqual(left: string, right: string) {
    const leftBuffer = Buffer.from(left);
    const rightBuffer = Buffer.from(right);

    return (
        leftBuffer.length === rightBuffer.length &&
        timingSafeEqual(leftBuffer, rightBuffer)
    );
}

function toToken(payload: ChallengePayload | VerifiedPayload) {
    const encodedPayload = encode(payload);
    return `${encodedPayload}.${sign(encodedPayload)}`;
}

function fromToken<T extends ChallengePayload | VerifiedPayload>(
    token: string
) {
    const [encodedPayload, signature, ...extra] = token.split(".");
    if (!encodedPayload || !signature || extra.length > 0) return null;
    if (!constantTimeEqual(signature, sign(encodedPayload))) return null;

    try {
        return decode<T>(encodedPayload);
    } catch {
        return null;
    }
}

function getCodeDigest(email: string, salt: string, code: string) {
    return createHmac("sha256", getSecret())
        .update(`${email}:${salt}:${code}`)
        .digest("base64url");
}

export function normalizeEmail(email: string) {
    return email.trim().toLowerCase();
}

export function isEmailFormatValid(email: string) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export function createEmailChallenge(email: string) {
    const code = randomBytes(4).readUInt32BE(0).toString().slice(-6).padStart(6, "0");
    const salt = randomBytes(16).toString("base64url");

    return {
        code,
        token: toToken({
            type: "email-challenge",
            email,
            salt,
            codeDigest: getCodeDigest(email, salt, code),
            expiresAt: Date.now() + CHALLENGE_TTL_MS,
        }),
    };
}

export function confirmEmailChallenge(token: string, code: string) {
    const challenge = fromToken<ChallengePayload>(token);
    if (
        !challenge ||
        challenge.type !== "email-challenge" ||
        challenge.expiresAt < Date.now() ||
        !/^\d{6}$/.test(code)
    ) {
        return null;
    }

    const submittedDigest = getCodeDigest(
        challenge.email,
        challenge.salt,
        code
    );

    if (!constantTimeEqual(challenge.codeDigest, submittedDigest)) {
        return null;
    }

    return toToken({
        type: "email-verified",
        email: challenge.email,
        expiresAt: Date.now() + VERIFIED_TTL_MS,
    });
}

export function getVerifiedEmail(token: string) {
    const verification = fromToken<VerifiedPayload>(token);
    if (
        !verification ||
        verification.type !== "email-verified" ||
        verification.expiresAt < Date.now()
    ) {
        return null;
    }

    return verification.email;
}
