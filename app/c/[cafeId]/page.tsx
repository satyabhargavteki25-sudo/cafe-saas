"use client";

import Image from "next/image";
import { FormEvent, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import {
  addDoc,
  collection,
  doc,
  getDoc,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "@/src/lib/firebase";

type Cafe = {
  name: string;
  whatsappNumber: string;
  googleReviewUrl: string;
};

export default function CustomerFeedbackPage() {
  const params = useParams();

  const cafeId = params.cafeId as string;

  const [cafe, setCafe] = useState<Cafe | null>(null);
  const [loadingCafe, setLoadingCafe] = useState(true);

  const [rating, setRating] = useState(0);
  const [message, setMessage] = useState("");

  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    async function loadCafe() {
      try {
        const cafeRef = doc(db, "cafes", cafeId);
        const cafeSnapshot = await getDoc(cafeRef);

        if (!cafeSnapshot.exists()) {
          setCafe(null);
          return;
        }

        const data = cafeSnapshot.data();

        setCafe({
          name: data.name ?? "Cafe",
          whatsappNumber: data.whatsappNumber ?? "",
          googleReviewUrl: data.googleReviewUrl ?? "",
        });
      } catch (err) {
        console.error(err);
        setCafe(null);
      } finally {
        setLoadingCafe(false);
      }
    }

    if (cafeId) {
      loadCafe();
    }
  }, [cafeId]);

  function normalizeWhatsAppNumber(number: string) {
    let cleaned = number.replace(/\D/g, "");

    if (cleaned.startsWith("0")) {
      cleaned = cleaned.substring(1);
    }

    if (cleaned.length === 10) {
      cleaned = `91${cleaned}`;
    }

    return cleaned;
  }

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();

    setError("");

    if (rating === 0) {
      setError("Please select a rating.");
      return;
    }

    if (message.trim().length < 3) {
      setError("Please enter at least a few words of feedback.");
      return;
    }

    if (message.trim().length > 2000) {
      setError("Feedback must be less than 2000 characters.");
      return;
    }

    if (!cafe) {
      setError("Cafe information could not be loaded.");
      return;
    }

    setSubmitting(true);

    try {
      await addDoc(collection(db, "feedback"), {
        cafeId,
        rating,
        message: message.trim(),
        createdAt: serverTimestamp(),
      });

      setSubmitted(true);

      const whatsappNumber = normalizeWhatsAppNumber(
        cafe.whatsappNumber
      );

      const whatsappMessage = `Hi ${cafe.name},

I visited your cafe and wanted to share some feedback.

Rating: ${rating}/5

Feedback:
${message.trim()}

Thank you.`;

      if (whatsappNumber.length >= 10) {
        const whatsappUrl =
          `https://wa.me/${whatsappNumber}` +
          `?text=${encodeURIComponent(whatsappMessage)}`;

        window.location.href = whatsappUrl;
      }
    } catch (err) {
      console.error(err);
      setError(
        "Something went wrong while submitting your feedback. Please try again."
      );
    } finally {
      setSubmitting(false);
    }
  }

  if (loadingCafe) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-50 px-6">
        <div className="text-center">
          <div className="mx-auto h-10 w-10 animate-spin rounded-full border-4 border-orange-100 border-t-orange-500" />

          <p className="mt-4 text-sm font-medium text-slate-600">
            Loading...
          </p>
        </div>
      </main>
    );
  }

  if (!cafe) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-50 px-6">
        <div className="w-full max-w-md rounded-3xl border border-slate-200 bg-white p-8 text-center shadow-sm">
          <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-2xl bg-orange-50">
            <Image
              src="/logo.jpeg"
              alt="CafeFlow"
              width={70}
              height={70}
              className="h-16 w-16 object-contain"
            />
          </div>

          <h1 className="mt-6 text-2xl font-bold text-slate-950">
            Cafe not found
          </h1>

          <p className="mt-2 text-sm leading-6 text-slate-500">
            This feedback page is no longer available.
          </p>
        </div>
      </main>
    );
  }

  if (submitted) {
    return (
      <main className="min-h-screen bg-slate-50 px-5 py-8 sm:px-6">
        <div className="mx-auto flex min-h-[calc(100vh-4rem)] max-w-lg items-center justify-center">
          <div className="w-full rounded-3xl border border-slate-200 bg-white p-8 text-center shadow-sm sm:p-10">
            {/* CafeFlow subtle branding */}
            <div className="mb-7 flex justify-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-orange-50">
                <Image
                  src="/logo.jpeg"
                  alt="CafeFlow"
                  width={58}
                  height={58}
                  className="h-14 w-14 object-contain"
                />
              </div>
            </div>

            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-green-50 text-3xl">
              ✓
            </div>

            <h1 className="mt-6 text-3xl font-bold tracking-tight text-slate-950">
              Thank you!
            </h1>

            <p className="mt-3 leading-7 text-slate-600">
              Your feedback has been received by{" "}
              <span className="font-semibold text-slate-900">
                {cafe.name}
              </span>
              .
            </p>

            {cafe.googleReviewUrl && (
              <div className="mt-8 rounded-2xl border border-slate-200 bg-slate-50 p-6">
                <h2 className="font-bold text-slate-900">
                  Want to share your experience publicly?
                </h2>

                <p className="mt-2 text-sm leading-6 text-slate-500">
                  If you would like, you can leave an honest review on Google.
                </p>

                <a
                  href={cafe.googleReviewUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-5 inline-flex w-full items-center justify-center rounded-xl bg-orange-500 px-5 py-3.5 font-semibold text-white transition hover:bg-orange-600"
                >
                  ⭐ Leave an Honest Google Review
                </a>
              </div>
            )}

            <div className="mt-8 border-t border-slate-100 pt-6">
              <p className="text-xs text-slate-400">
                Powered by
              </p>

              <div className="mt-2 flex items-center justify-center gap-2">
                <Image
                  src="/logo.jpeg"
                  alt="CafeFlow"
                  width={28}
                  height={28}
                  className="h-7 w-7 object-contain"
                />

                <span className="text-sm font-bold">
                  <span className="text-slate-700">Cafe</span>
                  <span className="text-orange-500">Flow</span>
                </span>
              </div>
            </div>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-50 px-5 py-8 sm:px-6">
      <div className="mx-auto flex min-h-[calc(100vh-4rem)] max-w-lg items-center justify-center">
        <div className="w-full">
          {/* CUSTOMER CARD */}
          <div className="rounded-3xl border border-slate-200 bg-white p-7 shadow-sm sm:p-9">
            {/* CAFE BRANDING */}
            <div className="text-center">
              <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-2xl bg-orange-50">
                <span className="text-3xl">☕</span>
              </div>

              <h1 className="mt-6 text-3xl font-bold tracking-tight text-slate-950">
                {cafe.name}
              </h1>

              <p className="mt-2 text-sm leading-6 text-slate-500">
                We&apos;d love to hear about your experience.
              </p>
            </div>

            {/* RATING */}
            <form
              onSubmit={handleSubmit}
              className="mt-9"
            >
              <div className="text-center">
                <p className="text-sm font-semibold text-slate-700">
                  How was your experience?
                </p>

                <div className="mt-4 flex justify-center gap-2">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      type="button"
                      onClick={() => setRating(star)}
                      aria-label={`${star} star rating`}
                      className="rounded-lg p-1 text-4xl transition hover:scale-110 focus:outline-none"
                    >
                      <span
                        className={
                          star <= rating
                            ? "text-orange-400"
                            : "text-slate-200"
                        }
                      >
                        ★
                      </span>
                    </button>
                  ))}
                </div>

                <p className="mt-2 min-h-5 text-sm font-medium text-orange-500">
                  {rating === 1 && "We&apos;re sorry to hear that."}
                  {rating === 2 && "We can do better."}
                  {rating === 3 && "Thanks for your feedback."}
                  {rating === 4 && "Glad you enjoyed it!"}
                  {rating === 5 && "That&apos;s wonderful! ❤️"}
                </p>
              </div>

              {/* MESSAGE */}
              <div className="mt-7">
                <label
                  htmlFor="message"
                  className="mb-2 block text-sm font-semibold text-slate-700"
                >
                  Tell us more
                </label>

                <textarea
                  id="message"
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  rows={6}
                  maxLength={2000}
                  placeholder="What did you like? What could we improve?"
                  className="w-full resize-none rounded-2xl border border-slate-300 bg-white px-4 py-3.5 text-sm leading-6 text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-orange-500 focus:ring-2 focus:ring-orange-100"
                />

                <div className="mt-2 flex justify-end">
                  <span className="text-xs text-slate-400">
                    {message.length}/2000
                  </span>
                </div>
              </div>

              {/* ERROR */}
              {error && (
                <div className="mt-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm leading-5 text-red-600">
                  {error}
                </div>
              )}

              {/* SUBMIT */}
              <button
                type="submit"
                disabled={submitting}
                className="mt-6 w-full rounded-xl bg-orange-500 px-5 py-3.5 font-semibold text-white shadow-sm transition hover:bg-orange-600 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {submitting
                  ? "Submitting..."
                  : "Submit Feedback"}
              </button>

              <p className="mt-4 text-center text-xs leading-5 text-slate-400">
                Your feedback helps {cafe.name} improve.
              </p>
            </form>
          </div>

          {/* SUBTLE CAFEFLOW BRANDING */}
          <div className="mt-6 flex items-center justify-center gap-2">
            <Image
              src="/logo.jpeg"
              alt="CafeFlow"
              width={24}
              height={24}
              className="h-6 w-6 object-contain"
            />

            <span className="text-xs font-medium text-slate-400">
              Powered by{" "}
              <span className="font-semibold text-slate-500">
                CafeFlow
              </span>
            </span>
          </div>
        </div>
      </div>
    </main>
  );
}