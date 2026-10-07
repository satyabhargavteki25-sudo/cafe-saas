
"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
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
  id: string;
  name: string;
  whatsappNumber: string;
  googleReviewUrl: string;
};

const CATEGORIES = [
  {
    id: "Food",
    label: "Food",
    emoji: "🍔",
  },
  {
    id: "Service",
    label: "Service",
    emoji: "👨‍🍳",
  },
  {
    id: "Ambience",
    label: "Ambience",
    emoji: "🪑",
  },
  {
    id: "Cleanliness",
    label: "Cleanliness",
    emoji: "🧹",
  },
  {
    id: "Pricing",
    label: "Pricing",
    emoji: "💰",
  },
];

function normalizeWhatsAppNumber(number: string) {
  let digits = number.replace(/\D/g, "");

  if (digits.startsWith("0")) {
    digits = digits.substring(1);
  }

  if (digits.length === 10) {
    digits = `91${digits}`;
  }

  return digits;
}

export default function CustomerPage() {
  const params = useParams();

  const cafeId = params.cafeId as string;

  const [cafe, setCafe] = useState<Cafe | null>(null);

  const [rating, setRating] = useState(0);

  const [categories, setCategories] = useState<string[]>([]);

  const [message, setMessage] = useState("");

  const [loading, setLoading] = useState(true);

  const [submitting, setSubmitting] = useState(false);

  const [redirecting, setRedirecting] = useState(false);

  const [error, setError] = useState("");

  useEffect(() => {
    async function loadCafe() {
      try {
        const cafeRef = doc(db, "cafes", cafeId);

        const cafeSnapshot = await getDoc(cafeRef);

        if (!cafeSnapshot.exists()) {
          setError("Cafe not found.");
          return;
        }

        const data = cafeSnapshot.data();

        setCafe({
          id: cafeSnapshot.id,
          name: data.name ?? "Cafe",
          whatsappNumber: data.whatsappNumber ?? "",
          googleReviewUrl: data.googleReviewUrl ?? "",
        });
      } catch (err) {
        console.error("Cafe loading error:", err);
        setError("Unable to load this cafe.");
      } finally {
        setLoading(false);
      }
    }

    if (cafeId) {
      loadCafe();
    }
  }, [cafeId]);

  function toggleCategory(category: string) {
    setCategories((current) => {
      if (current.includes(category)) {
        return current.filter((item) => item !== category);
      }

      return [...current, category];
    });
  }

  async function handleSubmit() {
    setError("");

    // ==========================================
    // VALIDATION
    // ==========================================

    if (rating === 0) {
      setError("Please select a rating.");
      return;
    }

    if (categories.length === 0) {
      setError("Please select at least one category.");
      return;
    }

    const trimmedMessage = message.trim();

    if (trimmedMessage.length < 3) {
      setError("Please enter at least a few words about your experience.");
      return;
    }

    if (trimmedMessage.length > 2000) {
      setError("Feedback must be less than 2000 characters.");
      return;
    }

    if (!cafe) {
      setError("Cafe information is unavailable.");
      return;
    }

    setSubmitting(true);

    try {
      // ==========================================
      // SAVE FEEDBACK FIRST
      // ==========================================

      await addDoc(collection(db, "feedback"), {
        cafeId: cafe.id,
        rating,
        categories,
        message: trimmedMessage,
        createdAt: serverTimestamp(),
      });

      // ==========================================
      // 1–3 STARS
      // AUTOMATIC WHATSAPP REDIRECT
      // ==========================================

      if (rating <= 3) {
        const whatsappNumber = normalizeWhatsAppNumber(
          cafe.whatsappNumber
        );

        if (!whatsappNumber) {
          setError(
            "Feedback submitted, but WhatsApp number is not configured."
          );
          setSubmitting(false);
          return;
        }

        const categoryText = categories.join(", ");

        const whatsappMessage = `Hi ${cafe.name},

I visited your cafe and wanted to share some feedback.

Rating: ${rating}/5

Category: ${categoryText}

Feedback:
${trimmedMessage}

Thank you.`;

        const whatsappUrl =
          `https://wa.me/${whatsappNumber}` +
          `?text=${encodeURIComponent(whatsappMessage)}`;

        window.location.href = whatsappUrl;

        return;
      }

      // ==========================================
      // 4–5 STARS
      // COPY FEEDBACK + GOOGLE REDIRECT
      // ==========================================

      if (rating >= 4) {
        if (!cafe.googleReviewUrl) {
          setError(
            "Feedback submitted, but Google Review link is not configured."
          );
          setSubmitting(false);
          return;
        }

        setRedirecting(true);

        // Create the text that the customer can use
        // as their Google review.
        const googleReviewText = `${trimmedMessage}`;

        // Try to copy the customer's own feedback.
        // If the browser/device does not allow clipboard
        // access, we simply continue to Google.
        try {
          if (navigator.clipboard) {
            await navigator.clipboard.writeText(
              googleReviewText
            );
          }
        } catch (clipboardError) {
          console.warn(
            "Clipboard copy was unavailable:",
            clipboardError
          );
        }

        // Automatically open Google Review.
        window.location.href = cafe.googleReviewUrl;

        return;
      }
    } catch (err) {
      console.error("Feedback submission error:", err);

      setError(
        "Unable to submit your feedback. Please try again."
      );

      setSubmitting(false);
    }
  }

  // ==========================================
  // LOADING
  // ==========================================

  if (loading) {
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

  // ==========================================
  // ERROR / CAFE NOT FOUND
  // ==========================================

  if (error && !cafe) {
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

          <p className="mt-3 text-sm leading-6 text-slate-500">
            This customer feedback page is unavailable.
          </p>

          <p className="mt-5 text-xs font-medium text-slate-400">
            Powered by CafeFlow
          </p>
        </div>
      </main>
    );
  }

  if (!cafe) {
    return null;
  }

  // ==========================================
  // REDIRECTING SCREEN
  // ==========================================

  if (redirecting) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-50 px-6">
        <div className="w-full max-w-md rounded-3xl border border-slate-200 bg-white p-8 text-center shadow-sm sm:p-10">
          <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-orange-50">
            <span className="text-4xl">⭐</span>
          </div>

          <h1 className="mt-6 text-2xl font-bold text-slate-950">
            Thank you!
          </h1>

          <p className="mt-3 text-sm leading-6 text-slate-600">
            Your feedback has been saved.
          </p>

          <p className="mt-2 text-sm leading-6 text-slate-500">
            Opening Google Review...
          </p>

          <div className="mx-auto mt-6 h-8 w-8 animate-spin rounded-full border-4 border-orange-100 border-t-orange-500" />

          <div className="mt-8 flex items-center justify-center gap-2">
            <Image
              src="/logo.jpeg"
              alt="CafeFlow"
              width={28}
              height={28}
              className="h-7 w-7 object-contain"
            />

            <p className="text-xs font-medium text-slate-400">
              Powered by CafeFlow
            </p>
          </div>
        </div>
      </main>
    );
  }

  // ==========================================
  // MAIN CUSTOMER PAGE
  // ==========================================

  return (
    <main className="min-h-screen bg-slate-50 px-5 py-8 sm:px-6 sm:py-12">
      <div className="mx-auto max-w-xl">
        {/* HEADER */}

        <div className="text-center">
          <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-3xl bg-orange-50 shadow-sm">
            <span className="text-4xl">☕</span>
          </div>

          <h1 className="mt-6 text-3xl font-bold tracking-tight text-slate-950 sm:text-4xl">
            {cafe.name}
          </h1>

          <p className="mt-3 text-slate-600">
            We&apos;d love to hear about your experience.
          </p>
        </div>

        {/* FORM CARD */}

        <div className="mt-8 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
          {/* RATING */}

          <div>
            <label className="text-sm font-bold text-slate-900">
              How was your experience?
            </label>

            <div className="mt-4 flex justify-center gap-2 sm:gap-3">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  type="button"
                  onClick={() => setRating(star)}
                  aria-label={`${star} star rating`}
                  className="rounded-xl p-1 text-4xl transition hover:scale-110 sm:text-5xl"
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

            <div className="mt-3 text-center text-sm font-medium text-slate-500">
              {rating === 0 &&
                "Tap a star to rate your experience."}

              {rating === 1 &&
                "We're sorry to hear that."}

              {rating === 2 &&
                "We'd like to do better."}

              {rating === 3 &&
                "Thank you for your feedback."}

              {rating === 4 &&
                "Glad you had a good experience!"}

              {rating === 5 &&
                "That's wonderful! ❤️"}
            </div>
          </div>

          {/* CATEGORIES */}

          <div className="mt-8">
            <label className="text-sm font-bold text-slate-900">
              What would you like to comment on?
            </label>

            <p className="mt-1 text-xs text-slate-500">
              Select one or more.
            </p>

            <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
              {CATEGORIES.map((category) => {
                const selected = categories.includes(
                  category.id
                );

                return (
                  <button
                    key={category.id}
                    type="button"
                    onClick={() =>
                      toggleCategory(category.id)
                    }
                    className={`rounded-2xl border px-3 py-4 text-sm font-semibold transition ${
                      selected
                        ? "border-orange-500 bg-orange-50 text-orange-700"
                        : "border-slate-200 bg-white text-slate-700 hover:border-orange-200 hover:bg-orange-50/50"
                    }`}
                  >
                    <div className="text-2xl">
                      {category.emoji}
                    </div>

                    <div className="mt-2">
                      {category.label}
                    </div>

                    {selected && (
                      <div className="mt-1 text-xs text-orange-500">
                        ✓ Selected
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* MESSAGE */}

          <div className="mt-8">
            <label
              htmlFor="feedback"
              className="text-sm font-bold text-slate-900"
            >
              Tell us more
            </label>

            <textarea
              id="feedback"
              value={message}
              onChange={(event) =>
                setMessage(event.target.value)
              }
              maxLength={2000}
              rows={6}
              placeholder="What did you like? What could we improve?"
              className="mt-3 w-full resize-none rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-orange-400 focus:bg-white focus:ring-4 focus:ring-orange-100"
            />

            <div className="mt-2 text-right text-xs text-slate-400">
              {message.length}/2000
            </div>
          </div>

          {/* ERROR */}

          {error && (
            <div className="mt-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-600">
              {error}
            </div>
          )}

          {/* SUBMIT */}

          <button
            type="button"
            onClick={handleSubmit}
            disabled={submitting}
            className="mt-6 w-full rounded-2xl bg-orange-500 px-5 py-4 font-bold text-white shadow-sm transition hover:bg-orange-600 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {submitting
              ? "Submitting..."
              : "Submit Feedback"}
          </button>

          <p className="mt-4 text-center text-xs leading-5 text-slate-400">
            Your feedback helps {cafe.name} improve.
          </p>
        </div>

        {/* BRANDING */}

        <div className="mt-8 flex items-center justify-center gap-2">
          <Image
            src="/logo.jpeg"
            alt="CafeFlow"
            width={28}
            height={28}
            className="h-7 w-7 object-contain"
          />

          <p className="text-xs font-medium text-slate-400">
            Powered by CafeFlow
          </p>
        </div>
      </div>
    </main>
  );
}
