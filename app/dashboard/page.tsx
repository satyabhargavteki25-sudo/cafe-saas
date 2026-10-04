
"use client";

import Link from "next/link";
import Image from "next/image";
import { useEffect, useState } from "react";
import {
  collection,
  getDocs,
  limit,
  query,
  where,
} from "firebase/firestore";
import { onAuthStateChanged, User } from "firebase/auth";
import { auth, db } from "@/src/lib/firebase";

type Cafe = {
  id: string;
  name: string;
  whatsappNumber: string;
  googleReviewUrl: string;
  ownerId: string;
};

type Feedback = {
  id: string;
  rating: number;
  message: string;
  createdAt?: {
    seconds: number;
  };
};

export default function DashboardPage() {
  const [user, setUser] = useState<User | null>(null);
  const [cafe, setCafe] = useState<Cafe | null>(null);
  const [feedback, setFeedback] = useState<Feedback[]>([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (!currentUser) {
        window.location.href = "/login";
        return;
      }

      setUser(currentUser);

      try {
        // ==========================================
        // GET OWNER'S CAFE
        // ==========================================

        const cafeQuery = query(
          collection(db, "cafes"),
          where("ownerId", "==", currentUser.uid),
          limit(1)
        );

        const cafeSnapshot = await getDocs(cafeQuery);

        if (cafeSnapshot.empty) {
          setCafe(null);
          setFeedback([]);
          setLoading(false);
          return;
        }

        const cafeDocument = cafeSnapshot.docs[0];
        const cafeData = cafeDocument.data();

        const currentCafe: Cafe = {
          id: cafeDocument.id,
          name: cafeData.name ?? "My Cafe",
          whatsappNumber: cafeData.whatsappNumber ?? "",
          googleReviewUrl: cafeData.googleReviewUrl ?? "",
          ownerId: cafeData.ownerId ?? currentUser.uid,
        };

        setCafe(currentCafe);

        // ==========================================
        // GET FEEDBACK
        // ==========================================
        //
        // IMPORTANT:
        // We intentionally do NOT use orderBy()
        // here. That avoids requiring a Firestore
        // composite index for the MVP.
        //

        const feedbackQuery = query(
          collection(db, "feedback"),
          where("cafeId", "==", currentCafe.id),
          limit(100)
        );

        const feedbackSnapshot = await getDocs(feedbackQuery);

        const feedbackList: Feedback[] = feedbackSnapshot.docs.map(
          (document) => {
            const data = document.data();

            return {
              id: document.id,
              rating:
                typeof data.rating === "number"
                  ? data.rating
                  : 0,
              message:
                typeof data.message === "string"
                  ? data.message
                  : "",
              createdAt: data.createdAt,
            };
          }
        );

        // Sort newest feedback first in JavaScript.
        feedbackList.sort((a, b) => {
          const aTime = a.createdAt?.seconds ?? 0;
          const bTime = b.createdAt?.seconds ?? 0;

          return bTime - aTime;
        });

        setFeedback(feedbackList);
      } catch (err) {
        console.error("Dashboard loading error:", err);
        setError(
          "Unable to load some dashboard data. Please refresh and try again."
        );
      } finally {
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, []);

  // ==========================================
  // CALCULATIONS
  // ==========================================

  const totalFeedback = feedback.length;

  const averageRating =
    totalFeedback > 0
      ? feedback.reduce((sum, item) => sum + item.rating, 0) /
        totalFeedback
      : 0;

  const ratingCounts = [5, 4, 3, 2, 1].map((rating) => ({
    rating,
    count: feedback.filter((item) => item.rating === rating).length,
  }));

  // ==========================================
  // LOADING
  // ==========================================

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-50">
        <div className="text-center">
          <div className="mx-auto h-10 w-10 animate-spin rounded-full border-4 border-orange-100 border-t-orange-500" />

          <p className="mt-4 text-sm font-medium text-slate-600">
            Loading your dashboard...
          </p>
        </div>
      </main>
    );
  }

  if (!user) {
    return null;
  }

  // ==========================================
  // NO CAFE
  // ==========================================

  if (!cafe) {
    return (
      <main className="min-h-screen bg-slate-50">
        <header className="border-b border-slate-200 bg-white">
          <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-5 lg:px-8">
            <Link href="/" className="flex items-center gap-3">
              <Image
                src="/logo.jpeg"
                alt="CafeFlow"
                width={48}
                height={48}
                className="h-12 w-12 object-contain"
              />

              <span className="text-2xl font-bold tracking-tight">
                <span className="text-slate-900">Cafe</span>
                <span className="text-orange-500">Flow</span>
              </span>
            </Link>

            <Link
              href="/onboarding"
              className="rounded-xl bg-orange-500 px-5 py-2.5 text-sm font-semibold text-white hover:bg-orange-600"
            >
              Set Up Cafe
            </Link>
          </div>
        </header>

        <div className="flex min-h-[calc(100vh-90px)] items-center justify-center px-6">
          <div className="w-full max-w-lg rounded-3xl border border-slate-200 bg-white p-10 text-center shadow-sm">
            <div className="mx-auto flex h-24 w-24 items-center justify-center rounded-3xl bg-orange-50">
              <Image
                src="/logo.jpeg"
                alt="CafeFlow"
                width={90}
                height={90}
                className="h-20 w-20 object-contain"
              />
            </div>

            <h1 className="mt-7 text-3xl font-bold text-slate-950">
              Let&apos;s set up your cafe
            </h1>

            <p className="mt-3 leading-7 text-slate-600">
              Your account is ready. Add your cafe details to start using
              CafeFlow.
            </p>

            <Link
              href="/onboarding"
              className="mt-8 inline-flex rounded-xl bg-orange-500 px-7 py-3.5 font-semibold text-white hover:bg-orange-600"
            >
              Set Up My Cafe
            </Link>
          </div>
        </div>
      </main>
    );
  }

  // ==========================================
  // DASHBOARD
  // ==========================================

  return (
    <main className="min-h-screen bg-slate-50 text-slate-900">
      {/* NAVBAR */}
      <header className="sticky top-0 z-20 border-b border-slate-200 bg-white/95 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4 lg:px-8">
          <Link href="/" className="flex items-center gap-3">
            <Image
              src="/logo.jpeg"
              alt="CafeFlow"
              width={44}
              height={44}
              className="h-11 w-11 object-contain"
              priority
            />

            <span className="text-2xl font-bold tracking-tight">
              <span className="text-slate-900">Cafe</span>
              <span className="text-orange-500">Flow</span>
            </span>
          </Link>

          <div className="flex items-center gap-4">
            <div className="hidden text-right sm:block">
              <p className="text-sm font-semibold text-slate-800">
                Cafe Owner
              </p>

              <p className="text-xs text-slate-500">
                {user.email}
              </p>
            </div>

            <button
              type="button"
              onClick={async () => {
                await auth.signOut();
                window.location.href = "/login";
              }}
              className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
            >
              Logout
            </button>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-7xl px-6 py-10 lg:px-8">
        {/* HERO */}
        <section className="rounded-3xl bg-slate-950 p-8 text-white shadow-sm sm:p-10">
          <div className="flex flex-col justify-between gap-8 lg:flex-row lg:items-center">
            <div>
              <p className="text-sm font-semibold text-orange-400">
                CafeFlow Dashboard
              </p>

              <h1 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl">
                Good to see you again.
              </h1>

              <p className="mt-3 max-w-2xl leading-7 text-slate-300">
                Manage your customer feedback, ratings, QR code, and cafe
                settings from one place.
              </p>

              <div className="mt-6 inline-flex items-center rounded-full bg-white/10 px-4 py-2 text-sm font-semibold">
                ☕ {cafe.name}
              </div>
            </div>

            <Link
              href={`/c/${cafe.id}`}
              target="_blank"
              className="inline-flex items-center justify-center rounded-xl bg-orange-500 px-6 py-3.5 font-semibold text-white transition hover:bg-orange-600"
            >
              Open Customer Page
            </Link>
          </div>
        </section>

        {/* ERROR */}
        {error && (
          <div className="mt-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
            {error}
          </div>
        )}

        {/* QUICK ACTIONS */}
        <section className="mt-8">
          <h2 className="text-xl font-bold text-slate-950">
            Quick actions
          </h2>

          <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Link
              href="/dashboard/feedback"
              className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition hover:-translate-y-0.5 hover:border-orange-200 hover:shadow-md"
            >
              <div className="text-2xl">💬</div>

              <h3 className="mt-4 font-bold text-slate-900">
                Feedback
              </h3>

              <p className="mt-1 text-sm leading-6 text-slate-500">
                View customer feedback and ratings.
              </p>
            </Link>

            <Link
              href="/dashboard/qr"
              className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition hover:-translate-y-0.5 hover:border-orange-200 hover:shadow-md"
            >
              <div className="text-2xl">▦</div>

              <h3 className="mt-4 font-bold text-slate-900">
                QR Code
              </h3>

              <p className="mt-1 text-sm leading-6 text-slate-500">
                Download or print your cafe QR code.
              </p>
            </Link>

            <Link
              href="/dashboard/cafe"
              className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition hover:-translate-y-0.5 hover:border-orange-200 hover:shadow-md"
            >
              <div className="text-2xl">⚙️</div>

              <h3 className="mt-4 font-bold text-slate-900">
                My Cafe
              </h3>

              <p className="mt-1 text-sm leading-6 text-slate-500">
                Update your cafe information.
              </p>
            </Link>

            <Link
              href={`/c/${cafe.id}`}
              target="_blank"
              className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition hover:-translate-y-0.5 hover:border-orange-200 hover:shadow-md"
            >
              <div className="text-2xl">👀</div>

              <h3 className="mt-4 font-bold text-slate-900">
                Customer Page
              </h3>

              <p className="mt-1 text-sm leading-6 text-slate-500">
                See what your customers see.
              </p>
            </Link>
          </div>
        </section>

        {/* STATS */}
        <section className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <p className="text-sm font-medium text-slate-500">
              Total Feedback
            </p>

            <p className="mt-3 text-4xl font-bold text-slate-950">
              {totalFeedback}
            </p>

            <p className="mt-2 text-sm text-slate-500">
              Customer responses
            </p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <p className="text-sm font-medium text-slate-500">
              Average Rating
            </p>

            <div className="mt-3 flex items-center gap-3">
              <span className="text-4xl font-bold text-slate-950">
                {averageRating.toFixed(1)}
              </span>

              <span className="text-2xl text-orange-400">
                ★
              </span>
            </div>

            <p className="mt-2 text-sm text-slate-500">
              Based on customer feedback
            </p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <p className="text-sm font-medium text-slate-500">
              Your Cafe
            </p>

            <p className="mt-3 truncate text-2xl font-bold text-slate-950">
              {cafe.name}
            </p>

            <p className="mt-2 text-sm text-slate-500">
              CafeFlow is connected
            </p>
          </div>
        </section>

        {/* RATING OVERVIEW */}
        <section className="mt-8 rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold text-slate-950">
                Rating Overview
              </h2>

              <p className="mt-1 text-sm text-slate-500">
                Customer rating distribution.
              </p>
            </div>

            <Link
              href="/dashboard/feedback"
              className="text-sm font-semibold text-orange-500 hover:text-orange-600"
            >
              View all →
            </Link>
          </div>

          <div className="mt-7 space-y-4">
            {ratingCounts.map((item) => {
              const percentage =
                totalFeedback > 0
                  ? (item.count / totalFeedback) * 100
                  : 0;

              return (
                <div
                  key={item.rating}
                  className="flex items-center gap-4"
                >
                  <div className="flex w-12 items-center gap-1 text-sm font-semibold text-slate-700">
                    {item.rating}
                    <span className="text-orange-400">★</span>
                  </div>

                  <div className="h-3 flex-1 overflow-hidden rounded-full bg-slate-100">
                    <div
                      className="h-full rounded-full bg-orange-500 transition-all"
                      style={{
                        width: `${percentage}%`,
                      }}
                    />
                  </div>

                  <span className="w-8 text-right text-sm font-medium text-slate-500">
                    {item.count}
                  </span>
                </div>
              );
            })}
          </div>
        </section>

        {/* RECENT FEEDBACK */}
        <section className="mt-8 rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold text-slate-950">
                Recent Feedback
              </h2>

              <p className="mt-1 text-sm text-slate-500">
                Latest customer responses.
              </p>
            </div>

            <Link
              href="/dashboard/feedback"
              className="text-sm font-semibold text-orange-500 hover:text-orange-600"
            >
              View all →
            </Link>
          </div>

          {feedback.length === 0 ? (
            <div className="mt-7 rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-8 text-center">
              <p className="font-semibold text-slate-700">
                No feedback yet
              </p>

              <p className="mt-2 text-sm text-slate-500">
                Share your QR code with customers to start collecting
                feedback.
              </p>
            </div>
          ) : (
            <div className="mt-6 divide-y divide-slate-100">
              {feedback.slice(0, 5).map((item) => (
                <div
                  key={item.id}
                  className="py-5 first:pt-0 last:pb-0"
                >
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex gap-1 text-orange-400">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <span
                          key={star}
                          className={
                            star <= item.rating
                              ? "text-orange-400"
                              : "text-slate-200"
                          }
                        >
                          ★
                        </span>
                      ))}
                    </div>

                    <span className="text-xs text-slate-400">
                      {item.createdAt
                        ? new Date(
                            item.createdAt.seconds * 1000
                          ).toLocaleDateString()
                        : "Recently"}
                    </span>
                  </div>

                  <p className="mt-3 text-sm leading-6 text-slate-700">
                    {item.message}
                  </p>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* CTA */}
        <section className="mt-8 rounded-3xl border border-orange-100 bg-orange-50 p-8 sm:p-10">
          <div className="flex flex-col justify-between gap-6 lg:flex-row lg:items-center">
            <div>
              <p className="text-sm font-semibold text-orange-600">
                Grow your cafe
              </p>

              <h2 className="mt-2 text-2xl font-bold text-slate-950">
                Put your CafeFlow QR where customers can see it.
              </h2>

              <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
                Place it on tables, counters, bills, or takeaway packaging
                and make feedback easy for your customers.
              </p>
            </div>

            <Link
              href="/dashboard/qr"
              className="inline-flex shrink-0 items-center justify-center rounded-xl bg-orange-500 px-6 py-3.5 font-semibold text-white transition hover:bg-orange-600"
            >
              Get QR Code
            </Link>
          </div>
        </section>
      </div>

      {/* FOOTER */}
      <footer className="mt-12 border-t border-slate-200 bg-white">
        <div className="mx-auto flex max-w-7xl flex-col gap-3 px-6 py-8 text-sm text-slate-500 sm:flex-row sm:items-center sm:justify-between lg:px-8">
          <p>
            © {new Date().getFullYear()} CafeFlow. All rights reserved.
          </p>

          <p>
            Customer feedback made simple.
          </p>
        </div>
      </footer>
    </main>
  );
}
