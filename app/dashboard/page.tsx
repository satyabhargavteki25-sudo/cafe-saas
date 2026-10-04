"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { onAuthStateChanged, signOut, User } from "firebase/auth";
import {
  collection,
  getDocs,
  query,
  where,
} from "firebase/firestore";

import { auth, db } from "../../src/lib/firebase";

type Cafe = {
  id: string;
  name: string;
  whatsappNumber?: string;
  googleReviewUrl?: string;
};

type Feedback = {
  id: string;
  cafeId: string;
  rating: number;
  message: string;
  createdAt?: {
    seconds?: number;
  };
};

export default function DashboardPage() {
  const [user, setUser] = useState<User | null>(null);
  const [cafe, setCafe] = useState<Cafe | null>(null);
  const [feedback, setFeedback] = useState<Feedback[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (!currentUser) {
        window.location.href = "/login";
        return;
      }

      setUser(currentUser);

      try {
        const cafesQuery = query(
          collection(db, "cafes"),
          where("ownerId", "==", currentUser.uid)
        );

        const cafeSnapshot = await getDocs(cafesQuery);

        if (!cafeSnapshot.empty) {
          const cafeDoc = cafeSnapshot.docs[0];

          const cafeData: Cafe = {
            id: cafeDoc.id,
            ...(cafeDoc.data() as Omit<Cafe, "id">),
          };

          setCafe(cafeData);

          const feedbackQuery = query(
            collection(db, "feedback"),
            where("cafeId", "==", cafeDoc.id)
          );

          const feedbackSnapshot = await getDocs(feedbackQuery);

          const feedbackData: Feedback[] = feedbackSnapshot.docs.map(
            (doc) => ({
              id: doc.id,
              ...(doc.data() as Omit<Feedback, "id">),
            })
          );

          feedbackData.sort((a, b) => {
            const aTime = a.createdAt?.seconds ?? 0;
            const bTime = b.createdAt?.seconds ?? 0;
            return bTime - aTime;
          });

          setFeedback(feedbackData);
        }
      } catch (error) {
        console.error("Dashboard loading error:", error);
      }

      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const handleLogout = async () => {
    await signOut(auth);
    window.location.href = "/login";
  };

  const totalFeedback = feedback.length;

  const averageRating =
    totalFeedback > 0
      ? (
          feedback.reduce((sum, item) => sum + Number(item.rating), 0) /
          totalFeedback
        ).toFixed(1)
      : "0.0";

  const ratingCounts = {
    5: feedback.filter((item) => Number(item.rating) === 5).length,
    4: feedback.filter((item) => Number(item.rating) === 4).length,
    3: feedback.filter((item) => Number(item.rating) === 3).length,
    2: feedback.filter((item) => Number(item.rating) === 2).length,
    1: feedback.filter((item) => Number(item.rating) === 1).length,
  };

  const getPercentage = (count: number) => {
    if (totalFeedback === 0) return 0;
    return Math.round((count / totalFeedback) * 100);
  };

  const formatDate = (seconds?: number) => {
    if (!seconds) return "Recently";

    return new Date(seconds * 1000).toLocaleDateString("en-IN", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#faf7f2] flex items-center justify-center">
        <div className="text-center">
          <div className="text-5xl mb-4">☕</div>
          <p className="text-[#6b5143] font-medium">
            Loading your dashboard...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#faf7f2] text-[#2d211b]">
      {/* NAVBAR */}
      <header className="sticky top-0 z-50 border-b border-[#eadfd5] bg-white/95 backdrop-blur">
        <div className="max-w-7xl mx-auto px-5 sm:px-8">
          <div className="h-20 flex items-center justify-between">
            <Link href="/dashboard" className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-xl bg-[#4b2e20] flex items-center justify-center text-2xl shadow-sm">
                ☕
              </div>

              <div>
                <div className="text-xl font-bold text-[#3b2418]">
                  CafeFlow
                </div>

                <div className="text-xs text-[#8b7568]">
                  Feedback management
                </div>
              </div>
            </Link>

            <div className="flex items-center gap-4">
              <div className="hidden sm:block text-right">
                <div className="text-sm font-semibold text-[#3b2418]">
                  {user?.email}
                </div>

                <div className="text-xs text-[#8b7568]">
                  Cafe Owner
                </div>
              </div>

              <button
                onClick={handleLogout}
                className="px-4 py-2 rounded-lg border border-[#dfd1c6] bg-white text-[#5a4032] text-sm font-semibold hover:bg-[#f7f0ea] transition"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* MAIN */}
      <main className="max-w-7xl mx-auto px-5 sm:px-8 py-10">
        {/* HERO */}
        <section className="mb-10">
          <p className="text-sm font-bold tracking-[0.18em] text-[#9a6b4f] uppercase mb-3">
            Owner Dashboard
          </p>

          <h1 className="text-3xl sm:text-4xl font-bold text-[#3b2418]">
            Good to see you again 👋
          </h1>

          <p className="mt-3 text-[#756256] text-base">
            Here&apos;s how your customers are feeling about{" "}
            <span className="font-bold text-[#3b2418]">
              {cafe?.name || "your cafe"}
            </span>
            .
          </p>
        </section>

        {/* QUICK ACTIONS */}
        <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 mb-10">
          <Link
            href="/dashboard/feedback"
            className="group bg-white border border-[#eadfd5] rounded-2xl p-6 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition"
          >
            <div className="w-12 h-12 rounded-xl bg-[#f4ebe4] flex items-center justify-center text-2xl mb-5">
              💬
            </div>

            <h2 className="font-bold text-lg text-[#3b2418]">
              Feedback
            </h2>

            <p className="text-sm text-[#756256] mt-1">
              View responses
            </p>
          </Link>

          <Link
            href="/dashboard/qr"
            className="group bg-white border border-[#eadfd5] rounded-2xl p-6 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition"
          >
            <div className="w-12 h-12 rounded-xl bg-[#f4ebe4] flex items-center justify-center text-2xl mb-5">
              📱
            </div>

            <h2 className="font-bold text-lg text-[#3b2418]">
              QR Code
            </h2>

            <p className="text-sm text-[#756256] mt-1">
              Get customer QR
            </p>
          </Link>

          <Link
            href="/dashboard/cafe"
            className="group bg-white border border-[#eadfd5] rounded-2xl p-6 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition"
          >
            <div className="w-12 h-12 rounded-xl bg-[#f4ebe4] flex items-center justify-center text-2xl mb-5">
              ☕
            </div>

            <h2 className="font-bold text-lg text-[#3b2418]">
              My Cafe
            </h2>

            <p className="text-sm text-[#756256] mt-1">
              Cafe settings
            </p>
          </Link>

          {cafe && (
            <Link
              href={`/c/${cafe.id}`}
              target="_blank"
              className="group bg-white border border-[#eadfd5] rounded-2xl p-6 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition"
            >
              <div className="w-12 h-12 rounded-xl bg-[#f4ebe4] flex items-center justify-center text-2xl mb-5">
                🔗
              </div>

              <h2 className="font-bold text-lg text-[#3b2418]">
                Customer Page
              </h2>

              <p className="text-sm text-[#756256] mt-1">
                Preview your page
              </p>
            </Link>
          )}
        </section>

        {/* STATS */}
        <section className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-10">
          {/* TOTAL FEEDBACK */}
          <div className="bg-white border border-[#eadfd5] rounded-2xl p-7 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-[#756256]">
                  Total Feedback
                </p>

                <p className="mt-3 text-4xl font-bold text-[#3b2418]">
                  {totalFeedback}
                </p>

                <p className="mt-2 text-sm text-[#8b7568]">
                  Customer responses
                </p>
              </div>

              <div className="w-14 h-14 rounded-2xl bg-[#f4ebe4] flex items-center justify-center text-2xl">
                💬
              </div>
            </div>
          </div>

          {/* AVERAGE */}
          <div className="bg-white border border-[#eadfd5] rounded-2xl p-7 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-[#756256]">
                  Average Rating
                </p>

                <p className="mt-3 text-4xl font-bold text-[#3b2418]">
                  {averageRating}
                </p>

                <p className="mt-2 text-sm text-[#8b7568]">
                  Out of 5 stars
                </p>
              </div>

              <div className="w-14 h-14 rounded-2xl bg-[#f4ebe4] flex items-center justify-center text-2xl">
                ⭐
              </div>
            </div>
          </div>

          {/* CAFE */}
          <div className="bg-white border border-[#eadfd5] rounded-2xl p-7 shadow-sm">
            <div className="flex items-center justify-between">
              <div className="min-w-0">
                <p className="text-sm font-semibold text-[#756256]">
                  Your Cafe
                </p>

                <p className="mt-3 text-2xl font-bold text-[#3b2418] truncate">
                  {cafe?.name || "No cafe"}
                </p>

                <p className="mt-2 text-sm text-[#8b7568]">
                  CafeFlow business profile
                </p>
              </div>

              <div className="w-14 h-14 rounded-2xl bg-[#f4ebe4] flex items-center justify-center text-2xl shrink-0 ml-4">
                ☕
              </div>
            </div>
          </div>
        </section>

        {/* LOWER SECTION */}
        <section className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* RATING OVERVIEW */}
          <div className="bg-white border border-[#eadfd5] rounded-2xl p-7 shadow-sm">
            <div className="flex items-center justify-between mb-7">
              <div>
                <h2 className="text-xl font-bold text-[#3b2418]">
                  Rating Overview
                </h2>

                <p className="text-sm text-[#8b7568] mt-1">
                  Customer satisfaction
                </p>
              </div>

              <div className="text-2xl">⭐</div>
            </div>

            <div className="space-y-4">
              {[5, 4, 3, 2, 1].map((rating) => {
                const count =
                  ratingCounts[rating as keyof typeof ratingCounts];

                const percentage = getPercentage(count);

                return (
                  <div key={rating} className="flex items-center gap-3">
                    <div className="w-10 text-sm font-semibold text-[#5f493d]">
                      {rating} ⭐
                    </div>

                    <div className="flex-1 h-2.5 bg-[#eee5df] rounded-full overflow-hidden">
                      <div
                        className="h-full bg-[#9a6b4f] rounded-full transition-all"
                        style={{
                          width: `${percentage}%`,
                        }}
                      />
                    </div>

                    <div className="w-8 text-right text-sm font-semibold text-[#3b2418]">
                      {count}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* RECENT FEEDBACK */}
          <div className="bg-white border border-[#eadfd5] rounded-2xl p-7 shadow-sm">
            <div className="flex items-center justify-between mb-7">
              <div>
                <h2 className="text-xl font-bold text-[#3b2418]">
                  Recent Feedback
                </h2>

                <p className="text-sm text-[#8b7568] mt-1">
                  Latest customer responses
                </p>
              </div>

              <Link
                href="/dashboard/feedback"
                className="text-sm font-bold text-[#8b5e3c] hover:text-[#5f3c29]"
              >
                View all →
              </Link>
            </div>

            {feedback.length === 0 ? (
              <div className="py-10 text-center">
                <div className="text-4xl mb-3">💬</div>

                <p className="font-semibold text-[#3b2418]">
                  No feedback yet
                </p>

                <p className="text-sm text-[#8b7568] mt-1">
                  Your first customer response will appear here.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {feedback.slice(0, 3).map((item) => (
                  <div
                    key={item.id}
                    className="border border-[#eee5df] rounded-xl p-4 bg-[#fffdfb]"
                  >
                    <div className="flex items-center justify-between gap-4">
                      <div className="text-sm tracking-wide">
                        {"⭐".repeat(Number(item.rating))}
                      </div>

                      <span className="text-xs text-[#8b7568]">
                        {formatDate(item.createdAt?.seconds)}
                      </span>
                    </div>

                    <p className="mt-3 text-sm leading-6 text-[#4d3b31]">
                      {item.message}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>

        {/* CTA */}
        <section className="mt-8">
          <div className="rounded-2xl bg-[#4b2e20] px-7 py-8 sm:px-10 sm:py-9 text-white shadow-sm">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
              <div>
                <p className="text-xs font-bold tracking-[0.18em] uppercase text-[#e8cdb9]">
                  Grow your feedback
                </p>

                <h2 className="mt-2 text-2xl sm:text-3xl font-bold text-white">
                  Put your feedback QR on every table.
                </h2>

                <p className="mt-2 text-sm sm:text-base text-[#eadbd2] max-w-2xl">
                  Make it easy for customers to share their experience while
                  it&apos;s still fresh.
                </p>
              </div>

              <Link
                href="/dashboard/qr"
                className="inline-flex items-center justify-center px-6 py-3 rounded-xl bg-white text-[#4b2e20] font-bold hover:bg-[#f7eee8] transition shrink-0"
              >
                Get QR Code →
              </Link>
            </div>
          </div>
        </section>
      </main>

      {/* FOOTER */}
      <footer className="max-w-7xl mx-auto px-5 sm:px-8 py-8">
        <div className="border-t border-[#eadfd5] pt-6 text-center text-sm text-[#8b7568]">
          ☕ CafeFlow · Simple feedback management for cafes
        </div>
      </footer>
    </div>
  );
}