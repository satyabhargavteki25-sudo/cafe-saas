"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { onAuthStateChanged, signOut } from "firebase/auth";
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDocs,
  limit,
  onSnapshot,
  query,
  serverTimestamp,
  updateDoc,
  where,
} from "firebase/firestore";

import { auth, db } from "@/src/lib/firebase";

type RewardType = "discount" | "free_item" | "cashback";

type Reward = {
  id: string;
  cafeId: string;
  name: string;
  description: string;
  pointsRequired: number;
  rewardType: RewardType;
  rewardValue: number;
  active: boolean;
};

type Cafe = {
  id: string;
  name: string;
  ownerId: string;
  whatsappNumber?: string;
  googleReviewUrl?: string;
};

type FormData = {
  name: string;
  description: string;
  pointsRequired: string;
  rewardType: RewardType;
  rewardValue: string;
  active: boolean;
};

const emptyForm: FormData = {
  name: "",
  description: "",
  pointsRequired: "",
  rewardType: "discount",
  rewardValue: "",
  active: true,
};

function formatCurrency(value: number) {
  return `₹${value.toLocaleString("en-IN")}`;
}

function getRewardTypeLabel(type: RewardType) {
  if (type === "discount") return "Discount";
  if (type === "cashback") return "Cashback";
  return "Free Item";
}

function getRewardText(reward: Reward) {
  if (reward.rewardType === "discount") {
    return `${formatCurrency(reward.rewardValue)} OFF`;
  }

  if (reward.rewardType === "cashback") {
    return `${formatCurrency(reward.rewardValue)} Cashback`;
  }

  return "Free Item";
}

export default function RewardsPage() {
  const [userEmail, setUserEmail] = useState("");
  const [cafe, setCafe] = useState<Cafe | null>(null);

  const [rewards, setRewards] = useState<Reward[]>([]);

  const [loading, setLoading] = useState(true);
  const [rewardsLoading, setRewardsLoading] = useState(true);

  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const [search, setSearch] = useState("");

  const [showModal, setShowModal] = useState(false);
  const [editingReward, setEditingReward] = useState<Reward | null>(null);

  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState<FormData>(emptyForm);

  // =========================================================
  // AUTH + CAFE + REAL-TIME REWARDS
  // =========================================================

  useEffect(() => {
    let mounted = true;
    let unsubscribeRewards: (() => void) | null = null;

    const unsubscribeAuth = onAuthStateChanged(
      auth,
      async (currentUser) => {
        // Clean previous rewards listener when auth changes.
        if (unsubscribeRewards) {
          unsubscribeRewards();
          unsubscribeRewards = null;
        }

        if (!currentUser) {
          window.location.href = "/login";
          return;
        }

        if (!mounted) return;

        setUserEmail(currentUser.email || "");
        setLoading(true);
        setRewardsLoading(true);
        setError("");

        try {
          const cafeQuery = query(
            collection(db, "cafes"),
            where("ownerId", "==", currentUser.uid),
            limit(1)
          );

          const cafeSnapshot = await getDocs(cafeQuery);

          if (!mounted) return;

          if (cafeSnapshot.empty) {
            setCafe(null);
            setLoading(false);
            setRewardsLoading(false);
            return;
          }

          const cafeDoc = cafeSnapshot.docs[0];

          const currentCafe: Cafe = {
            id: cafeDoc.id,
            ...(cafeDoc.data() as Omit<Cafe, "id">),
          };

          setCafe(currentCafe);
          setLoading(false);

          // -------------------------------------------------
          // REAL-TIME REWARDS
          // -------------------------------------------------

          const rewardsQuery = query(
            collection(db, "rewards"),
            where("cafeId", "==", currentCafe.id)
          );

          unsubscribeRewards = onSnapshot(
            rewardsQuery,
            (snapshot) => {
              const rewardData: Reward[] = snapshot.docs.map(
                (rewardDoc) => {
                  const data = rewardDoc.data();

                  return {
                    id: rewardDoc.id,
                    cafeId: String(data.cafeId || ""),
                    name: String(data.name || ""),
                    description: String(data.description || ""),
                    pointsRequired: Number(
                      data.pointsRequired || 0
                    ),
                    rewardType:
                      (data.rewardType as RewardType) ||
                      "discount",
                    rewardValue: Number(
                      data.rewardValue || 0
                    ),
                    active: Boolean(data.active),
                  };
                }
              );

              rewardData.sort(
                (a, b) =>
                  a.pointsRequired - b.pointsRequired
              );

              if (mounted) {
                setRewards(rewardData);
                setRewardsLoading(false);
              }
            },
            (snapshotError) => {
              console.error(
                "Rewards listener error:",
                snapshotError
              );

              if (mounted) {
                setRewardsLoading(false);
                setError(
                  "Rewards could not be loaded. Please check your Firestore rules."
                );
              }
            }
          );
        } catch (err) {
          console.error(
            "Rewards page loading error:",
            err
          );

          if (mounted) {
            setError(
              "Something went wrong while loading rewards."
            );
            setLoading(false);
            setRewardsLoading(false);
          }
        }
      }
    );

    return () => {
      mounted = false;

      unsubscribeAuth();

      if (unsubscribeRewards) {
        unsubscribeRewards();
      }
    };
  }, []);

  // =========================================================
  // FILTER
  // =========================================================

  const filteredRewards = useMemo(() => {
    const value = search.trim().toLowerCase();

    if (!value) {
      return rewards;
    }

    return rewards.filter((reward) => {
      return (
        reward.name.toLowerCase().includes(value) ||
        reward.description.toLowerCase().includes(value) ||
        getRewardTypeLabel(reward.rewardType)
          .toLowerCase()
          .includes(value)
      );
    });
  }, [rewards, search]);

  // =========================================================
  // STATS
  // =========================================================

  const totalRewards = rewards.length;

  const activeRewards = rewards.filter(
    (reward) => reward.active
  ).length;

  const inactiveRewards = rewards.filter(
    (reward) => !reward.active
  ).length;

  // =========================================================
  // LOGOUT
  // =========================================================

  async function handleLogout() {
    try {
      await signOut(auth);
      window.location.href = "/login";
    } catch (err) {
      console.error("Logout error:", err);
    }
  }

  // =========================================================
  // CREATE MODAL
  // =========================================================

  function openCreateModal() {
    setEditingReward(null);
    setForm(emptyForm);
    setError("");
    setMessage("");
    setShowModal(true);
  }

  // =========================================================
  // EDIT MODAL
  // =========================================================

  function openEditModal(reward: Reward) {
    setEditingReward(reward);

    setForm({
      name: reward.name,
      description: reward.description,
      pointsRequired: String(reward.pointsRequired),
      rewardType: reward.rewardType,
      rewardValue: String(reward.rewardValue),
      active: reward.active,
    });

    setError("");
    setMessage("");
    setShowModal(true);
  }

  // =========================================================
  // CLOSE MODAL
  // =========================================================

  function closeModal() {
    if (saving) return;

    setShowModal(false);
    setEditingReward(null);
    setForm(emptyForm);
  }

  // =========================================================
  // SAVE REWARD
  // =========================================================

  async function saveReward() {
    setError("");
    setMessage("");

    if (!cafe) {
      setError("Cafe not found.");
      return;
    }

    const name = form.name.trim();
    const description = form.description.trim();

    const pointsRequired = Number(form.pointsRequired);
    const rewardValue = Number(form.rewardValue);

    if (name.length < 2) {
      setError(
        "Reward name must contain at least 2 characters."
      );
      return;
    }

    if (name.length > 100) {
      setError("Reward name is too long.");
      return;
    }

    if (description.length > 500) {
      setError("Description is too long.");
      return;
    }

    if (
      !Number.isFinite(pointsRequired) ||
      pointsRequired <= 0
    ) {
      setError("Enter valid points required.");
      return;
    }

    if (
      !Number.isFinite(rewardValue) ||
      rewardValue <= 0
    ) {
      setError("Enter a valid reward value.");
      return;
    }

    try {
      setSaving(true);

      if (editingReward) {
        await updateDoc(
          doc(db, "rewards", editingReward.id),
          {
            name,
            description,
            pointsRequired,
            rewardType: form.rewardType,
            rewardValue,
            active: form.active,
          }
        );

        setMessage(
          "Reward updated successfully."
        );
      } else {
        await addDoc(collection(db, "rewards"), {
          cafeId: cafe.id,
          name,
          description,
          pointsRequired,
          rewardType: form.rewardType,
          rewardValue,
          active: form.active,
          createdAt: serverTimestamp(),
        });

        setMessage(
          "Reward created successfully."
        );
      }

      setShowModal(false);
      setEditingReward(null);
      setForm(emptyForm);
    } catch (err) {
      console.error("Save reward error:", err);

      setError(
        "Unable to save reward. Please check your Firestore rules."
      );
    } finally {
      setSaving(false);
    }
  }

  // =========================================================
  // TOGGLE REWARD
  // =========================================================

  async function toggleReward(reward: Reward) {
    setError("");
    setMessage("");

    try {
      await updateDoc(
        doc(db, "rewards", reward.id),
        {
          active: !reward.active,
        }
      );

      setMessage(
        reward.active
          ? "Reward disabled."
          : "Reward activated."
      );
    } catch (err) {
      console.error(
        "Toggle reward error:",
        err
      );

      setError(
        "Unable to change reward status."
      );
    }
  }

  // =========================================================
  // DELETE REWARD
  // =========================================================

  async function deleteReward(reward: Reward) {
    const confirmed = window.confirm(
      `Delete "${reward.name}"? This action cannot be undone.`
    );

    if (!confirmed) return;

    setError("");
    setMessage("");

    try {
      await deleteDoc(
        doc(db, "rewards", reward.id)
      );

      setMessage(
        "Reward deleted successfully."
      );
    } catch (err) {
      console.error(
        "Delete reward error:",
        err
      );

      setError("Unable to delete reward.");
    }
  }

  // =========================================================
  // LOADING
  // =========================================================

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-50">
        <div className="text-center">
          <div className="mx-auto mb-4 h-10 w-10 animate-spin rounded-full border-4 border-orange-200 border-t-orange-500" />

          <p className="text-sm text-slate-500">
            Loading rewards...
          </p>
        </div>
      </main>
    );
  }

  // =========================================================
  // PAGE
  // =========================================================

  return (
    <main className="min-h-screen bg-slate-50">
      {/* NAVBAR */}

      <nav className="sticky top-0 z-50 border-b border-slate-200 bg-white/95 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-6 lg:px-8">
          <Link
            href="/dashboard"
            className="flex items-center gap-3"
          >
            <Image
              src="/logo.jpeg"
              alt="CafeFlow"
              width={42}
              height={42}
              className="rounded-xl"
            />

            <div>
              <div className="text-lg font-bold text-slate-900">
                CafeFlow
              </div>

              <div className="text-xs text-slate-500">
                Restaurant Growth Platform
              </div>
            </div>
          </Link>

          <div className="flex items-center gap-3">
            <Link
              href="/dashboard/loyalty"
              className="hidden rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-50 sm:block"
            >
              Loyalty
            </Link>

            <div className="hidden text-right sm:block">
              <p className="text-sm font-medium text-slate-700">
                {userEmail}
              </p>

              <p className="text-xs text-slate-400">
                Cafe Owner
              </p>
            </div>

            <button
              onClick={handleLogout}
              className="rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-50"
            >
              Logout
            </button>
          </div>
        </div>
      </nav>

      {/* ERROR */}

      {error && (
        <div className="mx-auto max-w-7xl px-4 pt-5 sm:px-6 lg:px-8">
          <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        </div>
      )}

      {/* SUCCESS */}

      {message && (
        <div className="mx-auto max-w-7xl px-4 pt-5 sm:px-6 lg:px-8">
          <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
            {message}
          </div>
        </div>
      )}

      {/* HERO */}

      <section className="bg-slate-950">
        <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-3xl">
              <p className="mb-3 text-sm font-semibold uppercase tracking-wider text-orange-400">
                Loyalty & Rewards
              </p>

              <h1 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">
                Reward your best customers.
              </h1>

              <p className="mt-4 max-w-2xl text-base leading-7 text-slate-300">
                Create and manage loyalty rewards that encourage
                customers to return to your cafe again and again.
              </p>
            </div>

            <button
              onClick={openCreateModal}
              className="rounded-xl bg-orange-500 px-5 py-3 text-sm font-semibold text-white transition hover:bg-orange-600"
            >
              + Create Reward
            </button>
          </div>
        </div>
      </section>

      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        {/* BREADCRUMB */}

        <div className="mb-6 flex items-center gap-2 text-sm text-slate-500">
          <Link
            href="/dashboard"
            className="hover:text-orange-600"
          >
            Dashboard
          </Link>

          <span>/</span>

          <Link
            href="/dashboard/loyalty"
            className="hover:text-orange-600"
          >
            Loyalty
          </Link>

          <span>/</span>

          <span className="font-medium text-slate-700">
            Rewards
          </span>
        </div>

        {/* STATS */}

        <section>
          <div className="mb-4">
            <h2 className="text-xl font-bold text-slate-900">
              Reward Overview
            </h2>

            <p className="mt-1 text-sm text-slate-500">
              Monitor the rewards available to your customers.
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <p className="text-sm text-slate-500">
                Total Rewards
              </p>

              <p className="mt-2 text-3xl font-bold text-slate-900">
                {totalRewards}
              </p>

              <p className="mt-2 text-xs text-slate-400">
                All rewards
              </p>
            </div>

            <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-5 shadow-sm">
              <p className="text-sm text-emerald-700">
                Active Rewards
              </p>

              <p className="mt-2 text-3xl font-bold text-emerald-800">
                {activeRewards}
              </p>

              <p className="mt-2 text-xs text-emerald-600">
                Visible to customers
              </p>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <p className="text-sm text-slate-500">
                Inactive Rewards
              </p>

              <p className="mt-2 text-3xl font-bold text-slate-900">
                {inactiveRewards}
              </p>

              <p className="mt-2 text-xs text-slate-400">
                Currently disabled
              </p>
            </div>

            <div className="rounded-2xl border border-orange-200 bg-orange-50 p-5 shadow-sm">
              <p className="text-sm text-orange-700">
                Recommended
              </p>

              <p className="mt-2 text-2xl font-bold text-orange-800">
                100 Points
              </p>

              <p className="mt-2 text-xs text-orange-600">
                Start with ₹50 OFF
              </p>
            </div>
          </div>
        </section>

        {/* SEARCH */}

        <section className="mt-8">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-xl font-bold text-slate-900">
                Your Rewards
              </h2>

              <p className="mt-1 text-sm text-slate-500">
                Create, edit, activate, or remove loyalty rewards.
              </p>
            </div>

            <div className="w-full sm:max-w-sm">
              <input
                type="text"
                value={search}
                onChange={(event) =>
                  setSearch(event.target.value)
                }
                placeholder="Search rewards..."
                className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-orange-500 focus:ring-2 focus:ring-orange-100"
              />
            </div>
          </div>
        </section>

        {/* REWARDS */}

        <section className="mt-5">
          {rewardsLoading ? (
            <div className="rounded-2xl border border-slate-200 bg-white p-10 text-center shadow-sm">
              <div className="mx-auto mb-4 h-8 w-8 animate-spin rounded-full border-4 border-orange-200 border-t-orange-500" />

              <p className="text-sm text-slate-500">
                Updating rewards...
              </p>
            </div>
          ) : filteredRewards.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-12 text-center">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-orange-50 text-3xl">
                🎁
              </div>

              <h3 className="mt-5 text-xl font-bold text-slate-900">
                {search
                  ? "No matching rewards"
                  : "No rewards created yet"}
              </h3>

              <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-500">
                {search
                  ? "Try another search term."
                  : "Create your first loyalty reward and start giving customers a reason to come back."}
              </p>

              {!search && (
                <button
                  onClick={openCreateModal}
                  className="mt-6 rounded-xl bg-orange-500 px-5 py-3 text-sm font-semibold text-white transition hover:bg-orange-600"
                >
                  Create First Reward
                </button>
              )}
            </div>
          ) : (
            <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
              {filteredRewards.map((reward) => (
                <article
                  key={reward.id}
                  className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition hover:-translate-y-1 hover:shadow-md"
                >
                  {/* CARD HEADER */}

                  <div
                    className={`border-b p-6 ${
                      reward.active
                        ? "border-orange-100 bg-orange-50"
                        : "border-slate-100 bg-slate-50"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-white text-2xl shadow-sm">
                        🎁
                      </div>

                      <span
                        className={`rounded-full px-3 py-1 text-xs font-semibold ${
                          reward.active
                            ? "bg-emerald-100 text-emerald-700"
                            : "bg-slate-200 text-slate-600"
                        }`}
                      >
                        {reward.active
                          ? "Active"
                          : "Inactive"}
                      </span>
                    </div>

                    <h3 className="mt-5 text-xl font-bold text-slate-900">
                      {reward.name}
                    </h3>

                    <p className="mt-2 min-h-[42px] text-sm leading-6 text-slate-500">
                      {reward.description ||
                        "No description added."}
                    </p>
                  </div>

                  {/* CARD BODY */}

                  <div className="p-6">
                    <div className="grid grid-cols-2 gap-3">
                      <div className="rounded-xl bg-slate-50 p-4">
                        <p className="text-xs font-medium text-slate-500">
                          Points Required
                        </p>

                        <p className="mt-2 text-2xl font-bold text-orange-600">
                          {reward.pointsRequired}
                        </p>
                      </div>

                      <div className="rounded-xl bg-slate-50 p-4">
                        <p className="text-xs font-medium text-slate-500">
                          Customer Gets
                        </p>

                        <p className="mt-2 text-lg font-bold text-slate-900">
                          {getRewardText(reward)}
                        </p>
                      </div>
                    </div>

                    <div className="mt-4">
                      <span className="inline-flex rounded-full bg-slate-100 px-3 py-1.5 text-xs font-semibold text-slate-600">
                        {getRewardTypeLabel(
                          reward.rewardType
                        )}
                      </span>
                    </div>

                    {/* ACTIONS */}

                    <div className="mt-6 grid grid-cols-3 gap-2">
                      <button
                        onClick={() =>
                          openEditModal(reward)
                        }
                        className="rounded-xl border border-slate-200 px-3 py-2.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-50"
                      >
                        Edit
                      </button>

                      <button
                        onClick={() =>
                          toggleReward(reward)
                        }
                        className="rounded-xl border border-slate-200 px-3 py-2.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-50"
                      >
                        {reward.active
                          ? "Disable"
                          : "Enable"}
                      </button>

                      <button
                        onClick={() =>
                          deleteReward(reward)
                        }
                        className="rounded-xl border border-red-200 px-3 py-2.5 text-xs font-semibold text-red-600 transition hover:bg-red-50"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>

        {/* REWARD RULE */}

        <section className="mt-10 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-sm font-semibold uppercase tracking-wider text-orange-500">
                Recommended Loyalty Model
              </p>

              <h2 className="mt-2 text-xl font-bold text-slate-900">
                Simple rewards customers understand.
              </h2>

              <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">
                Customers earn 1 point for every ₹10 spent.
                They can then exchange points for rewards.
              </p>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div className="rounded-xl bg-orange-50 px-4 py-3 text-center">
                <p className="text-lg font-bold text-orange-700">
                  100
                </p>

                <p className="text-xs text-orange-600">
                  Points
                </p>
              </div>

              <div className="flex items-center justify-center text-slate-300">
                →
              </div>

              <div className="rounded-xl bg-emerald-50 px-4 py-3 text-center">
                <p className="text-lg font-bold text-emerald-700">
                  ₹50
                </p>

                <p className="text-xs text-emerald-600">
                  Reward
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* CTA */}

        <section className="mt-10 overflow-hidden rounded-3xl bg-orange-500 p-8 sm:p-10">
          <div className="max-w-3xl">
            <p className="text-sm font-semibold uppercase tracking-wider text-orange-100">
              Customer Loyalty
            </p>

            <h2 className="mt-2 text-2xl font-bold text-white sm:text-3xl">
              Turn one-time visitors into repeat customers.
            </h2>

            <p className="mt-3 max-w-2xl text-sm leading-6 text-orange-50">
              Your loyalty system can reward customers after
              completed and paid orders, helping your cafe build
              long-term customer relationships.
            </p>

            <div className="mt-6 flex flex-wrap gap-3">
              <Link
                href="/dashboard/loyalty"
                className="rounded-xl bg-white px-5 py-3 text-sm font-semibold text-orange-600 transition hover:bg-orange-50"
              >
                Loyalty Overview
              </Link>

              <Link
                href="/dashboard/orders"
                className="rounded-xl border border-orange-300 px-5 py-3 text-sm font-semibold text-white transition hover:bg-orange-600"
              >
                View Orders
              </Link>
            </div>
          </div>
        </section>
      </div>

      {/* FOOTER */}

      <footer className="mt-16 border-t border-slate-200 bg-white">
        <div className="mx-auto flex max-w-7xl flex-col gap-3 px-4 py-8 text-sm text-slate-500 sm:flex-row sm:items-center sm:justify-between sm:px-6 lg:px-8">
          <p>
            © 2026 CafeFlow. All rights reserved.
          </p>

          <p>
            Customer Feedback • Digital Menu • Ordering • Loyalty
          </p>
        </div>
      </footer>

      {/* CREATE / EDIT MODAL */}

      {showModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm">
          <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-white shadow-2xl">
            {/* MODAL HEADER */}

            <div className="sticky top-0 z-10 flex items-center justify-between border-b border-slate-100 bg-white px-6 py-5">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-orange-500">
                  Loyalty
                </p>

                <h2 className="mt-1 text-xl font-bold text-slate-900">
                  {editingReward
                    ? "Edit Reward"
                    : "Create Reward"}
                </h2>

                <p className="mt-1 text-xs text-slate-500">
                  Configure the reward customers can redeem.
                </p>
              </div>

              <button
                onClick={closeModal}
                disabled={saving}
                className="flex h-9 w-9 items-center justify-center rounded-lg text-xl text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 disabled:opacity-50"
              >
                ×
              </button>
            </div>

            {/* FORM */}

            <div className="space-y-5 p-6">
              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-700">
                  Reward Name
                </label>

                <input
                  type="text"
                  value={form.name}
                  onChange={(event) =>
                    setForm({
                      ...form,
                      name: event.target.value,
                    })
                  }
                  placeholder="Example: ₹50 Off"
                  className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none transition focus:border-orange-500 focus:ring-2 focus:ring-orange-100"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-700">
                  Description
                </label>

                <textarea
                  rows={3}
                  value={form.description}
                  onChange={(event) =>
                    setForm({
                      ...form,
                      description: event.target.value,
                    })
                  }
                  placeholder="Get ₹50 discount on your next order."
                  className="w-full resize-none rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none transition focus:border-orange-500 focus:ring-2 focus:ring-orange-100"
                />
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-2 block text-sm font-semibold text-slate-700">
                    Points Required
                  </label>

                  <input
                    type="number"
                    min="1"
                    value={form.pointsRequired}
                    onChange={(event) =>
                      setForm({
                        ...form,
                        pointsRequired:
                          event.target.value,
                      })
                    }
                    placeholder="100"
                    className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none transition focus:border-orange-500 focus:ring-2 focus:ring-orange-100"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-semibold text-slate-700">
                    Reward Value
                  </label>

                  <input
                    type="number"
                    min="1"
                    value={form.rewardValue}
                    onChange={(event) =>
                      setForm({
                        ...form,
                        rewardValue:
                          event.target.value,
                      })
                    }
                    placeholder="50"
                    className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none transition focus:border-orange-500 focus:ring-2 focus:ring-orange-100"
                  />
                </div>
              </div>

              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-700">
                  Reward Type
                </label>

                <select
                  value={form.rewardType}
                  onChange={(event) =>
                    setForm({
                      ...form,
                      rewardType:
                        event.target.value as RewardType,
                    })
                  }
                  className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-orange-500 focus:ring-2 focus:ring-orange-100"
                >
                  <option value="discount">
                    Discount
                  </option>

                  <option value="cashback">
                    Cashback
                  </option>

                  <option value="free_item">
                    Free Item
                  </option>
                </select>
              </div>

              <label className="flex cursor-pointer items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 p-4">
                <input
                  type="checkbox"
                  checked={form.active}
                  onChange={(event) =>
                    setForm({
                      ...form,
                      active: event.target.checked,
                    })
                  }
                  className="h-5 w-5 rounded border-slate-300 text-orange-500"
                />

                <div>
                  <p className="text-sm font-semibold text-slate-800">
                    Reward is active
                  </p>

                  <p className="text-xs text-slate-500">
                    Active rewards can be shown to customers.
                  </p>
                </div>
              </label>
            </div>

            {/* MODAL FOOTER */}

            <div className="sticky bottom-0 flex gap-3 border-t border-slate-100 bg-white px-6 py-5">
              <button
                onClick={closeModal}
                disabled={saving}
                className="flex-1 rounded-xl border border-slate-200 px-4 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-50"
              >
                Cancel
              </button>

              <button
                onClick={saveReward}
                disabled={saving}
                className="flex-1 rounded-xl bg-orange-500 px-4 py-3 text-sm font-semibold text-white transition hover:bg-orange-600 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {saving
                  ? "Saving..."
                  : editingReward
                  ? "Update Reward"
                  : "Create Reward"}
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}