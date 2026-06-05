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
        "w-full px-4 py-3 rounded-lg bg-white border border-purple-800/35 text-slate-900 text-sm placeholder:text-slate-400 focus:outline-none focus:border-purple-800/60 focus:ring-1 focus:ring-purple-800/20 transition-all duration-200";
    const labelClasses = "block text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-600 mb-2";
    const errorClasses = "text-red-700 text-xs mt-1";

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
                    placeholder="+63 9** *** ***"
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
                    placeholder="Adamson University"
                    value={form.company}
                    onChange={handleChange}
                    className={inputClasses}
                />
                {errors.company && <p className={errorClasses}>{errors.company}</p>}
            </div>

            {/* Consent */}
            <div className="flex items-start gap-3 p-4 rounded-lg bg-[#faf8fd] border border-purple-800/25">
                <input
                    id="consent"
                    name="consent"
                    type="checkbox"
                    checked={form.consent}
                    onChange={handleChange}
                    className="mt-0.5 h-5 w-5 rounded border-purple-800/35 bg-white text-purple-700 focus:ring-purple-800/30 cursor-pointer accent-purple-700"
                />
                <label htmlFor="consent" className="text-sm text-slate-600 leading-snug cursor-pointer">
                    I consent to the collection and processing
                    of my facial data for event registration and vending machine access purposes.
                </label>
            </div>
            {errors.consent && <p className={errorClasses}>{errors.consent}</p>}

            {/* Submit */}
            <button
                type="submit"
                className="w-full py-3.5 rounded-lg font-semibold text-white bg-purple-700 hover:bg-purple-800 focus:outline-none focus:ring-2 focus:ring-purple-800/30 transition-all duration-200"
            >
                Verify Email to Continue
            </button>
        </form>
    );
}
