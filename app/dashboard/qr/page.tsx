"use client";

import Link from "next/link";
import Image from "next/image";
import {
  onAuthStateChanged,
  User,
} from "firebase/auth";
import {
  collection,
  getDocs,
  limit,
  query,
  where,
} from "firebase/firestore";
import {
  useEffect,
  useRef,
  useState,
  type ReactElement,
} from "react";
import { QRCodeCanvas } from "qrcode.react";

import { auth, db } from "@/src/lib/firebase";

type Cafe = {
  id: string;
  name: string;
  ownerId: string;
};

type QRCardProps = {
  type: "table" | "billing" | "menu";
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
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const downloadQR = () => {
    const canvas = canvasRef.current;

    if (!canvas) {
      return;
    }

    const image = canvas.toDataURL("image/png");
    const link = document.createElement("a");

    link.href = image;
    link.download = `${type}-feedback-qr.png`;

    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const printQR = () => {
    const canvas = canvasRef.current;

    if (!canvas) {
      return;
    }

    const image = canvas.toDataURL("image/png");

    const printWindow = window.open(
      "",
      "_blank",
      "width=800,height=900"
    );

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
            * {
              box-sizing: border-box;
            }

            body {
              margin: 0;
              min-height: 100vh;
              display: flex;
              align-items: center;
              justify-content: center;
              font-family: Arial, sans-serif;
              background: white;
              color: #0f172a;
            }

            .container {
              width: 100%;
              max-width: 700px;
              padding: 40px;
              text-align: center;
            }

            .logo {
              width: 72px;
              height: 72px;
              object-fit: contain;
              margin-bottom: 18px;
            }

            .brand {
              font-size: 28px;
              font-weight: 700;
              margin-bottom: 28px;
            }

            .brand-cafe {
              color: #0f172a;
            }

            .brand-flow {
              color: #f97316;
            }

            img.qr {
              width: 360px;
              height: 360px;
              max-width: 80vw;
              max-height: 80vw;
            }

            h1 {
              margin: 0 0 10px;
              font-size: 32px;
            }

            p {
              margin: 8px 0;
              color: #64748b;
              font-size: 16px;
            }

            .url {
              margin-top: 20px;
              font-size: 12px;
              color: #94a3b8;
              word-break: break-all;
            }

            .footer {
              margin-top: 28px;
              font-size: 12px;
              color: #94a3b8;
            }

            @media print {
              body {
                min-height: auto;
              }
            }
          </style>
        </head>

        <body>
          <div class="container">

            <img
              class="logo"
              src="${window.location.origin}/logo.jpeg"
              alt="CafeFlow"
            />

            <div class="brand">
              <span class="brand-cafe">Cafe</span><span class="brand-flow">Flow</span>
            </div>

            <h1>${title}</h1>

            <p>Scan to share your feedback</p>

            <img
              class="qr"
              src="${image}"
              alt="${title}"
            />

            <p class="url">${url}</p>

            <div class="footer">
              Powered by CafeFlow
            </div>

          </div>
        </body>
      </html>
    `);

    printWindow.document.close();

    printWindow.focus();

    setTimeout(() => {
      printWindow.print();
    }, 300);
  };

  if (!active) {
    return (
      <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        {/* CARD HEADER */}
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 text-2xl">
              {icon}
            </div>

            <h2 className="text-xl font-bold text-slate-900">
              {title}
            </h2>

            <p className="mt-2 text-sm leading-6 text-slate-500">
              {description}
            </p>
          </div>

          <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-500">
            Coming soon
          </span>
        </div>

        {/* DISABLED PREVIEW */}
        <div className="mt-6 flex min-h-[320px] items-center justify-center rounded-2xl border border-dashed border-slate-300 bg-slate-50">
          <div className="text-center">
            <div className="text-4xl">{icon}</div>

            <p className="mt-3 font-semibold text-slate-700">
              Digital Menu QR
            </p>

            <p className="mt-1 text-xs text-slate-500">
              Menu feature will be available soon.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm transition hover:-translate-y-0.5 hover:border-orange-200 hover:shadow-md">
      {/* CARD HEADER */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-orange-50 text-2xl">
            {icon}
          </div>

          <h2 className="text-xl font-bold text-slate-900">
            {title}
          </h2>

          <p className="mt-2 text-sm leading-6 text-slate-500">
            {description}
          </p>
        </div>

        <span className="rounded-full bg-green-50 px-3 py-1 text-xs font-semibold text-green-700">
          Active
        </span>
      </div>

      {/* QR */}
      <div className="mt-6 flex min-h-[320px] items-center justify-center rounded-2xl bg-slate-50 p-6">
        <div className="text-center">
          <div className="inline-flex rounded-2xl bg-white p-4 shadow-sm">
            <QRCodeCanvas
              ref={canvasRef}
              value={url}
              size={250}
              level="H"
              includeMargin
            />
          </div>

          <p className="mt-4 max-w-sm break-all text-xs text-slate-400">
            {url}
          </p>
        </div>
      </div>

      {/* ACTIONS */}
      <div className="mt-5 grid grid-cols-2 gap-3">
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
          className="rounded-xl bg-slate-950 px-4 py-3 text-sm font-semibold text-white transition hover:bg-slate-800"
        >
          🖨 Print
        </button>
      </div>
    </div>
  );
}

export default function QRPage(): ReactElement | null {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [cafe, setCafe] = useState<Cafe | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(
      auth,
      async (currentUser) => {
        if (!currentUser) {
          window.location.href = "/login";
          return;
        }

        setUser(currentUser);

        try {
          setLoading(true);
          setError("");

          const cafesQuery = query(
            collection(db, "cafes"),
            where("ownerId", "==", currentUser.uid),
            limit(1)
          );

          const snapshot = await getDocs(cafesQuery);

          if (snapshot.empty) {
            window.location.href = "/onboarding";
            return;
          }

          const cafeDocument = snapshot.docs[0];
          const cafeData = cafeDocument.data();

          setCafe({
            id: cafeDocument.id,
            name: cafeData.name ?? "My Cafe",
            ownerId: cafeData.ownerId ?? currentUser.uid,
          });
        } catch (err) {
          console.error("Failed to load cafe:", err);

          setError(
            "Unable to load your cafe information."
          );
        } finally {
          setLoading(false);
        }
      }
    );

    return () => unsubscribe();
  }, []);

  // ==========================================
  // LOADING
  // ==========================================

  if (loading) {
    return (
      <main className="min-h-screen bg-slate-50">
        <header className="border-b border-slate-200 bg-white">
          <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4 lg:px-8">
            <Link
              href="/"
              className="flex items-center gap-3"
            >
              <Image
                src="/logo.jpeg"
                alt="CafeFlow"
                width={44}
                height={44}
                className="h-11 w-11 object-contain"
                priority
              />

              <span className="text-2xl font-bold tracking-tight">
                <span className="text-slate-900">
                  Cafe
                </span>
                <span className="text-orange-500">
                  Flow
                </span>
              </span>
            </Link>
          </div>
        </header>

        <div className="mx-auto max-w-7xl px-6 py-10 lg:px-8">
          <div className="animate-pulse">
            <div className="h-4 w-32 rounded bg-slate-200" />

            <div className="mt-4 h-10 w-64 rounded-lg bg-slate-200" />

            <div className="mt-3 h-5 w-96 max-w-full rounded bg-slate-200" />

            <div className="mt-10 grid gap-6 lg:grid-cols-3">
              <div className="h-[620px] rounded-3xl bg-slate-200" />
              <div className="h-[620px] rounded-3xl bg-slate-200" />
              <div className="h-[620px] rounded-3xl bg-slate-200" />
            </div>
          </div>
        </div>
      </main>
    );
  }

  if (!user) {
    return null;
  }

  // ==========================================
  // ERROR
  // ==========================================

  if (error) {
    return (
      <main className="min-h-screen bg-slate-50">
        <header className="border-b border-slate-200 bg-white">
          <div className="mx-auto flex max-w-7xl items-center px-6 py-4 lg:px-8">
            <Link
              href="/"
              className="flex items-center gap-3"
            >
              <Image
                src="/logo.jpeg"
                alt="CafeFlow"
                width={44}
                height={44}
                className="h-11 w-11 object-contain"
              />

              <span className="text-2xl font-bold tracking-tight">
                <span className="text-slate-900">
                  Cafe
                </span>
                <span className="text-orange-500">
                  Flow
                </span>
              </span>
            </Link>
          </div>
        </header>

        <div className="flex min-h-[calc(100vh-80px)] items-center justify-center px-4">
          <div className="w-full max-w-md rounded-3xl border border-red-200 bg-white p-8 text-center shadow-sm">
            <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-2xl bg-red-50">
              <span className="text-4xl">⚠️</span>
            </div>

            <h1 className="mt-6 text-2xl font-bold text-slate-950">
              Something went wrong
            </h1>

            <p className="mt-3 text-sm leading-6 text-slate-500">
              {error}
            </p>

            <button
              type="button"
              onClick={() => window.location.reload()}
              className="mt-6 rounded-xl bg-slate-950 px-6 py-3 text-sm font-semibold text-white transition hover:bg-slate-800"
            >
              Try again
            </button>
          </div>
        </div>
      </main>
    );
  }

  if (!cafe) {
    return null;
  }

  // ==========================================
  // URLS
  // ==========================================

  const origin =
    typeof window !== "undefined"
      ? window.location.origin
      : "";

  const customerUrl = `${origin}/c/${cafe.id}`;

  const tableUrl =
    `${customerUrl}?source=table`;

  const billingUrl =
    `${customerUrl}?source=billing`;

  const menuUrl =
    `${origin}/menu/${cafe.id}`;

  // ==========================================
  // MAIN PAGE
  // ==========================================

  return (
    <main className="min-h-screen bg-slate-50 text-slate-900">
      {/* ====================================== */}
      {/* NAVBAR */}
      {/* ====================================== */}

      <header className="sticky top-0 z-20 border-b border-slate-200 bg-white/95 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4 lg:px-8">
          <Link
            href="/"
            className="flex items-center gap-3"
          >
            <Image
              src="/logo.jpeg"
              alt="CafeFlow"
              width={44}
              height={44}
              className="h-11 w-11 object-contain"
              priority
            />

            <span className="text-2xl font-bold tracking-tight">
              <span className="text-slate-900">
                Cafe
              </span>
              <span className="text-orange-500">
                Flow
              </span>
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

      {/* ====================================== */}
      {/* CONTENT */}
      {/* ====================================== */}

      <div className="mx-auto max-w-7xl px-6 py-10 lg:px-8">

        {/* HERO */}
        <section className="rounded-3xl bg-slate-950 p-8 text-white shadow-sm sm:p-10">
          <div className="flex flex-col justify-between gap-8 lg:flex-row lg:items-center">
            <div>
              <p className="text-sm font-semibold text-orange-400">
                CafeFlow QR Management
              </p>

              <h1 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl">
                Your cafe QR codes.
              </h1>

              <p className="mt-3 max-w-2xl leading-7 text-slate-300">
                Create, download, print, and place QR codes
                around your cafe to make customer feedback
                easy.
              </p>

              <div className="mt-6 inline-flex items-center rounded-full bg-white/10 px-4 py-2 text-sm font-semibold">
                ☕ {cafe.name}
              </div>
            </div>

            <Link
              href="/dashboard"
              className="inline-flex items-center justify-center rounded-xl border border-white/20 bg-white/10 px-6 py-3.5 font-semibold text-white transition hover:bg-white/15"
            >
              ← Dashboard
            </Link>
          </div>
        </section>

        {/* EXPLANATION */}
        <section className="mt-8 rounded-3xl border border-orange-100 bg-orange-50 p-6 sm:p-7">
          <div className="flex gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-white text-xl shadow-sm">
              💡
            </div>

            <div>
              <h2 className="font-bold text-slate-900">
                Three QR touchpoints
              </h2>

              <p className="mt-1 max-w-3xl text-sm leading-6 text-slate-600">
                Use the Table QR during the dining experience,
                the Billing QR after payment, and the Digital
                Menu QR when the menu feature becomes available.
              </p>
            </div>
          </div>
        </section>

        {/* QR CARDS */}
        <section className="mt-8">
          <div className="mb-5">
            <h2 className="text-xl font-bold text-slate-950">
              QR Codes
            </h2>

            <p className="mt-1 text-sm text-slate-500">
              Download or print the QR code you need.
            </p>
          </div>

          <div className="grid gap-6 lg:grid-cols-3">
            <QRCard
              type="table"
              title="Table Feedback QR"
              description="Place this QR on tables so customers can quickly share feedback while they are at your cafe."
              icon="🍽️"
              url={tableUrl}
              active
            />

            <QRCard
              type="billing"
              title="Billing Feedback QR"
              description="Place this QR near the billing counter or payment area for feedback after the customer's visit."
              icon="💳"
              url={billingUrl}
              active
            />

            <QRCard
              type="menu"
              title="Digital Menu QR"
              description="A dedicated QR for your future digital menu. Customers will be able to view your menu without an app."
              icon="📋"
              url={menuUrl}
              active={false}
            />
          </div>
        </section>

        {/* HOW IT WORKS */}
        <section className="mt-8 rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
          <div>
            <h2 className="text-xl font-bold text-slate-950">
              How these QR codes work
            </h2>

            <p className="mt-1 text-sm text-slate-500">
              Give customers the right QR at the right moment.
            </p>
          </div>

          <div className="mt-7 grid gap-6 md:grid-cols-3">
            <div className="rounded-2xl border border-slate-100 bg-slate-50 p-6">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-orange-50 text-2xl">
                🍽️
              </div>

              <h3 className="mt-4 font-bold text-slate-900">
                Table QR
              </h3>

              <p className="mt-2 text-sm leading-6 text-slate-500">
                Customers scan the QR directly from their table
                and submit feedback.
              </p>
            </div>

            <div className="rounded-2xl border border-slate-100 bg-slate-50 p-6">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-orange-50 text-2xl">
                💳
              </div>

              <h3 className="mt-4 font-bold text-slate-900">
                Billing QR
              </h3>

              <p className="mt-2 text-sm leading-6 text-slate-500">
                Customers can provide feedback immediately after
                completing their payment.
              </p>
            </div>

            <div className="rounded-2xl border border-slate-100 bg-slate-50 p-6">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-orange-50 text-2xl">
                📋
              </div>

              <h3 className="mt-4 font-bold text-slate-900">
                Digital Menu
              </h3>

              <p className="mt-2 text-sm leading-6 text-slate-500">
                Later, this QR system will also support your
                cafe&apos;s digital menu.
              </p>
            </div>
          </div>
        </section>

        {/* CUSTOMER PAGE */}
        <section className="mt-8 rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
          <div className="flex flex-col justify-between gap-6 sm:flex-row sm:items-center">
            <div>
              <p className="text-sm font-semibold text-orange-500">
                Customer experience
              </p>

              <h2 className="mt-2 text-xl font-bold text-slate-950">
                Preview your feedback page
              </h2>

              <p className="mt-2 text-sm leading-6 text-slate-500">
                This is the page customers see after scanning
                your QR code.
              </p>
            </div>

            <Link
              href={`/c/${cafe.id}`}
              target="_blank"
              className="inline-flex shrink-0 items-center justify-center rounded-xl bg-orange-500 px-6 py-3.5 font-semibold text-white transition hover:bg-orange-600"
            >
              Open Customer Page →
            </Link>
          </div>
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
                Place it on tables, counters, bills, takeaway
                packaging, or other customer touchpoints.
              </p>
            </div>

            <Link
              href="/dashboard/feedback"
              className="inline-flex shrink-0 items-center justify-center rounded-xl bg-slate-950 px-6 py-3.5 font-semibold text-white transition hover:bg-slate-800"
            >
              View Feedback
            </Link>
          </div>
        </section>
      </div>

      {/* ====================================== */}
      {/* FOOTER */}
      {/* ====================================== */}

      <footer className="mt-12 border-t border-slate-200 bg-white">
        <div className="mx-auto flex max-w-7xl flex-col gap-4 px-6 py-8 sm:flex-row sm:items-center sm:justify-between lg:px-8">
          <Link
            href="/"
            className="flex items-center gap-2"
          >
            <Image
              src="/logo.jpeg"
              alt="CafeFlow"
              width={28}
              height={28}
              className="h-7 w-7 object-contain"
            />

            <span className="text-sm font-bold">
              <span className="text-slate-700">
                Cafe
              </span>
              <span className="text-orange-500">
                Flow
              </span>
            </span>
          </Link>

          <p className="text-sm text-slate-500">
            Customer feedback made simple.
          </p>

          <p className="text-sm text-slate-400">
            © {new Date().getFullYear()} CafeFlow
          </p>
        </div>
      </footer>
    </main>
  );
}