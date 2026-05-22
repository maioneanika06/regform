"use client";

import React from "react";
import Image from "next/image";

interface SuccessPageProps {
    name: string;
    qrCodeDataUrl: string;
    emailWarning?: string;
    onRegisterAnother: () => void;
}

export default function SuccessPage({
    name,
    qrCodeDataUrl,
    emailWarning,
    onRegisterAnother,
}: SuccessPageProps) {
    return (
        <div className="text-center space-y-6 animate-fadeIn">
            {/* Success icon */}
            <div className="flex justify-center">
                <div className="w-16 h-16 rounded-xl bg-green-500/10 border border-green-500/25 flex items-center justify-center">
                    <svg
                        className="w-8 h-8 text-green-400"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        strokeWidth={2.5}
                    >
                        <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="M5 13l4 4L19 7"
                        />
                    </svg>
                </div>
            </div>

            {/* Heading */}
            <div>
                <h2 className="text-2xl font-bold text-white mb-1">
                    Registration Successful!
                </h2>
                <p className="text-white/50 text-sm">
                    Welcome,{" "}
                    <span className="text-purple-300 font-medium">{name}</span>
                </p>
            </div>

            {/* QR Code */}
            <div className="flex justify-center">
                <div className="p-4 bg-white rounded-xl shadow-2xl shadow-black/20">
                    <Image
                        src={qrCodeDataUrl}
                        alt="Your unique QR code"
                        width={250}
                        height={250}
                        className="rounded-lg"
                    />
                </div>
            </div>

            <p className="text-white/40 text-xs max-w-xs mx-auto">
                Present this QR code to access the vending machine.
            </p>

            {emailWarning && (
                <div className="rounded-lg border border-amber-500/20 bg-amber-500/10 px-4 py-3 text-left text-sm text-amber-100/80">
                    {emailWarning}
                </div>
            )}

            {/* Register another */}
            <button
                type="button"
                onClick={onRegisterAnother}
                className="w-full py-3.5 rounded-lg font-semibold text-white bg-purple-600 hover:bg-purple-500 transition-all duration-200 shadow-lg shadow-purple-600/15"
            >
                Register Another Attendee
            </button>
        </div>
    );
}
