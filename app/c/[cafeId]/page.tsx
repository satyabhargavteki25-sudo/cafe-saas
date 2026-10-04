"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { doc, getDoc, addDoc, collection, serverTimestamp } from "firebase/firestore";

import { db } from "@/src/lib/firebase";

type Cafe = {
  name: string;
  whatsappNumber: string;
  googleReviewUrl: string;
};

export default function CustomerCafePage() {
  const params = useParams();
  const cafeId = params.cafeId as string;

  const [cafe, setCafe] = useState<Cafe | null>(null);
  const [rating, setRating] = useState(0);
  const [message, setMessage] = useState("");

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    async function loadCafe() {
      try {
        const cafeRef = doc(db, "cafes", cafeId);
        const cafeSnapshot = await getDoc(cafeRef);

        if (!cafeSnapshot.exists()) {
          setError("Cafe not found.");
          setLoading(false);
          return;
        }

        setCafe(cafeSnapshot.data() as Cafe);
      } catch (err) {
        console.error(err);
        setError("Failed to load cafe.");
      }

      setLoading(false);
    }

    loadCafe();
  }, [cafeId]);

  const submitFeedback = async () => {
    if (rating === 0) {
      setError("Please select a rating.");
      return;
    }

    if (message.trim().length < 3) {
      setError("Please enter some feedback.");
      return;
    }

    if (!cafe) {
      return;
    }

    setSubmitting(true);
    setError("");

    try {
      // Save feedback in Firebase
      await addDoc(collection(db, "feedback"), {
        cafeId,
        rating,
        message: message.trim(),
        createdAt: serverTimestamp(),
      });

      // Prepare WhatsApp message
      let whatsappNumber = cafe.whatsappNumber.replace(/\D/g, "");

      if (whatsappNumber.startsWith("0")) {
        whatsappNumber = whatsappNumber.substring(1);
      }

      if (whatsappNumber.length === 10) {
        whatsappNumber = "91" + whatsappNumber;
      }

      const whatsappMessage = `Hi ${cafe.name},

I visited your cafe and wanted to share some feedback.

Rating: ${rating}/5

Feedback:
${message.trim()}

Thank you.`;

      const whatsappUrl = `https://wa.me/${whatsappNumber}?text=${encodeURIComponent(
        whatsappMessage
      )}`;

      setSubmitted(true);

      // Open WhatsApp after saving feedback
      window.location.href = whatsappUrl;
    } catch (err) {
      console.error(err);
      setError("Failed to submit feedback. Please try again.");
    }

    setSubmitting(false);
  };

  if (loading) {
    return (
      <main className="min-h-screen bg-[#FFF8F0] flex items-center justify-center">
        <p className="text-[#6F4E37] text-lg">
          Loading cafe...
        </p>
      </main>
    );
  }

  if (error && !cafe) {
    return (
      <main className="min-h-screen bg-[#FFF8F0] flex items-center justify-center px-6">
        <div className="bg-white rounded-2xl shadow-sm border border-red-200 p-8 text-center max-w-md">
          <p className="text-3xl">☕</p>

          <h1 className="mt-3 text-2xl font-bold text-[#3E2723]">
            CafeFlow
          </h1>

          <p className="mt-3 text-red-600">
            {error}
          </p>
        </div>
      </main>
    );
  }

  if (!cafe) {
    return null;
  }

  return (
    <main className="min-h-screen bg-[#FFF8F0] px-5 py-10">
      <div className="max-w-md mx-auto">

        {/* Header */}
        <div className="text-center">
          <p className="text-5xl">☕</p>

          <h1 className="mt-3 text-3xl font-bold text-[#3E2723]">
            {cafe.name}
          </h1>

          <p className="mt-2 text-gray-600">
            We value your feedback
          </p>
        </div>

        {!submitted ? (
          <div className="mt-8 bg-white rounded-2xl border border-[#E8D5C4] shadow-sm p-6">

            {/* Rating */}
            <h2 className="text-lg font-semibold text-[#3E2723]">
              How was your experience?
            </h2>

            <div className="flex justify-center gap-2 mt-5">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  type="button"
                  onClick={() => setRating(star)}
                  className="text-4xl transition-transform hover:scale-110"
                >
                  {star <= rating ? "⭐" : "☆"}
                </button>
              ))}
            </div>

            <p className="text-center mt-2 text-sm text-gray-500">
              {rating === 0
                ? "Select a rating"
                : `${rating} out of 5`}
            </p>

            {/* Message */}
            <div className="mt-6">
              <label className="block text-sm font-medium text-[#3E2723]">
                Your feedback
              </label>

              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Tell us about your experience..."
                rows={5}
                className="mt-2 w-full rounded-xl border border-[#D9C2AE] p-3 outline-none focus:ring-2 focus:ring-[#C68B59]"
              />
            </div>

            {error && (
              <p className="mt-4 text-sm text-red-600">
                {error}
              </p>
            )}

            <button
              type="button"
              onClick={submitFeedback}
              disabled={submitting}
              className="mt-6 w-full rounded-xl bg-[#6F4E37] py-3 font-semibold text-white hover:bg-[#5D4037] disabled:opacity-50"
            >
              {submitting ? "Submitting..." : "Submit Feedback"}
            </button>
          </div>
        ) : (
          /* Success screen */
          <div className="mt-8 bg-white rounded-2xl border border-[#E8D5C4] shadow-sm p-7 text-center">

            <p className="text-5xl">🎉</p>

            <h2 className="mt-4 text-2xl font-bold text-[#3E2723]">
              Thank you!
            </h2>

            <p className="mt-3 text-gray-600">
              Your feedback has been received.
            </p>

            <div className="mt-6 border-t border-[#E8D5C4] pt-6">
              <p className="font-semibold text-[#3E2723]">
                Want to share your experience publicly?
              </p>

              <p className="mt-2 text-sm text-gray-500">
                If you would like, you can leave an honest review on Google.
              </p>

              <a
                href={cafe.googleReviewUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-5 block w-full rounded-xl bg-[#6F4E37] py-3 font-semibold text-white hover:bg-[#5D4037]"
              >
                ⭐ Leave an Honest Google Review
              </a>
            </div>
          </div>
        )}

        <p className="text-center text-xs text-gray-400 mt-8">
          Powered by CafeFlow
        </p>
      </div>
    </main>
  );
}