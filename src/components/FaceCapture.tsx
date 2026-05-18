"use client";

import React, { useRef, useEffect, useState, useCallback } from "react";
import { loadModels, detectFace, faceapi } from "@/lib/faceapi";

interface FaceCaptureProps {
    onCapture: (descriptor: number[]) => void;
    onError: (message: string) => void;
    onCancel: () => void;
}

export default function FaceCapture({
    onCapture,
    onError,
    onCancel,
}: FaceCaptureProps) {
    const videoRef = useRef<HTMLVideoElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const streamRef = useRef<MediaStream | null>(null);
    const animFrameRef = useRef<number | null>(null);

    const [status, setStatus] = useState<
        "loading" | "ready" | "detecting" | "captured"
    >("loading");
    const [message, setMessage] = useState("Loading face detection models...");
    const [faceDetected, setFaceDetected] = useState(false);

    // Cleanup camera on unmount
    useEffect(() => {
        return () => {
            if (streamRef.current) {
                streamRef.current.getTracks().forEach((track) => track.stop());
            }
            if (animFrameRef.current) {
                cancelAnimationFrame(animFrameRef.current);
            }
        };
    }, []);

    // Initialize models + camera
    useEffect(() => {
        let cancelled = false;

        async function init() {
            try {
                // Load models
                setMessage("Loading face detection models...");
                await loadModels();

                if (cancelled) return;

                // Start camera
                setMessage("Activating camera...");
                const stream = await navigator.mediaDevices.getUserMedia({
                    video: { facingMode: "user", width: 640, height: 480 },
                });

                if (cancelled) {
                    stream.getTracks().forEach((track) => track.stop());
                    return;
                }

                streamRef.current = stream;

                if (videoRef.current) {
                    videoRef.current.srcObject = stream;
                    await videoRef.current.play();
                }

                setStatus("ready");
                setMessage(
                    "Position your face in the frame and click Capture."
                );
            } catch (err) {
                if (!cancelled) {
                    const errorMsg =
                        err instanceof Error ? err.message : "Failed to initialize camera";
                    onError(errorMsg);
                }
            }
        }

        init();

        return () => {
            cancelled = true;
        };
    }, [onError]);

    // Draw face detection overlay once ready
    useEffect(() => {
        if (status !== "ready" && status !== "detecting") return;

        const video = videoRef.current;
        const canvas = canvasRef.current;
        if (!video || !canvas) return;

        const drawLoop = async () => {
            if (!video || !canvas) return;

            canvas.width = video.videoWidth;
            canvas.height = video.videoHeight;
            const ctx = canvas.getContext("2d");
            if (!ctx) return;

            ctx.clearRect(0, 0, canvas.width, canvas.height);

            const detection = await faceapi
                .detectSingleFace(video, new faceapi.TinyFaceDetectorOptions())
                .withFaceLandmarks();

            if (detection) {
                setFaceDetected(true);
                const box = detection.detection.box;

                // Draw glowing border around face
                ctx.strokeStyle = "#a855f7";
                ctx.lineWidth = 3;
                ctx.shadowColor = "#a855f7";
                ctx.shadowBlur = 15;
                ctx.beginPath();
                ctx.roundRect(box.x, box.y, box.width, box.height, 12);
                ctx.stroke();

                // Corner accents
                const cornerLength = 20;
                ctx.lineWidth = 4;
                ctx.shadowBlur = 20;

                // Top-left
                ctx.beginPath();
                ctx.moveTo(box.x, box.y + cornerLength);
                ctx.lineTo(box.x, box.y);
                ctx.lineTo(box.x + cornerLength, box.y);
                ctx.stroke();

                // Top-right
                ctx.beginPath();
                ctx.moveTo(box.x + box.width - cornerLength, box.y);
                ctx.lineTo(box.x + box.width, box.y);
                ctx.lineTo(box.x + box.width, box.y + cornerLength);
                ctx.stroke();

                // Bottom-left
                ctx.beginPath();
                ctx.moveTo(box.x, box.y + box.height - cornerLength);
                ctx.lineTo(box.x, box.y + box.height);
                ctx.lineTo(box.x + cornerLength, box.y + box.height);
                ctx.stroke();

                // Bottom-right
                ctx.beginPath();
                ctx.moveTo(box.x + box.width - cornerLength, box.y + box.height);
                ctx.lineTo(box.x + box.width, box.y + box.height);
                ctx.lineTo(box.x + box.width, box.y + box.height - cornerLength);
                ctx.stroke();
            } else {
                setFaceDetected(false);
            }

            animFrameRef.current = requestAnimationFrame(drawLoop);
        };

        drawLoop();

        return () => {
            if (animFrameRef.current) {
                cancelAnimationFrame(animFrameRef.current);
            }
        };
    }, [status]);

    const handleCapture = useCallback(async () => {
        if (!videoRef.current) return;

        setStatus("detecting");
        setMessage("Extracting facial features...");

        try {
            const descriptor = await detectFace(videoRef.current);

            if (!descriptor) {
                setStatus("ready");
                setMessage(
                    "No face detected. Please position your face clearly in the frame and try again."
                );
                return;
            }

            setStatus("captured");
            setMessage("Face captured successfully!");

            // Stop camera
            if (streamRef.current) {
                streamRef.current.getTracks().forEach((track) => track.stop());
            }
            if (animFrameRef.current) {
                cancelAnimationFrame(animFrameRef.current);
            }

            // Brief delay so user sees the success message
            setTimeout(() => {
                onCapture(descriptor);
            }, 800);
        } catch (err) {
            setStatus("ready");
            setMessage("Face detection failed. Please try again.");
        }
    }, [onCapture]);

    return (
        <div className="space-y-5">
            {/* Status message */}
            <div
                className={`text-center text-sm font-medium px-4 py-3 rounded-xl transition-all duration-300 ${status === "captured"
                        ? "bg-green-500/10 text-green-400 border border-green-500/20"
                        : faceDetected
                            ? "bg-purple-500/10 text-purple-300 border border-purple-500/20"
                            : "bg-white/5 text-white/60 border border-white/10"
                    }`}
            >
                {status === "loading" && (
                    <span className="inline-flex items-center gap-2">
                        <svg
                            className="animate-spin h-4 w-4"
                            viewBox="0 0 24 24"
                            fill="none"
                        >
                            <circle
                                className="opacity-25"
                                cx="12"
                                cy="12"
                                r="10"
                                stroke="currentColor"
                                strokeWidth="4"
                            />
                            <path
                                className="opacity-75"
                                fill="currentColor"
                                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                            />
                        </svg>
                        {message}
                    </span>
                )}
                {status !== "loading" && message}
            </div>

            {/* Video feed */}
            <div className="relative w-full aspect-[4/3] rounded-2xl overflow-hidden bg-black/50 border border-white/10">
                <video
                    ref={videoRef}
                    className="w-full h-full object-cover mirror"
                    style={{ transform: "scaleX(-1)" }}
                    playsInline
                    muted
                />
                <canvas
                    ref={canvasRef}
                    className="absolute inset-0 w-full h-full pointer-events-none"
                    style={{ transform: "scaleX(-1)" }}
                />

                {/* Scanning overlay when loading */}
                {status === "loading" && (
                    <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                        <div className="w-16 h-16 border-4 border-purple-500/30 border-t-purple-500 rounded-full animate-spin" />
                    </div>
                )}

                {/* Captured flash */}
                {status === "captured" && (
                    <div className="absolute inset-0 bg-green-500/10 flex items-center justify-center animate-pulse">
                        <svg
                            className="w-20 h-20 text-green-400"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                            strokeWidth={2}
                        >
                            <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                            />
                        </svg>
                    </div>
                )}
            </div>

            {/* Action buttons */}
            <div className="flex gap-3">
                <button
                    type="button"
                    onClick={onCancel}
                    disabled={status === "detecting" || status === "captured"}
                    className="flex-1 py-3 rounded-xl font-medium text-white/70 bg-white/5 border border-white/10 hover:bg-white/10 transition-all duration-300 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                    ← Back
                </button>
                <button
                    type="button"
                    onClick={handleCapture}
                    disabled={
                        status === "loading" ||
                        status === "detecting" ||
                        status === "captured" ||
                        !faceDetected
                    }
                    className="flex-1 py-3 rounded-xl font-semibold text-white bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 transition-all duration-300 shadow-lg shadow-purple-500/25 disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:from-purple-600 disabled:hover:to-pink-600"
                >
                    {status === "detecting" ? (
                        <span className="inline-flex items-center gap-2">
                            <svg
                                className="animate-spin h-4 w-4"
                                viewBox="0 0 24 24"
                                fill="none"
                            >
                                <circle
                                    className="opacity-25"
                                    cx="12"
                                    cy="12"
                                    r="10"
                                    stroke="currentColor"
                                    strokeWidth="4"
                                />
                                <path
                                    className="opacity-75"
                                    fill="currentColor"
                                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                                />
                            </svg>
                            Processing…
                        </span>
                    ) : (
                        "📸 Capture Face"
                    )}
                </button>
            </div>
        </div>
    );
}
