"use client";

import Image from "next/image";
import Link from "next/link";
import { FormEvent, useState } from "react";
import { signInWithEmailAndPassword } from "firebase/auth";
import { auth } from "@/src/lib/firebase";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleLogin(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();

    setError("");
    setLoading(true);

    try {
      await signInWithEmailAndPassword(
        auth,
        email.trim(),
        password
      );

      router.push("/dashboard");
    } catch (err) {
      console.error(err);
      setError("Invalid email or password. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-slate-50">

      {/* =========================
          TOP NAVIGATION
      ========================== */}
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

        <Link
          href="/signup"
          className="rounded-lg px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-white hover:text-orange-500"
        >
          Create Account
        </Link>

      </div>

      {/* =========================
          LOGIN AREA
      ========================== */}
      <div className="flex min-h-[calc(100vh-100px)] items-center justify-center px-6 pb-12">

        <div className="w-full max-w-md">

          {/* LOGIN CARD */}
          <div className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm sm:p-10">

            {/* LOGO */}
            <div className="mb-7 flex justify-center">
              <div className="flex h-28 w-28 items-center justify-center rounded-[2rem] border border-orange-100 bg-orange-50 shadow-sm">

                <Image
                  src="/logo.jpeg"
                  alt="CafeFlow raccoon"
                  width={120}
                  height={120}
                  className="h-24 w-24 object-contain"
                />

              </div>
            </div>

            {/* HEADING */}
            <div className="text-center">

              <h1 className="text-3xl font-bold tracking-tight text-slate-950">
                Welcome back
              </h1>

              <p className="mt-2 text-sm leading-6 text-slate-600">
                Sign in to manage your cafe with CafeFlow.
              </p>

            </div>

            {/* ERROR MESSAGE */}
            {error && (
              <div className="mt-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
                {error}
              </div>
            )}

            {/* LOGIN FORM */}
            <form
              onSubmit={handleLogin}
              className="mt-8 space-y-5"
            >

              {/* EMAIL */}
              <div>

                <label
                  htmlFor="email"
                  className="mb-2 block text-sm font-semibold text-slate-700"
                >
                  Email
                </label>

                <input
                  id="email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  autoComplete="email"
                  className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-orange-500 focus:ring-2 focus:ring-orange-100"
                />

              </div>

              {/* PASSWORD */}
              <div>

                <label
                  htmlFor="password"
                  className="mb-2 block text-sm font-semibold text-slate-700"
                >
                  Password
                </label>

                <input
                  id="password"
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  autoComplete="current-password"
                  className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-orange-500 focus:ring-2 focus:ring-orange-100"
                />

              </div>

              {/* LOGIN BUTTON */}
              <button
                type="submit"
                disabled={loading}
                className="w-full rounded-xl bg-orange-500 px-5 py-3.5 font-semibold text-white shadow-sm transition hover:bg-orange-600 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {loading ? "Signing in..." : "Sign In"}
              </button>

            </form>

            {/* SIGNUP */}
            <div className="mt-7 text-center text-sm text-slate-600">
              Don&apos;t have an account?{" "}
              <Link
                href="/signup"
                className="font-semibold text-orange-500 hover:text-orange-600"
              >
                Create an account
              </Link>
            </div>

          </div>

          {/* BACK TO HOME */}
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