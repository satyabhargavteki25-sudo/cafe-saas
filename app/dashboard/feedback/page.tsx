"use client";

import { useEffect, useState } from "react";
import { onAuthStateChanged, User } from "firebase/auth";
import {
  collection,
  getDocs,
  query,
  where,
} from "firebase/firestore";

import { auth, db } from "@/src/lib/firebase";

type Cafe = {
  id: string;
  name?: string;
};

type Feedback = {
  id: string;
  cafeId: string;
  rating: number;
  message: string;
  createdAt?: {
    seconds: number;
    nanoseconds: number;
  };
};

export default function FeedbackPage() {
  const [user, setUser] = useState<User | null>(null);
  const [cafe, setCafe] = useState<Cafe | null>(null);
  const [feedback, setFeedback] = useState<Feedback[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (!currentUser) {
        setError("You are not logged in.");
        setLoading(false);
        return;
      }

      setUser(currentUser);

      try {
        // Find the cafe belonging to this owner
        const cafeQuery = query(
          collection(db, "cafes"),
          where("ownerId", "==", currentUser.uid)
        );

        const cafeSnapshot = await getDocs(cafeQuery);

        if (cafeSnapshot.empty) {
          setError("No cafe is connected to this owner account.");
          setLoading(false);
          return;
        }

        const cafeDoc = cafeSnapshot.docs[0];

        const cafeData = cafeDoc.data();

        const currentCafe: Cafe = {
          id: cafeDoc.id,
          name: cafeData.name,
        };

        setCafe(currentCafe);

        // Find feedback belonging to this cafe
        const feedbackQuery = query(
          collection(db, "feedback"),
          where("cafeId", "==", currentCafe.id)
        );

        const feedbackSnapshot = await getDocs(feedbackQuery);

        const feedbackList: Feedback[] = feedbackSnapshot.docs.map(
          (doc) => ({
            id: doc.id,
            ...doc.data(),
          } as Feedback)
        );

        // Newest feedback first
        feedbackList.sort((a, b) => {
          const aTime = a.createdAt?.seconds || 0;
          const bTime = b.createdAt?.seconds || 0;

          return bTime - aTime;
        });

        setFeedback(feedbackList);
      } catch (err) {
        console.error("Feedback loading error:", err);
        setError("Failed to load feedback.");
      }

      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const totalFeedback = feedback.length;

  const averageRating =
    totalFeedback === 0
      ? 0
      : feedback.reduce((sum, item) => sum + item.rating, 0) /
        totalFeedback;

  const formattedAverage =
    averageRating === 0 ? "—" : averageRating.toFixed(1);

  const getDate = (createdAt?: {
    seconds: number;
    nanoseconds: number;
  }) => {
    if (!createdAt) {
      return "Date unavailable";
    }

    return new Date(createdAt.seconds * 1000).toLocaleString("en-IN", {
      dateStyle: "medium",
      timeStyle: "short",
    });
  };

  const getStars = (rating: number) => {
    return "⭐".repeat(rating);
  };

  if (loading) {
    return (
      <main className="min-h-screen bg-[#FFF8F0] flex items-center justify-center">
        <p className="text-[#6F4E37] text-lg">
          Loading feedback...
        </p>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#FFF8F0]">
      {/* Header */}
      <header className="bg-[#3E2723] text-white px-6 py-5">
        <div className="max-w-6xl mx-auto">
          <p className="text-2xl font-bold">
            ☕ CafeFlow
          </p>

          <p className="text-sm text-[#E8D5C4]">
            Customer feedback
          </p>
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-6 py-8">

        {/* Back */}
        <a
          href="/dashboard"
          className="text-[#6F4E37] font-medium hover:underline"
        >
          ← Dashboard
        </a>

        {/* Title */}
        <div className="mt-6">
          <h1 className="text-3xl font-bold text-[#3E2723]">
            Customer Feedback
          </h1>

          <p className="mt-2 text-gray-600">
            See what your customers are saying about your cafe.
          </p>
        </div>

        {/* Error */}
        {error && (
          <div className="mt-6 rounded-xl border border-red-200 bg-red-50 p-5">
            <p className="font-semibold text-red-700">
              {error}
            </p>

            {user && (
              <p className="mt-2 text-sm text-red-600">
                Logged-in email: {user.email}
              </p>
            )}
          </div>
        )}

        {cafe && (
          <>
            {/* Cafe name */}
            <div className="mt-8">
              <p className="text-sm text-gray-500">
                Cafe
              </p>

              <h2 className="text-2xl font-bold text-[#3E2723]">
                ☕ {cafe.name}
              </h2>
            </div>

            {/* Statistics */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mt-6">

              {/* Total */}
              <div className="bg-white border border-[#E8D5C4] rounded-2xl p-6 shadow-sm">
                <p className="text-gray-500 text-sm">
                  Total Feedback
                </p>

                <p className="text-4xl font-bold text-[#6F4E37] mt-2">
                  {totalFeedback}
                </p>
              </div>

              {/* Average */}
              <div className="bg-white border border-[#E8D5C4] rounded-2xl p-6 shadow-sm">
                <p className="text-gray-500 text-sm">
                  Average Rating
                </p>

                <p className="text-4xl font-bold text-[#6F4E37] mt-2">
                  ⭐ {formattedAverage}
                </p>
              </div>
            </div>

            {/* Feedback list */}
            <div className="mt-8">
              <h2 className="text-2xl font-bold text-[#3E2723]">
                Recent Feedback
              </h2>

              {feedback.length === 0 ? (
                <div className="mt-5 bg-white border border-[#E8D5C4] rounded-2xl p-8 text-center">
                  <p className="text-4xl">💬</p>

                  <p className="mt-3 text-lg font-semibold text-[#3E2723]">
                    No feedback yet
                  </p>

                  <p className="mt-1 text-gray-500">
                    Customer feedback will appear here.
                  </p>
                </div>
              ) : (
                <div className="mt-5 space-y-4">
                  {feedback.map((item) => (
                    <div
                      key={item.id}
                      className="bg-white border border-[#E8D5C4] rounded-2xl p-6 shadow-sm"
                    >
                      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2">
                        <p className="text-lg">
                          {getStars(item.rating)}
                        </p>

                        <p className="text-sm text-gray-500">
                          {getDate(item.createdAt)}
                        </p>
                      </div>

                      <div className="mt-4">
                        <p className="text-sm text-gray-500">
                          Rating
                        </p>

                        <p className="font-semibold text-[#6F4E37]">
                          {item.rating}/5
                        </p>
                      </div>

                      <div className="mt-4">
                        <p className="text-sm text-gray-500">
                          Customer message
                        </p>

                        <p className="mt-1 text-gray-800 leading-relaxed">
                          {item.message}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </main>
  );
}