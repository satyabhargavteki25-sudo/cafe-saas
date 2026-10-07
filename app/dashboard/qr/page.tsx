"use client";

import { useEffect, useRef, useState } from "react";
import { onAuthStateChanged } from "firebase/auth";
import {
  collection,
  getDocs,
  limit,
  query,
  where,
} from "firebase/firestore";
import { QRCodeCanvas } from "qrcode.react";

import { auth, db } from "@/src/lib/firebase";

type CafeData = {
  id: string;
  name: string;
};

type QRCardProps = {
  title: string;
  description: string;
  url: string;
  fileName: string;
  active?: boolean;
};

function QRCard({
  title,
  description,
  url,
  fileName,
  active = true,
}: QRCardProps) {
  const qrRef = useRef<HTMLCanvasElement | null>(null);

  const downloadQR = () => {
    const canvas = qrRef.current;

    if (!canvas) {
      return;
    }

    const imageUrl = canvas.toDataURL("image/png");

    const link = document.createElement("a");
    link.href = imageUrl;
    link.download = `${fileName}.png`;

    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const printQR = () => {
    window.print();
  };

  if (!active) {
    return (
      <div className="flex h-full flex-col rounded-3xl border border-dashed border-slate-300 bg-slate-50 p-6">
        <div className="mb-5 flex items-start justify-between gap-4">
          <div>
            <h2 className="text-lg font-bold text-slate-900">{title}</h2>

            <p className="mt-1 text-sm leading-6 text-slate-500">
              {description}
            </p>
          </div>

          <span className="shrink-0 rounded-full bg-slate-200 px-3 py-1 text-xs font-semibold text-slate-600">
            Coming Soon
          </span>
        </div>

        <div className="flex flex-1 items-center justify-center rounded-2xl bg-white p-10">
          <div className="text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-100 text-3xl">
              📋
            </div>

            <h3 className="font-semibold text-slate-800">
              Digital Menu QR
            </h3>

            <p className="mx-auto mt-2 max-w-xs text-sm leading-6 text-slate-500">
              Your digital menu will have its own QR code here.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="mb-5">
        <h2 className="text-lg font-bold text-slate-900">{title}</h2>

        <p className="mt-1 text-sm leading-6 text-slate-500">
          {description}
        </p>
      </div>

      <div className="flex flex-1 flex-col items-center">
        <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <QRCodeCanvas
            ref={qrRef}
            value={url}
            size={220}
            level="H"
            includeMargin
          />
        </div>

        <p className="mt-4 max-w-sm break-all text-center text-xs leading-5 text-slate-400">
          {url}
        </p>

        <div className="mt-6 grid w-full grid-cols-2 gap-3">
          <button
            type="button"
            onClick={downloadQR}
            className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
          >
            ↓ Download
          </button>

          <button
            type="button"
            onClick={printQR}
            className="rounded-xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white transition hover:bg-slate-800"
          >
            🖨 Print
          </button>
        </div>
      </div>
    </div>
  );
}

export default function QRPage() {
  const [cafe, setCafe] = useState<CafeData | null>(null);
  const [origin, setOrigin] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    setOrigin(window.location.origin);

    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        window.location.href = "/login";
        return;
      }

      try {
        setLoading(true);
        setError("");

        const cafesQuery = query(
          collection(db, "cafes"),
          where("ownerId", "==", user.uid),
          limit(1)
        );

        const snapshot = await getDocs(cafesQuery);

        if (snapshot.empty) {
          window.location.href = "/onboarding";
          return;
        }

        const cafeDocument = snapshot.docs[0];

        setCafe({
          id: cafeDocument.id,
          name: cafeDocument.data().name || "My Cafe",
        });
      } catch (err) {
        console.error("QR page error:", err);
        setError("Unable to load your cafe information.");
      } finally {
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, []);

  if (loading) {
    return (
      <main className="min-h-screen bg-slate-50 p-6">
        <div className="mx-auto max-w-7xl">
          <div className="mb-8">
            <div className="h-8 w-48 animate-pulse rounded-lg bg-slate-200" />
            <div className="mt-3 h-4 w-80 animate-pulse rounded bg-slate-200" />
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            <div className="h-[500px] animate-pulse rounded-3xl bg-slate-200" />
            <div className="h-[500px] animate-pulse rounded-3xl bg-slate-200" />
          </div>
        </div>
      </main>
    );
  }

  if (error) {
    return (
      <main className="min-h-screen bg-slate-50 p-6">
        <div className="mx-auto max-w-2xl">
          <div className="rounded-3xl border border-red-200 bg-red-50 p-6">
            <h1 className="text-lg font-bold text-red-900">
              Something went wrong
            </h1>

            <p className="mt-2 text-sm text-red-700">{error}</p>

            <button
              type="button"
              onClick={() => window.location.reload()}
              className="mt-5 rounded-xl bg-red-600 px-5 py-3 text-sm font-semibold text-white hover:bg-red-700"
            >
              Try Again
            </button>
          </div>
        </div>
      </main>
    );
  }

  if (!cafe || !origin) {
    return null;
  }

  const customerUrl = `${origin}/c/${cafe.id}`;

  const tableQRUrl = `${customerUrl}?source=table`;

  const billingQRUrl = `${customerUrl}?source=billing`;

  const menuQRUrl = `${origin}/menu/${cafe.id}`;

  return (
    <main className="min-h-screen bg-slate-50 p-4 sm:p-6 lg:p-8">
      <div className="mx-auto max-w-7xl">
        {/* Header */}
        <div className="mb-8">
          <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
            <div>
              <div className="mb-2 inline-flex items-center gap-2 rounded-full bg-white px-3 py-1.5 text-xs font-semibold text-slate-600 shadow-sm ring-1 ring-slate-200">
                <span>⚡</span>
                CafeFlow QR Manager
              </div>

              <h1 className="text-3xl font-black tracking-tight text-slate-950 sm:text-4xl">
                QR Codes
              </h1>

              <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500 sm:text-base">
                Generate QR codes for{" "}
                <span className="font-semibold text-slate-700">
                  {cafe.name}
                </span>{" "}
                and collect customer feedback at different points of your
                cafe.
              </p>
            </div>

            <a
              href="/dashboard"
              className="inline-flex items-center justify-center rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50"
            >
              ← Dashboard
            </a>
          </div>
        </div>

        {/* Info banner */}
        <div className="mb-8 rounded-2xl border border-blue-100 bg-blue-50 p-4 sm:p-5">
          <div className="flex gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-100 text-xl">
              💡
            </div>

            <div>
              <h2 className="font-bold text-blue-950">
                Recommended QR setup
              </h2>

              <p className="mt-1 text-sm leading-6 text-blue-800">
                Place the Table QR on dining tables and the Billing QR near
                the payment counter. Both open the same feedback page while
                recording where the feedback came from.
              </p>
            </div>
          </div>
        </div>

        {/* QR Cards */}
        <div className="grid gap-6 lg:grid-cols-2">
          <QRCard
            title="🍽️ Table Feedback QR"
            description="Place this QR code on dining tables so customers can quickly share their experience."
            url={tableQRUrl}
            fileName={`${cafe.name}-table-feedback-qr`}
          />

          <QRCard
            title="💳 Billing Feedback QR"
            description="Place this QR code near the billing or payment counter for customers to submit feedback before leaving."
            url={billingQRUrl}
            fileName={`${cafe.name}-billing-feedback-qr`}
          />

          <QRCard
            title="📋 Digital Menu QR"
            description="This QR will open your future digital menu. The menu system can be connected later."
            url={menuQRUrl}
            fileName={`${cafe.name}-digital-menu-qr`}
            active={false}
          />
        </div>

        {/* Setup guide */}
        <section className="mt-8 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-xl font-bold text-slate-950">
            Where should you place the QR codes?
          </h2>

          <div className="mt-6 grid gap-4 md:grid-cols-3">
            <div className="rounded-2xl bg-slate-50 p-5">
              <div className="text-2xl">🍽️</div>

              <h3 className="mt-3 font-bold text-slate-900">
                Dining Tables
              </h3>

              <p className="mt-2 text-sm leading-6 text-slate-500">
                Put the Table Feedback QR on every table. Customers can scan
                it immediately after eating.
              </p>
            </div>

            <div className="rounded-2xl bg-slate-50 p-5">
              <div className="text-2xl">💳</div>

              <h3 className="mt-3 font-bold text-slate-900">
                Billing Counter
              </h3>

              <p className="mt-2 text-sm leading-6 text-slate-500">
                Put the Billing QR beside the payment counter so customers
                can give feedback before they leave.
              </p>
            </div>

            <div className="rounded-2xl bg-slate-50 p-5">
              <div className="text-2xl">📋</div>

              <h3 className="mt-3 font-bold text-slate-900">
                Digital Menu
              </h3>

              <p className="mt-2 text-sm leading-6 text-slate-500">
                The Digital Menu QR will be activated when the CafeFlow menu
                feature is ready.
              </p>
            </div>
          </div>
        </section>

        {/* Feedback flow */}
        <section className="mt-6 rounded-3xl border border-slate-200 bg-slate-900 p-6 text-white shadow-sm">
          <div className="grid gap-6 lg:grid-cols-3">
            <div>
              <p className="text-sm font-semibold text-slate-400">
                Customer scans
              </p>

              <h3 className="mt-1 text-lg font-bold">
                QR Code
              </h3>

              <p className="mt-2 text-sm leading-6 text-slate-400">
                Customer opens your CafeFlow feedback page.
              </p>
            </div>

            <div>
              <p className="text-sm font-semibold text-slate-400">
                Customer gives
              </p>

              <h3 className="mt-1 text-lg font-bold">
                Rating + Feedback
              </h3>

              <p className="mt-2 text-sm leading-6 text-slate-400">
                They select a rating, category and write their experience.
              </p>
            </div>

            <div>
              <p className="text-sm font-semibold text-slate-400">
                CafeFlow automatically
              </p>

              <h3 className="mt-1 text-lg font-bold">
                Routes the feedback
              </h3>

              <p className="mt-2 text-sm leading-6 text-slate-400">
                Lower ratings go to WhatsApp while happy customers are guided
                to your Google Review page.
              </p>
            </div>
          </div>
        </section>
      </div>

      {/* Print styles */}
      <style jsx global>{`
        @media print {
          body {
            background: white !important;
          }

          nav,
          header,
          button,
          a,
          .no-print {
            display: none !important;
          }

          main {
            padding: 0 !important;
            background: white !important;
          }

          .rounded-3xl {
            break-inside: avoid;
          }
        }
      `}</style>
    </main>
  );
}