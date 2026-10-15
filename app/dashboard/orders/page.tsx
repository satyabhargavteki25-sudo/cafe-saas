"use client";

import { useEffect, useMemo, useState } from "react";
import {
  collection,
  doc,
  onSnapshot,
  query,
  updateDoc,
  where,
  Timestamp,
} from "firebase/firestore";
import { onAuthStateChanged, User } from "firebase/auth";
import { useRouter } from "next/navigation";

import { auth, db } from "@/src/lib/firebase";

type OrderStatus =
  | "pending"
  | "accepted"
  | "preparing"
  | "ready"
  | "completed"
  | "cancelled";

type OrderItem = {
  menuItemId?: string;
  name: string;
  price: number;
  quantity: number;
  isVeg?: boolean;
};

type FirestoreOrderItem = {
  menuItemId?: unknown;
  name?: unknown;
  price?: unknown;
  quantity?: unknown;
  isVeg?: unknown;
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
  paymentStatus: "unpaid" | "paid";
  createdAt?: Timestamp | null;
};

const statusConfig: Record<
  OrderStatus,
  {
    label: string;
    className: string;
  }
> = {
  pending: {
    label: "Pending",
    className:
      "bg-amber-50 text-amber-700 border-amber-200",
  },

  accepted: {
    label: "Accepted",
    className:
      "bg-blue-50 text-blue-700 border-blue-200",
  },

  preparing: {
    label: "Preparing",
    className:
      "bg-purple-50 text-purple-700 border-purple-200",
  },

  ready: {
    label: "Ready",
    className:
      "bg-emerald-50 text-emerald-700 border-emerald-200",
  },

  completed: {
    label: "Completed",
    className:
      "bg-slate-100 text-slate-700 border-slate-200",
  },

  cancelled: {
    label: "Cancelled",
    className:
      "bg-red-50 text-red-700 border-red-200",
  },
};

export default function OrdersPage() {
  const router = useRouter();

  const [currentUser, setCurrentUser] =
    useState<User | null>(null);

  const [orders, setOrders] = useState<Order[]>([]);

  const [filter, setFilter] = useState<
    "all" | OrderStatus
  >("all");

  const [selectedOrder, setSelectedOrder] =
    useState<Order | null>(null);

  const [loading, setLoading] = useState(true);

  const [updating, setUpdating] = useState(false);

  const [error, setError] = useState("");

  /*
   * ==========================================
   * AUTHENTICATION
   * ==========================================
   */

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(
      auth,
      (user) => {
        if (!user) {
          setCurrentUser(null);
          setOrders([]);
          setError("You are not logged in.");
          setLoading(false);

          router.push("/login");

          return;
        }

        setCurrentUser(user);
  setLoading(true);
        setError("");
      }
    );

    return () => unsubscribe();
  }, [router]);

  /*
   * ==========================================
   * LOAD OWNER ORDERS
   * ==========================================
   *
   * IMPORTANT:
   *
   * Firestore rules authorize order reads using:
   *
   * resource.data.ownerId == request.auth.uid
   *
   * Therefore this query MUST use ownerId.
   *
   * Do NOT change this to:
   *
   * where("cafeId", "==", ...)
   *
   */

  useEffect(() => {
    if (!currentUser) {
      return;
    }

    const ordersQuery = query(
      collection(db, "orders"),
      where(
        "ownerId",
        "==",
        currentUser.uid
      )
    );

    const unsubscribe = onSnapshot(
      ordersQuery,
      (snapshot) => {
        const realOrders: Order[] =
          snapshot.docs.map((document) => {
            const data = document.data();

            return {
              id: document.id,

              cafeId:
                typeof data.cafeId === "string"
                  ? data.cafeId
                  : "",

              ownerId:
                typeof data.ownerId === "string"
                  ? data.ownerId
                  : "",

              customerName:
                typeof data.customerName === "string"
                  ? data.customerName
                  : "Customer",

              customerPhone:
                typeof data.customerPhone === "string"
                  ? data.customerPhone
                  : "",

              tableNumber:
                typeof data.tableNumber === "string"
                  ? data.tableNumber
                  : "",

              items: Array.isArray(data.items)
                ? data.items.map((item: any) => ({
                    menuItemId:
                      typeof item?.menuItemId ===
                      "string"
                        ? item.menuItemId
                        : undefined,

                    name:
                      typeof item?.name === "string"
                        ? item.name
                        : "Item",

                    price:
                      typeof item?.price === "number"
                        ? item.price
                        : Number(item?.price ?? 0),

                    quantity:
                      typeof item?.quantity === "number"
                        ? item.quantity
                        : Number(
                            item?.quantity ?? 1
                          ),

                    isVeg:
                      typeof item?.isVeg === "boolean"
                        ? item.isVeg
                        : undefined,
                  }))
                : [],

              total:
                typeof data.total === "number"
                  ? data.total
                  : Number(data.total ?? 0),

              status:
                data.status === "pending" ||
                data.status === "accepted" ||
                data.status === "preparing" ||
                data.status === "ready" ||
                data.status === "completed" ||
                data.status === "cancelled"
                  ? data.status
                  : "pending",

              paymentStatus:
                data.paymentStatus === "paid"
                  ? "paid"
                  : "unpaid",

              createdAt:
                data.createdAt instanceof Timestamp
                  ? data.createdAt
                  : null,
            };
          });

        /*
         * Newest orders first.
         */
        realOrders.sort((a, b) => {
          const aTime =
            a.createdAt?.toMillis?.() ?? 0;

          const bTime =
            b.createdAt?.toMillis?.() ?? 0;

          return bTime - aTime;
        });

        setOrders(realOrders);

        setLoading(false);

        setError("");
      },
      (snapshotError) => {
        console.error(
          "Orders Firestore error:",
          snapshotError
        );

        setError(
          "Unable to load orders. Please check your Firestore permissions."
        );

        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [currentUser]);

  /*
   * ==========================================
   * FILTER ORDERS
   * ==========================================
   */

  const filteredOrders = useMemo(() => {
    if (filter === "all") {
      return orders;
    }

    return orders.filter(
      (order) => order.status === filter
    );
  }, [orders, filter]);

  /*
   * ==========================================
   * STATISTICS
   * ==========================================
   */

  const pendingCount = orders.filter(
    (order) =>
      order.status === "pending"
  ).length;

  const preparingCount = orders.filter(
    (order) =>
      order.status === "preparing"
  ).length;

  const readyCount = orders.filter(
    (order) =>
      order.status === "ready"
  ).length;

  const orderValue = orders
    .filter(
      (order) =>
        order.status !== "cancelled"
    )
    .reduce(
      (sum, order) =>
        sum + order.total,
      0
    );

  /*
   * ==========================================
   * UPDATE ORDER STATUS
   * ==========================================
   */

  async function updateStatus(
    orderId: string,
    status: OrderStatus
  ) {
    try {
      setUpdating(true);
      setError("");

      await updateDoc(
        doc(db, "orders", orderId),
        {
          status,
        }
      );

      setSelectedOrder(
        (currentOrder) => {
          if (!currentOrder) {
            return null;
          }

          return {
            ...currentOrder,
            status,
          };
        }
      );
    } catch (err) {
      console.error(
        "Update order error:",
        err
      );

      setError(
        "Unable to update order status. Please check Firestore permissions."
      );
    } finally {
      setUpdating(false);
    }
  }

  /*
   * ==========================================
   * UPDATE PAYMENT STATUS
   * ==========================================
   */

  async function updatePayment(
    orderId: string,
    paymentStatus:
      | "unpaid"
      | "paid"
  ) {
    try {
      setUpdating(true);
      setError("");

      await updateDoc(
        doc(db, "orders", orderId),
        {
          paymentStatus,
        }
      );

      setSelectedOrder(
        (currentOrder) => {
          if (!currentOrder) {
            return null;
          }

          return {
            ...currentOrder,
            paymentStatus,
          };
        }
      );
    } catch (err) {
      console.error(
        "Update payment error:",
        err
      );

      setError(
        "Unable to update payment status. Please check Firestore permissions."
      );
    } finally {
      setUpdating(false);
    }
  }

  /*
   * ==========================================
   * FORMAT TIME
   * ==========================================
   */

  function formatTime(
    timestamp?: Timestamp | null
  ) {
    if (!timestamp) {
      return "Time unavailable";
    }

    return timestamp
      .toDate()
      .toLocaleString("en-IN", {
        day: "2-digit",
        month: "short",
        hour: "2-digit",
        minute: "2-digit",
      });
  }

  /*
   * ==========================================
   * REFRESH
   * ==========================================
   */

  function refreshPage() {
    window.location.reload();
  }

  /*
   * ==========================================
   * UI
   * ==========================================
   */

  return (
    <main className="min-h-screen bg-slate-50 text-slate-900">

      {/* ===================================== */}
      {/* HEADER */}
      {/* ===================================== */}

      <header className="border-b border-slate-200 bg-white">

        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-5">

          <div>

            <p className="text-sm font-semibold text-orange-600">
              CafeFlow
            </p>

            <h1 className="mt-1 text-2xl font-bold text-slate-900">
              Orders
            </h1>

            <p className="mt-1 text-sm text-slate-500">
              Live orders from your customers.
            </p>

          </div>

          <div className="flex items-center gap-3">

            <div className="hidden rounded-xl border border-slate-200 bg-slate-50 px-4 py-2 text-sm font-medium text-slate-700 sm:block">
              {currentUser
                ? "1 cafe"
                : "Not logged in"}
            </div>

            <button
              onClick={refreshPage}
              className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50"
            >
              ↻ Refresh
            </button>

          </div>

        </div>

      </header>

      {/* ===================================== */}
      {/* MAIN CONTENT */}
      {/* ===================================== */}

      <div className="mx-auto max-w-7xl px-6 py-6">

        {/* ERROR */}

        {error && (
          <div className="mb-6 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-medium text-red-700">
            {error}
          </div>
        )}

        {/* LOADING */}

        {loading ? (

          <div className="rounded-2xl border border-slate-200 bg-white p-12 text-center shadow-sm">

            <div className="mx-auto h-8 w-8 animate-spin rounded-full border-4 border-slate-200 border-t-orange-500" />

            <p className="mt-4 text-sm font-medium text-slate-600">
              Loading real orders...
            </p>

          </div>

        ) : (

          <>

            {/* ================================= */}
            {/* STATISTICS */}
            {/* ================================= */}

            <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">

              <StatCard
                title="Pending"
                value={pendingCount}
                icon="🕐"
                description="Needs attention"
              />

              <StatCard
                title="Preparing"
                value={preparingCount}
                icon="👨‍🍳"
                description="Kitchen orders"
              />

              <StatCard
                title="Ready"
                value={readyCount}
                icon="📦"
                description="Ready to serve"
              />

              <StatCard
                title="Order Value"
                value={`₹${orderValue.toLocaleString(
                  "en-IN"
                )}`}
                icon="₹"
                description="Current order value"
              />

            </section>

            {/* ================================= */}
            {/* FILTERS */}
            {/* ================================= */}

            <section className="mt-8">

              <div className="flex flex-wrap gap-2">

                {[
                  ["all", "All Orders"],
                  ["pending", "Pending"],
                  ["accepted", "Accepted"],
                  ["preparing", "Preparing"],
                  ["ready", "Ready"],
                  ["completed", "Completed"],
                  ["cancelled", "Cancelled"],
                ].map(
                  ([value, label]) => (

                    <button
                      key={value}
                      onClick={() =>
                        setFilter(
                          value as
                            | "all"
                            | OrderStatus
                        )
                      }
                      className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
                        filter === value
                          ? "bg-slate-900 text-white"
                          : "border border-slate-200 bg-white text-slate-600 hover:bg-slate-100"
                      }`}
                    >
                      {label}
                    </button>

                  )
                )}

              </div>

            </section>

            {/* ================================= */}
            {/* ORDERS LIST */}
            {/* ================================= */}

            <section className="mt-5">

              <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">

                {/* LIST HEADER */}

                <div className="border-b border-slate-200 px-6 py-4">

                  <h2 className="font-bold text-slate-900">
                    Customer Orders
                  </h2>

                  <p className="mt-1 text-sm text-slate-500">
                    {filteredOrders.length} real order
                    {filteredOrders.length !== 1
                      ? "s"
                      : ""}
                  </p>

                </div>

                {/* EMPTY */}

                {filteredOrders.length ===
                0 ? (

                  <div className="px-6 py-20 text-center">

                    <div className="text-5xl">
                      🍽️
                    </div>

                    <h3 className="mt-5 text-lg font-bold text-slate-900">
                      No orders found
                    </h3>

                    <p className="mx-auto mt-2 max-w-md text-sm text-slate-500">
                      Customer orders will appear here automatically when they place an order through your CafeFlow menu.
                    </p>

                  </div>

                ) : (

                  /* ORDER ITEMS */

                  <div className="divide-y divide-slate-100">

                    {filteredOrders.map(
                      (order) => (

                        <div
                          key={order.id}
                          className="p-5 transition hover:bg-slate-50"
                        >

                          <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">

                            {/* ================================= */}
                            {/* ORDER INFORMATION */}
                            {/* ================================= */}

                            <div className="min-w-0 flex-1">

                              <div className="flex flex-wrap items-center gap-2">

                                <span className="font-bold text-slate-900">
                                  #
                                  {order.id
                                    .slice(-6)
                                    .toUpperCase()}
                                </span>

                                <StatusBadge
                                  status={
                                    order.status
                                  }
                                />

                              </div>

                              {/* CUSTOMER DETAILS */}

                              <div className="mt-3 flex flex-wrap gap-x-5 gap-y-2 text-sm text-slate-600">

                                <span>
                                  👤{" "}
                                  {order.customerName}
                                </span>

                                <span>
                                  📞{" "}
                                  {order.customerPhone}
                                </span>

                                <span>
                                  🪑 Table{" "}
                                  {order.tableNumber}
                                </span>

                                <span>
                                  🕐{" "}
                                  {formatTime(
                                    order.createdAt
                                  )}
                                </span>

                              </div>

                              {/* ITEMS */}

                              <div className="mt-4 flex flex-wrap gap-2">

                                {order.items.map(
                                  (
                                    item,
                                    index
                                  ) => (

                                    <div
                                      key={`${order.id}-${index}`}
                                      className="rounded-lg bg-slate-100 px-3 py-1.5 text-sm text-slate-700"
                                    >

                                      <span
                                        className={
                                          item.isVeg
                                            ? "text-green-600"
                                            : "text-red-600"
                                        }
                                      >
                                        ●
                                      </span>{" "}

                                      {item.name} ×{" "}
                                      {item.quantity}

                                    </div>

                                  )
                                )}

                              </div>

                            </div>

                            {/* ================================= */}
                            {/* TOTAL / PAYMENT */}
                            {/* ================================= */}

                            <div className="flex flex-col items-start gap-3 lg:items-end">

                              <div className="text-xl font-bold text-slate-900">
                                ₹
                                {order.total.toLocaleString(
                                  "en-IN"
                                )}
                              </div>

                              <div
                                className={`rounded-full px-3 py-1 text-xs font-semibold ${
                                  order.paymentStatus ===
                                  "paid"
                                    ? "bg-emerald-50 text-emerald-700"
                                    : "bg-amber-50 text-amber-700"
                                }`}
                              >
                                {order.paymentStatus ===
                                "paid"
                                  ? "Paid"
                                  : "Payment Pending"}
                              </div>

                              <button
                                onClick={() =>
                                  setSelectedOrder(
                                    order
                                  )
                                }
                                className="rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800"
                              >
                                Manage Order
                              </button>

                            </div>

                          </div>

                        </div>

                      )
                    )}

                  </div>

                )}

              </div>

            </section>

          </>

        )}

      </div>

      {/* ===================================== */}
      {/* ORDER MANAGEMENT MODAL */}
      {/* ===================================== */}

      {selectedOrder && (

        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4"
          onMouseDown={(event) => {
            if (
              event.target ===
              event.currentTarget
            ) {
              setSelectedOrder(null);
            }
          }}
        >

          <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-white shadow-2xl">

            {/* MODAL HEADER */}

            <div className="flex items-start justify-between border-b border-slate-200 p-6">

              <div>

                <p className="text-sm font-semibold text-orange-600">
                  Customer Order
                </p>

                <h2 className="mt-1 text-xl font-bold text-slate-900">
                  #
                  {selectedOrder.id
                    .slice(-6)
                    .toUpperCase()}
                </h2>

              </div>

              <button
                onClick={() =>
                  setSelectedOrder(null)
                }
                className="rounded-lg p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
                aria-label="Close order"
              >
                ✕
              </button>

            </div>

            <div className="space-y-6 p-6">

              {/* ================================= */}
              {/* CUSTOMER */}
              {/* ================================= */}

              <div>

                <h3 className="text-sm font-bold text-slate-900">
                  Customer
                </h3>

                <div className="mt-3 space-y-2 text-sm text-slate-600">

                  <p>
                    <span className="font-semibold text-slate-800">
                      Name:
                    </span>{" "}
                    {selectedOrder.customerName}
                  </p>

                  <p>
                    <span className="font-semibold text-slate-800">
                      Phone:
                    </span>{" "}
                    {selectedOrder.customerPhone}
                  </p>

                  <p>
                    <span className="font-semibold text-slate-800">
                      Table:
                    </span>{" "}
                    {selectedOrder.tableNumber}
                  </p>

                  <p>
                    <span className="font-semibold text-slate-800">
                      Ordered:
                    </span>{" "}
                    {formatDateTime(
                      selectedOrder.createdAt
                    )}
                  </p>

                </div>

              </div>

              {/* ================================= */}
              {/* ORDER ITEMS */}
              {/* ================================= */}

              <div>

                <h3 className="text-sm font-bold text-slate-900">
                  Order Items
                </h3>

                <div className="mt-3 divide-y divide-slate-100 rounded-xl border border-slate-200">

                  {selectedOrder.items.map(
                    (item, index) => (

                      <div
                        key={`${selectedOrder.id}-item-${index}`}
                        className="flex items-center justify-between p-3"
                      >

                        <div>

                          <p className="font-medium text-slate-800">

                            <span
                              className={
                                item.isVeg
                                  ? "text-green-600"
                                  : "text-red-600"
                              }
                            >
                              ●
                            </span>{" "}

                            {item.name}

                          </p>

                          <p className="mt-1 text-xs text-slate-500">
                            ₹
                            {item.price.toLocaleString(
                              "en-IN"
                            )}{" "}
                            ×{" "}
                            {item.quantity}
                          </p>

                        </div>

                        <p className="font-semibold text-slate-900">
                          ₹
                          {(
                            item.price *
                            item.quantity
                          ).toLocaleString(
                            "en-IN"
                          )}
                        </p>

                      </div>

                    )
                  )}

                </div>

                {/* TOTAL */}

                <div className="mt-4 flex items-center justify-between border-t border-slate-200 pt-4">

                  <span className="font-semibold text-slate-700">
                    Total
                  </span>

                  <span className="text-xl font-bold text-slate-900">
                    ₹
                    {selectedOrder.total.toLocaleString(
                      "en-IN"
                    )}
                  </span>

                </div>

              </div>

              {/* ================================= */}
              {/* ORDER STATUS */}
              {/* ================================= */}

              <div>

                <h3 className="text-sm font-bold text-slate-900">
                  Update Order Status
                </h3>

                <div className="mt-3 grid grid-cols-2 gap-2">

                  <StatusButton
                    label="Accept"
                    active={
                      selectedOrder.status ===
                      "accepted"
                    }
                    disabled={updating}
                    onClick={() =>
                      updateStatus(
                        selectedOrder.id,
                        "accepted"
                      )
                    }
                  />

                  <StatusButton
                    label="Preparing"
                    active={
                      selectedOrder.status ===
                      "preparing"
                    }
                    disabled={updating}
                    onClick={() =>
                      updateStatus(
                        selectedOrder.id,
                        "preparing"
                      )
                    }
                  />

                  <StatusButton
                    label="Ready"
                    active={
                      selectedOrder.status ===
                      "ready"
                    }
                    disabled={updating}
                    onClick={() =>
                      updateStatus(
                        selectedOrder.id,
                        "ready"
                      )
                    }
                  />

                  <StatusButton
                    label="Completed"
                    active={
                      selectedOrder.status ===
                      "completed"
                    }
                    disabled={updating}
                    onClick={() =>
                      updateStatus(
                        selectedOrder.id,
                        "completed"
                      )
                    }
                  />

                  <StatusButton
                    label="Cancel"
                    active={
                      selectedOrder.status ===
                      "cancelled"
                    }
                    danger
                    disabled={updating}
                    onClick={() =>
                      updateStatus(
                        selectedOrder.id,
                        "cancelled"
                      )
                    }
                  />

                </div>

                {updating && (
                  <p className="mt-3 text-center text-xs text-slate-500">
                    Updating order...
                  </p>
                )}

              </div>

              {/* ================================= */}
              {/* PAYMENT */}
              {/* ================================= */}

              <div>

                <h3 className="text-sm font-bold text-slate-900">
                  Payment
                </h3>

                <div className="mt-3 grid grid-cols-2 gap-2">

                  <button
                    disabled={updating}
                    onClick={() =>
                      updatePayment(
                        selectedOrder.id,
                        "unpaid"
                      )
                    }
                    className={`rounded-xl border px-3 py-3 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-50 ${
                      selectedOrder.paymentStatus ===
                      "unpaid"
                        ? "border-amber-300 bg-amber-50 text-amber-700"
                        : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                    }`}
                  >
                    Payment Pending
                  </button>

                  <button
                    disabled={updating}
                    onClick={() =>
                      updatePayment(
                        selectedOrder.id,
                        "paid"
                      )
                    }
                    className={`rounded-xl border px-3 py-3 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-50 ${
                      selectedOrder.paymentStatus ===
                      "paid"
                        ? "border-emerald-300 bg-emerald-50 text-emerald-700"
                        : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                    }`}
                  >
                    Mark Paid
                  </button>

                </div>

              </div>

            </div>

          </div>

        </div>

      )}

    </main>
  );
}

/* ========================================= */
/* STAT CARD */
/* ========================================= */

function StatCard({
  title,
  value,
  icon,
  description,
}: {
  title: string;
  value: string | number;
  icon: string;
  description: string;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:border-orange-200">

      <div className="flex items-center justify-between">

        <div>

          <p className="text-sm font-medium text-slate-500">
            {title}
          </p>

          <p className="mt-2 text-2xl font-bold text-slate-900">
            {value}
          </p>

        </div>

        <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-orange-50 text-lg">
          {icon}
        </div>

      </div>

      <p className="mt-3 text-xs text-slate-500">
        {description}
      </p>

    </div>
  );
}

/* ========================================= */
/* STATUS BADGE */
/* ========================================= */

function StatusBadge({
  status,
}: {
  status: OrderStatus;
}) {
  const config = statusConfig[status];

  return (
    <span
      className={`rounded-full border px-2.5 py-1 text-xs font-semibold ${config.className}`}
    >
      {config.label}
    </span>
  );
}

/* ========================================= */
/* STATUS BUTTON */
/* ========================================= */

function StatusButton({
  label,
  active,
  danger = false,
  disabled,
  onClick,
}: {
  label: string;
  active: boolean;
  danger?: boolean;
  disabled?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`rounded-xl border px-3 py-2.5 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-50 ${
        active
          ? danger
            ? "border-red-600 bg-red-600 text-white"
            : "border-slate-900 bg-slate-900 text-white"
          : danger
          ? "border-red-200 bg-red-50 text-red-600 hover:bg-red-100"
          : "border-slate-200 bg-white text-slate-700 hover:bg-slate-100"
      }`}
    >
      {label}
    </button>
  );
}

/* ========================================= */
/* FULL DATE/TIME */
/* ========================================= */

function formatDateTime(
  timestamp?: Timestamp | null
) {
  if (!timestamp) {
    return "Time unavailable";
  }

  return timestamp
    .toDate()
    .toLocaleString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
}