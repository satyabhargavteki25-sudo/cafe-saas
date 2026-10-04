"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import { collection, getDocs, limit, query, where } from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";
import { auth, db } from "@/src/lib/firebase";
import { useRouter } from "next/navigation";
import { QRCodeCanvas } from "qrcode.react";

type Cafe = {
  id: string;
  name: string;
};

export default function QRCodePage() {
  const router = useRouter();

  const [cafe, setCafe] = useState<Cafe | null>(null);
  const [customerUrl, setCustomerUrl] = useState("");

  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState(false);

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

        setCafe({
          id: cafeDoc.id,
          name: data.name ?? "My Cafe",
        });

        if (typeof window !== "undefined") {
          setCustomerUrl(
            `${window.location.origin}/c/${cafeDoc.id}`
          );
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, [router]);

  function downloadQRCode() {
    const canvas = document.getElementById(
      "cafeflow-qr"
    ) as HTMLCanvasElement | null;

    if (!canvas || !cafe) return;

    setDownloading(true);

    try {
      const pngUrl = canvas.toDataURL("image/png");

      const downloadLink = document.createElement("a");

      downloadLink.href = pngUrl;
      downloadLink.download = `${cafe.name
        .replace(/[^a-z0-9]/gi, "-")
        .toLowerCase()}-cafeflow-qr.png`;

      document.body.appendChild(downloadLink);
      downloadLink.click();
      document.body.removeChild(downloadLink);
    } finally {
      setDownloading(false);
    }
  }

  function printQRCode() {
    window.print();
  }

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-50">
        <div className="text-center">
          <div className="mx-auto h-10 w-10 animate-spin rounded-full border-4 border-orange-100 border-t-orange-500" />

          <p className="mt-4 text-sm font-medium text-slate-600">
            Loading QR code...
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
      <header className="border-b border-slate-200 bg-white print:hidden">
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

      <div className="mx-auto max-w-6xl px-6 py-10 lg:px-8">
        {/* HEADER */}
        <div className="print:hidden">
          <p className="text-sm font-semibold text-orange-500">
            QR Management
          </p>

          <h1 className="mt-2 text-3xl font-bold tracking-tight text-slate-950">
            Your Cafe QR Code
          </h1>

          <p className="mt-2 max-w-2xl leading-7 text-slate-600">
            Customers can scan this QR code to open your feedback page.
          </p>
        </div>

        {/* MAIN GRID */}
        <div className="mt-8 grid gap-8 lg:grid-cols-[1fr_1.2fr]">
          {/* QR CARD */}
          <section
            id="qr-print-area"
            className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm"
          >
            <div className="text-center">
              <p className="text-sm font-semibold text-orange-500">
                {cafe.name}
              </p>

              <h2 className="mt-2 text-2xl font-bold text-slate-950">
                Scan to Share Feedback
              </h2>

              <p className="mt-2 text-sm text-slate-500">
                Point your phone camera at the QR code.
              </p>
            </div>

            <div className="mt-8 flex justify-center">
              <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
                {customerUrl && (
                  <QRCodeCanvas
                    id="cafeflow-qr"
                    value={customerUrl}
                    size={280}
                    level="H"
                    includeMargin
                    imageSettings={{
                      src: "/logo.jpeg",
                      height: 44,
                      width: 44,
                      excavate: true,
                    }}
                  />
                )}
              </div>
            </div>

            <div className="mt-7 text-center">
              <p className="text-xs font-medium uppercase tracking-wider text-slate-400">
                Customer Page
              </p>

              <p className="mt-2 break-all text-sm font-medium text-slate-600">
                {customerUrl}
              </p>
            </div>

            {/* PRINT VERSION */}
            <div className="hidden print:block print:mt-8">
              <p className="text-center text-sm text-slate-500">
                Powered by CafeFlow
              </p>
            </div>
          </section>

          {/* INFORMATION CARD */}
          <section className="space-y-5 print:hidden">
            {/* DOWNLOAD */}
            <div className="rounded-3xl border border-slate-200 bg-white p-7 shadow-sm">
              <h2 className="text-xl font-bold text-slate-950">
                Use your QR anywhere
              </h2>

              <p className="mt-2 text-sm leading-6 text-slate-500">
                Download the QR image and place it on tables, counters,
                receipts, takeaway bags, menus, or posters.
              </p>

              <div className="mt-6 grid gap-3 sm:grid-cols-2">
                <button
                  type="button"
                  onClick={downloadQRCode}
                  disabled={downloading}
                  className="rounded-xl bg-orange-500 px-5 py-3.5 font-semibold text-white transition hover:bg-orange-600 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {downloading
                    ? "Preparing..."
                    : "Download QR"}
                </button>

                <button
                  type="button"
                  onClick={printQRCode}
                  className="rounded-xl border border-slate-300 px-5 py-3.5 font-semibold text-slate-700 transition hover:bg-slate-50"
                >
                  Print QR
                </button>
              </div>
            </div>

            {/* PERMANENT QR */}
            <div className="rounded-3xl border border-green-200 bg-green-50 p-7">
              <div className="flex items-start gap-4">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white text-xl shadow-sm">
                  ✓
                </div>

                <div>
                  <h2 className="font-bold text-slate-950">
                    Your QR is permanent
                  </h2>

                  <p className="mt-2 text-sm leading-6 text-slate-600">
                    You can change your WhatsApp number, Google Review
                    link, or other cafe settings without changing this QR
                    code.
                  </p>
                </div>
              </div>
            </div>

            {/* HOW IT WORKS */}
            <div className="rounded-3xl border border-slate-200 bg-white p-7 shadow-sm">
              <h2 className="text-xl font-bold text-slate-950">
                How it works
              </h2>

              <div className="mt-6 space-y-5">
                <div className="flex gap-4">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-orange-100 text-sm font-bold text-orange-600">
                    1
                  </div>

                  <div>
                    <h3 className="font-semibold text-slate-900">
                      Customer scans
                    </h3>

                    <p className="mt-1 text-sm leading-6 text-slate-500">
                      The customer scans the QR using their phone.
                    </p>
                  </div>
                </div>

                <div className="flex gap-4">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-orange-100 text-sm font-bold text-orange-600">
                    2
                  </div>

                  <div>
                    <h3 className="font-semibold text-slate-900">
                      Customer gives feedback
                    </h3>

                    <p className="mt-1 text-sm leading-6 text-slate-500">
                      They select a rating and write their experience.
                    </p>
                  </div>
                </div>

                <div className="flex gap-4">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-orange-100 text-sm font-bold text-orange-600">
                    3
                  </div>

                  <div>
                    <h3 className="font-semibold text-slate-900">
                      Cafe receives it
                    </h3>

                    <p className="mt-1 text-sm leading-6 text-slate-500">
                      The feedback appears in your CafeFlow dashboard.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* PREVIEW */}
            <Link
              href={`/c/${cafe.id}`}
              target="_blank"
              className="block rounded-3xl border border-orange-100 bg-orange-50 p-7 transition hover:border-orange-200"
            >
              <p className="text-sm font-semibold text-orange-600">
                Preview
              </p>

              <h2 className="mt-2 text-xl font-bold text-slate-950">
                See the customer page →
              </h2>

              <p className="mt-2 text-sm leading-6 text-slate-600">
                Open exactly what customers will see after scanning your QR.
              </p>
            </Link>
          </section>
        </div>
      </div>

      <style jsx global>{`
        @media print {
          body {
            background: white !important;
          }

          #qr-print-area {
            border: none !important;
            box-shadow: none !important;
          }
        }
      `}</style>
    </main>
  );
}