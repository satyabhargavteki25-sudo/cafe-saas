"use client";

import { useState } from "react";
import { createUserWithEmailAndPassword } from "firebase/auth";
import { auth, db } from "@/src/lib/firebase";
import { doc, setDoc, serverTimestamp } from "firebase/firestore";
import { useRouter } from "next/navigation";

export default function SignupPage() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSignup(e: React.FormEvent) {
    e.preventDefault();

    setError("");
    setLoading(true);

    try {
      const userCredential = await createUserWithEmailAndPassword(
        auth,
        email,
        password
      );

      const user = userCredential.user;

      await setDoc(doc(db, "users", user.uid), {
        email: user.email,
        role: "owner",
        createdAt: serverTimestamp(),
      });

      router.push("/dashboard");
    } catch (error: unknown) {
      console.error("Signup error:", error);

      if (
        error &&
        typeof error === "object" &&
        "code" in error
      ) {
        const firebaseError = error as { code: string };

        if (firebaseError.code === "auth/email-already-in-use") {
          setError("This email is already registered.");
        } else if (firebaseError.code === "auth/weak-password") {
          setError("Password must be at least 6 characters.");
        } else if (firebaseError.code === "auth/invalid-email") {
          setError("Please enter a valid email address.");
        } else {
          setError("Unable to create account.");
        }
      } else {
        setError("Unable to create account.");
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-2xl shadow-lg p-8">

          <div className="text-center mb-8">
            <div className="text-5xl mb-4">☕</div>

            <h1 className="text-3xl font-bold text-gray-900">
              Create Owner Account
            </h1>

            <p className="text-gray-500 mt-2">
              Start managing your cafe
            </p>
          </div>

          <form onSubmit={handleSignup} className="space-y-5">

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Email
              </label>

              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="owner@example.com"
                required
                className="w-full rounded-lg border border-gray-300 px-4 py-3 outline-none focus:border-black"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Password
              </label>

              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Minimum 6 characters"
                minLength={6}
                required
                className="w-full rounded-lg border border-gray-300 px-4 py-3 outline-none focus:border-black"
              />
            </div>

            {error && (
              <div className="rounded-lg bg-red-50 border border-red-200 p-3 text-sm text-red-700">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-lg bg-black text-white py-3 font-semibold hover:bg-gray-800 disabled:opacity-50"
            >
              {loading ? "Creating account..." : "Create Account"}
            </button>

          </form>

          <p className="text-center text-sm text-gray-500 mt-6">
            Already have an account?{" "}
            <a
              href="/login"
              className="font-semibold text-black hover:underline"
            >
              Login
            </a>
          </p>

        </div>
      </div>
    </main>
  );
}