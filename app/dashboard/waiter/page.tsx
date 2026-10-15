"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { onAuthStateChanged, User } from "firebase/auth";
import {
  collection,
  doc,
  onSnapshot,
  query,
  updateDoc,
  where,
} from "firebase/firestore";
import { auth, db } from "@/src/lib/firebase";

type ReadyOrder = {
  id: string;
  ownerId: string;
  tableNumber?: string;
  customerName?: string;
  items?: { name: string; quantity: number }[];
  status?: string;
  waiterAlert?: {
    message?: string;
    acknowledged?: boolean;
  };
};

export default function WaiterDisplayPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [orders, setOrders] = useState<ReadyOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let unsubscribeOrders: (() => void) | undefined;

    const unsubscribeAuth = onAuthStateChanged(auth, (currentUser) => {
      unsubscribeOrders?.();

      if (!currentUser) {
        setUser(null);
        setOrders([]);
        setLoading(false);
        router.push("/login");
        return;
      }

      setUser(currentUser);
      setLoading(true);
      setError("");

      const ordersQuery = query(
        collection(db, "orders"),
        where("ownerId", "==", currentUser.uid)
      );

      unsubscribeOrders = onSnapshot(
        ordersQuery,
        (snapshot) => {
          const readyOrders = snapshot.docs
            .map((orderDoc) => ({
              id: orderDoc.id,
              ...orderDoc.data(),
            }) as ReadyOrder)
            .filter(
              (order) =>
                order.status === "ready" &&
                order.waiterAlert?.acknowledged !== true
            );

          setOrders(readyOrders);
          setLoading(false);
          setError("");
        },
        (err) => {
          console.error("Waiter display error:", err);
          setError("Could not load orders. Check your Firestore rules.");
          setLoading(false);
        }
      );
    });

    return () => {
      unsubscribeAuth();
      unsubscribeOrders?.();
    };
  }, [router]);

  async function acknowledgeOrder(order: ReadyOrder) {
    if (!user || order.ownerId !== user.uid) return;

    try {
      await updateDoc(doc(db, "orders", order.id), {
        "waiterAlert.acknowledged": true,
      });
    } catch (err) {
      console.error("Could not acknowledge order:", err);
      setError("Could not acknowledge this order. Please try again.");
    }
  }

  return (
    <main className="min-h-screen bg-slate-950 p-4 text-white sm:p-8">
      <div className="mx-auto max-w-6xl">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-sm font-semibold uppercase tracking-widest text-amber-400">
              CafeFlow • Live Operations
            </p>
            <h1 className="mt-2 text-3xl font-bold">Waiter Alerts</h1>
            <p className="mt-2 text-slate-400">
              Collect orders as soon as the kitchen or bar marks them ready.
            </p>
          </div>

          <div className="rounded-xl border border-slate-700 bg-slate-900 px-5 py-3">
            <p className="text-sm text-slate-400">Orders to collect</p>
            <p className="text-3xl font-bold text-amber-400">
              {orders.length}
            </p>
          </div>
        </div>

        {error && (
          <div className="mt-6 rounded-xl border border-red-500/40 bg-red-950 p-4 text-red-200">
            {error}
          </div>
        )}

        {loading ? (
          <p className="mt-10 text-slate-400">Loading orders...</p>
        ) : orders.length === 0 ? (
          <div className="mt-8 rounded-2xl border border-slate-800 bg-slate-900 p-10 text-center">
            <div className="text-4xl">✓</div>
            <h2 className="mt-4 text-xl font-semibold">All caught up!</h2>
            <p className="mt-2 text-slate-400">
              New ready orders will appear here automatically.
            </p>
          </div>
        ) : (
          <div className="mt-8 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
            {orders.map((order) => (
              <article
                key={order.id}
                className="rounded-2xl border border-amber-500/40 bg-slate-900 p-5 shadow-lg"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm text-slate-400">Deliver to</p>
                    <h2 className="mt-1 text-3xl font-black text-amber-400">
                      Table {order.tableNumber || "—"}
                    </h2>
                  </div>
                  <span className="rounded-full bg-emerald-500/15 px-3 py-1 text-sm font-semibold text-emerald-300">
                    READY
                  </span>
                </div>

                <p className="mt-3 text-slate-300">
                  Customer: {order.customerName || "Guest"}
                </p>

                <div className="mt-5 border-t border-slate-700 pt-4">
                  <p className="mb-3 font-semibold">Items to collect</p>
                  {order.items?.length ? (
                    <ul className="space-y-2">
                      {order.items.map((item, index) => (
                        <li
                          key={`${item.name}-${index}`}
                          className="flex justify-between gap-3 text-slate-300"
                        >
                          <span>{item.name}</span>
                          <span className="font-semibold">
                            × {item.quantity}
                          </span>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-sm text-slate-400">
                      Check the order details at the counter.
                    </p>
                  )}
                </div>

                <button
                  onClick={() => acknowledgeOrder(order)}
                  className="mt-6 w-full rounded-xl bg-amber-400 px-4 py-3 font-bold text-slate-950 transition hover:bg-amber-300"
                >
                  Collected / Acknowledge
                </button>
              </article>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}