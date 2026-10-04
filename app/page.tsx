import Image from "next/image";
import Link from "next/link";

export default function Home() {
  return (
    <main className="min-h-screen bg-white text-slate-900">
      {/* =========================
          NAVBAR
      ========================== */}
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4 lg:px-8">
          {/* Logo */}
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

          {/* Navigation */}
          <div className="flex items-center gap-3">
            <Link
              href="/login"
              className="rounded-lg px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-100"
            >
              Login
            </Link>

            <Link
              href="/signup"
              className="rounded-lg bg-orange-500 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-orange-600"
            >
              Get Started
            </Link>
          </div>
        </div>
      </header>

      {/* =========================
          HERO
      ========================== */}
      <section className="relative overflow-hidden bg-white">
        <div className="mx-auto max-w-7xl px-6 py-20 lg:px-8 lg:py-28">
          <div className="mx-auto max-w-4xl text-center">

            {/* BIG CENTER LOGO */}
            <div className="mb-10 flex justify-center">
              <div className="flex h-64 w-64 items-center justify-center rounded-[2.5rem] border border-orange-100 bg-orange-50 shadow-sm">
                <Image
                  src="/logo.jpeg"
                  alt="CafeFlow raccoon"
                  width={300}
                  height={300}
                  className="h-70 w-70 scale-125 object-contain"
                  priority
                />
              </div>
            </div>

            {/* Badge */}
            <div className="mb-6 inline-flex rounded-full border border-orange-200 bg-orange-50 px-4 py-2 text-sm font-semibold text-orange-600">
              Customer feedback made simple
            </div>

            {/* Heading */}
            <h1 className="text-5xl font-bold tracking-tight text-slate-950 sm:text-6xl lg:text-7xl">
              Turn customer feedback into a{" "}
              <span className="text-orange-500">better cafe.</span>
            </h1>

            {/* Description */}
            <p className="mx-auto mt-6 max-w-2xl text-lg leading-8 text-slate-600">
              CafeFlow helps cafes collect customer feedback, understand
              ratings, connect with customers, and build a stronger
              reputation.
            </p>

            {/* Buttons */}
            <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
              <Link
                href="/signup"
                className="w-full rounded-xl bg-orange-500 px-7 py-3.5 text-center font-semibold text-white shadow-sm transition hover:bg-orange-600 sm:w-auto"
              >
                Start Free
              </Link>

              <Link
                href="/login"
                className="w-full rounded-xl border border-slate-300 px-7 py-3.5 text-center font-semibold text-slate-700 transition hover:bg-slate-50 sm:w-auto"
              >
                Owner Login
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* =========================
          FEATURES
      ========================== */}
      <section className="border-y border-slate-200 bg-slate-50">
        <div className="mx-auto max-w-7xl px-6 py-20 lg:px-8">

          {/* Section heading */}
          <div className="mx-auto max-w-2xl text-center">
            <p className="font-semibold text-orange-500">
              Everything you need
            </p>

            <h2 className="mt-2 text-3xl font-bold tracking-tight text-slate-950 sm:text-4xl">
              A simple feedback system for modern cafes
            </h2>

            <p className="mt-4 text-slate-600">
              Start with feedback today and grow into a complete customer
              engagement platform.
            </p>
          </div>

          {/* Feature cards */}
          <div className="mt-12 grid gap-6 md:grid-cols-2 lg:grid-cols-4">

            {/* Card 1 */}
            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition hover:-translate-y-1 hover:shadow-md">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-orange-50 font-bold text-orange-500">
                QR
              </div>

              <h3 className="mt-5 text-lg font-bold text-slate-950">
                QR Feedback
              </h3>

              <p className="mt-2 text-sm leading-6 text-slate-600">
                Give customers a simple QR code to share their experience.
              </p>
            </div>

            {/* Card 2 */}
            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition hover:-translate-y-1 hover:shadow-md">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-orange-50 font-bold text-orange-500">
                ★
              </div>

              <h3 className="mt-5 text-lg font-bold text-slate-950">
                Ratings
              </h3>

              <p className="mt-2 text-sm leading-6 text-slate-600">
                Collect 1–5 star ratings and understand how customers feel.
              </p>
            </div>

            {/* Card 3 */}
            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition hover:-translate-y-1 hover:shadow-md">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-orange-50 font-bold text-orange-500">
                WA
              </div>

              <h3 className="mt-5 text-lg font-bold text-slate-950">
                WhatsApp
              </h3>

              <p className="mt-2 text-sm leading-6 text-slate-600">
                Make it easy for customers to share feedback directly with
                your cafe.
              </p>
            </div>

            {/* Card 4 */}
            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition hover:-translate-y-1 hover:shadow-md">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-orange-50 font-bold text-orange-500">
                AN
              </div>

              <h3 className="mt-5 text-lg font-bold text-slate-950">
                Dashboard
              </h3>

              <p className="mt-2 text-sm leading-6 text-slate-600">
                See feedback, ratings, and customer insights in one place.
              </p>
            </div>

          </div>
        </div>
      </section>

      {/* =========================
          HOW IT WORKS
      ========================== */}
      <section className="bg-white">
        <div className="mx-auto max-w-7xl px-6 py-20 lg:px-8">

          {/* Heading */}
          <div className="mx-auto max-w-2xl text-center">
            <p className="font-semibold text-orange-500">
              How it works
            </p>

            <h2 className="mt-2 text-3xl font-bold tracking-tight text-slate-950 sm:text-4xl">
              Start collecting feedback in minutes
            </h2>
          </div>

          {/* Steps */}
          <div className="mx-auto mt-12 grid max-w-5xl gap-8 md:grid-cols-4">

            {/* Step 1 */}
            <div className="text-center">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-slate-950 font-bold text-white">
                01
              </div>

              <h3 className="mt-5 font-bold text-slate-950">
                Create your cafe
              </h3>

              <p className="mt-2 text-sm leading-6 text-slate-600">
                Set up your cafe profile in CafeFlow.
              </p>
            </div>

            {/* Step 2 */}
            <div className="text-center">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-slate-950 font-bold text-white">
                02
              </div>

              <h3 className="mt-5 font-bold text-slate-950">
                Share your QR
              </h3>

              <p className="mt-2 text-sm leading-6 text-slate-600">
                Place your permanent QR code at your cafe.
              </p>
            </div>

            {/* Step 3 */}
            <div className="text-center">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-slate-950 font-bold text-white">
                03
              </div>

              <h3 className="mt-5 font-bold text-slate-950">
                Customers respond
              </h3>

              <p className="mt-2 text-sm leading-6 text-slate-600">
                Customers scan and share their experience.
              </p>
            </div>

            {/* Step 4 */}
            <div className="text-center">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-slate-950 font-bold text-white">
                04
              </div>

              <h3 className="mt-5 font-bold text-slate-950">
                Improve & grow
              </h3>

              <p className="mt-2 text-sm leading-6 text-slate-600">
                Use feedback to improve your customer experience.
              </p>
            </div>

          </div>
        </div>
      </section>

      {/* =========================
          CTA
      ========================== */}
      <section className="bg-slate-950">
        <div className="mx-auto max-w-5xl px-6 py-20 text-center lg:px-8">

          {/* Small logo */}
          <div className="mx-auto mb-6 flex justify-center">
            <Image
              src="/logo.jpeg"
              alt="CafeFlow"
              width={1180}
              height={1180}
              className="h-16 w-16 rounded-2xl object-contain"
            />
          </div>

          <h2 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">
            Ready to make your cafe better?
          </h2>

          <p className="mx-auto mt-4 max-w-2xl text-slate-300">
            Start collecting valuable customer feedback with CafeFlow.
          </p>

          <div className="mt-8">
            <Link
              href="/signup"
              className="inline-flex rounded-xl bg-orange-500 px-7 py-3.5 font-semibold text-white transition hover:bg-orange-600"
            >
              Create Your Cafe
            </Link>
          </div>
        </div>
      </section>

      {/* =========================
          FOOTER
      ========================== */}
      <footer className="border-t border-slate-800 bg-slate-950">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-4 px-6 py-8 sm:flex-row lg:px-8">

          <div className="flex items-center gap-3">
            <Image
              src="/logo.jpeg"
              alt="CafeFlow"
              width={40}
              height={40}
              className="h-10 w-10 object-contain"
            />

            <span className="font-bold text-white">
              Cafe<span className="text-orange-500">Flow</span>
            </span>
          </div>

          <p className="text-sm text-slate-400">
            © 2026 CafeFlow. Built for better customer experiences.
          </p>

        </div>
      </footer>
    </main>
  );
}