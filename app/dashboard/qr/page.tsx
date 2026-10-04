"use client";

import { useEffect, useState } from "react";
import { onAuthStateChanged, User } from "firebase/auth";
import { collection, getDocs, query, where } from "firebase/firestore";
import { QRCodeCanvas } from "qrcode.react";

import { auth, db } from "@/src/lib/firebase";

type Cafe = {
  id: string;
  name?: string;
};

export default function QRPage() {
  const [user, setUser] = useState<User | null>(null);
  const [cafe, setCafe] = useState<Cafe | null>(null);
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
        const cafesQuery = query(
          collection(db, "cafes"),
          where("ownerId", "==", currentUser.uid)
        );

        const snapshot = await getDocs(cafesQuery);

        if (snapshot.empty) {
          setError("No cafe is connected to this owner account.");
          setLoading(false);
          return;
        }

        const cafeDoc = snapshot.docs[0];

        setCafe({
          id: cafeDoc.id,
          ...cafeDoc.data(),
        });
      } catch (err) {
        console.error("QR cafe loading error:", err);
        setError("Failed to load cafe.");
      }

      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const customerUrl =
    typeof window !== "undefined" && cafe
      ? `${window.location.origin}/c/${cafe.id}`
      : "";

  const downloadQR = () => {
    const canvas = document.getElementById(
      "cafe-qr-code"
    ) as HTMLCanvasElement | null;

    if (!canvas) {
      return;
    }

    const pngUrl = canvas
      .toDataURL("image/png")
      .replace("image/png", "image/octet-stream");

    const downloadLink = document.createElement("a");

    downloadLink.href = pngUrl;
    downloadLink.download = `${cafe?.name || "cafe"}-qr-code.png`;

    document.body.appendChild(downloadLink);
    downloadLink.click();
    document.body.removeChild(downloadLink);
  };

  const printQR = () => {
    window.print();
  };

  if (loading) {
    return (
      <main className="min-h-screen bg-[#FFF8F0] flex items-center justify-center">
        <p className="text-[#6F4E37] text-lg">
          Loading QR code...
        </p>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#FFF8F0]">
      {/* Header */}
      <header className="bg-[#3E2723] text-white px-6 py-5">
        <div className="max-w-5xl mx-auto">
          <p className="text-2xl font-bold">
            ☕ CafeFlow
          </p>

          <p className="text-sm text-[#E8D5C4]">
            Customer QR code
          </p>
        </div>
      </header>

      <div className="max-w-5xl mx-auto px-6 py-8">

        <a
          href="/dashboard"
          className="text-[#6F4E37] font-medium hover:underline"
        >
          ← Dashboard
        </a>

        <div className="mt-6">
          <h1 className="text-3xl font-bold text-[#3E2723]">
            Customer QR Code
          </h1>

          <p className="mt-2 text-gray-600">
            Customers can scan this QR code to leave feedback.
          </p>
        </div>

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
          <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-8">

            {/* QR card */}
            <div
              id="qr-print-area"
              className="bg-white rounded-2xl border border-[#E8D5C4] shadow-sm p-8 text-center"
            >
              <p className="text-4xl">
                ☕
              </p>

              <h2 className="mt-3 text-2xl font-bold text-[#3E2723]">
                {cafe.name}
              </h2>

              <p className="mt-2 text-gray-500">
                Scan to share your feedback
              </p>

              <div className="mt-8 flex justify-center">
                {customerUrl && (
                  <QRCodeCanvas
                    id="cafe-qr-code"
                    value={customerUrl}
                    size={240}
                    bgColor="#ffffff"
                    fgColor="#3E2723"
                    level="H"
                    includeMargin
                  />
                )}
              </div>

              <p className="mt-6 text-sm text-gray-500">
                Scan this QR code with your phone camera.
              </p>
            </div>

            {/* Information card */}
            <div className="space-y-5">

              <div className="bg-white rounded-2xl border border-[#E8D5C4] shadow-sm p-6">
                <p className="text-sm text-gray-500">
                  Customer URL
                </p>

                <p className="mt-2 break-all font-mono text-sm text-[#6F4E37]">
                  {customerUrl}
                </p>
              </div>

              <div className="bg-white rounded-2xl border border-[#E8D5C4] shadow-sm p-6">
                <h2 className="text-xl font-bold text-[#3E2723]">
                  How to use it
                </h2>

                <ol className="mt-4 space-y-3 text-gray-600">
                  <li>
                    <strong>1.</strong> Download the QR code.
                  </li>

                  <li>
                    <strong>2.</strong> Print it.
                  </li>

                  <li>
                    <strong>3.</strong> Place it on tables or near the billing counter.
                  </li>

                  <li>
                    <strong>4.</strong> Customers scan it and submit feedback.
                  </li>
                </ol>
              </div>

              <div className="flex flex-col sm:flex-row gap-3">
                <button
                  type="button"
                  onClick={downloadQR}
                  className="flex-1 rounded-xl bg-[#6F4E37] py-3 font-semibold text-white hover:bg-[#5D4037]"
                >
                  ⬇️ Download QR
                </button>

                <button
                  type="button"
                  onClick={printQR}
                  className="flex-1 rounded-xl border border-[#6F4E37] py-3 font-semibold text-[#6F4E37] hover:bg-[#F5EADF]"
                >
                  🖨️ Print QR
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      <style jsx global>{`
        @media print {
          body {
            background: white !important;
          }

          body * {
            visibility: hidden;
          }

          #qr-print-area,
          #qr-print-area * {
            visibility: visible;
          }

          #qr-print-area {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
            border: none !important;
            box-shadow: none !important;
          }
        }
      `}</style>
    </main>
  );
}