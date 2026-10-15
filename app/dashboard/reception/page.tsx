"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  collection,
  doc,
  onSnapshot,
  query,
  Timestamp,
  updateDoc,
  where,
} from "firebase/firestore";
import { onAuthStateChanged, signOut, User } from "firebase/auth";
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
  menuItemId?: string;
  name: string;
  price: number;
  quantity: number;
  isVeg?: boolean;
};

type Order = {
  id: string;
  cafeId: string;
  ownerId: string;
  customerName: string;
  customerPhone: string;
  tableNumber: string;
  items: OrderItem[];
  total: number;
  status: OrderStatus;
  paymentStatus: PaymentStatus;
  createdAt?: Timestamp | null;

  // Loyalty fields
  loyaltyProcessed?: boolean;
  loyaltyPointsAwarded?: number;
};

type LoyaltyResult = {
  success: boolean;
  alreadyProcessed?: boolean;
  pointsAwarded?: number;
  message?: string;
};

const STATUS_OPTIONS: OrderStatus[] = [
  "pending",
  "accepted",
  "preparing",
  "ready",
  "completed",
  "cancelled",
];

function formatCurrency(value: number) {
  return `₹${value.toLocaleString("en-IN")}`;
}

function formatDate(timestamp?: Timestamp | null) {
  if (!timestamp) return "Just now";

  const date = timestamp.toDate();

  return date.toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function getStatusLabel(status: OrderStatus) {
  switch (status) {
    case "pending":
      return "Pending";
    case "accepted":
      return "Accepted";
    case "preparing":
      return "Preparing";
    case "ready":
      return "Ready";
    case "completed":
      return "Completed";
    case "cancelled":
      return "Cancelled";
    default:
      return status;
  }
}

function getStatusClasses(status: OrderStatus) {
  switch (status) {
    case "pending":
      return "bg-amber-50 text-amber-700 border-amber-200";

    case "accepted":
      return "bg-blue-50 text-blue-700 border-blue-200";

    case "preparing":
      return "bg-purple-50 text-purple-700 border-purple-200";

    case "ready":
      return "bg-emerald-50 text-emerald-700 border-emerald-200";

    case "completed":
      return "bg-slate-100 text-slate-700 border-slate-200";

    case "cancelled":
      return "bg-red-50 text-red-700 border-red-200";

    default:
      return "bg-slate-100 text-slate-700 border-slate-200";
  }
}

function getNextAction(status: OrderStatus): {
  label: string;
  status?: OrderStatus;
} {
  switch (status) {
    case "pending":
      return {
        label: "Accept Order",
        status: "accepted",
      };

    case "accepted":
      return {
        label: "Start Preparing",
        status: "preparing",
      };

    case "preparing":
      return {
        label: "Mark Ready",
        status: "ready",
      };

    case "ready":
      return {
        label: "Complete Order",
        status: "completed",
      };

    default:
      return {
        label: "Manage",
      };
  }
}

export default function ReceptionPage() {
  const router = useRouter();

  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [orders, setOrders] = useState<Order[]>([]);

  const [loadingUser, setLoadingUser] = useState(true);
  const [loadingOrders, setLoadingOrders] = useState(true);

  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  const [selectedOrder, setSelectedOrder] =
    useState<Order | null>(null);

  const [updatingOrder, setUpdatingOrder] = useState(false);

  // =========================================================
  // AUTH
  // =========================================================

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (!user) {
        router.push("/login");
        return;
      }

      setCurrentUser(user);
      setLoadingUser(false);
    });

    return () => unsubscribe();
  }, [router]);

  // =========================================================
  // ORDERS
  // =========================================================

  useEffect(() => {
    if (!currentUser) return;

    setLoadingOrders(true);
    setError("");

    const ordersQuery = query(
      collection(db, "orders"),
      where("ownerId", "==", currentUser.uid)
    );

    const unsubscribe = onSnapshot(
      ordersQuery,
      (snapshot) => {
        const orderList: Order[] = [];

        snapshot.forEach((document) => {
          const data = document.data();

          orderList.push({
            id: document.id,
            cafeId: data.cafeId ?? "",
            ownerId: data.ownerId ?? "",
            customerName:
              data.customerName ?? "Customer",
            customerPhone:
              data.customerPhone ?? "",
            tableNumber:
              data.tableNumber ?? "",
            items:
              Array.isArray(data.items)
                ? data.items
                : [],
            total:
              Number(data.total ?? 0),
            status:
              data.status ?? "pending",
            paymentStatus:
              data.paymentStatus ?? "unpaid",
            createdAt:
              data.createdAt ?? null,

            loyaltyProcessed:
              data.loyaltyProcessed ?? false,

            loyaltyPointsAwarded:
              Number(
                data.loyaltyPointsAwarded ?? 0
              ),
          });
        });

        orderList.sort((a, b) => {
          const timeA =
            a.createdAt?.toMillis?.() ?? 0;

          const timeB =
            b.createdAt?.toMillis?.() ?? 0;

          return timeB - timeA;
        });

        setOrders(orderList);
        setLoadingOrders(false);
        setError("");
      },
      (firebaseError) => {
        console.error(
          "Orders listener error:",
          firebaseError
        );

        setError(
          "Unable to load orders. Please check your connection and Firestore permissions."
        );

        setLoadingOrders(false);
      }
    );

    return () => unsubscribe();
  }, [currentUser]);

  // =========================================================
  // STATS
  // =========================================================

  const stats = useMemo(() => {
    const pending = orders.filter(
      (order) =>
        order.status === "pending"
    ).length;

    const accepted = orders.filter(
      (order) =>
        order.status === "accepted"
    ).length;

    const preparing = orders.filter(
      (order) =>
        order.status === "preparing"
    ).length;

    const ready = orders.filter(
      (order) =>
        order.status === "ready"
    ).length;

    const unpaid = orders.filter(
      (order) =>
        order.paymentStatus === "unpaid"
    ).length;

    const activeOrders = orders.filter(
      (order) =>
        order.status !== "completed" &&
        order.status !== "cancelled"
    );

    const activeOrderValue =
      activeOrders.reduce(
        (sum, order) =>
          sum + order.total,
        0
      );

    return {
      pending,
      accepted,
      preparing,
      ready,
      unpaid,
      activeOrderValue,
      activeCount:
        activeOrders.length,
    };
  }, [orders]);

  // =========================================================
  // LOYALTY PROCESSOR
  // =========================================================

  const processLoyalty = async (
    order: Order
  ): Promise<LoyaltyResult | null> => {
    if (!currentUser) {
      return null;
    }

    // Loyalty is only processed for:
    // completed + paid orders.

    if (
      order.status !== "completed" ||
      order.paymentStatus !== "paid"
    ) {
      return null;
    }

    try {
      const idToken =
        await currentUser.getIdToken();

      const response = await fetch(
        "/api/loyalty/process-order",
        {
          method: "POST",

          headers: {
            "Content-Type":
              "application/json",

            Authorization:
              `Bearer ${idToken}`,
          },

          body: JSON.stringify({
            orderId: order.id,
          }),
        }
      );

      const result =
        (await response.json()) as LoyaltyResult;

      if (!response.ok || !result.success) {
        throw new Error(
          result.message ||
            "Unable to process loyalty."
        );
      }

      return result;
    } catch (loyaltyError) {
      console.error(
        "Loyalty processing error:",
        loyaltyError
      );

      throw loyaltyError;
    }
  };

  // =========================================================
  // UPDATE ORDER
  // =========================================================

  const updateOrder = async (
    order: Order,
    changes: {
      status?: OrderStatus;
      paymentStatus?: PaymentStatus;
    }
  ) => {
    if (!currentUser) return;

    try {
      setUpdatingOrder(true);
      setError("");
      setSuccessMessage("");

      const newStatus =
        changes.status ?? order.status;

      const newPaymentStatus =
        changes.paymentStatus ??
        order.paymentStatus;

      // -------------------------------------------------------
      // UPDATE FIRESTORE ORDER
      // -------------------------------------------------------

      const orderRef = doc(
        db,
        "orders",
        order.id
      );

      await updateDoc(orderRef, {
        ...changes,
      });

      // -------------------------------------------------------
      // CREATE THE FINAL ORDER STATE
      // -------------------------------------------------------

      const updatedOrder: Order = {
        ...order,
        ...changes,
      };

      // -------------------------------------------------------
      // PROCESS LOYALTY
      //
      // This works in both cases:
      //
      // 1. Completing an already-paid order
      //
      // 2. Paying an already-completed order
      // -------------------------------------------------------

      if (
        newStatus === "completed" &&
        newPaymentStatus === "paid"
      ) {
        try {
          const loyaltyResult =
            await processLoyalty(
              updatedOrder
            );

          if (loyaltyResult) {
            if (
              loyaltyResult.alreadyProcessed
            ) {
              setSuccessMessage(
                "✓ Order updated. Loyalty points were already awarded for this order."
              );
            } else {
              const points =
                loyaltyResult.pointsAwarded ??
                0;

              setSuccessMessage(
                `✓ Order completed and paid. ${points} loyalty points awarded to ${order.customerName}.`
              );
            }
          }
        } catch {
          // The order update succeeded, but
          // loyalty processing failed.
          //
          // Do not pretend points were awarded.

          setError(
            "Order updated successfully, but loyalty points could not be processed. Please try updating the order again."
          );
        }
      } else {
        setSuccessMessage(
          "✓ Order updated successfully."
        );
      }

      setSelectedOrder(null);
    } catch (firebaseError) {
      console.error(
        "Order update error:",
        firebaseError
      );

      setError(
        "Unable to update the order. Please check Firestore permissions."
      );
    } finally {
      setUpdatingOrder(false);
    }
  };

  // =========================================================
  // LOGOUT
  // =========================================================

  const handleLogout = async () => {
    await signOut(auth);
    router.push("/login");
  };

  // =========================================================
  // LOADING
  // =========================================================

  if (loadingUser) {
    return (
      <main className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <div className="mx-auto mb-4 h-10 w-10 animate-spin rounded-full border-4 border-slate-200 border-t-orange-500" />

          <p className="text-sm text-slate-500">
            Loading CafeFlow...
          </p>
        </div>
      </main>
    );
  }

  // =========================================================
  // PAGE
  // =========================================================

  return (
    <main className="min-h-screen bg-slate-50 text-slate-900">

      {/* =====================================================
          NAVBAR
      ====================================================== */}

      <header className="sticky top-0 z-40 border-b border-slate-200 bg-white/95 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-5 py-4 sm:px-6 lg:px-8">

          <div className="flex items-center gap-3">
            <Link
              href="/dashboard"
              className="flex items-center gap-3"
            >
              <img
                src="/logo.jpeg"
                alt="CafeFlow"
                className="h-10 w-10 rounded-xl object-cover"
              />

              <div>
                <div className="text-xl font-bold tracking-tight">
                  <span className="text-slate-900">
                    Cafe
                  </span>

                  <span className="text-orange-500">
                    Flow
                  </span>
                </div>

                <p className="text-xs text-slate-500">
                  Reception
                </p>
              </div>
            </Link>
          </div>

          <div className="flex items-center gap-3">

            <div className="hidden text-right sm:block">
              <p className="text-sm font-semibold text-slate-800">
                Reception
              </p>

              <p className="text-xs text-slate-500">
                {currentUser?.email}
              </p>
            </div>

            <Link
              href="/dashboard"
              className="hidden rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-orange-200 hover:bg-orange-50 sm:block"
            >
              Dashboard
            </Link>

            <button
              onClick={handleLogout}
              className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800"
            >
              Logout
            </button>
          </div>
        </div>
      </header>

      {/* =====================================================
          MAIN
      ====================================================== */}

      <div className="mx-auto max-w-7xl px-5 py-8 sm:px-6 lg:px-8">

        {/* HERO */}

        <section className="relative overflow-hidden rounded-3xl bg-slate-950 p-7 text-white shadow-sm sm:p-10">

          <div className="absolute -right-24 -top-24 h-72 w-72 rounded-full bg-orange-500/10 blur-3xl" />

          <div className="absolute -bottom-32 left-1/3 h-72 w-72 rounded-full bg-orange-500/5 blur-3xl" />

          <div className="relative grid gap-8 lg:grid-cols-[1fr_300px] lg:items-center">

            <div>

              <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-orange-400/20 bg-orange-500/10 px-3 py-1.5 text-xs font-semibold text-orange-300">

                <span className="h-2 w-2 animate-pulse rounded-full bg-orange-400" />

                Live Order System

              </div>

              <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
                CafeFlow Reception
              </h1>

              <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-300 sm:text-base">
                Manage customer orders, update kitchen status,
                track payments, and keep the cafe running smoothly.
              </p>

              <div className="mt-7 flex flex-wrap gap-3">

                <Link
                  href="/dashboard/menu"
                  className="rounded-xl bg-orange-500 px-5 py-3 text-sm font-bold text-white transition hover:bg-orange-600"
                >
                  Open Menu
                </Link>

                <Link
                  href="/dashboard/qr"
                  className="rounded-xl border border-slate-700 bg-slate-900 px-5 py-3 text-sm font-bold text-white transition hover:border-slate-500"
                >
                  QR Management
                </Link>

                <Link
                  href="/dashboard/feedback"
                  className="rounded-xl border border-slate-700 bg-slate-900 px-5 py-3 text-sm font-bold text-white transition hover:border-slate-500"
                >
                  Feedback
                </Link>

              </div>
            </div>

            <div className="rounded-2xl border border-white/10 bg-white/5 p-6">

              <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                Active Order Value
              </p>

              <p className="mt-3 text-4xl font-bold">
                {formatCurrency(
                  stats.activeOrderValue
                )}
              </p>

              <p className="mt-2 text-sm text-slate-400">
                {stats.activeCount} active{" "}
                {stats.activeCount === 1
                  ? "order"
                  : "orders"}
              </p>

            </div>
          </div>
        </section>

        {/* SUCCESS */}

        {successMessage && (
          <div className="mt-6 rounded-2xl border border-emerald-200 bg-emerald-50 px-5 py-4 text-sm font-semibold text-emerald-700">
            {successMessage}
          </div>
        )}

        {/* ERROR */}

        {error && (
          <div className="mt-6 rounded-2xl border border-red-200 bg-red-50 px-5 py-4 text-sm font-medium text-red-700">
            {error}
          </div>
        )}

        {/* STATS */}

        <section className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">

          <StatCard
            label="Pending"
            value={stats.pending}
            description="Waiting for acceptance"
          />

          <StatCard
            label="Accepted"
            value={stats.accepted}
            description="Accepted orders"
          />

          <StatCard
            label="Preparing"
            value={stats.preparing}
            description="In kitchen"
          />

          <StatCard
            label="Ready"
            value={stats.ready}
            description="Ready to serve"
          />

          <StatCard
            label="Unpaid"
            value={stats.unpaid}
            description="Payment pending"
          />

        </section>

        {/* QUICK TOOLS */}

        <section className="mt-8">

          <div className="mb-4">

            <h2 className="text-xl font-bold tracking-tight">
              Reception tools
            </h2>

            <p className="mt-1 text-sm text-slate-500">
              Quickly access the most important CafeFlow modules.
            </p>

          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">

            <ToolCard
              href="/dashboard/menu"
              icon="🍽️"
              title="Digital Menu"
              description="Manage items, prices and availability."
            />

            <ToolCard
              href="/dashboard/qr"
              icon="▣"
              title="QR Management"
              description="Generate and manage your cafe QR."
            />

            <ToolCard
              href="/dashboard/feedback"
              icon="★"
              title="Customer Feedback"
              description="Review customer ratings and comments."
            />

            <ToolCard
              href="/dashboard"
              icon="⌂"
              title="Dashboard"
              description="Return to the CafeFlow overview."
            />

          </div>
        </section>

        {/* ORDERS */}

        <section className="mt-10">

          <div className="mb-5 flex flex-col justify-between gap-3 sm:flex-row sm:items-end">

            <div>

              <h2 className="text-2xl font-bold tracking-tight">
                Live Orders
              </h2>

              <p className="mt-1 text-sm text-slate-500">
                Orders are updated in real time.
              </p>

            </div>

            <div className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-600">
              {orders.length}{" "}
              {orders.length === 1
                ? "order"
                : "orders"}
            </div>

          </div>

          {loadingOrders ? (

            <div className="rounded-2xl border border-slate-200 bg-white p-12 text-center shadow-sm">

              <div className="mx-auto mb-4 h-9 w-9 animate-spin rounded-full border-4 border-slate-200 border-t-orange-500" />

              <p className="text-sm font-medium text-slate-600">
                Loading live orders...
              </p>

            </div>

          ) : orders.length === 0 ? (

            <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-12 text-center">

              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-orange-50 text-2xl">
                🍽️
              </div>

              <h3 className="mt-5 text-lg font-bold">
                No orders yet
              </h3>

              <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-500">
                Customer orders will appear here automatically
                when they place an order through your digital menu.
              </p>

              <Link
                href="/dashboard/menu"
                className="mt-6 inline-flex rounded-xl bg-orange-500 px-5 py-3 text-sm font-bold text-white transition hover:bg-orange-600"
              >
                View Digital Menu
              </Link>

            </div>

          ) : (

            <div className="space-y-4">

              {orders.map((order) => {

                const nextAction =
                  getNextAction(
                    order.status
                  );

                const loyaltyReady =
                  order.status ===
                    "completed" &&
                  order.paymentStatus ===
                    "paid";

                return (

                  <div
                    key={order.id}
                    className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:border-orange-200 sm:p-6"
                  >

                    <div className="flex flex-col gap-5">

                      {/* ORDER HEADER */}

                      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">

                        <div>

                          <div className="flex flex-wrap items-center gap-2">

                            <span className="text-lg font-bold">
                              #{order.id
                                .slice(-6)
                                .toUpperCase()}
                            </span>

                            <span
                              className={`rounded-full border px-2.5 py-1 text-xs font-bold ${getStatusClasses(
                                order.status
                              )}`}
                            >
                              {getStatusLabel(
                                order.status
                              )}
                            </span>

                            <span
                              className={`rounded-full border px-2.5 py-1 text-xs font-bold ${
                                order.paymentStatus ===
                                "paid"
                                  ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                                  : "border-amber-200 bg-amber-50 text-amber-700"
                              }`}
                            >
                              {order.paymentStatus ===
                              "paid"
                                ? "Paid"
                                : "Unpaid"}
                            </span>

                            {order.loyaltyProcessed && (
                              <span className="rounded-full border border-orange-200 bg-orange-50 px-2.5 py-1 text-xs font-bold text-orange-700">
                                🎁{" "}
                                {order.loyaltyPointsAwarded ??
                                  0}{" "}
                                Points
                              </span>
                            )}

                          </div>

                          <p className="mt-2 text-xs text-slate-500">
                            {formatDate(
                              order.createdAt
                            )}
                          </p>

                        </div>

                        <div className="text-left sm:text-right">

                          <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                            Total
                          </p>

                          <p className="mt-1 text-2xl font-bold text-slate-900">
                            {formatCurrency(
                              order.total
                            )}
                          </p>

                        </div>

                      </div>

                      {/* CUSTOMER */}

                      <div className="grid gap-4 rounded-2xl bg-slate-50 p-4 sm:grid-cols-3">

                        <div>

                          <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                            Customer
                          </p>

                          <p className="mt-1 text-sm font-bold text-slate-800">
                            {order.customerName}
                          </p>

                        </div>

                        <div>

                          <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                            Phone
                          </p>

                          <p className="mt-1 text-sm font-bold text-slate-800">
                            {order.customerPhone}
                          </p>

                        </div>

                        <div>

                          <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                            Table
                          </p>

                          <p className="mt-1 text-sm font-bold text-slate-800">
                            Table{" "}
                            {order.tableNumber}
                          </p>

                        </div>

                      </div>

                      {/* ITEMS */}

                      <div>

                        <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-400">
                          Ordered Items
                        </p>

                        <div className="space-y-2">

                          {order.items.map(
                            (item, index) => (

                              <div
                                key={`${item.menuItemId ?? item.name}-${index}`}
                                className="flex items-center justify-between gap-4 rounded-xl border border-slate-100 px-4 py-3"
                              >

                                <div className="flex min-w-0 items-center gap-3">

                                  <span
                                    className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-md border text-[10px] font-bold ${
                                      item.isVeg
                                        ? "border-emerald-500 text-emerald-600"
                                        : "border-red-500 text-red-600"
                                    }`}
                                  >
                                    ●
                                  </span>

                                  <div className="min-w-0">

                                    <p className="truncate text-sm font-semibold text-slate-800">
                                      {item.name}
                                    </p>

                                    <p className="text-xs text-slate-500">
                                      {formatCurrency(
                                        item.price
                                      )}{" "}
                                      ×{" "}
                                      {
                                        item.quantity
                                      }
                                    </p>

                                  </div>

                                </div>

                                <p className="shrink-0 text-sm font-bold text-slate-800">
                                  {formatCurrency(
                                    item.price *
                                      item.quantity
                                  )}
                                </p>

                              </div>

                            )
                          )}

                        </div>
                      </div>

                      {/* LOYALTY INFORMATION */}

                      {loyaltyReady && (
                        <div className="rounded-2xl border border-orange-200 bg-orange-50 p-4">

                          <div className="flex items-start gap-3">

                            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white text-lg">
                              🎁
                            </div>

                            <div>

                              <p className="text-sm font-bold text-orange-800">
                                Loyalty processing
                              </p>

                              <p className="mt-1 text-xs leading-5 text-orange-700">
                                This completed and paid order
                                qualifies for{" "}
                                <strong>
                                  {Math.floor(
                                    order.total / 10
                                  )} points
                                </strong>
                                .
                              </p>

                            </div>

                          </div>
                        </div>
                      )}

                      {/* ACTIONS */}

                      <div className="flex flex-col gap-3 border-t border-slate-100 pt-4 sm:flex-row sm:justify-end">

                        {nextAction.status && (
                          <button
                            disabled={
                              updatingOrder
                            }
                            onClick={() =>
                              updateOrder(
                                order,
                                {
                                  status:
                                    nextAction.status,
                                }
                              )
                            }
                            className="rounded-xl bg-orange-500 px-5 py-3 text-sm font-bold text-white transition hover:bg-orange-600 disabled:cursor-not-allowed disabled:opacity-50"
                          >
                            {updatingOrder
                              ? "Updating..."
                              : nextAction.label}
                          </button>
                        )}

                        {order.paymentStatus ===
                          "unpaid" &&
                          order.status !==
                            "cancelled" && (
                            <button
                              disabled={
                                updatingOrder
                              }
                              onClick={() =>
                                updateOrder(
                                  order,
                                  {
                                    paymentStatus:
                                      "paid",
                                  }
                                )
                              }
                              className="rounded-xl border border-emerald-200 bg-emerald-50 px-5 py-3 text-sm font-bold text-emerald-700 transition hover:bg-emerald-100 disabled:cursor-not-allowed disabled:opacity-50"
                            >
                              {updatingOrder
                                ? "Updating..."
                                : "Mark Paid"}
                            </button>
                          )}

                        <button
                          onClick={() =>
                            setSelectedOrder(
                              order
                            )
                          }
                          className="rounded-xl border border-slate-200 bg-white px-5 py-3 text-sm font-bold text-slate-700 transition hover:border-orange-200 hover:bg-orange-50"
                        >
                          Manage Order
                        </button>

                      </div>

                    </div>
                  </div>
                );
              })}

            </div>
          )}
        </section>

        {/* ORDER FLOW */}

        <section className="mt-10 overflow-hidden rounded-3xl border border-orange-100 bg-orange-50 p-7 sm:p-8">

          <div className="grid gap-6 lg:grid-cols-[1fr_auto] lg:items-center">

            <div>

              <p className="text-xs font-bold uppercase tracking-widest text-orange-600">
                CafeFlow Order Flow
              </p>

              <h2 className="mt-2 text-2xl font-bold tracking-tight text-slate-900">
                From QR scan to completed order.
              </h2>

              <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
                Customers scan the cafe QR, browse the digital menu,
                place their order, and the reception team manages
                the order until completion.
              </p>

            </div>

            <div className="flex flex-wrap gap-2 text-xs font-bold">

              {[
                "QR",
                "Menu",
                "Order",
                "Kitchen",
                "Ready",
                "Payment",
                "Loyalty",
              ].map(
                (step, index, array) => (

                  <div
                    key={step}
                    className="flex items-center gap-2"
                  >

                    <span className="rounded-full border border-orange-200 bg-white px-3 py-2 text-slate-700">
                      {step}
                    </span>

                    {index <
                      array.length - 1 && (
                      <span className="text-orange-400">
                        →
                      </span>
                    )}

                  </div>
                )
              )}

            </div>

          </div>
        </section>

      </div>

      {/* =====================================================
          FOOTER
      ====================================================== */}

      <footer className="mt-12 border-t border-slate-200 bg-white">

        <div className="mx-auto flex max-w-7xl flex-col gap-3 px-5 py-6 text-sm text-slate-500 sm:flex-row sm:items-center sm:justify-between sm:px-6 lg:px-8">

          <p>
            © {new Date().getFullYear()}{" "}
            <span className="font-semibold text-slate-700">
              CafeFlow
            </span>
            . All rights reserved.
          </p>

          <div className="flex gap-5">

            <Link
              href="/dashboard"
              className="transition hover:text-orange-500"
            >
              Dashboard
            </Link>

            <Link
              href="/dashboard/menu"
              className="transition hover:text-orange-500"
            >
              Menu
            </Link>

            <Link
              href="/dashboard/feedback"
              className="transition hover:text-orange-500"
            >
              Feedback
            </Link>

          </div>

        </div>

      </footer>

      {/* =====================================================
          MANAGE ORDER MODAL
      ====================================================== */}

      {selectedOrder && (

        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm">

          <div className="w-full max-w-lg rounded-3xl bg-white p-6 shadow-2xl sm:p-7">

            <div className="flex items-start justify-between gap-4">

              <div>

                <p className="text-xs font-bold uppercase tracking-wider text-orange-500">
                  Manage Order
                </p>

                <h2 className="mt-1 text-2xl font-bold">
                  #{selectedOrder.id
                    .slice(-6)
                    .toUpperCase()}
                </h2>

                <p className="mt-1 text-sm text-slate-500">
                  {selectedOrder.customerName} · Table{" "}
                  {selectedOrder.tableNumber}
                </p>

              </div>

              <button
                onClick={() =>
                  setSelectedOrder(null)
                }
                className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-100 text-slate-500 transition hover:bg-slate-200"
              >
                ✕
              </button>

            </div>

            {/* STATUS */}

            <div className="mt-6">

              <p className="mb-2 text-sm font-bold text-slate-700">
                Order Status
              </p>

              <select
                value={
                  selectedOrder.status
                }
                disabled={
                  updatingOrder
                }
                onChange={(event) =>
                  updateOrder(
                    selectedOrder,
                    {
                      status:
                        event.target.value as OrderStatus,
                    }
                  )
                }
                className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold outline-none transition focus:border-orange-400 focus:ring-2 focus:ring-orange-100"
              >

                {STATUS_OPTIONS.map(
                  (status) => (

                    <option
                      key={status}
                      value={status}
                    >
                      {getStatusLabel(
                        status
                      )}
                    </option>

                  )
                )}

              </select>

            </div>

            {/* PAYMENT */}

            <div className="mt-5">

              <p className="mb-2 text-sm font-bold text-slate-700">
                Payment Status
              </p>

              <div className="grid grid-cols-2 gap-3">

                <button
                  disabled={
                    updatingOrder
                  }
                  onClick={() =>
                    updateOrder(
                      selectedOrder,
                      {
                        paymentStatus:
                          "unpaid",
                      }
                    )
                  }
                  className={`rounded-xl border px-4 py-3 text-sm font-bold transition ${
                    selectedOrder.paymentStatus ===
                    "unpaid"
                      ? "border-amber-300 bg-amber-50 text-amber-700"
                      : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                  }`}
                >
                  Unpaid
                </button>

                <button
                  disabled={
                    updatingOrder
                  }
                  onClick={() =>
                    updateOrder(
                      selectedOrder,
                      {
                        paymentStatus:
                          "paid",
                      }
                    )
                  }
                  className={`rounded-xl border px-4 py-3 text-sm font-bold transition ${
                    selectedOrder.paymentStatus ===
                    "paid"
                      ? "border-emerald-300 bg-emerald-50 text-emerald-700"
                      : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                  }`}
                >
                  Paid
                </button>

              </div>
            </div>

            {/* LOYALTY */}

            {selectedOrder.status ===
              "completed" &&
              selectedOrder.paymentStatus ===
                "paid" && (

              <div className="mt-5 rounded-2xl border border-orange-200 bg-orange-50 p-4">

                <div className="flex items-center justify-between gap-3">

                  <div>

                    <p className="text-sm font-bold text-orange-800">
                      Loyalty Reward
                    </p>

                    <p className="mt-1 text-xs text-orange-700">
                      This order earns{" "}
                      <strong>
                        {Math.floor(
                          selectedOrder.total /
                            10
                        )} points
                      </strong>
                      .
                    </p>

                  </div>

                  <div className="text-2xl">
                    🎁
                  </div>

                </div>

                {selectedOrder.loyaltyProcessed && (
                  <p className="mt-3 rounded-xl bg-white px-3 py-2 text-xs font-bold text-emerald-700">
                    ✓ Points already awarded
                  </p>
                )}

              </div>
            )}

            {/* TOTAL */}

            <div className="mt-6 rounded-2xl bg-slate-50 p-4">

              <div className="flex items-center justify-between">

                <span className="text-sm font-semibold text-slate-500">
                  Order Total
                </span>

                <span className="text-xl font-bold text-slate-900">
                  {formatCurrency(
                    selectedOrder.total
                  )}
                </span>

              </div>

            </div>

            <button
              onClick={() =>
                setSelectedOrder(null)
              }
              className="mt-6 w-full rounded-xl border border-slate-200 bg-white px-5 py-3 text-sm font-bold text-slate-700 transition hover:bg-slate-50"
            >
              Close
            </button>

          </div>

        </div>
      )}
    </main>
  );
}

/* ========================================================= */
/* STAT CARD */
/* ========================================================= */

function StatCard({
  label,
  value,
  description,
}: {
  label: string;
  value: number;
  description: string;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">

      <p className="text-xs font-bold uppercase tracking-wider text-slate-400">
        {label}
      </p>

      <p className="mt-3 text-3xl font-bold text-slate-900">
        {value}
      </p>

      <p className="mt-1 text-xs text-slate-500">
        {description}
      </p>

    </div>
  );
}

/* ========================================================= */
/* TOOL CARD */
/* ========================================================= */

function ToolCard({
  href,
  icon,
  title,
  description,
}: {
  href: string;
  icon: string;
  title: string;
  description: string;
}) {
  return (
    <Link
      href={href}
      className="group rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-orange-200 hover:shadow-md"
    >

      <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-orange-50 text-xl">
        {icon}
      </div>

      <h3 className="mt-4 font-bold text-slate-900 group-hover:text-orange-500">
        {title}
      </h3>

      <p className="mt-1 text-sm leading-5 text-slate-500">
        {description}
      </p>

    </Link>
  );
}