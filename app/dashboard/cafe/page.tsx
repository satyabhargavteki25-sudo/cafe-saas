"use client";

import Image from "next/image";
import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";
import {
  collection,
  getDocs,
  limit,
  query,
  updateDoc,
  where,
} from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";
import { auth, db } from "@/src/lib/firebase";
import { useRouter } from "next/navigation";

type Cafe = {
  id: string;
  name: string;
  whatsappNumber: string;
  googleReviewUrl: string;
};

export default function CafeSettingsPage() {
  const router = useRouter();

  const [cafe, setCafe] = useState<Cafe | null>(null);

  const [name, setName] = useState("");
  const [whatsappNumber, setWhatsappNumber] = useState("");
  const [googleReviewUrl, setGoogleReviewUrl] = useState("");

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [editing, setEditing] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        router.replace("/login");
        return;
      }

      try {
        const cafeQuery = query(
          collection(db, "cafes"),
          where("ownerId", "==", user.uid),
          limit(1)
        );

        const snapshot = await getDocs(cafeQuery);

        if (snapshot.empty) {
          router.replace("/onboarding");
          return;
        }

        const cafeDoc = snapshot.docs[0];
        const data = cafeDoc.data();

        const currentCafe: Cafe = {
          id: cafeDoc.id,
          name: data.name ?? "",
          whatsappNumber: data.whatsappNumber ?? "",
          googleReviewUrl: data.googleReviewUrl ?? "",
        };

        setCafe(currentCafe);
        setName(currentCafe.name);
        setWhatsappNumber(currentCafe.whatsappNumber);
        setGoogleReviewUrl(currentCafe.googleReviewUrl);
      } catch (err) {
        console.error(err);
        setError("Unable to load your cafe information.");
      } finally {
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, [router]);

  function handleCancel() {
    if (!cafe) return;

    setName(cafe.name);
    setWhatsappNumber(cafe.whatsappNumber);
    setGoogleReviewUrl(cafe.googleReviewUrl);

    setEditing(false);
    setError("");
    setMessage("");
  }

  async function handleSave(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();

    if (!cafe) return;

    setError("");
    setMessage("");

    const trimmedName = name.trim();
    const trimmedWhatsapp = whatsappNumber.trim();
    const trimmedGoogleUrl = googleReviewUrl.trim();

    if (trimmedName.length < 2) {
      setError("Cafe name must contain at least 2 characters.");
      return;
    }

    const whatsappDigits = trimmedWhatsapp.replace(/\D/g, "");

    if (whatsappDigits.length < 10) {
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

    setSaving(true);

    try {
      const cafeRef = (
        await import("firebase/firestore")
      ).doc(db, "cafes", cafe.id);

      await updateDoc(cafeRef, {
        name: trimmedName,
        whatsappNumber: trimmedWhatsapp,
        googleReviewUrl: trimmedGoogleUrl,
      });

      const updatedCafe: Cafe = {
        ...cafe,
        name: trimmedName,
        whatsappNumber: trimmedWhatsapp,
        googleReviewUrl: trimmedGoogleUrl,
      };

      setCafe(updatedCafe);

      setName(trimmedName);
      setWhatsappNumber(trimmedWhatsapp);
      setGoogleReviewUrl(trimmedGoogleUrl);

      setEditing(false);
      setMessage("Cafe information updated successfully.");
    } catch (err) {
      console.error(err);
      setError("Unable to save your changes. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-50">
        <div className="text-center">
          <div className="mx-auto h-10 w-10 animate-spin rounded-full border-4 border-orange-100 border-t-orange-500" />

          <p className="mt-4 text-sm font-medium text-slate-600">
            Loading cafe...
          </p>
        </div>
      </main>
    );
  }

  if (!cafe) {
    return null;
  }

  return (
    <main className="min-h-screen bg-slate-50 text-slate-900">
      {/* NAVBAR */}
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4 lg:px-8">
          <Link href="/dashboard" className="flex items-center gap-3">
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

          <Link
            href="/dashboard"
            className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
          >
            ← Dashboard
          </Link>
        </div>
      </header>

      <div className="mx-auto max-w-4xl px-6 py-10 lg:px-8">
        {/* PAGE HEADER */}
        <div>
          <p className="text-sm font-semibold text-orange-500">
            Cafe Management
          </p>

          <h1 className="mt-2 text-3xl font-bold tracking-tight text-slate-950">
            My Cafe
          </h1>

          <p className="mt-2 max-w-2xl leading-7 text-slate-600">
            Manage the information customers see when they scan your
            CafeFlow QR code.
          </p>
        </div>

        {/* SUCCESS */}
        {message && (
          <div className="mt-6 rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm font-medium text-green-700">
            {message}
          </div>
        )}

        {/* ERROR */}
        {error && (
          <div className="mt-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-600">
            {error}
          </div>
        )}

        <div className="mt-8 grid gap-8 lg:grid-cols-3">
          {/* SETTINGS */}
          <section className="lg:col-span-2">
            <div className="rounded-3xl border border-slate-200 bg-white p-7 shadow-sm sm:p-8">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h2 className="text-xl font-bold text-slate-950">
                    Cafe Information
                  </h2>

                  <p className="mt-1 text-sm text-slate-500">
                    These details are used throughout CafeFlow.
                  </p>
                </div>

                {!editing && (
                  <button
                    type="button"
                    onClick={() => {
                      setEditing(true);
                      setMessage("");
                      setError("");
                    }}
                    className="rounded-xl bg-orange-500 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-orange-600"
                  >
                    Edit
                  </button>
                )}
              </div>

              <form
                onSubmit={handleSave}
                className="mt-8 space-y-6"
              >
                {/* CAFE NAME */}
                <div>
                  <label
                    htmlFor="name"
                    className="mb-2 block text-sm font-semibold text-slate-700"
                  >
                    Cafe Name
                  </label>

                  <input
                    id="name"
                    type="text"
                    value={name}
                    disabled={!editing}
                    onChange={(e) => setName(e.target.value)}
                    className={`w-full rounded-xl border px-4 py-3 text-slate-900 outline-none transition ${
                      editing
                        ? "border-slate-300 bg-white focus:border-orange-500 focus:ring-2 focus:ring-orange-100"
                        : "border-slate-200 bg-slate-50"
                    }`}
                  />
                </div>

                {/* WHATSAPP */}
                <div>
                  <label
                    htmlFor="whatsapp"
                    className="mb-2 block text-sm font-semibold text-slate-700"
                  >
                    WhatsApp Number
                  </label>

                  <input
                    id="whatsapp"
                    type="tel"
                    value={whatsappNumber}
                    disabled={!editing}
                    onChange={(e) =>
                      setWhatsappNumber(e.target.value)
                    }
                    placeholder="918688856097"
                    className={`w-full rounded-xl border px-4 py-3 text-slate-900 outline-none transition ${
                      editing
                        ? "border-slate-300 bg-white focus:border-orange-500 focus:ring-2 focus:ring-orange-100"
                        : "border-slate-200 bg-slate-50"
                    }`}
                  />

                  <p className="mt-2 text-xs text-slate-500">
                    This number receives customer feedback through
                    WhatsApp.
                  </p>
                </div>

                {/* GOOGLE REVIEW */}
                <div>
                  <label
                    htmlFor="googleReview"
                    className="mb-2 block text-sm font-semibold text-slate-700"
                  >
                    Google Review Link
                  </label>

                  <input
                    id="googleReview"
                    type="url"
                    value={googleReviewUrl}
                    disabled={!editing}
                    onChange={(e) =>
                      setGoogleReviewUrl(e.target.value)
                    }
                    placeholder="https://g.page/r/your-cafe/review"
                    className={`w-full rounded-xl border px-4 py-3 text-slate-900 outline-none transition ${
                      editing
                        ? "border-slate-300 bg-white focus:border-orange-500 focus:ring-2 focus:ring-orange-100"
                        : "border-slate-200 bg-slate-50"
                    }`}
                  />

                  <p className="mt-2 text-xs leading-5 text-slate-500">
                    Customers can choose to leave an honest review
                    on Google.
                  </p>
                </div>

                {/* BUTTONS */}
                {editing && (
                  <div className="flex flex-col gap-3 pt-2 sm:flex-row">
                    <button
                      type="submit"
                      disabled={saving}
                      className="rounded-xl bg-orange-500 px-6 py-3 font-semibold text-white transition hover:bg-orange-600 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {saving ? "Saving..." : "Save Changes"}
                    </button>

                    <button
                      type="button"
                      onClick={handleCancel}
                      disabled={saving}
                      className="rounded-xl border border-slate-300 px-6 py-3 font-semibold text-slate-700 transition hover:bg-slate-50"
                    >
                      Cancel
                    </button>
                  </div>
                )}
              </form>
            </div>
          </section>

          {/* SIDE CARD */}
          <aside className="space-y-5">
            <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
              <p className="text-sm font-semibold text-slate-500">
                Your Cafe
              </p>

              <div className="mt-5 flex items-center gap-4">
                <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-orange-50">
                  <span className="text-2xl">☕</span>
                </div>

                <div className="min-w-0">
                  <h3 className="truncate text-lg font-bold text-slate-950">
                    {cafe.name}
                  </h3>

                  <p className="mt-1 text-xs text-slate-500">
                    CafeFlow customer page
                  </p>
                </div>
              </div>

              <Link
                href={`/c/${cafe.id}`}
                target="_blank"
                className="mt-6 block rounded-xl border border-slate-300 px-4 py-3 text-center text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
              >
                Preview Customer Page
              </Link>
            </div>

            <div className="rounded-3xl border border-orange-100 bg-orange-50 p-6">
              <p className="text-sm font-semibold text-orange-600">
                QR Code
              </p>

              <h3 className="mt-2 font-bold text-slate-950">
                Ready to collect feedback?
              </h3>

              <p className="mt-2 text-sm leading-6 text-slate-600">
                Download your permanent CafeFlow QR code and place
                it where customers can easily scan it.
              </p>

              <Link
                href="/dashboard/qr"
                className="mt-5 block rounded-xl bg-orange-500 px-4 py-3 text-center text-sm font-semibold text-white transition hover:bg-orange-600"
              >
                Manage QR Code
              </Link>
            </div>
          </aside>
        </div>
      </div>
    </main>
  );
}