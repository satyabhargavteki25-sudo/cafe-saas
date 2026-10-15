
"use client";

import { useEffect, useState } from "react";
import { onAuthStateChanged, User } from "firebase/auth";
import {
  collection,
  getDocs,
  query,
  where,
  doc,
  updateDoc,
  serverTimestamp,
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
  resolutionStatus?: "pending" | "resolved";
  resolutionNote?: string;
  resolvedAt?: {
    seconds: number;
    nanoseconds: number;
  } | null;
};

export default function FeedbackPage() {
  const [user, setUser] = useState<User | null>(null);
  const [cafe, setCafe] = useState<Cafe | null>(null);
  const [feedback, setFeedback] = useState<Feedback[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [filter, setFilter] = useState<"all" | "pending" | "resolved">("all");
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState<Record<string, boolean>>({});

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);

      if (!currentUser) {
        setError("You are not logged in.");
        setLoading(false);
        return;
      }

      try {
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

        const feedbackQuery = query(
          collection(db, "feedback"),
          where("cafeId", "==", currentCafe.id)
        );

        const feedbackSnapshot = await getDocs(feedbackQuery);

        const feedbackList: Feedback[] = feedbackSnapshot.docs.map((item) => {
          const data = item.data();

          return {
            id: item.id,
            cafeId: data.cafeId,
            rating: data.rating,
            message: data.message,
            createdAt: data.createdAt,
            resolutionStatus:
              data.resolutionStatus === "resolved" ? "resolved" : "pending",
            resolutionNote: data.resolutionNote ?? "",
            resolvedAt: data.resolvedAt ?? null,
          };
        });

        feedbackList.sort(
          (a, b) =>
            (b.createdAt?.seconds ?? 0) - (a.createdAt?.seconds ?? 0)
        );

        setFeedback(feedbackList);
        setNotes(
          Object.fromEntries(
            feedbackList.map((item) => [
              item.id,
              item.resolutionNote ?? "",
            ])
          )
        );
      } catch (err) {
        console.error("Feedback loading error:", err);
        setError("Failed to load feedback. Check your connection and Firestore rules.");
      } finally {
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, []);

  const totalFeedback = feedback.length;
  const pendingCount = feedback.filter(
    (item) => item.resolutionStatus !== "resolved"
  ).length;
  const resolvedCount = totalFeedback - pendingCount;

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
    if (!createdAt) return "Date unavailable";

    return new Date(createdAt.seconds * 1000).toLocaleString("en-IN", {
      dateStyle: "medium",
      timeStyle: "short",
    });
  };

  const getStars = (rating: number) => "★".repeat(rating);

  const saveResolution = async (
    item: Feedback,
    nextStatus: "pending" | "resolved"
  ) => {
    if (!cafe || !user) {
      setError("Please sign in with your cafe owner account.");
      return;
    }

    const note = (notes[item.id] ?? "").trim();

    if (note.length > 1000) {
      setError("The internal note must be 1000 characters or fewer.");
      return;
    }

    setError("");
    setNotice("");
    setSaving((previous) => ({ ...previous, [item.id]: true }));

    try {
      await updateDoc(doc(db, "feedback", item.id), {
        resolutionStatus: nextStatus,
        resolutionNote: note,
        resolvedAt:
          nextStatus === "resolved" ? serverTimestamp() : null,
      });

      setFeedback((previous) =>
        previous.map((entry) =>
          entry.id === item.id
            ? {
                ...entry,
                resolutionStatus: nextStatus,
                resolutionNote: note,
                resolvedAt:
                  nextStatus === "resolved"
                    ? { seconds: Math.floor(Date.now() / 1000), nanoseconds: 0 }
                    : null,
              }
            : entry
        )
      );

      setNotice(
        nextStatus === "resolved"
          ? "Complaint marked as resolved."
          : "Complaint moved back to pending."
      );
    } catch (err) {
      console.error("Saving complaint resolution failed:", err);
      setError(
        "Could not save the resolution. Verify the Firestore rules and try again."
      );
    } finally {
      setSaving((previous) => ({ ...previous, [item.id]: false }));
    }
  };

  const visibleFeedback = feedback.filter((item) => {
    if (filter === "pending") return item.resolutionStatus !== "resolved";
    if (filter === "resolved") return item.resolutionStatus === "resolved";
    return true;
  });

  if (loading) {
    return (
      <main className="min-h-screen bg-[#FFF8F0] flex items-center justify-center">
        <p className="text-[#6F4E37] text-lg">Loading feedback...</p>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#FFF8F0]">
      <header className="bg-[#3E2723] text-white px-6 py-5">
        <div className="max-w-6xl mx-auto">
          <p className="text-2xl font-bold">☕ CafeFlow</p>
          <p className="text-sm text-[#E8D5C4]">Customer feedback</p>
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-6 py-8">
        <a
          href="/dashboard"
          className="text-[#6F4E37] font-medium hover:underline"
        >
          ← Dashboard
        </a>

        <div className="mt-6">
          <h1 className="text-3xl font-bold text-[#3E2723]">
            Customer Feedback
          </h1>
          <p className="mt-2 text-gray-600">
            Review customer feedback and track complaint resolution.
          </p>
        </div>

        {error && (
          <div className="mt-6 rounded-xl border border-red-200 bg-red-50 p-5">
            <p className="font-semibold text-red-700">{error}</p>
            {user && (
              <p className="mt-2 text-sm text-red-600">
                Logged-in email: {user.email}
              </p>
            )}
          </div>
        )}

        {notice && (
          <div className="mt-4 rounded-xl border border-green-200 bg-green-50 p-4 text-green-800">
            {notice}
          </div>
        )}

        {cafe && (
          <>
            <div className="mt-8">
              <p className="text-sm text-gray-500">Cafe</p>
              <h2 className="text-2xl font-bold text-[#3E2723]">
                {cafe.name}
              </h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mt-6">
              <div className="bg-white border border-[#E8D5C4] rounded-2xl p-6 shadow-sm">
                <p className="text-gray-500 text-sm">Total Feedback</p>
                <p className="text-4xl font-bold text-[#6F4E37] mt-2">
                  {totalFeedback}
                </p>
              </div>

              <div className="bg-white border border-[#E8D5C4] rounded-2xl p-6 shadow-sm">
                <p className="text-gray-500 text-sm">Pending</p>
                <p className="text-4xl font-bold text-amber-600 mt-2">
                  {pendingCount}
                </p>
              </div>

              <div className="bg-white border border-[#E8D5C4] rounded-2xl p-6 shadow-sm">
                <p className="text-gray-500 text-sm">Resolved</p>
                <p className="text-4xl font-bold text-green-700 mt-2">
                  {resolvedCount}
                </p>
              </div>

              <div className="bg-white border border-[#E8D5C4] rounded-2xl p-6 shadow-sm md:col-span-3">
                <p className="text-gray-500 text-sm">Average Rating</p>
                <p className="text-3xl font-bold text-[#6F4E37] mt-2">
                  {formattedAverage} / 5
                </p>
              </div>
            </div>

            <div className="mt-8">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <h2 className="text-2xl font-bold text-[#3E2723]">
                  Feedback and Complaints
                </h2>

                <select
                  value={filter}
                  onChange={(event) =>
                    setFilter(event.target.value as typeof filter)
                  }
                  className="rounded-lg border border-[#E8D5C4] bg-white px-4 py-2"
                  aria-label="Filter feedback"
                >
                  <option value="all">All feedback</option>
                  <option value="pending">Pending only</option>
                  <option value="resolved">Resolved only</option>
                </select>
              </div>

              {visibleFeedback.length === 0 ? (
                <div className="mt-5 bg-white border border-[#E8D5C4] rounded-2xl p-8 text-center">
                  <p className="text-lg font-semibold text-[#3E2723]">
                    {totalFeedback === 0
                      ? "No feedback yet"
                      : "No feedback matches this filter"}
                  </p>
                  <p className="mt-1 text-gray-500">
                    Customer feedback will appear here.
                  </p>
                </div>
              ) : (
                <div className="mt-5 space-y-4">
                  {visibleFeedback.map((item) => {
                    const resolved = item.resolutionStatus === "resolved";
                    const isSaving = !!saving[item.id];

                    return (
                      <article
                        key={item.id}
                        className="bg-white border border-[#E8D5C4] rounded-2xl p-6 shadow-sm"
                      >
                        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                          <p className="text-xl text-amber-500">
                            {getStars(item.rating)}
                            <span className="ml-2 text-sm text-gray-700">
                              {item.rating}/5
                            </span>
                          </p>

                          <span
                            className={`inline-flex w-fit rounded-full px-3 py-1 text-sm font-semibold ${
                              resolved
                                ? "bg-green-100 text-green-800"
                                : "bg-amber-100 text-amber-800"
                            }`}
                          >
                            {resolved ? "Resolved" : "Pending"}
                          </span>
                        </div>

                        <p className="mt-2 text-sm text-gray-500">
                          Submitted: {getDate(item.createdAt)}
                        </p>

                        <div className="mt-4">
                          <p className="text-sm text-gray-500">
                            Customer message
                          </p>
                          <p className="mt-1 text-gray-800 leading-relaxed whitespace-pre-wrap">
                            {item.message || "No message provided."}
                          </p>
                        </div>

                        <div className="mt-5 border-t border-[#E8D5C4] pt-5">
                          <label
                            htmlFor={`note-${item.id}`}
                            className="block text-sm font-semibold text-[#3E2723]"
                          >
                            Internal resolution note
                          </label>
                          <p className="mt-1 text-xs text-gray-500">
                            For your team only; do not include sensitive customer information.
                          </p>

                          <textarea
                            id={`note-${item.id}`}
                            value={notes[item.id] ?? ""}
                            onChange={(event) =>
                              setNotes((previous) => ({
                                ...previous,
                                [item.id]: event.target.value,
                              }))
                            }
                            maxLength={1000}
                            rows={3}
                            placeholder="Example: Spoke with the customer and replaced the order."
                            className="mt-2 w-full rounded-lg border border-[#E8D5C4] bg-white p-3 text-gray-800 focus:outline-none focus:ring-2 focus:ring-[#6F4E37]"
                          />

                          <p className="mt-1 text-right text-xs text-gray-500">
                            {(notes[item.id] ?? "").length}/1000
                          </p>

                          {resolved && item.resolvedAt && (
                            <p className="mt-2 text-sm text-green-700">
                              Resolved at: {getDate(item.resolvedAt)}
                            </p>
                          )}

                          <div className="mt-4 flex flex-wrap gap-3">
                            <button
                              type="button"
                              disabled={isSaving}
                              onClick={() => saveResolution(item, "resolved")}
                              className="rounded-lg bg-green-700 px-4 py-2 font-semibold text-white hover:bg-green-800 disabled:opacity-50"
                            >
                              {isSaving ? "Saving..." : "Save and resolve"}
                            </button>

                            {resolved && (
                              <button
                                type="button"
                                disabled={isSaving}
                                onClick={() => saveResolution(item, "pending")}
                                className="rounded-lg border border-amber-600 px-4 py-2 font-semibold text-amber-800 hover:bg-amber-50 disabled:opacity-50"
                              >
                                Reopen complaint
                              </button>
                            )}
                          </div>
                        </div>
                      </article>
                    );
                  })}
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </main>
  );
}
