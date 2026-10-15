
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { onAuthStateChanged, User } from "firebase/auth";
import {
  collection,
  doc,
  onSnapshot,
  query,
  runTransaction,
  serverTimestamp,
  where,
} from "firebase/firestore";
import { auth, db } from "@/src/lib/firebase";

type Station = "kitchen" | "bar";
type TicketStatus = "pending" | "preparing" | "ready";

type TicketItem = {
  menuItemId?: string;
  name: string;
  category?: string;
  quantity: number;
  price: number;
};

type TicketOrder = {
  id: string;
  ownerId: string;
  cafeId: string;
  tableNumber: string;
  customerName: string;
  items: TicketItem[];
  status: string;
  kitchenStatus: TicketStatus;
  barStatus: TicketStatus;
};

function getStation(item: TicketItem): Station {
  const category = (item.category ?? "").toLowerCase();
  const name = (item.name ?? "").toLowerCase();

  if (
    /drink|beverage|juice|coffee|tea|mocktail|bar/.test(category)
  ) {
    return "bar";
  }

  if (
    /mojito|juice|coffee|tea|milkshake|smoothie|lemonade|soda|cola|water|latte|cappuccino|espresso|iced tea/.test(name)
  ) {
    return "bar";
  }

  return "kitchen";
}

function statusLabel(status: string) {
  if (status === "ready") return "Ready";
  if (status === "preparing") return "Preparing";
  return "New order";
}

export default function StationDisplay({
  station,
}: {
  station: Station;
}) {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [orders, setOrders] = useState<TicketOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState<string | null>(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      if (!currentUser) {
        router.push("/login");
        return;
      }
      setUser(currentUser);
    });

    return () => unsubscribe();
  }, [router]);

  useEffect(() => {
    if (!user) return;

    const ordersQuery = query(
      collection(db, "orders"),
      where("ownerId", "==", user.uid)
    );

    const unsubscribe = onSnapshot(
      ordersQuery,
      (snapshot) => {
        const result: TicketOrder[] = [];

        snapshot.forEach((itemDoc) => {
          const data = itemDoc.data();
          const items = Array.isArray(data.items)
            ? (data.items as TicketItem[])
            : [];

          const stationItems = items.filter(
            (item) => getStation(item) === station
          );

          if (stationItems.length === 0) return;

          const status = String(data.status ?? "pending");
          if (status === "completed" || status === "cancelled") return;

          result.push({
            id: itemDoc.id,
            ownerId: String(data.ownerId ?? ""),
            cafeId: String(data.cafeId ?? ""),
            tableNumber: String(data.tableNumber ?? ""),
            customerName: String(data.customerName ?? "Customer"),
            items: stationItems,
            status,
            kitchenStatus: data.kitchenStatus ?? "pending",
            barStatus: data.barStatus ?? "pending",
          });
        });

        result.sort((a, b) => {
          const statusOrder = (value: string) =>
            value === "pending" ? 0 : value === "preparing" ? 1 : 2;
          return (
            statusOrder(a[`${station}Status`]) -
            statusOrder(b[`${station}Status`])
          );
        });

        setOrders(result);
        setLoading(false);
        setError("");
      },
      (err) => {
        console.error("Station orders listener:", err);
        setError(
          "Could not load orders. Check Firestore permissions and your connection."
        );
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [user, station]);

  async function updateTicket(
    order: TicketOrder,
    nextStatus: "preparing" | "ready"
  ) {
    if (!user || busy) return;

    setBusy(order.id);
    setError("");

    try {
      const orderRef = doc(db, "orders", order.id);

      await runTransaction(db, async (transaction) => {
        const orderSnapshot = await transaction.get(orderRef);

        if (!orderSnapshot.exists()) {
          throw new Error("This order no longer exists.");
        }

        const data = orderSnapshot.data();

        if (data.ownerId !== user.uid) {
          throw new Error("You do not have permission to update this order.");
        }

        const allItems = Array.isArray(data.items)
          ? (data.items as TicketItem[])
          : [];

        const otherStation: Station =
          station === "kitchen" ? "bar" : "kitchen";

        const otherItems = allItems.filter(
          (item) => getStation(item) === otherStation
        );

        const otherStatus = data[`${otherStation}Status`] ?? "pending";

        const updates: Record<string, unknown> = {
          [`${station}Status`]: nextStatus,
          updatedAt: serverTimestamp(),
        };

        if (
          nextStatus === "preparing" &&
          ["pending", "accepted"].includes(String(data.status))
        ) {
          updates.status = "preparing";
        }

        const allStationsReady =
          nextStatus === "ready" &&
          (otherItems.length === 0 || otherStatus === "ready");

        if (allStationsReady) {
          updates.status = "ready";
          updates.waiterAlert = {
            tableNumber: String(data.tableNumber ?? ""),
            message: `Order ready for table ${data.tableNumber || "not specified"}`,
            createdAt: serverTimestamp(),
            acknowledged: false,
          };
        }

        transaction.update(orderRef, updates);
      });
    } catch (err) {
      console.error("Ticket update failed:", err);
      setError(
        err instanceof Error ? err.message : "Unable to update this ticket."
      );
    } finally {
      setBusy(null);
    }
  }

  const heading = station === "kitchen" ? "Kitchen Display" : "Bar Display";

  return (
    <main className="min-h-screen bg-slate-950 p-4 text-white sm:p-8">
      <header className="mb-8 flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-sm font-semibold uppercase tracking-widest text-orange-400">
            CafeFlow • Live Operations
          </p>
          <h1 className="mt-2 text-3xl font-black">{heading}</h1>
          <p className="mt-2 text-sm text-slate-400">
            Orders update automatically when customers order.
          </p>
        </div>

        <div className="rounded-xl border border-slate-700 bg-slate-900 px-4 py-3">
          <span className="text-slate-400">Active tickets: </span>
          <strong>{orders.length}</strong>
        </div>
      </header>

      {error && (
        <div className="mb-5 rounded-xl border border-red-500/40 bg-red-950 p-4 text-red-200">
          {error}
        </div>
      )}

      {loading ? (
        <p className="text-slate-300">Connecting to live orders...</p>
      ) : orders.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-700 p-12 text-center">
          <p className="text-xl font-bold">No active tickets</p>
          <p className="mt-2 text-slate-400">
            New orders will appear here automatically.
          </p>
        </div>
      ) : (
        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {orders.map((order) => {
            const status = order[`${station}Status`];

            return (
              <article
                key={order.id}
                className="rounded-2xl border border-slate-700 bg-slate-900 p-5 shadow-xl"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm text-slate-400">
                      Table {order.tableNumber || "—"}
                    </p>
                    <h2 className="mt-1 text-xl font-bold">
                      {order.customerName}
                    </h2>
                  </div>

                  <span className="rounded-full bg-orange-500/15 px-3 py-1 text-xs font-bold text-orange-300">
                    {statusLabel(status)}
                  </span>
                </div>

                <div className="my-5 space-y-3">
                  {order.items.map((item, index) => (
                    <div
                      key={`${item.menuItemId ?? item.name}-${index}`}
                      className="flex items-center justify-between gap-3 border-b border-slate-800 pb-3"
                    >
                      <span className="font-medium">{item.name}</span>
                      <span className="rounded-lg bg-slate-800 px-3 py-1 font-bold">
                        × {item.quantity}
                      </span>
                    </div>
                  ))}
                </div>

                {status !== "ready" ? (
                  <button
                    type="button"
                    disabled={busy !== null}
                    onClick={() =>
                      updateTicket(
                        order,
                        status === "pending" ? "preparing" : "ready"
                      )
                    }
                    className="w-full rounded-xl bg-orange-500 px-4 py-3 font-bold text-white hover:bg-orange-400 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {busy === order.id
                      ? "Updating..."
                      : status === "pending"
                        ? "Start Preparing"
                        : "Mark Ready"}
                  </button>
                ) : (
                  <div className="rounded-xl bg-emerald-500/15 px-4 py-3 text-center font-bold text-emerald-300">
                    ✓ Station ticket ready
                  </div>
                )}
              </article>
            );
          })}
        </section>
      )}
    </main>
  );
}
