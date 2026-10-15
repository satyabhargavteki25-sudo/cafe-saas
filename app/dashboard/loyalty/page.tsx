"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { onAuthStateChanged, signOut } from "firebase/auth";
import {
  collection,
  getDocs,
  limit,
  query,
  where,
} from "firebase/firestore";

import { auth, db } from "@/src/lib/firebase";

type Cafe = {
  id: string;
  name: string;
  ownerId: string;
};

type LoyaltyCustomer = {
  id: string;
  name: string;
  phone: string;
  points: number;
  orders: number;
  spent: number;
  lastVisit: string;
  tier: "Bronze" | "Silver" | "Gold";
};

type Order = {
  id: string;
  ownerId: string;
  customerName: string;
  customerPhone?: string;
  total: number;
  status:
    | "pending"
    | "accepted"
    | "preparing"
    | "ready"
    | "completed"
    | "cancelled";
  paymentStatus: "unpaid" | "paid";
  createdAt?: {
    toDate?: () => Date;
  } | null;
};

function formatCurrency(value: number) {
  return `₹${value.toLocaleString("en-IN")}`;
}

function calculateTier(points: number): LoyaltyCustomer["tier"] {
  if (points >= 500) return "Gold";
  if (points >= 200) return "Silver";
  return "Bronze";
}

function getTierStyle(tier: LoyaltyCustomer["tier"]) {
  if (tier === "Gold") {
    return "bg-amber-100 text-amber-700 border-amber-200";
  }

  if (tier === "Silver") {
    return "bg-slate-100 text-slate-700 border-slate-200";
  }

  return "bg-orange-100 text-orange-700 border-orange-200";
}

export default function LoyaltyPage() {
  const [cafe, setCafe] = useState<Cafe | null>(null);
  const [customers, setCustomers] = useState<LoyaltyCustomer[]>([]);
  const [loading, setLoading] = useState(true);
  const [userEmail, setUserEmail] = useState("");
  const [search, setSearch] = useState("");

  useEffect(() => {
    let mounted = true;

    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (!currentUser) {
        window.location.href = "/login";
        return;
      }

      if (!mounted) return;

      setUserEmail(currentUser.email || "");

      try {
        // -----------------------------
        // GET CAFE
        // -----------------------------

        const cafeQuery = query(
          collection(db, "cafes"),
          where("ownerId", "==", currentUser.uid),
          limit(1)
        );

        const cafeSnapshot = await getDocs(cafeQuery);

        if (cafeSnapshot.empty) {
          if (mounted) {
            setLoading(false);
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
        // GET ORDERS
        // -----------------------------

        const ordersQuery = query(
          collection(db, "orders"),
          where("ownerId", "==", currentUser.uid)
        );

        const ordersSnapshot = await getDocs(ordersQuery);

        const orders: Order[] = ordersSnapshot.docs.map((doc) => ({
          id: doc.id,
          ...(doc.data() as Omit<Order, "id">),
        }));

        // -----------------------------
        // BUILD CUSTOMER DATA
        // -----------------------------

        const customerMap = new Map<
          string,
          {
            name: string;
            phone: string;
            orders: number;
            spent: number;
            lastVisit: Date | null;
          }
        >();

        orders
          .filter(
            (order) =>
              order.status === "completed" &&
              order.paymentStatus === "paid"
          )
          .forEach((order) => {
            const phone = order.customerPhone || "unknown";

            const existing = customerMap.get(phone);

            const orderDate = order.createdAt?.toDate
              ? order.createdAt.toDate()
              : null;

            if (existing) {
              existing.orders += 1;
              existing.spent += order.total;

              if (
                orderDate &&
                (!existing.lastVisit ||
                  orderDate > existing.lastVisit)
              ) {
                existing.lastVisit = orderDate;
              }
            } else {
              customerMap.set(phone, {
                name: order.customerName,
                phone,
                orders: 1,
                spent: order.total,
                lastVisit: orderDate,
              });
            }
          });

        const loyaltyCustomers: LoyaltyCustomer[] = Array.from(
          customerMap.values()
        ).map((customer, index) => {
          /*
           * Loyalty formula:
           *
           * ₹100 spent = 10 points
           */

          const points = Math.floor(customer.spent / 10);

          return {
            id: `${customer.phone}-${index}`,
            name: customer.name,
            phone: customer.phone,
            points,
            orders: customer.orders,
            spent: customer.spent,
            lastVisit: customer.lastVisit
              ? customer.lastVisit.toLocaleDateString("en-IN", {
                  day: "2-digit",
                  month: "short",
                  year: "numeric",
                })
              : "—",
            tier: calculateTier(points),
          };
        });

        loyaltyCustomers.sort((a, b) => b.points - a.points);

        if (mounted) {
          setCustomers(loyaltyCustomers);
          setLoading(false);
        }
      } catch (error) {
        console.error("Loyalty dashboard error:", error);

        if (mounted) {
          setLoading(false);
        }
      }
    });

    return () => {
      mounted = false;
      unsubscribe();
    };
  }, []);

  // -----------------------------
  // SEARCH
  // -----------------------------

  const filteredCustomers = useMemo(() => {
    const value = search.trim().toLowerCase();

    if (!value) {
      return customers;
    }

    return customers.filter(
      (customer) =>
        customer.name.toLowerCase().includes(value) ||
        customer.phone.includes(value)
    );
  }, [customers, search]);

  // -----------------------------
  // ANALYTICS
  // -----------------------------

  const totalCustomers = customers.length;

  const totalPoints = customers.reduce(
    (sum, customer) => sum + customer.points,
    0
  );

  const totalSpent = customers.reduce(
    (sum, customer) => sum + customer.spent,
    0
  );

  const totalOrders = customers.reduce(
    (sum, customer) => sum + customer.orders,
    0
  );

  const goldCustomers = customers.filter(
    (customer) => customer.tier === "Gold"
  ).length;

  const silverCustomers = customers.filter(
    (customer) => customer.tier === "Silver"
  ).length;

  const bronzeCustomers = customers.filter(
    (customer) => customer.tier === "Bronze"
  ).length;

  async function handleLogout() {
    try {
      await signOut(auth);
      window.location.href = "/login";
    } catch (error) {
      console.error("Logout error:", error);
    }
  }

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-50">
        <div className="text-center">
          <div className="mx-auto mb-4 h-10 w-10 animate-spin rounded-full border-4 border-orange-200 border-t-orange-500" />

          <p className="text-sm text-slate-500">
            Loading loyalty dashboard...
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
                Loyalty & Rewards
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

      {/* HERO */}

      <section className="bg-slate-950">
        <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
          <p className="text-sm font-semibold uppercase tracking-wider text-orange-400">
            Customer Loyalty
          </p>

          <h1 className="mt-2 text-3xl font-bold tracking-tight text-white sm:text-4xl">
            Turn regular customers into loyal customers.
          </h1>

          <p className="mt-4 max-w-2xl text-base leading-7 text-slate-300">
            Track customer visits, spending and loyalty points from
            completed paid orders.
          </p>
        </div>
      </section>

      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        {/* BACK */}

        <Link
          href="/dashboard"
          className="mb-6 inline-flex text-sm font-semibold text-orange-600 hover:text-orange-700"
        >
          ← Back to Dashboard
        </Link>

        {/* CAFE */}

        {cafe && (
          <div className="mb-6 rounded-2xl border border-orange-200 bg-orange-50 p-5">
            <p className="text-sm text-orange-700">
              Loyalty program for
            </p>

            <h2 className="mt-1 text-xl font-bold text-slate-900">
              {cafe.name}
            </h2>
          </div>
        )}

        {/* STATS */}

        <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <p className="text-sm text-slate-500">
              Loyalty Customers
            </p>

            <p className="mt-2 text-3xl font-bold text-slate-900">
              {totalCustomers}
            </p>

            <p className="mt-2 text-xs text-slate-400">
              Customers with completed orders
            </p>
          </div>

          <div className="rounded-2xl border border-orange-200 bg-orange-50 p-6 shadow-sm">
            <p className="text-sm text-orange-700">
              Points Issued
            </p>

            <p className="mt-2 text-3xl font-bold text-orange-800">
              {totalPoints.toLocaleString("en-IN")}
            </p>

            <p className="mt-2 text-xs text-orange-600">
              ₹100 spent = 10 points
            </p>
          </div>

          <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-6 shadow-sm">
            <p className="text-sm text-emerald-700">
              Customer Spending
            </p>

            <p className="mt-2 text-3xl font-bold text-emerald-800">
              {formatCurrency(totalSpent)}
            </p>

            <p className="mt-2 text-xs text-emerald-600">
              From loyalty customers
            </p>
          </div>

          <div className="rounded-2xl border border-blue-200 bg-blue-50 p-6 shadow-sm">
            <p className="text-sm text-blue-700">
              Completed Orders
            </p>

            <p className="mt-2 text-3xl font-bold text-blue-800">
              {totalOrders}
            </p>

            <p className="mt-2 text-xs text-blue-600">
              Paid and completed
            </p>
          </div>
        </section>

        {/* TIERS */}

        <section className="mt-8">
          <div className="mb-4">
            <h2 className="text-xl font-bold text-slate-900">
              Loyalty Tiers
            </h2>

            <p className="mt-1 text-sm text-slate-500">
              Customers are automatically grouped based on their
              points.
            </p>
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            <div className="rounded-2xl border border-orange-200 bg-white p-6">
              <div className="flex items-center justify-between">
                <span className="text-2xl">🥉</span>

                <span className="rounded-full border border-orange-200 bg-orange-100 px-3 py-1 text-xs font-semibold text-orange-700">
                  Bronze
                </span>
              </div>

              <p className="mt-4 text-3xl font-bold text-slate-900">
                {bronzeCustomers}
              </p>

              <p className="mt-1 text-sm text-slate-500">
                0–199 points
              </p>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-6">
              <div className="flex items-center justify-between">
                <span className="text-2xl">🥈</span>

                <span className="rounded-full border border-slate-200 bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
                  Silver
                </span>
              </div>

              <p className="mt-4 text-3xl font-bold text-slate-900">
                {silverCustomers}
              </p>

              <p className="mt-1 text-sm text-slate-500">
                200–499 points
              </p>
            </div>

            <div className="rounded-2xl border border-amber-200 bg-white p-6">
              <div className="flex items-center justify-between">
                <span className="text-2xl">🥇</span>

                <span className="rounded-full border border-amber-200 bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-700">
                  Gold
                </span>
              </div>

              <p className="mt-4 text-3xl font-bold text-slate-900">
                {goldCustomers}
              </p>

              <p className="mt-1 text-sm text-slate-500">
                500+ points
              </p>
            </div>
          </div>
        </section>

        {/* REWARD RULES */}

        <section className="mt-8">
          <div className="rounded-2xl bg-slate-950 p-6 sm:p-8">
            <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <p className="text-sm font-semibold uppercase tracking-wider text-orange-400">
                  Current Reward System
                </p>

                <h2 className="mt-2 text-2xl font-bold text-white">
                  Earn points with every completed order.
                </h2>

                <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-300">
                  Points are calculated from completed and paid
                  orders. Customers can later use these points for
                  rewards and discounts.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-xl bg-white/10 p-4 text-center">
                  <p className="text-2xl font-bold text-white">
                    10
                  </p>

                  <p className="mt-1 text-xs text-slate-300">
                    points / ₹100
                  </p>
                </div>

                <div className="rounded-xl bg-white/10 p-4 text-center">
                  <p className="text-2xl font-bold text-white">
                    ₹50
                  </p>

                  <p className="mt-1 text-xs text-slate-300">
                    starter reward
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* CUSTOMERS */}

        <section className="mt-10">
          <div className="mb-5 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h2 className="text-xl font-bold text-slate-900">
                Loyalty Customers
              </h2>

              <p className="mt-1 text-sm text-slate-500">
                Customers ranked by their loyalty points.
              </p>
            </div>

            <div className="relative">
              <input
                type="text"
                value={search}
                onChange={(event) =>
                  setSearch(event.target.value)
                }
                placeholder="Search customer..."
                className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-orange-400 focus:ring-2 focus:ring-orange-100 sm:w-72"
              />
            </div>
          </div>

          <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            {filteredCustomers.length === 0 ? (
              <div className="p-10 text-center">
                <div className="text-5xl">🎁</div>

                <h3 className="mt-4 font-semibold text-slate-900">
                  No loyalty customers yet
                </h3>

                <p className="mx-auto mt-2 max-w-md text-sm text-slate-500">
                  Once customers complete paid orders, they will
                  automatically appear here.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[800px]">
                  <thead className="border-b border-slate-200 bg-slate-50">
                    <tr>
                      <th className="px-5 py-4 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                        Customer
                      </th>

                      <th className="px-5 py-4 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                        Tier
                      </th>

                      <th className="px-5 py-4 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                        Points
                      </th>

                      <th className="px-5 py-4 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                        Orders
                      </th>

                      <th className="px-5 py-4 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                        Spent
                      </th>

                      <th className="px-5 py-4 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                        Last Visit
                      </th>
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-slate-100">
                    {filteredCustomers.map((customer) => (
                      <tr
                        key={customer.id}
                        className="transition hover:bg-slate-50"
                      >
                        <td className="px-5 py-5">
                          <div>
                            <p className="font-semibold text-slate-900">
                              {customer.name}
                            </p>

                            <p className="mt-1 text-xs text-slate-400">
                              {customer.phone}
                            </p>
                          </div>
                        </td>

                        <td className="px-5 py-5">
                          <span
                            className={`rounded-full border px-3 py-1 text-xs font-semibold ${getTierStyle(
                              customer.tier
                            )}`}
                          >
                            {customer.tier}
                          </span>
                        </td>

                        <td className="px-5 py-5">
                          <span className="font-bold text-slate-900">
                            {customer.points.toLocaleString("en-IN")}
                          </span>

                          <span className="ml-1 text-xs text-slate-400">
                            pts
                          </span>
                        </td>

                        <td className="px-5 py-5 text-sm text-slate-600">
                          {customer.orders}
                        </td>

                        <td className="px-5 py-5 text-sm font-semibold text-slate-900">
                          {formatCurrency(customer.spent)}
                        </td>

                        <td className="px-5 py-5 text-sm text-slate-500">
                          {customer.lastVisit}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </section>

        {/* FUTURE FEATURES */}

        <section className="mt-10 grid gap-4 md:grid-cols-3">
          <div className="rounded-2xl border border-slate-200 bg-white p-6">
            <div className="text-2xl">🎁</div>

            <h3 className="mt-4 font-bold text-slate-900">
              Rewards
            </h3>

            <p className="mt-2 text-sm leading-6 text-slate-500">
              Create rewards customers can redeem using their
              points.
            </p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-6">
            <div className="text-2xl">📲</div>

            <h3 className="mt-4 font-bold text-slate-900">
              Customer Wallet
            </h3>

            <p className="mt-2 text-sm leading-6 text-slate-500">
              Customers will be able to view points and rewards
              from their phone.
            </p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-6">
            <div className="text-2xl">📣</div>

            <h3 className="mt-4 font-bold text-slate-900">
              Marketing
            </h3>

            <p className="mt-2 text-sm leading-6 text-slate-500">
              Send targeted offers to customers based on their
              loyalty activity.
            </p>
          </div>
        </section>
      </div>

      {/* FOOTER */}

      <footer className="mt-16 border-t border-slate-200 bg-white">
        <div className="mx-auto flex max-w-7xl flex-col gap-3 px-4 py-8 text-sm text-slate-500 sm:flex-row sm:items-center sm:justify-between sm:px-6 lg:px-8">
          <p>© 2026 CafeFlow. All rights reserved.</p>

          <p>Customer Loyalty • Rewards • Retention</p>
        </div>
      </footer>
    </main>
  );
}