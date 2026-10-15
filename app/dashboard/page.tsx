"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { signOut, onAuthStateChanged } from "firebase/auth";
import {
  collection,
  getDocs,
  limit,
  onSnapshot,
  query,
  Timestamp,
  where,
} from "firebase/firestore";

import { auth, db } from "@/src/lib/firebase";

type OrderStatus =
  | "pending"
  | "accepted"
  | "preparing"
  | "ready"
  | "completed"
  | "cancelled";

type PaymentStatus = "unpaid" | "paid";

type OrderItem = {
  menuItemId: string;
  name: string;
  price: number;
  quantity: number;
  isVeg: boolean;
};

type Order = {
  id: string;
  cafeId: string;
  customerName: string;
  customerPhone?: string;
  tableNumber: string;
  items: OrderItem[];
  total: number;
  status: OrderStatus;
  paymentStatus: PaymentStatus;
  createdAt?: Timestamp | null;
};

type Cafe = {
  id: string;
  name: string;
  ownerId: string;
  whatsappNumber?: string;
  googleReviewUrl?: string;
};

type Feedback = {
  id: string;
  rating: number;
  message: string;
  categories: string[];
  createdAt?: Timestamp | null;
};

const statusStyles: Record<OrderStatus, string> = {
  pending: "bg-amber-100 text-amber-700",
  accepted: "bg-blue-100 text-blue-700",
  preparing: "bg-purple-100 text-purple-700",
  ready: "bg-emerald-100 text-emerald-700",
  completed: "bg-green-100 text-green-700",
  cancelled: "bg-red-100 text-red-700",
};

const statusLabels: Record<OrderStatus, string> = {
  pending: "Pending",
  accepted: "Accepted",
  preparing: "Preparing",
  ready: "Ready",
  completed: "Completed",
  cancelled: "Cancelled",
};

function formatCurrency(value: number) {
  return `₹${value.toLocaleString("en-IN")}`;
}

function formatOrderTime(timestamp?: Timestamp | null) {
  if (!timestamp) return "Just now";

  return timestamp.toDate().toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function DashboardPage() {
  const [userEmail, setUserEmail] = useState("");
  const [cafe, setCafe] = useState<Cafe | null>(null);

  const [feedback, setFeedback] = useState<Feedback[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);

  const [loading, setLoading] = useState(true);
  const [ordersLoading, setOrdersLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let mounted = true;
    let unsubscribeOrders: (() => void) | null = null;

    const unsubscribeAuth = onAuthStateChanged(auth, async (currentUser) => {
      if (!currentUser) {
        window.location.href = "/login";
        return;
      }

      if (!mounted) return;

      setUserEmail(currentUser.email || "");

      try {
        const cafeQuery = query(
          collection(db, "cafes"),
          where("ownerId", "==", currentUser.uid),
          limit(1)
        );

        const cafeSnapshot = await getDocs(cafeQuery);

        if (cafeSnapshot.empty) {
          if (mounted) {
            setCafe(null);
            setLoading(false);
            setOrdersLoading(false);
          }
          return;
        }

        const cafeDoc = cafeSnapshot.docs[0];

        const currentCafe: Cafe = {
          id: cafeDoc.id,
          ...(cafeDoc.data() as Omit<Cafe, "id">),
        };

        if (!mounted) return;

        setCafe(currentCafe);

        // -----------------------------
        // FEEDBACK
        // -----------------------------

        const feedbackQuery = query(
          collection(db, "feedback"),
          where("cafeId", "==", currentCafe.id),
          limit(100)
        );

        const feedbackSnapshot = await getDocs(feedbackQuery);

        const feedbackData: Feedback[] = feedbackSnapshot.docs.map((doc) => ({
          id: doc.id,
          ...(doc.data() as Omit<Feedback, "id">),
        }));

        feedbackData.sort((a, b) => {
          const aTime = a.createdAt?.toMillis?.() || 0;
          const bTime = b.createdAt?.toMillis?.() || 0;
          return bTime - aTime;
        });

        if (mounted) {
          setFeedback(feedbackData);
          setLoading(false);
        }

        // -----------------------------
        // ORDERS - REAL TIME
        // -----------------------------

        const ordersQuery = query(
          collection(db, "orders"),
          where("ownerId", "==", currentUser.uid)
        );

        unsubscribeOrders = onSnapshot(
          ordersQuery,
          (snapshot) => {
            const orderData: Order[] = snapshot.docs.map((doc) => ({
              id: doc.id,
              ...(doc.data() as Omit<Order, "id">),
            }));

            orderData.sort((a, b) => {
              const aTime = a.createdAt?.toMillis?.() || 0;
              const bTime = b.createdAt?.toMillis?.() || 0;

              return bTime - aTime;
            });

            if (mounted) {
              setOrders(orderData);
              setOrdersLoading(false);
            }
          },
          (snapshotError) => {
            console.error("Orders listener error:", snapshotError);

            if (mounted) {
              setOrdersLoading(false);
              setError(
                "Orders could not be loaded. Please refresh the page."
              );
            }
          }
        );
      } catch (err) {
        console.error("Dashboard loading error:", err);

        if (mounted) {
          setError("Something went wrong while loading your dashboard.");
          setLoading(false);
          setOrdersLoading(false);
        }
      }
    });

    return () => {
      mounted = false;
      unsubscribeAuth();

      if (unsubscribeOrders) {
        unsubscribeOrders();
      }
    };
  }, []);

  // -----------------------------
  // FEEDBACK ANALYTICS
  // -----------------------------

  const totalFeedback = feedback.length;

  const averageRating =
    totalFeedback > 0
      ? feedback.reduce((sum, item) => sum + item.rating, 0) /
        totalFeedback
      : 0;

  const ratingCounts = useMemo(() => {
    return {
      5: feedback.filter((item) => item.rating === 5).length,
      4: feedback.filter((item) => item.rating === 4).length,
      3: feedback.filter((item) => item.rating === 3).length,
      2: feedback.filter((item) => item.rating === 2).length,
      1: feedback.filter((item) => item.rating === 1).length,
    };
  }, [feedback]);

  // -----------------------------
  // ORDER ANALYTICS
  // -----------------------------

  const startOfToday = useMemo(() => {
    const date = new Date();

    date.setHours(0, 0, 0, 0);

    return date;
  }, []);

  const todayOrders = useMemo(() => {
    return orders.filter((order) => {
      const orderDate = order.createdAt?.toDate?.();

      if (!orderDate) return false;

      return orderDate >= startOfToday;
    });
  }, [orders, startOfToday]);

  const pendingOrders = useMemo(() => {
    return orders.filter((order) => order.status === "pending");
  }, [orders]);

  const activeOrders = useMemo(() => {
    return orders.filter((order) =>
      ["pending", "accepted", "preparing", "ready"].includes(order.status)
    );
  }, [orders]);

  const activeOrderValue = useMemo(() => {
    return activeOrders.reduce((sum, order) => sum + order.total, 0);
  }, [activeOrders]);

  const totalRevenue = useMemo(() => {
    return orders
      .filter(
        (order) =>
          order.paymentStatus === "paid" && order.status !== "cancelled"
      )
      .reduce((sum, order) => sum + order.total, 0);
  }, [orders]);

  const todayRevenue = useMemo(() => {
    return todayOrders
      .filter(
        (order) =>
          order.paymentStatus === "paid" && order.status !== "cancelled"
      )
      .reduce((sum, order) => sum + order.total, 0);
  }, [todayOrders]);

  const recentOrders = orders.slice(0, 5);

  async function handleLogout() {
    try {
      await signOut(auth);
      window.location.href = "/login";
    } catch (err) {
      console.error("Logout error:", err);
    }
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <div className="mx-auto mb-4 h-10 w-10 animate-spin rounded-full border-4 border-orange-200 border-t-orange-500" />

          <p className="text-sm text-slate-500">
            Loading your dashboard...
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-50">
      {/* NAVBAR */}

      <nav className="sticky top-0 z-50 border-b border-slate-200 bg-white/95 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-6 lg:px-8">
          <Link href="/dashboard" className="flex items-center gap-3">
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
            <div className="hidden text-right sm:block">
              <p className="text-sm font-medium text-slate-700">
                {userEmail}
              </p>

              <p className="text-xs text-slate-400">Cafe Owner</p>
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

      {/* HERO */}

      <section className="bg-slate-950">
        <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
          <div className="max-w-3xl">
            <p className="mb-3 text-sm font-semibold uppercase tracking-wider text-orange-400">
              Owner Dashboard
            </p>

            <h1 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">
              {cafe ? `Welcome back to ${cafe.name}` : "Welcome to CafeFlow"}
            </h1>

            <p className="mt-4 max-w-2xl text-base leading-7 text-slate-300">
              Manage your orders, customer feedback, menu, QR ordering,
              and restaurant operations from one place.
            </p>
          </div>
        </div>
      </section>

      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        {/* NO CAFE */}

        {!cafe ? (
          <section className="rounded-2xl border border-orange-200 bg-orange-50 p-8 text-center">
            <h2 className="text-xl font-bold text-slate-900">
              Set up your cafe
            </h2>

            <p className="mx-auto mt-2 max-w-lg text-sm text-slate-600">
              Complete your cafe setup before using orders, feedback,
              menu management, and QR ordering.
            </p>

            <Link
              href="/onboarding"
              className="mt-6 inline-flex rounded-xl bg-orange-500 px-5 py-3 text-sm font-semibold text-white transition hover:bg-orange-600"
            >
              Complete Setup
            </Link>
          </section>
        ) : (
          <>
            {/* QUICK ACTIONS */}

            <section>
              <div className="mb-4">
                <h2 className="text-xl font-bold text-slate-900">
                  Quick Actions
                </h2>

                <p className="mt-1 text-sm text-slate-500">
                  Manage the most important parts of your cafe.
                </p>
              </div>

              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                <Link
                  href="/dashboard/orders"
                  className="group rounded-2xl border border-orange-200 bg-orange-50 p-5 transition hover:-translate-y-1 hover:shadow-md"
                >
                  <div className="text-2xl">🧾</div>

                  <h3 className="mt-3 font-semibold text-slate-900">
                    Orders
                  </h3>

                  <p className="mt-1 text-sm text-slate-500">
                    View and manage customer orders.
                  </p>
                </Link>

                <Link
                  href="/dashboard/reception"
                  className="group rounded-2xl border border-blue-200 bg-blue-50 p-5 transition hover:-translate-y-1 hover:shadow-md"
                >
                  <div className="text-2xl">🖥️</div>

                  <h3 className="mt-3 font-semibold text-slate-900">
                    Reception
                  </h3>

                  <p className="mt-1 text-sm text-slate-500">
                    Handle active orders at the counter.
                  </p>
                </Link>

                <Link
                  href="/dashboard/menu"
                  className="group rounded-2xl border border-purple-200 bg-purple-50 p-5 transition hover:-translate-y-1 hover:shadow-md"
                >
                  <div className="text-2xl">🍽️</div>

                  <h3 className="mt-3 font-semibold text-slate-900">
                    Menu
                  </h3>

                  <p className="mt-1 text-sm text-slate-500">
                    Add and manage your food items.
                  </p>
                </Link>

                <Link
                  href="/dashboard/feedback"
                  className="group rounded-2xl border border-emerald-200 bg-emerald-50 p-5 transition hover:-translate-y-1 hover:shadow-md"
                >
                  <div className="text-2xl">⭐</div>

                  <h3 className="mt-3 font-semibold text-slate-900">
                    Feedback
                  </h3>

                  <p className="mt-1 text-sm text-slate-500">
                    Understand what customers think.
                  </p>
                </Link>

                <Link
                  href="/dashboard/qr"
                  className="group rounded-2xl border border-pink-200 bg-pink-50 p-5 transition hover:-translate-y-1 hover:shadow-md"
                >
                  <div className="text-2xl">📱</div>

                  <h3 className="mt-3 font-semibold text-slate-900">
                    QR Code
                  </h3>

                  <p className="mt-1 text-sm text-slate-500">
                    Let customers open your digital menu.
                  </p>
                </Link>

                <Link
                  href="/dashboard/loyalty"
                  className="group rounded-2xl border border-yellow-200 bg-yellow-50 p-5 transition hover:-translate-y-1 hover:shadow-md"
                >
                  <div className="text-2xl">🎁</div>

                  <h3 className="mt-3 font-semibold text-slate-900">
                    Loyalty
                  </h3>

                  <p className="mt-1 text-sm text-slate-500">
                    Reward customers and increase repeat visits.
                  </p>
                </Link>

                <Link
                  href="/dashboard/cafe"
                  className="group rounded-2xl border border-slate-200 bg-white p-5 transition hover:-translate-y-1 hover:shadow-md"
                >
                  <div className="text-2xl">🏪</div>

                  <h3 className="mt-3 font-semibold text-slate-900">
                    My Cafe
                  </h3>

                  <p className="mt-1 text-sm text-slate-500">
                    Manage cafe information and settings.
                  </p>
                </Link>
              </div>
            </section>

            {/* ORDER STATS */}

            <section className="mt-10">
              <div className="mb-4 flex items-end justify-between">
                <div>
                  <h2 className="text-xl font-bold text-slate-900">
                    Order Overview
                  </h2>

                  <p className="mt-1 text-sm text-slate-500">
                    Live performance from your customer orders.
                  </p>
                </div>

                {ordersLoading && (
                  <span className="text-xs text-slate-400">
                    Updating...
                  </span>
                )}
              </div>

              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                  <p className="text-sm text-slate-500">Total Orders</p>

                  <p className="mt-2 text-3xl font-bold text-slate-900">
                    {orders.length}
                  </p>

                  <p className="mt-2 text-xs text-slate-400">
                    All customer orders
                  </p>
                </div>

                <div className="rounded-2xl border border-amber-200 bg-amber-50 p-5 shadow-sm">
                  <p className="text-sm text-amber-700">Pending Orders</p>

                  <p className="mt-2 text-3xl font-bold text-amber-800">
                    {pendingOrders.length}
                  </p>

                  <p className="mt-2 text-xs text-amber-600">
                    Need attention
                  </p>
                </div>

                <div className="rounded-2xl border border-blue-200 bg-blue-50 p-5 shadow-sm">
                  <p className="text-sm text-blue-700">Today's Orders</p>

                  <p className="mt-2 text-3xl font-bold text-blue-800">
                    {todayOrders.length}
                  </p>

                  <p className="mt-2 text-xs text-blue-600">
                    Orders placed today
                  </p>
                </div>

                <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-5 shadow-sm">
                  <p className="text-sm text-emerald-700">
                    Today's Revenue
                  </p>

                  <p className="mt-2 text-3xl font-bold text-emerald-800">
                    {formatCurrency(todayRevenue)}
                  </p>

                  <p className="mt-2 text-xs text-emerald-600">
                    Paid orders
                  </p>
                </div>
              </div>
            </section>

            {/* ACTIVE ORDER + REVENUE */}

            <section className="mt-4 grid gap-4 lg:grid-cols-3">
              <div className="rounded-2xl border border-slate-200 bg-white p-6">
                <p className="text-sm text-slate-500">
                  Active Orders
                </p>

                <div className="mt-3 flex items-end justify-between">
                  <p className="text-3xl font-bold text-slate-900">
                    {activeOrders.length}
                  </p>

                  <span className="rounded-full bg-orange-100 px-3 py-1 text-xs font-semibold text-orange-700">
                    Live
                  </span>
                </div>

                <p className="mt-2 text-sm text-slate-500">
                  Pending, accepted, preparing and ready orders.
                </p>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white p-6">
                <p className="text-sm text-slate-500">
                  Active Order Value
                </p>

                <p className="mt-3 text-3xl font-bold text-slate-900">
                  {formatCurrency(activeOrderValue)}
                </p>

                <p className="mt-2 text-sm text-slate-500">
                  Current orders not yet completed.
                </p>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white p-6">
                <p className="text-sm text-slate-500">
                  Total Paid Revenue
                </p>

                <p className="mt-3 text-3xl font-bold text-slate-900">
                  {formatCurrency(totalRevenue)}
                </p>

                <p className="mt-2 text-sm text-slate-500">
                  Excluding cancelled orders.
                </p>
              </div>
            </section>

            {/* RECENT ORDERS */}

            <section className="mt-10">
              <div className="mb-4 flex items-end justify-between">
                <div>
                  <h2 className="text-xl font-bold text-slate-900">
                    Recent Orders
                  </h2>

                  <p className="mt-1 text-sm text-slate-500">
                    Your latest customer orders.
                  </p>
                </div>

                <Link
                  href="/dashboard/orders"
                  className="text-sm font-semibold text-orange-600 hover:text-orange-700"
                >
                  View all →
                </Link>
              </div>

              <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                {recentOrders.length === 0 ? (
                  <div className="p-8 text-center">
                    <div className="text-4xl">🧾</div>

                    <h3 className="mt-3 font-semibold text-slate-900">
                      No orders yet
                    </h3>

                    <p className="mt-1 text-sm text-slate-500">
                      Customer orders will appear here automatically.
                    </p>
                  </div>
                ) : (
                  <div className="divide-y divide-slate-100">
                    {recentOrders.map((order) => (
                      <div
                        key={order.id}
                        className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between"
                      >
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="font-semibold text-slate-900">
                              #{order.id.slice(0, 6).toUpperCase()}
                            </span>

                            <span
                              className={`rounded-full px-2.5 py-1 text-xs font-semibold ${statusStyles[order.status]}`}
                            >
                              {statusLabels[order.status]}
                            </span>

                            <span
                              className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                                order.paymentStatus === "paid"
                                  ? "bg-green-100 text-green-700"
                                  : "bg-slate-100 text-slate-600"
                              }`}
                            >
                              {order.paymentStatus === "paid"
                                ? "Paid"
                                : "Unpaid"}
                            </span>
                          </div>

                          <p className="mt-2 text-sm font-medium text-slate-700">
                            {order.customerName}
                          </p>

                          <p className="mt-1 text-xs text-slate-400">
                            Table {order.tableNumber} •{" "}
                            {order.items?.length || 0} item
                            {(order.items?.length || 0) !== 1
                              ? "s"
                              : ""}{" "}
                            • {formatOrderTime(order.createdAt)}
                          </p>
                        </div>

                        <div className="text-left sm:text-right">
                          <p className="text-lg font-bold text-slate-900">
                            {formatCurrency(order.total)}
                          </p>

                          <Link
                            href="/dashboard/orders"
                            className="mt-1 inline-block text-xs font-semibold text-orange-600 hover:text-orange-700"
                          >
                            Manage order →
                          </Link>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </section>

            {/* FEEDBACK STATS */}

            <section className="mt-10">
              <div className="mb-4">
                <h2 className="text-xl font-bold text-slate-900">
                  Customer Feedback
                </h2>

                <p className="mt-1 text-sm text-slate-500">
                  Understand how customers feel about your cafe.
                </p>
              </div>

              <div className="grid gap-4 lg:grid-cols-3">
                {/* TOTAL */}

                <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                  <p className="text-sm text-slate-500">
                    Total Feedback
                  </p>

                  <p className="mt-2 text-4xl font-bold text-slate-900">
                    {totalFeedback}
                  </p>

                  <p className="mt-2 text-sm text-slate-500">
                    Customer responses
                  </p>
                </div>

                {/* AVERAGE */}

                <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                  <p className="text-sm text-slate-500">
                    Average Rating
                  </p>

                  <div className="mt-2 flex items-center gap-3">
                    <p className="text-4xl font-bold text-slate-900">
                      {averageRating.toFixed(1)}
                    </p>

                    <span className="text-2xl text-amber-400">
                      ★
                    </span>
                  </div>

                  <p className="mt-2 text-sm text-slate-500">
                    Based on customer feedback
                  </p>
                </div>

                {/* CAFE */}

                <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                  <p className="text-sm text-slate-500">
                    Your Cafe
                  </p>

                  <p className="mt-2 truncate text-2xl font-bold text-slate-900">
                    {cafe.name}
                  </p>

                  <Link
                    href={`/c/${cafe.id}`}
                    target="_blank"
                    className="mt-3 inline-block text-sm font-semibold text-orange-600 hover:text-orange-700"
                  >
                    Open customer page →
                  </Link>
                </div>
              </div>
            </section>

            {/* RATING OVERVIEW */}

            <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-bold text-slate-900">
                    Rating Overview
                  </h3>

                  <p className="mt-1 text-sm text-slate-500">
                    Distribution of customer ratings.
                  </p>
                </div>

                <span className="text-2xl font-bold text-slate-900">
                  {averageRating.toFixed(1)} ★
                </span>
              </div>

              <div className="mt-6 space-y-4">
                {[5, 4, 3, 2, 1].map((rating) => {
                  const count =
                    ratingCounts[
                      rating as keyof typeof ratingCounts
                    ];

                  const percentage =
                    totalFeedback > 0
                      ? (count / totalFeedback) * 100
                      : 0;

                  return (
                    <div
                      key={rating}
                      className="flex items-center gap-3"
                    >
                      <span className="w-10 text-sm font-medium text-slate-600">
                        {rating} ★
                      </span>

                      <div className="h-2 flex-1 overflow-hidden rounded-full bg-slate-100">
                        <div
                          className="h-full rounded-full bg-orange-500 transition-all"
                          style={{
                            width: `${percentage}%`,
                          }}
                        />
                      </div>

                      <span className="w-8 text-right text-sm text-slate-500">
                        {count}
                      </span>
                    </div>
                  );
                })}
              </div>
            </section>

            {/* RECENT FEEDBACK */}

            <section className="mt-10">
              <div className="mb-4 flex items-end justify-between">
                <div>
                  <h2 className="text-xl font-bold text-slate-900">
                    Recent Feedback
                  </h2>

                  <p className="mt-1 text-sm text-slate-500">
                    Latest customer comments.
                  </p>
                </div>

                <Link
                  href="/dashboard/feedback"
                  className="text-sm font-semibold text-orange-600 hover:text-orange-700"
                >
                  View all →
                </Link>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                {feedback.slice(0, 4).map((item) => (
                  <div
                    key={item.id}
                    className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
                  >
                    <div className="flex items-center justify-between">
                      <div className="text-lg tracking-wide text-amber-400">
                        {"★".repeat(item.rating)}
                        <span className="text-slate-200">
                          {"★".repeat(5 - item.rating)}
                        </span>
                      </div>

                      <span className="text-xs text-slate-400">
                        {formatOrderTime(item.createdAt)}
                      </span>
                    </div>

                    <p className="mt-4 text-sm leading-6 text-slate-600">
                      “{item.message}”
                    </p>

                    {item.categories?.length > 0 && (
                      <div className="mt-4 flex flex-wrap gap-2">
                        {item.categories.map((category) => (
                          <span
                            key={category}
                            className="rounded-full bg-slate-100 px-2.5 py-1 text-xs text-slate-600"
                          >
                            {category}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                ))}

                {feedback.length === 0 && (
                  <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center md:col-span-2">
                    <div className="text-4xl">⭐</div>

                    <h3 className="mt-3 font-semibold text-slate-900">
                      No feedback yet
                    </h3>

                    <p className="mt-1 text-sm text-slate-500">
                      Customer feedback will appear here.
                    </p>
                  </div>
                )}
              </div>
            </section>

            {/* CTA */}

            <section className="mt-10 overflow-hidden rounded-3xl bg-orange-500 p-8 sm:p-10">
              <div className="max-w-3xl">
                <p className="text-sm font-semibold uppercase tracking-wider text-orange-100">
                  Grow your cafe
                </p>

                <h2 className="mt-2 text-2xl font-bold text-white sm:text-3xl">
                  Turn every customer interaction into growth.
                </h2>

                <p className="mt-3 max-w-2xl text-sm leading-6 text-orange-50">
                  Use CafeFlow to collect feedback, increase repeat
                  customers, manage digital orders, and build a stronger
                  restaurant brand.
                </p>

                <div className="mt-6 flex flex-wrap gap-3">
                  <Link
                    href="/dashboard/menu"
                    className="rounded-xl bg-white px-5 py-3 text-sm font-semibold text-orange-600 transition hover:bg-orange-50"
                  >
                    Manage Menu
                  </Link>

                  <Link
                    href="/dashboard/qr"
                    className="rounded-xl border border-orange-300 px-5 py-3 text-sm font-semibold text-white transition hover:bg-orange-600"
                  >
                    Get QR Code
                  </Link>
                </div>
              </div>
            </section>
          </>
        )}
      </div>

      {/* FOOTER */}

      <footer className="mt-16 border-t border-slate-200 bg-white">
        <div className="mx-auto flex max-w-7xl flex-col gap-3 px-4 py-8 text-sm text-slate-500 sm:flex-row sm:items-center sm:justify-between sm:px-6 lg:px-8">
          <p>© 2026 CafeFlow. All rights reserved.</p>

          <p>
            Customer Feedback • Digital Menu • Ordering • Growth
          </p>
        </div>
      </footer>
    </main>
  );
}