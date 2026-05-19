"use client";

import React, { useState, useCallback, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import RegistrationForm, { FormData } from "@/components/RegistrationForm";
import FaceCapture from "@/components/FaceCapture";
import SuccessPage from "@/components/SuccessPage";
import { supabase } from "@/lib/supabase";
import { generateQRCode } from "@/lib/qrcode";

type Step = "form" | "face" | "processing" | "success";

function sanitize(str: string): string {
  return str.replace(/[<>&"']/g, "").trim();
}

function RegistrationContent() {
  const searchParams = useSearchParams();
  const eventId = searchParams.get("eventId");

  const [eventDetails, setEventDetails] = useState<{ name: string; event_date: string } | null>(null);
  const [eventError, setEventError] = useState<string>("");

  const [step, setStep] = useState<Step>("form");
  const [formData, setFormData] = useState<FormData | null>(null);
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState<string>("");
  const [error, setError] = useState<string>("");
  const [processingMessage, setProcessingMessage] = useState<string>("");

  useEffect(() => {
    if (!eventId) {
      setEventError("No event ID provided in the URL.");
      return;
    }

    const fetchEvent = async () => {
      const { data, error } = await supabase
        .from("events")
        .select("name, event_date")
        .eq("id", eventId)
        .single();

      if (error || !data) {
        setEventError(`Supabase Error: ${error.message} (Code: ${error.code})`);
      } else if (!data) {
        setEventError(`No Data Error: Nahanap yung database, pero walang event na may ID na ${eventId}`);
      } else {
        setEventDetails(data);
      }
    };

    fetchEvent();
  }, [eventId]);

  const handleFormSubmit = useCallback((data: FormData) => {
    setFormData(data);
    setError("");
    setStep("face");
  }, []);

  const handleFaceCapture = useCallback(
    async (descriptor: number[]) => {
      if (!formData || !eventId) return;

      setStep("processing");
      setError("");

      try {
        // 1. Check duplicate email for THIS event
        setProcessingMessage("Checking email availability...");
        const { data: existing, error: selectError } = await supabase
          .from("attendees")
          .select("id")
          .eq("email", formData.email.toLowerCase().trim())
          .eq("event_id", eventId)
          .maybeSingle();

        if (selectError) {
          console.error("Supabase select error:", selectError);
          setError(
            `Database error: ${selectError.message}. Make sure the 'attendees' table exists in Supabase (run schema.sql).`
          );
          setStep("form");
          return;
        }

        if (existing) {
          setError(
            "This email is already registered for this event. Please use a different email address."
          );
          setStep("form");
          return;
        }

        // 2. Insert into Supabase
        setProcessingMessage("Saving registration data...");
        const { data: newAttendee, error: insertError } = await supabase
          .from("attendees")
          .insert({
            event_id: eventId,
            full_name: sanitize(formData.fullName),
            email: sanitize(formData.email).toLowerCase(),
            contact_number: sanitize(formData.contactNumber),
            company: sanitize(formData.company),
            role: 'Attendee',
            face_encoding: descriptor,
          })
          .select("id")
          .single();

        if (insertError || !newAttendee) {
          console.error("Supabase insert error:", insertError);
          if (insertError?.code === "23505") {
            setError(
              "This email is already registered. Please use a different email."
            );
          } else {
            setError(`Database error: ${insertError?.message || 'Unknown error'}`);
          }
          setStep("form");
          return;
        }

        // 3. Send Email
        setProcessingMessage("Sending confirmation email...");
        const emailResponse = await fetch('/api/send-email', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: formData.email,
            fullName: formData.fullName,
            eventName: eventDetails?.name,
            eventDate: eventDetails?.event_date,
            attendeeId: newAttendee.id
          })
        });

        if (!emailResponse.ok) {
          console.warn('Email failed to send, but registration was successful.');
        }

        // 4. Generate QR code for the success screen
        setProcessingMessage("Generating your unique QR code...");
        const qrDataUrl = await generateQRCode(newAttendee.id);

        // 5. Success!
        setQrCodeDataUrl(qrDataUrl);
        setStep("success");
      } catch (err) {
        console.error("Registration error:", err);
        const msg =
          err instanceof Error
            ? err.message
            : String(err);
        setError(`Error: ${msg}`);
        setStep("form");
      }
    },
    [formData, eventId, eventDetails]
  );

  const handleFaceCaptureError = useCallback((message: string) => {
    setError(`Camera error: ${message}`);
    setStep("form");
  }, []);

  const handleCancelFace = useCallback(() => {
    setStep("form");
  }, []);

  const handleRegisterAnother = useCallback(() => {
    setFormData(null);
    setQrCodeDataUrl("");
    setError("");
    setProcessingMessage("");
    setStep("form");
  }, []);

  // Step indicator
  const steps = [
    { key: "form", label: "Details", icon: "📝" },
    { key: "face", label: "Face Scan", icon: "📷" },
    { key: "success", label: "Complete", icon: "✅" },
  ];

  const currentStepIndex =
    step === "form"
      ? 0
      : step === "face" || step === "processing"
        ? 1
        : 2;

  if (eventError) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-950 via-purple-950/30 to-gray-950 flex items-center justify-center p-4 relative overflow-hidden">
        <div className="backdrop-blur-xl bg-white/[0.03] border border-white/[0.08] rounded-3xl p-6 sm:p-8 shadow-2xl text-center">
          <h2 className="text-2xl font-bold text-red-400 mb-2">Access Denied</h2>
          <p className="text-white/60">{eventError}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-950 via-purple-950/30 to-gray-950 flex items-center justify-center p-4 relative overflow-hidden">
      {/* Ambient glow effects */}
      <div className="absolute top-[-20%] left-[-10%] w-[40%] h-[40%] bg-purple-600/10 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-20%] right-[-10%] w-[40%] h-[40%] bg-pink-600/10 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[30%] h-[30%] bg-purple-500/5 rounded-full blur-[100px] pointer-events-none" />

      <div className="w-full max-w-md relative z-10">
        {/* Header */}
        <div className="flex items-center justify-center gap-4 mb-8">
          <img
            src="VENDY.png"
            alt="Vendy Logo"
            className="w-16 h-16 sm:w-20 sm:h-20 object-contain drop-shadow-[0_0_15px_rgba(168,85,247,0.4)]"
          />
          <div className="text-left">
            <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
              {eventDetails?.name || "Loading..."}
            </h1>
            <p className="text-white/40 text-xs sm:text-sm mt-1">
              {eventDetails?.event_date || "Please wait..."}
            </p>
          </div>
        </div>

        {/* Step progress */}
        <div className="flex items-center justify-center gap-2 mb-6">
          {steps.map((s, i) => (
            <React.Fragment key={s.key}>
              <div className="flex items-center gap-1.5">
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all duration-500 ${i < currentStepIndex
                    ? "bg-green-500/20 text-green-400 border border-green-500/30"
                    : i === currentStepIndex
                      ? "bg-purple-500/20 text-purple-300 border border-purple-500/40 shadow-lg shadow-purple-500/20"
                      : "bg-white/5 text-white/30 border border-white/10"
                    }`}
                >
                  {i < currentStepIndex ? "✓" : s.icon}
                </div>
                <span
                  className={`text-xs font-medium hidden sm:inline transition-colors duration-300 ${i === currentStepIndex
                    ? "text-purple-300"
                    : i < currentStepIndex
                      ? "text-green-400/60"
                      : "text-white/20"
                    }`}
                >
                  {s.label}
                </span>
              </div>
              {i < steps.length - 1 && (
                <div
                  className={`w-8 h-px transition-colors duration-500 ${i < currentStepIndex ? "bg-green-500/30" : "bg-white/10"
                    }`}
                />
              )}
            </React.Fragment>
          ))}
        </div>

        {/* Main card */}
        <div className="backdrop-blur-xl bg-white/[0.03] border border-white/[0.08] rounded-3xl p-6 sm:p-8 shadow-2xl shadow-black/20">
          {/* Error banner */}
          {error && step === "form" && (
            <div className="mb-5 p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-300 text-sm flex items-start gap-3 animate-fadeIn">
              <svg
                className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z"
                />
              </svg>
              <span>{error}</span>
            </div>
          )}

          {/* Step: Form */}
          {step === "form" && (
            <div className="animate-fadeIn">
              <RegistrationForm onSubmit={handleFormSubmit} />
            </div>
          )}

          {/* Step: Face Capture */}
          {step === "face" && (
            <div className="animate-fadeIn">
              <FaceCapture
                onCapture={handleFaceCapture}
                onError={handleFaceCaptureError}
                onCancel={handleCancelFace}
              />
            </div>
          )}

          {/* Step: Processing */}
          {step === "processing" && (
            <div className="py-12 text-center space-y-6 animate-fadeIn">
              <div className="flex justify-center">
                <div className="w-16 h-16 border-4 border-purple-500/20 border-t-purple-500 rounded-full animate-spin" />
              </div>
              <div>
                <p className="text-white font-medium">{processingMessage}</p>
                <p className="text-white/30 text-sm mt-1">
                  Please wait a moment...
                </p>
              </div>
            </div>
          )}

          {/* Step: Success */}
          {step === "success" && formData && (
            <SuccessPage
              name={formData.fullName}
              qrCodeDataUrl={qrCodeDataUrl}
              onRegisterAnother={handleRegisterAnother}
            />
          )}
        </div>

        {/* Footer */}
        <p className="text-center text-white/15 text-xs mt-6">
          Protected with secure facial authentication
        </p>
      </div>
    </div>
  );
}

export default function Home() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <div className="w-16 h-16 border-4 border-purple-500/20 border-t-purple-500 rounded-full animate-spin" />
      </div>
    }>
      <RegistrationContent />
    </Suspense>
  );
}
