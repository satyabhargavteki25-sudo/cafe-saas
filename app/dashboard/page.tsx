
"use client";

import { useEffect, useState } from "react";
import type { ReactElement } from "react";
import { QRCodeCanvas } from "qrcode.react";
import { auth, db } from "@/src/lib/firebase";
import {
  collection,
  getDocs,
  query,
  where,
} from "firebase/firestore";
import { useRouter } from "next/navigation";

type Cafe = {
  id: string;
  name: string;
};

type QRType = "table" | "billing" | "menu";

type QRCardProps = {
  type: QRType;
  title: string;
  description: string;
  icon: string;
  url: string;
  active: boolean;
};

function QRCard({
  type,
  title,
  description,
  icon,
  url,
  active,
}: QRCardProps): ReactElement {
  const canvasId = `qr-${type}`;

  const handleDownload = (): void => {
    const canvas = document.getElementById(
      canvasId
    ) as HTMLCanvasElement | null;

    if (!canvas) {
      return;
    }

    const downloadLink = document.createElement("a");
    downloadLink.href = canvas.toDataURL("image/png");
    downloadLink.download = `${type}-qr-code.png`;
    document.body.appendChild(downloadLink);
    downloadLink.click();
    document.body.removeChild(downloadLink);
  };

  const handlePrint = (): void => {
    const canvas = document.getElementById(
      canvasId
    ) as HTMLCanvasElement | null;

    if (!canvas) {
      return;
    }

    const imageData = canvas.toDataURL("image/png");
    const printWindow = window.open("", "_blank");

    if (!printWindow) {
      alert("Please allow pop-ups to print the QR code.");
      return;
    }

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>${title}</title>
          <style>
            * { box-sizing: border-box; }
            body {
              margin: 0;
              padding: 32px;
              font-family: Arial, sans-serif;
              text-align: center;
              background: white;
              color: #111827;
            }
            .container {
              max-width: 420px;
              margin: 0 auto;
            }
            h1 {
              font-size: 24px;
              margin-bottom: 12px;
            }
            p {
              color: #4b5563;
              font-size: 14px;
              line-height: 1.5;
              margin: 0 0 20px;
            }
            img {
              width: 260px;
              height: 260px;
              display: block;
              margin: 0 auto;
            }
          </style>
        </head>
        <body>
          <div class="container">
            <h1>${title}</h1>
            <p>${description}</p>
            <img src="${imageData}" alt="${title}" />
          </div>
        </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.focus();
    printWindow.print();
  };

  const handleCopyLink = async (): Promise<void> => {
    try {
      await navigator.clipboard.writeText(url);
    } catch (error) {
      console.error("Failed to copy QR link:", error);
    }
  };

  return (
    <div className="rounded-3xl border border-gray-200 bg-white p-5 shadow-sm ring-1 ring-gray-100">
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gray-100 text-xl">
            {icon}
          </div>
          <div>
            <div className="text-xs font-semibold uppercase tracking-[0.18em] text-gray-500">
              QR Code
            </div>
            <h3 className="mt-1 text-lg font-bold text-gray-900">
              {title}
            </h3>
          </div>
        </div>

        <span
          className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ${
            active
              ? "bg-emerald-100 text-emerald-700"
              : "bg-amber-100 text-amber-700"
          }`}
        >
          {active ? "Active" : "Pending"}
        </span>
      </div>

      <div className="mt-6 rounded-2xl border border-gray-200 bg-gray-50 p-4">
        <div className="mx-auto flex w-full max-w-[220px] items-center justify-center rounded-2xl bg-white p-3 shadow-inner">
          <QRCodeCanvas
            id={canvasId}
            value={url}
            size={176}
            bgColor="#ffffff"
            fgColor="#111827"
            level="M"
            includeMargin={true}
          />
        </div>
      </div>

      <p className="mt-5 text-sm leading-6 text-gray-600">
        {description}
      </p>

      <div className="mt-6 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={handleCopyLink}
          className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-xs font-semibold text-gray-700 transition hover:bg-gray-50"
        >
          Copy Link
        </button>

        <button
          type="button"
          onClick={handleDownload}
          className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-xs font-semibold text-gray-700 transition hover:bg-gray-50"
        >
          Download
        </button>

        <button
          type="button"
          onClick={handlePrint}
          className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-xs font-semibold text-gray-700 transition hover:bg-gray-50"
        >
          Print
        </button>
      </div>
    </div>
  );
}

export default function QRPage(): ReactElement | null {
  const router = useRouter();

  const [cafe, setCafe] = useState<Cafe | null>(null);
  const [loading, setLoading] = useState(true);
  const [customerUrl, setCustomerUrl] = useState("");
  const [menuUrl, setMenuUrl] = useState("");

  useEffect(() => {
    const loadCafe = async () => {
      try {
        const user = auth.currentUser;

        if (!user) {
          router.push("/login");
          return;
        }

        const cafeQuery = query(
          collection(db, "cafes"),
          where("ownerId", "==", user.uid)
        );

        const snapshot = await getDocs(cafeQuery);

        if (snapshot.empty) {
          router.push("/onboarding");
          return;
        }

        const cafeDoc = snapshot.docs[0];

        const cafeData: Cafe = {
          id: cafeDoc.id,
          name: cafeDoc.data().name || "My Cafe",
        };

        setCafe(cafeData);

        const origin = window.location.origin;

        setCustomerUrl(`${origin}/c/${cafeData.id}`);
        setMenuUrl(`${origin}/menu/${cafeData.id}`);
      } catch (error) {
        console.error("Error loading cafe:", error);
      } finally {
        setLoading(false);
      }
    };

    loadCafe();
  }, [router]);

  const downloadQR = (
    canvasId: string,
    fileName: string
  ): void => {
    const canvas = document.getElementById(
      canvasId
    ) as HTMLCanvasElement | null;

    if (!canvas) {
      return;
    }

    const pngUrl = canvas.toDataURL("image/png");

    const downloadLink = document.createElement("a");

    downloadLink.href = pngUrl;
    downloadLink.download = fileName;

    document.body.appendChild(downloadLink);
    downloadLink.click();
    document.body.removeChild(downloadLink);
  };

  const printQR = (
    canvasId: string,
    title: string,
    description: string
  ): void => {
    const canvas = document.getElementById(
      canvasId
    ) as HTMLCanvasElement | null;

    if (!canvas || !cafe) {
      return;
    }

    const imageData = canvas.toDataURL("image/png");

    const printWindow = window.open("", "_blank");

    if (!printWindow) {
      alert("Please allow pop-ups to print the QR code.");
      return;
    }

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>${title} - ${cafe.name}</title>

          <style>
            * {
              box-sizing: border-box;
            }

            body {
              margin: 0;
              padding: 40px;
              font-family: Arial, sans-serif;
              text-align: center;
              background: white;
              color: #111827;
            }

            .container {
              max-width: 500px;
              margin: 0 auto;
            }

            h1 {
              font-size: 28px;
              margin-bottom: 8px;
            }

            h2 {
              font-size: 20px;
              margin-bottom: 12px;
            }

            p {
              color: #4b5563;
              font-size: 15px;
              line-height: 1.5;
              margin-bottom: 25px;
            }

            img {
              width: 320px;
              height: 320px;
            }

            .footer {
              margin-top: 25px;
              font-size: 14px;
              color: #6b7280;
            }

            @media print {
              body {
                padding: 20px;
              }
            }
          </style>
        </head>

        <body>
          <div class="container">

            <h1>${cafe.name}</h1>

            <h2>${title}</h2>

            <p>${description}</p>

            <img src="${imageData}" />

            <div class="footer">
              Scan the QR code with your phone
            </div>

          </div>

          <script>
            window.onload = function() {
              window.print();
            };
          </script>
        </body>
      </html>
    `);

    printWindow.document.close();
  };

  /* Loading */
  if (loading) {
    return (
      <main className="min-h-screen bg-gray-50">
        <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
          <div className="animate-pulse">
            <div className="h-8 w-48 rounded bg-gray-200" />

            <div className="mt-3 h-4 w-80 rounded bg-gray-200" />

            <div className="mt-10 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              <div className="h-[580px] rounded-3xl bg-gray-200" />
              <div className="h-[580px] rounded-3xl bg-gray-200" />
              <div className="h-[580px] rounded-3xl bg-gray-200" />
            </div>
          </div>
        </div>
      </main>
    );
  }

  if (!cafe) {
    return null;
  }

  return (
    <main className="min-h-screen bg-gray-50">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 lg:py-10">

        {/* Back */}
        <button
          type="button"
          onClick={() => router.push("/dashboard")}
          className="mb-6 text-sm font-medium text-gray-500 transition hover:text-gray-900"
        >
          ← Back to Dashboard
        </button>

        {/* Header */}
        <div className="mb-10">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="mb-2 text-sm font-semibold text-gray-500">
                {cafe.name}
              </p>

              <h1 className="text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl">
                QR Management
              </h1>

              <p className="mt-3 max-w-2xl text-sm leading-6 text-gray-500 sm:text-base">
                Manage the QR codes customers use to give
                feedback and access your future digital menu.
              </p>
            </div>

            <button
              type="button"
              onClick={() =>
                router.push("/dashboard/cafe")
              }
              className="rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm font-semibold text-gray-700 shadow-sm transition hover:bg-gray-50"
            >
              Cafe Settings
            </button>
          </div>
        </div>

        {/* QR Cards */}
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">

          {/* TABLE FEEDBACK */}
          <QRCard
            type="table"
            title="Table Feedback QR"
            description="Place this QR code on customer tables. Customers can scan it and directly submit feedback."
            icon="🍽️"
            url={customerUrl}
            active={true}
          />

          {/* BILLING FEEDBACK */}
          <QRCard
            type="billing"
            title="Billing Feedback QR"
            description="Place this QR code near your billing counter or on the payment book for post-payment feedback."
            icon="💳"
            url={customerUrl}
            active={true}
          />

          {/* DIGITAL MENU */}
          <QRCard
            type="menu"
            title="Digital Menu QR"
            description="Customers will scan this QR to view your digital menu, categories, items, prices and availability."
            icon="📋"
            url={menuUrl}
            active={false}
          />

        </div>

        {/* How It Works */}
        <section className="mt-10 rounded-3xl border border-gray-200 bg-white p-6 shadow-sm sm:p-8">
          <h2 className="text-xl font-bold text-gray-900">
            How CafeFlow QR works
          </h2>

          <div className="mt-6 grid gap-6 md:grid-cols-3">

            <div>
              <div className="mb-3 text-3xl">
                📱
              </div>

              <h3 className="font-semibold text-gray-900">
                1. Customer scans
              </h3>

              <p className="mt-2 text-sm leading-6 text-gray-500">
                The customer scans the QR code using their
                phone camera.
              </p>
            </div>

            <div>
              <div className="mb-3 text-3xl">
                ⭐
              </div>

              <h3 className="font-semibold text-gray-900">
                2. Customer responds
              </h3>

              <p className="mt-2 text-sm leading-6 text-gray-500">
                They submit their rating, category and feedback
                through CafeFlow.
              </p>
            </div>

            <div>
              <div className="mb-3 text-3xl">
                📊
              </div>

              <h3 className="font-semibold text-gray-900">
                3. You see the feedback
              </h3>

              <p className="mt-2 text-sm leading-6 text-gray-500">
                Feedback is stored in your CafeFlow dashboard
                for analysis and improvement.
              </p>
            </div>

          </div>
        </section>

        {/* Future */}
        <section className="mt-6 rounded-3xl border border-gray-200 bg-white p-6 shadow-sm sm:p-8">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">

            <div>
              <h2 className="text-xl font-bold text-gray-900">
                Coming next
              </h2>

              <p className="mt-2 max-w-2xl text-sm leading-6 text-gray-500">
                The Digital Menu QR will become a full customer
                menu with categories, items, prices, images and
                availability.
              </p>
            </div>

            <div className="rounded-2xl bg-gray-50 px-5 py-4 text-center">
              <p className="text-2xl font-bold text-gray-900">
                3
              </p>

              <p className="text-xs font-medium text-gray-500">
                QR Types
              </p>
            </div>

          </div>
        </section>

      </div>
    </main>
  );
}

