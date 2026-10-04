"use client";

import { useEffect, useState } from "react";
import { onAuthStateChanged, User } from "firebase/auth";
import {
  collection,
  getDocs,
  query,
  updateDoc,
  where,
} from "firebase/firestore";
import Link from "next/link";

import { auth, db } from "../../../src/lib/firebase";

type Cafe = {
  id: string;
  name: string;
  whatsappNumber: string;
  googleReviewUrl: string;
};

export default function CafePage() {
  const [user, setUser] = useState<User | null>(null);
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

        const snapshot = await getDocs(cafesQuery);

        if (snapshot.empty) {
          setError("No cafe found for this account.");
          setLoading(false);
          return;
        }

        const cafeDoc = snapshot.docs[0];
        const data = cafeDoc.data();

        const cafeData: Cafe = {
          id: cafeDoc.id,
          name: data.name || "",
          whatsappNumber: data.whatsappNumber || "",
          googleReviewUrl: data.googleReviewUrl || "",
        };

        setCafe(cafeData);

        setName(cafeData.name);
        setWhatsappNumber(cafeData.whatsappNumber);
        setGoogleReviewUrl(cafeData.googleReviewUrl);
      } catch (err) {
        console.error(err);
        setError("Unable to load cafe information.");
      }

      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const handleSave = async () => {
    if (!cafe || !user) return;

    setMessage("");
    setError("");

    if (!name.trim()) {
      setError("Cafe name is required.");
      return;
    }

    if (!whatsappNumber.trim()) {
      setError("WhatsApp number is required.");
      return;
    }

    if (!googleReviewUrl.trim()) {
      setError("Google Review link is required.");
      return;
    }

    if (
      !googleReviewUrl.startsWith("http://") &&
      !googleReviewUrl.startsWith("https://")
    ) {
      setError("Google Review link must start with http:// or https://");
      return;
    }

    try {
      setSaving(true);

      await updateDoc(
        // Firebase document reference
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (await import("firebase/firestore")).doc(db, "cafes", cafe.id),
        {
          name: name.trim(),
          whatsappNumber: whatsappNumber.trim(),
          googleReviewUrl: googleReviewUrl.trim(),
        }
      );

      setCafe({
        ...cafe,
        name: name.trim(),
        whatsappNumber: whatsappNumber.trim(),
        googleReviewUrl: googleReviewUrl.trim(),
      });

      setEditing(false);
      setMessage("Cafe details updated successfully.");
    } catch (err) {
      console.error(err);
      setError("Unable to save changes. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    if (!cafe) return;

    setName(cafe.name);
    setWhatsappNumber(cafe.whatsappNumber);
    setGoogleReviewUrl(cafe.googleReviewUrl);

    setEditing(false);
    setMessage("");
    setError("");
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#faf7f2] flex items-center justify-center">
        <div className="text-center">
          <div className="text-5xl mb-4">☕</div>

          <p className="text-[#6b5143] font-medium">
            Loading cafe settings...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#faf7f2] text-[#2d211b]">
      {/* NAVBAR */}
      <header className="sticky top-0 z-50 bg-white/95 backdrop-blur border-b border-[#eadfd5]">
        <div className="max-w-6xl mx-auto px-5 sm:px-8">
          <div className="h-20 flex items-center justify-between">
            <Link href="/dashboard" className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-xl bg-[#4b2e20] flex items-center justify-center text-2xl">
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
                <p className="text-sm font-semibold text-[#3b2418]">
                  {user?.email}
                </p>

                <p className="text-xs text-[#8b7568]">
                  Cafe Owner
                </p>
              </div>

              <button
                onClick={async () => {
                  await auth.signOut();
                  window.location.href = "/login";
                }}
                className="px-4 py-2 rounded-lg border border-[#dfd1c6] bg-white text-[#5a4032] text-sm font-semibold hover:bg-[#f7f0ea] transition"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* MAIN */}
      <main className="max-w-6xl mx-auto px-5 sm:px-8 py-10">
        {/* BREADCRUMB */}
        <div className="mb-8">
          <Link
            href="/dashboard"
            className="text-sm font-semibold text-[#8b5e3c] hover:text-[#5f3c29]"
          >
            ← Back to Dashboard
          </Link>
        </div>

        {/* HEADER */}
        <section className="mb-8">
          <p className="text-sm font-bold tracking-[0.18em] text-[#9a6b4f] uppercase mb-3">
            Cafe Settings
          </p>

          <h1 className="text-3xl sm:text-4xl font-bold text-[#3b2418]">
            My Cafe
          </h1>

          <p className="mt-3 text-[#756256]">
            Manage the information customers see when they give feedback.
          </p>
        </section>

        {/* SUCCESS MESSAGE */}
        {message && (
          <div className="mb-6 rounded-xl border border-green-200 bg-green-50 px-5 py-4 text-sm font-medium text-green-800">
            ✅ {message}
          </div>
        )}

        {/* ERROR MESSAGE */}
        {error && (
          <div className="mb-6 rounded-xl border border-red-200 bg-red-50 px-5 py-4 text-sm font-medium text-red-800">
            ⚠️ {error}
          </div>
        )}

        {cafe && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* SETTINGS CARD */}
            <section className="lg:col-span-2 bg-white border border-[#eadfd5] rounded-2xl shadow-sm">
              <div className="p-7 border-b border-[#eee5df] flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-bold text-[#3b2418]">
                    Business Information
                  </h2>

                  <p className="text-sm text-[#8b7568] mt-1">
                    Keep your cafe information up to date.
                  </p>
                </div>

                {!editing && (
                  <button
                    onClick={() => {
                      setEditing(true);
                      setMessage("");
                      setError("");
                    }}
                    className="px-5 py-2.5 rounded-xl bg-[#4b2e20] text-white font-semibold hover:bg-[#382116] transition"
                  >
                    Edit
                  </button>
                )}
              </div>

              <div className="p-7 space-y-6">
                {/* CAFE NAME */}
                <div>
                  <label className="block text-sm font-bold text-[#4b372d] mb-2">
                    Cafe Name
                  </label>

                  {editing ? (
                    <input
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="ABC Cafe"
                      className="w-full px-4 py-3 rounded-xl border border-[#d9c9bd] bg-white text-[#3b2418] outline-none focus:ring-2 focus:ring-[#b78967] focus:border-[#b78967]"
                    />
                  ) : (
                    <div className="px-4 py-3 rounded-xl bg-[#faf7f2] border border-[#eee5df] text-[#3b2418] font-semibold">
                      {cafe.name}
                    </div>
                  )}
                </div>

                {/* WHATSAPP */}
                <div>
                  <label className="block text-sm font-bold text-[#4b372d] mb-2">
                    WhatsApp Number
                  </label>

                  <p className="text-xs text-[#8b7568] mb-2">
                    Include country code. Example: 918688856097
                  </p>

                  {editing ? (
                    <input
                      type="text"
                      value={whatsappNumber}
                      onChange={(e) =>
                        setWhatsappNumber(e.target.value)
                      }
                      placeholder="918688856097"
                      className="w-full px-4 py-3 rounded-xl border border-[#d9c9bd] bg-white text-[#3b2418] outline-none focus:ring-2 focus:ring-[#b78967] focus:border-[#b78967]"
                    />
                  ) : (
                    <div className="px-4 py-3 rounded-xl bg-[#faf7f2] border border-[#eee5df] text-[#3b2418] font-semibold">
                      {cafe.whatsappNumber}
                    </div>
                  )}
                </div>

                {/* GOOGLE REVIEW */}
                <div>
                  <label className="block text-sm font-bold text-[#4b372d] mb-2">
                    Google Review Link
                  </label>

                  <p className="text-xs text-[#8b7568] mb-2">
                    Customers will use this link to leave an honest Google
                    review.
                  </p>

                  {editing ? (
                    <input
                      type="url"
                      value={googleReviewUrl}
                      onChange={(e) =>
                        setGoogleReviewUrl(e.target.value)
                      }
                      placeholder="https://g.page/r/..."
                      className="w-full px-4 py-3 rounded-xl border border-[#d9c9bd] bg-white text-[#3b2418] outline-none focus:ring-2 focus:ring-[#b78967] focus:border-[#b78967]"
                    />
                  ) : (
                    <div className="px-4 py-3 rounded-xl bg-[#faf7f2] border border-[#eee5df] text-[#3b2418] break-all">
                      {cafe.googleReviewUrl}
                    </div>
                  )}
                </div>

                {/* BUTTONS */}
                {editing && (
                  <div className="pt-3 flex flex-col sm:flex-row gap-3">
                    <button
                      onClick={handleSave}
                      disabled={saving}
                      className="px-6 py-3 rounded-xl bg-[#4b2e20] text-white font-bold hover:bg-[#382116] transition disabled:opacity-60"
                    >
                      {saving ? "Saving..." : "Save Changes"}
                    </button>

                    <button
                      onClick={handleCancel}
                      disabled={saving}
                      className="px-6 py-3 rounded-xl border border-[#d9c9bd] bg-white text-[#5a4032] font-bold hover:bg-[#f7f0ea] transition disabled:opacity-60"
                    >
                      Cancel
                    </button>
                  </div>
                )}
              </div>
            </section>

            {/* PREVIEW CARD */}
            <section className="bg-white border border-[#eadfd5] rounded-2xl shadow-sm h-fit">
              <div className="p-7 border-b border-[#eee5df]">
                <h2 className="text-xl font-bold text-[#3b2418]">
                  Customer Preview
                </h2>

                <p className="text-sm text-[#8b7568] mt-1">
                  What your customer page represents.
                </p>
              </div>

              <div className="p-7">
                <div className="rounded-2xl bg-[#faf7f2] border border-[#eee5df] p-6 text-center">
                  <div className="w-16 h-16 mx-auto rounded-2xl bg-[#4b2e20] flex items-center justify-center text-3xl">
                    ☕
                  </div>

                  <h3 className="mt-4 text-xl font-bold text-[#3b2418]">
                    {editing ? name || "Your Cafe" : cafe.name}
                  </h3>

                  <p className="mt-2 text-sm text-[#756256]">
                    We&apos;d love to hear about your experience.
                  </p>

                  <div className="mt-5 flex justify-center gap-1 text-xl">
                    ⭐ ⭐ ⭐ ⭐ ⭐
                  </div>
                </div>

                <Link
                  href={`/c/${cafe.id}`}
                  target="_blank"
                  className="mt-5 w-full inline-flex items-center justify-center px-5 py-3 rounded-xl bg-[#4b2e20] text-white font-bold hover:bg-[#382116] transition"
                >
                  Open Customer Page →
                </Link>
              </div>
            </section>
          </div>
        )}

        {/* BOTTOM INFO */}
        <section className="mt-8 bg-[#4b2e20] rounded-2xl px-7 py-8 text-white">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-5">
            <div>
              <p className="text-xs font-bold tracking-[0.18em] uppercase text-[#e8cdb9]">
                Your Cafe ID
              </p>

              <p className="mt-2 font-mono text-sm text-white break-all">
                {cafe?.id}
              </p>
            </div>

            <Link
              href="/dashboard/qr"
              className="inline-flex items-center justify-center px-6 py-3 rounded-xl bg-white text-[#4b2e20] font-bold hover:bg-[#f7eee8] transition"
            >
              📱 Get QR Code
            </Link>
          </div>
        </section>
      </main>

      {/* FOOTER */}
      <footer className="max-w-6xl mx-auto px-5 sm:px-8 py-8">
        <div className="border-t border-[#eadfd5] pt-6 text-center text-sm text-[#8b7568]">
          ☕ CafeFlow · Simple feedback management for cafes
        </div>
      </footer>
    </div>
  );
}