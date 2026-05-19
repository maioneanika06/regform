"use client";

import React, { useState } from "react";

export interface FormData {
    fullName: string;
    email: string;
    contactNumber: string;
    company: string;
    consent: boolean;
}

interface RegistrationFormProps {
    onSubmit: (data: FormData) => void;
}

export default function RegistrationForm({ onSubmit }: RegistrationFormProps) {
    const [form, setForm] = useState<FormData>({
        fullName: "",
        email: "",
        contactNumber: "",
        company: "",
        consent: false,
    });

    const [errors, setErrors] = useState<Partial<Record<keyof FormData, string>>>(
        {}
    );

    function validate(): boolean {
        const errs: Partial<Record<keyof FormData, string>> = {};

        if (!form.fullName.trim()) errs.fullName = "Full name is required.";
        if (!form.email.trim()) {
            errs.email = "Email is required.";
        } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
            errs.email = "Please enter a valid email address.";
        }
        if (!form.contactNumber.trim())
            errs.contactNumber = "Contact number is required.";
        if (!form.company.trim())
            errs.company = "Company / Organization is required.";
        if (!form.consent)
            errs.consent = "You must consent to biometric data collection.";

        setErrors(errs);
        return Object.keys(errs).length === 0;
    }

    function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
        const { name, value, type, checked } = e.target;
        setForm((prev) => ({
            ...prev,
            [name]: type === "checkbox" ? checked : value,
        }));
        // Clear error on change
        if (errors[name as keyof FormData]) {
            setErrors((prev) => ({ ...prev, [name]: undefined }));
        }
    }

    function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        if (validate()) {
            onSubmit(form);
        }
    }

    const inputClasses =
        "w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500/50 transition-all duration-300";
    const labelClasses = "block text-sm font-medium text-white/70 mb-1.5";
    const errorClasses = "text-red-400 text-xs mt-1";

    return (
        <form onSubmit={handleSubmit} className="space-y-5" noValidate>
            {/* Full Name */}
            <div>
                <label htmlFor="fullName" className={labelClasses}>
                    Full Name
                </label>
                <input
                    id="fullName"
                    name="fullName"
                    type="text"
                    placeholder="Juan Dela Cruz"
                    value={form.fullName}
                    onChange={handleChange}
                    className={inputClasses}
                />
                {errors.fullName && <p className={errorClasses}>{errors.fullName}</p>}
            </div>

            {/* Email */}
            <div>
                <label htmlFor="email" className={labelClasses}>
                    Email Address
                </label>
                <input
                    id="email"
                    name="email"
                    type="email"
                    placeholder="juan@example.com"
                    value={form.email}
                    onChange={handleChange}
                    className={inputClasses}
                />
                {errors.email && <p className={errorClasses}>{errors.email}</p>}
            </div>

            {/* Contact Number */}
            <div>
                <label htmlFor="contactNumber" className={labelClasses}>
                    Contact Number
                </label>
                <input
                    id="contactNumber"
                    name="contactNumber"
                    type="tel"
                    placeholder="+63 912 345 6789"
                    value={form.contactNumber}
                    onChange={handleChange}
                    className={inputClasses}
                />
                {errors.contactNumber && (
                    <p className={errorClasses}>{errors.contactNumber}</p>
                )}
            </div>

            {/* Company */}
            <div>
                <label htmlFor="company" className={labelClasses}>
                    Company / Organization
                </label>
                <input
                    id="company"
                    name="company"
                    type="text"
                    placeholder="Acme Corp"
                    value={form.company}
                    onChange={handleChange}
                    className={inputClasses}
                />
                {errors.company && <p className={errorClasses}>{errors.company}</p>}
            </div>

            {/* Consent */}
            <div className="flex items-start gap-3 p-4 rounded-xl bg-white/5 border border-white/10">
                <input
                    id="consent"
                    name="consent"
                    type="checkbox"
                    checked={form.consent}
                    onChange={handleChange}
                    className="mt-0.5 h-5 w-5 rounded border-white/20 bg-white/10 text-purple-500 focus:ring-purple-500/50 cursor-pointer accent-purple-500"
                />
                <label htmlFor="consent" className="text-sm text-white/60 leading-snug cursor-pointer">
                    I consent to the collection and processing
                    of my facial data for event registration and vending machine access purposes.
                </label>
            </div>
            {errors.consent && <p className={errorClasses}>{errors.consent}</p>}

            {/* Submit */}
            <button
                type="submit"
                className="w-full py-3.5 rounded-xl font-semibold text-white bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 focus:outline-none focus:ring-2 focus:ring-purple-500/50 transition-all duration-300 shadow-lg shadow-purple-500/25 hover:shadow-purple-500/40 hover:scale-[1.02] active:scale-[0.98]"
            >
                Continue to Face Capture →
            </button>
        </form>
    );
}
