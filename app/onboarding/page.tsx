"use client";

import Image from "next/image";
import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";
import { addDoc, collection, serverTimestamp } from "firebase/firestore";
import { auth, db } from "@/src/lib/firebase";
import { useRouter } from "next/navigation";

export default function OnboardingPage() {
  const router = useRouter();

  const [cafeName, setCafeName] = useState("");
  const [whatsappNumber, setWhatsappNumber] = useState("");
  const [googleReviewUrl, setGoogleReviewUrl] = useState("");

  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!auth.currentUser) {
      router.replace("/login");
    }
  }, [router]);

  async function handleCreateCafe(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();

    setError("");

    const user = auth.currentUser;

    if (!user) {
      router.replace("/login");
      return;
    }

    const trimmedName = cafeName.trim();
    const trimmedWhatsapp = whatsappNumber.trim();
    const trimmedGoogleUrl = googleReviewUrl.trim();

    if (trimmedName.length < 2) {
      setError("Please enter your cafe name.");
      return;
    }

    if (trimmedWhatsapp.length < 10) {
      setError("Please enter a valid WhatsApp number.");
      return;
    }

    if (
      !trimmedGoogleUrl.startsWith("http://") &&
      !trimmedGoogleUrl.startsWith("https://")
    ) {
      setError("Please enter a valid Google Review link.");
      return;
    }

    setLoading(true);

    try {
      await addDoc(collection(db, "cafes"), {
        name: trimmedName,
        whatsappNumber: trimmedWhatsapp,
        googleReviewUrl: trimmedGoogleUrl,
        ownerId: user.uid,
        createdAt: serverTimestamp(),
      });

      router.push("/dashboard");
    } catch (err) {
      console.error(err);
      setError("Unable to create your cafe. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-slate-50">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-6 lg:px-8">
        <Link href="/" className="flex items-center gap-3">
          <Image
            src="/logo.jpeg"
            alt="CafeFlow"
            width={48}
            height={48}
            className="h-12 w-12 object-contain"
            priority
          />

          <span className="text-2xl font-bold tracking-tight">
            <span className="text-slate-900">Cafe</span>
            <span className="text-orange-500">Flow</span>
          </span>
        </Link>
      </div>

      <div className="flex min-h-[calc(100vh-100px)] items-center justify-center px-6 pb-12">
        <div className="w-full max-w-lg">
          <div className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm sm:p-10">
            <div className="mb-7 flex justify-center">
              <div className="flex h-24 w-24 items-center justify-center rounded-[1.75rem] border border-orange-100 bg-orange-50">
                <Image
                  src="/logo.jpeg"
                  alt="CafeFlow raccoon"
                  width={100}
                  height={100}
                  className="h-20 w-20 object-contain"
                />
              </div>
            </div>

            <div className="text-center">
              <div className="mb-3 inline-flex rounded-full border border-orange-200 bg-orange-50 px-3 py-1.5 text-xs font-semibold text-orange-600">
                Step 1 of 1
              </div>

              <h1 className="text-3xl font-bold tracking-tight text-slate-950">
                Set up your cafe
              </h1>

              <p className="mt-2 text-sm leading-6 text-slate-600">
                Add your cafe details to start collecting customer feedback.
              </p>
            </div>

            {error && (
              <div className="mt-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm leading-5 text-red-600">
                {error}
              </div>
            )}

            <form
              onSubmit={handleCreateCafe}
              className="mt-8 space-y-5"
            >
              <div>
                <label
                  htmlFor="cafeName"
                  className="mb-2 block text-sm font-semibold text-slate-700"
                >
                  Cafe Name
                </label>

                <input
                  id="cafeName"
                  type="text"
                  required
                  value={cafeName}
                  onChange={(e) => setCafeName(e.target.value)}
                  placeholder="e.g. ABC Cafe"
                  className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-orange-500 focus:ring-2 focus:ring-orange-100"
                />
              </div>

              <div>
                <label
                  htmlFor="whatsappNumber"
                  className="mb-2 block text-sm font-semibold text-slate-700"
                >
                  WhatsApp Number
                </label>

                <input
                  id="whatsappNumber"
                  type="tel"
                  required
                  value={whatsappNumber}
                  onChange={(e) => setWhatsappNumber(e.target.value)}
                  placeholder="e.g. 918688856097"
                  className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-orange-500 focus:ring-2 focus:ring-orange-100"
                />

                <p className="mt-2 text-xs text-slate-500">
                  Include country code for best results.
                </p>
              </div>

              <div>
                <label
                  htmlFor="googleReviewUrl"
                  className="mb-2 block text-sm font-semibold text-slate-700"
                >
                  Google Review Link
                </label>

                <input
                  id="googleReviewUrl"
                  type="url"
                  required
                  value={googleReviewUrl}
                  onChange={(e) => setGoogleReviewUrl(e.target.value)}
                  placeholder="https://g.page/r/your-cafe/review"
                  className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-orange-500 focus:ring-2 focus:ring-orange-100"
                />

                <p className="mt-2 text-xs leading-5 text-slate-500">
                  Customers will use this link when they choose to leave an
                  honest Google review.
                </p>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full rounded-xl bg-orange-500 px-5 py-3.5 font-semibold text-white shadow-sm transition hover:bg-orange-600 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {loading ? "Creating your cafe..." : "Create My Cafe"}
              </button>
            </form>
          </div>

          <div className="mt-6 text-center">
            <Link
              href="/"
              className="text-sm font-medium text-slate-500 transition hover:text-slate-900"
            >
              ← Back to CafeFlow
            </Link>
          </div>
        </div>
      </div>
    </main>
  );
}