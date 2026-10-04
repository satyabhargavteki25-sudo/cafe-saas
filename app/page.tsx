import Link from "next/link";

export default function Home() {
  return (
    <main className="min-h-screen bg-white text-slate-900">
      {/* Navbar */}
      <nav className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-5">
          <Link href="/" className="text-2xl font-bold tracking-tight">
            <span className="text-orange-500">Cafe</span>Flow
          </Link>

          <div className="flex items-center gap-3">
            <Link
              href="/login"
              className="rounded-lg px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-100"
            >
              Login
            </Link>

            <Link
              href="/signup"
              className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800"
            >
              Get Started
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="mx-auto max-w-7xl px-6 pb-20 pt-20 lg:pb-28 lg:pt-28">
          <div className="mx-auto max-w-4xl text-center">
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-orange-200 bg-orange-50 px-4 py-2 text-sm font-medium text-orange-700">
              ⭐ Simple feedback management for cafes
            </div>

            <h1 className="text-5xl font-bold tracking-tight text-slate-950 sm:text-6xl lg:text-7xl">
              Turn customer feedback into a{" "}
              <span className="text-orange-500">better cafe.</span>
            </h1>

            <p className="mx-auto mt-7 max-w-2xl text-lg leading-8 text-slate-600">
              CafeFlow helps cafes collect customer feedback through a simple
              QR code, connect with customers through WhatsApp, and encourage
              honest Google reviews.
            </p>

            <div className="mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <Link
                href="/signup"
                className="w-full rounded-xl bg-orange-500 px-7 py-3.5 text-center font-semibold text-white shadow-lg shadow-orange-200 transition hover:bg-orange-600 sm:w-auto"
              >
                Start Free
              </Link>

              <Link
                href="/login"
                className="w-full rounded-xl border border-slate-300 bg-white px-7 py-3.5 text-center font-semibold text-slate-800 transition hover:bg-slate-50 sm:w-auto"
              >
                Owner Login
              </Link>
            </div>

            <p className="mt-4 text-sm text-slate-500">
              No complicated setup. Just create your cafe and share your QR.
            </p>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="border-y border-slate-200 bg-slate-50">
        <div className="mx-auto max-w-7xl px-6 py-20">
          <div className="mx-auto max-w-2xl text-center">
            <p className="text-sm font-semibold uppercase tracking-wider text-orange-500">
              Everything you need
            </p>

            <h2 className="mt-3 text-3xl font-bold tracking-tight text-slate-950 sm:text-4xl">
              Simple tools. Better customer relationships.
            </h2>

            <p className="mt-4 text-slate-600">
              Designed for small cafes and restaurants that want a simple way
              to understand their customers.
            </p>
          </div>

          <div className="mt-12 grid gap-6 md:grid-cols-2 lg:grid-cols-4">
            <FeatureCard
              icon="📱"
              title="QR Feedback"
              description="Give customers a fast and simple way to share their experience."
            />

            <FeatureCard
              icon="⭐"
              title="Ratings"
              description="Collect 1–5 star ratings and understand how customers feel."
            />

            <FeatureCard
              icon="💬"
              title="WhatsApp"
              description="Let customers easily send their feedback to the cafe."
            />

            <FeatureCard
              icon="📊"
              title="Dashboard"
              description="View feedback, ratings and customer insights in one place."
            />
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="bg-white">
        <div className="mx-auto max-w-7xl px-6 py-20 lg:py-24">
          <div className="mx-auto max-w-2xl text-center">
            <p className="text-sm font-semibold uppercase tracking-wider text-orange-500">
              How it works
            </p>

            <h2 className="mt-3 text-3xl font-bold tracking-tight text-slate-950 sm:text-4xl">
              From QR scan to customer feedback
            </h2>
          </div>

          <div className="mt-14 grid gap-8 md:grid-cols-4">
            <StepCard
              number="01"
              title="Create your cafe"
              description="Add your cafe name, WhatsApp number and Google review link."
            />

            <StepCard
              number="02"
              title="Share your QR"
              description="Download your unique QR code and place it on tables or counters."
            />

            <StepCard
              number="03"
              title="Customers respond"
              description="Customers scan the QR and submit their rating and feedback."
            />

            <StepCard
              number="04"
              title="Build reputation"
              description="Connect with customers and invite them to leave an honest Google review."
            />
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="px-6 pb-20">
        <div className="mx-auto max-w-6xl overflow-hidden rounded-3xl bg-slate-950 px-6 py-16 text-center shadow-2xl sm:px-12">
          <div className="mx-auto max-w-2xl">
            <p className="text-sm font-semibold uppercase tracking-wider text-orange-400">
              Start today
            </p>

            <h2 className="mt-3 text-3xl font-bold tracking-tight text-white sm:text-4xl">
              Give your customers a better way to be heard.
            </h2>

            <p className="mt-5 leading-7 text-slate-300">
              Create your CafeFlow account and start collecting feedback with
              your own QR code.
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
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-slate-200 bg-white">
        <div className="mx-auto flex max-w-7xl flex-col gap-3 px-6 py-8 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-lg font-bold">
              <span className="text-orange-500">Cafe</span>Flow
            </p>
            <p className="mt-1 text-sm text-slate-500">
              Simple feedback management for cafes.
            </p>
          </div>

          <div className="flex gap-5 text-sm text-slate-500">
            <Link
              href="/login"
              className="transition hover:text-slate-900"
            >
              Login
            </Link>

            <Link
              href="/signup"
              className="transition hover:text-slate-900"
            >
              Get Started
            </Link>
          </div>
        </div>
      </footer>
    </main>
  );
}

function FeatureCard({
  icon,
  title,
  description,
}: {
  icon: string;
  title: string;
  description: string;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-7 shadow-sm transition hover:-translate-y-1 hover:shadow-lg">
      <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-orange-50 text-2xl">
        {icon}
      </div>

      <h3 className="mt-5 text-lg font-bold text-slate-950">{title}</h3>

      <p className="mt-2 text-sm leading-6 text-slate-600">{description}</p>
    </div>
  );
}

function StepCard({
  number,
  title,
  description,
}: {
  number: string;
  title: string;
  description: string;
}) {
  return (
    <div className="relative rounded-2xl border border-slate-200 bg-white p-7">
      <div className="text-sm font-bold text-orange-500">{number}</div>

      <h3 className="mt-4 text-xl font-bold text-slate-950">{title}</h3>

      <p className="mt-3 text-sm leading-6 text-slate-600">{description}</p>
    </div>
  );
}