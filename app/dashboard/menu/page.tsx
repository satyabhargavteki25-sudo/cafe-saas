"use client";

import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDocs,
  limit,
  query,
  serverTimestamp,
  updateDoc,
  where,
} from "firebase/firestore";

import {
  onAuthStateChanged,
  signOut,
  User,
} from "firebase/auth";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";

import { auth, db } from "@/src/lib/firebase";

type Cafe = {
  id: string;
  name: string;
  ownerId: string;
};

type MenuItem = {
  id: string;
  name: string;
  description: string;
  price: number;
  category: string;
  isVeg: boolean;
  available: boolean;
  createdAt?: {
    seconds: number;
  };
};

type FormState = {
  name: string;
  description: string;
  price: string;
  category: string;
  isVeg: boolean;
  available: boolean;
};

const emptyForm: FormState = {
  name: "",
  description: "",
  price: "",
  category: "",
  isVeg: true,
  available: true,
};

export default function MenuManagementPage() {
  const [user, setUser] = useState<User | null>(null);
  const [cafe, setCafe] = useState<Cafe | null>(null);
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState<FormState>(emptyForm);

  const [editingItem, setEditingItem] =
    useState<MenuItem | null>(null);

  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const [filterCategory, setFilterCategory] =
    useState("All");

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(
      auth,
      async (currentUser) => {
        if (!currentUser) {
          window.location.href = "/login";
          return;
        }

        setUser(currentUser);

        try {
          const cafeQuery = query(
            collection(db, "cafes"),
            where("ownerId", "==", currentUser.uid),
            limit(1)
          );

          const cafeSnapshot = await getDocs(cafeQuery);

          if (cafeSnapshot.empty) {
            setError("No cafe found for this account.");
            setLoading(false);
            return;
          }

          const cafeDoc = cafeSnapshot.docs[0];
          const cafeData = cafeDoc.data();

          const currentCafe: Cafe = {
            id: cafeDoc.id,
            name: cafeData.name || "My Cafe",
            ownerId: cafeData.ownerId,
          };

          setCafe(currentCafe);

          await loadMenu(currentCafe.id);
        } catch (err) {
          console.error(err);
          setError("Unable to load your menu.");
        } finally {
          setLoading(false);
        }
      }
    );

    return () => unsubscribe();
  }, []);

  async function loadMenu(cafeId: string) {
    const menuSnapshot = await getDocs(
      collection(db, "cafes", cafeId, "menuItems")
    );

    const items: MenuItem[] =
      menuSnapshot.docs.map((itemDoc) => {
        const data = itemDoc.data();

        return {
          id: itemDoc.id,
          name: data.name || "",
          description: data.description || "",
          price: Number(data.price || 0),
          category: data.category || "Other",
          isVeg: Boolean(data.isVeg),
          available: Boolean(data.available),
          createdAt: data.createdAt,
        };
      });

    items.sort((a, b) => {
      const aTime = a.createdAt?.seconds || 0;
      const bTime = b.createdAt?.seconds || 0;

      return bTime - aTime;
    });

    setMenuItems(items);
  }

  function resetForm() {
    setForm(emptyForm);
    setEditingItem(null);
    setMessage("");
    setError("");
  }

  function openAddForm() {
    resetForm();

    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  }

  function startEdit(item: MenuItem) {
    setEditingItem(item);

    setForm({
      name: item.name,
      description: item.description,
      price: String(item.price),
      category: item.category,
      isVeg: item.isVeg,
      available: item.available,
    });

    setMessage("");
    setError("");

    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  }

  async function handleSubmit(
    event: React.FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    if (!user || !cafe) {
      setError("You are not logged in.");
      return;
    }

    setMessage("");
    setError("");

    const trimmedName = form.name.trim();
    const trimmedDescription =
      form.description.trim();
    const trimmedCategory = form.category.trim();

    const price = Number(form.price);

    if (trimmedName.length < 2) {
      setError(
        "Food name must contain at least 2 characters."
      );
      return;
    }

    if (!price || price <= 0) {
      setError("Please enter a valid price.");
      return;
    }

    if (trimmedCategory.length < 2) {
      setError("Please enter a category.");
      return;
    }

    setSaving(true);

    try {
      if (editingItem) {
        const itemRef = doc(
          db,
          "cafes",
          cafe.id,
          "menuItems",
          editingItem.id
        );

        await updateDoc(itemRef, {
          name: trimmedName,
          description: trimmedDescription,
          price,
          category: trimmedCategory,
          isVeg: form.isVeg,
          available: form.available,
          updatedAt: serverTimestamp(),
        });

        setMessage(
          "Menu item updated successfully."
        );
      } else {
        await addDoc(
          collection(
            db,
            "cafes",
            cafe.id,
            "menuItems"
          ),
          {
            name: trimmedName,
            description: trimmedDescription,
            price,
            category: trimmedCategory,
            isVeg: form.isVeg,
            available: form.available,
            createdAt: serverTimestamp(),
          }
        );

        setMessage(
          "Menu item added successfully."
        );
      }

      await loadMenu(cafe.id);

      setForm(emptyForm);
      setEditingItem(null);
    } catch (err) {
      console.error(err);

      setError(
        err instanceof Error
          ? err.message
          : "Something went wrong while saving the menu item."
      );
    } finally {
      setSaving(false);
    }
  }

  async function toggleAvailability(
    item: MenuItem
  ) {
    if (!cafe) {
      return;
    }

    try {
      await updateDoc(
        doc(
          db,
          "cafes",
          cafe.id,
          "menuItems",
          item.id
        ),
        {
          available: !item.available,
          updatedAt: serverTimestamp(),
        }
      );

      await loadMenu(cafe.id);
    } catch (err) {
      console.error(err);
      setError(
        "Unable to change availability."
      );
    }
  }

  async function deleteMenuItem(
    item: MenuItem
  ) {
    if (!cafe) {
      return;
    }

    const confirmed = window.confirm(
      `Delete "${item.name}" from your menu?`
    );

    if (!confirmed) {
      return;
    }

    try {
      await deleteDoc(
        doc(
          db,
          "cafes",
          cafe.id,
          "menuItems",
          item.id
        )
      );

      await loadMenu(cafe.id);

      if (editingItem?.id === item.id) {
        resetForm();
      }

      setMessage("Menu item deleted.");
    } catch (err) {
      console.error(err);
      setError(
        "Unable to delete this menu item."
      );
    }
  }

  async function handleLogout() {
    await signOut(auth);
    window.location.href = "/login";
  }

  const categories = [
    "All",
    ...Array.from(
      new Set(
        menuItems.map(
          (item) => item.category
        )
      )
    ),
  ];

  const visibleItems =
    filterCategory === "All"
      ? menuItems
      : menuItems.filter(
          (item) =>
            item.category === filterCategory
        );

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-950">
        <div className="text-center">
          <div className="mx-auto mb-4 h-10 w-10 animate-spin rounded-full border-4 border-slate-700 border-t-orange-500" />

          <p className="text-slate-300">
            Loading your menu...
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-50 text-slate-900">

      {/* NAVBAR */}
      <nav className="sticky top-0 z-50 border-b border-slate-800 bg-slate-950/95 backdrop-blur">

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
              className="h-10 w-10 rounded-xl object-cover"
            />

            <div>
              <div className="text-lg font-bold tracking-tight text-white">
                CafeFlow
              </div>

              <div className="text-xs text-slate-400">
                Restaurant SaaS
              </div>
            </div>
          </Link>

          <div className="flex items-center gap-3">

            <div className="hidden text-right sm:block">
              <p className="text-sm font-medium text-white">
                {cafe?.name || "Cafe Owner"}
              </p>

              <p className="text-xs text-slate-400">
                {user?.email}
              </p>
            </div>

            <button
              onClick={handleLogout}
              className="rounded-xl border border-slate-700 px-4 py-2 text-sm font-semibold text-slate-200 transition hover:border-orange-500 hover:text-orange-400"
            >
              Logout
            </button>

          </div>
        </div>
      </nav>

      {/* HERO */}
      <section className="bg-slate-950">

        <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">

          <div className="max-w-3xl">

            <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-orange-500/30 bg-orange-500/10 px-4 py-2 text-sm font-semibold text-orange-400">
              🍽️ Digital Menu
            </div>

            <h1 className="text-4xl font-black tracking-tight text-white sm:text-5xl">
              Build your
              <span className="text-orange-500">
                {" "}digital menu.
              </span>
            </h1>

            <p className="mt-5 text-lg leading-8 text-slate-400">
              Add food items, prices, categories and
              availability. Your customers can view
              the menu instantly from their phone.
            </p>

          </div>
        </div>
      </section>

      {/* MAIN */}
      <section className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">

        {/* ALERTS */}

        {message && (
          <div className="mb-6 rounded-2xl border border-emerald-200 bg-emerald-50 px-5 py-4 text-sm font-medium text-emerald-700">
            ✓ {message}
          </div>
        )}

        {error && (
          <div className="mb-6 rounded-2xl border border-red-200 bg-red-50 px-5 py-4 text-sm font-medium text-red-700">
            {error}
          </div>
        )}

        {/* ADD / EDIT FORM */}

        <div className="mb-10 overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">

          <div className="bg-slate-950 px-6 py-6 sm:px-8">

            <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">

              <div>
                <p className="text-sm font-semibold uppercase tracking-wider text-orange-500">
                  {editingItem
                    ? "Edit Item"
                    : "Add New Item"}
                </p>

                <h2 className="mt-1 text-2xl font-bold text-white">
                  {editingItem
                    ? `Editing ${editingItem.name}`
                    : "Create a menu item"}
                </h2>
              </div>

              {editingItem && (
                <button
                  type="button"
                  onClick={resetForm}
                  className="rounded-xl border border-slate-700 px-4 py-2 text-sm font-semibold text-slate-300 transition hover:border-orange-500 hover:text-orange-400"
                >
                  Cancel Edit
                </button>
              )}

            </div>
          </div>

          <form
            onSubmit={handleSubmit}
            className="p-6 lg:p-8"
          >

            <div className="grid gap-5">

              {/* FOOD NAME */}

              <div>
                <label className="mb-2 block text-sm font-bold text-slate-700">
                  Food Name
                </label>

                <input
                  value={form.name}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      name: e.target.value,
                    })
                  }
                  placeholder="Chicken Biryani"
                  maxLength={100}
                  required
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3.5 outline-none transition focus:border-orange-500 focus:bg-white focus:ring-4 focus:ring-orange-500/10"
                />
              </div>

              {/* DESCRIPTION */}

              <div>
                <label className="mb-2 block text-sm font-bold text-slate-700">
                  Description
                </label>

                <textarea
                  value={form.description}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      description: e.target.value,
                    })
                  }
                  placeholder="Fragrant basmati rice with tender chicken..."
                  rows={4}
                  maxLength={1000}
                  className="w-full resize-none rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3.5 outline-none transition focus:border-orange-500 focus:bg-white focus:ring-4 focus:ring-orange-500/10"
                />

                <p className="mt-1 text-right text-xs text-slate-400">
                  {form.description.length}/1000
                </p>
              </div>

              {/* PRICE + CATEGORY */}

              <div className="grid gap-5 sm:grid-cols-2">

                <div>
                  <label className="mb-2 block text-sm font-bold text-slate-700">
                    Price
                  </label>

                  <div className="relative">

                    <span className="absolute left-4 top-1/2 -translate-y-1/2 font-bold text-slate-500">
                      ₹
                    </span>

                    <input
                      type="number"
                      min="1"
                      step="0.01"
                      value={form.price}
                      onChange={(e) =>
                        setForm({
                          ...form,
                          price: e.target.value,
                        })
                      }
                      placeholder="180"
                      required
                      className="w-full rounded-2xl border border-slate-200 bg-slate-50 py-3.5 pl-9 pr-4 outline-none transition focus:border-orange-500 focus:bg-white focus:ring-4 focus:ring-orange-500/10"
                    />

                  </div>
                </div>

                <div>
                  <label className="mb-2 block text-sm font-bold text-slate-700">
                    Category
                  </label>

                  <input
                    value={form.category}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        category: e.target.value,
                      })
                    }
                    placeholder="Biryani"
                    maxLength={50}
                    required
                    className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3.5 outline-none transition focus:border-orange-500 focus:bg-white focus:ring-4 focus:ring-orange-500/10"
                  />
                </div>

              </div>

              {/* OPTIONS */}

              <div className="grid gap-4 sm:grid-cols-2">

                <button
                  type="button"
                  onClick={() =>
                    setForm({
                      ...form,
                      isVeg: !form.isVeg,
                    })
                  }
                  className={`flex items-center justify-between rounded-2xl border p-4 text-left transition ${
                    form.isVeg
                      ? "border-emerald-300 bg-emerald-50"
                      : "border-slate-200 bg-slate-50"
                  }`}
                >

                  <div>
                    <p className="font-bold text-slate-900">
                      Vegetarian
                    </p>

                    <p className="text-xs text-slate-500">
                      Show green veg indicator
                    </p>
                  </div>

                  <div
                    className={`h-6 w-11 rounded-full p-1 transition ${
                      form.isVeg
                        ? "bg-emerald-500"
                        : "bg-slate-300"
                    }`}
                  >
                    <div
                      className={`h-4 w-4 rounded-full bg-white transition ${
                        form.isVeg
                          ? "translate-x-5"
                          : "translate-x-0"
                      }`}
                    />
                  </div>

                </button>

                <button
                  type="button"
                  onClick={() =>
                    setForm({
                      ...form,
                      available: !form.available,
                    })
                  }
                  className={`flex items-center justify-between rounded-2xl border p-4 text-left transition ${
                    form.available
                      ? "border-orange-300 bg-orange-50"
                      : "border-slate-200 bg-slate-50"
                  }`}
                >

                  <div>
                    <p className="font-bold text-slate-900">
                      Available
                    </p>

                    <p className="text-xs text-slate-500">
                      Show to customers
                    </p>
                  </div>

                  <div
                    className={`h-6 w-11 rounded-full p-1 transition ${
                      form.available
                        ? "bg-orange-500"
                        : "bg-slate-300"
                    }`}
                  >
                    <div
                      className={`h-4 w-4 rounded-full bg-white transition ${
                        form.available
                          ? "translate-x-5"
                          : "translate-x-0"
                      }`}
                    />
                  </div>

                </button>

              </div>

              {/* SUBMIT */}

              <button
                type="submit"
                disabled={saving}
                className="w-full rounded-2xl bg-orange-500 px-6 py-4 font-bold text-white shadow-lg shadow-orange-500/20 transition hover:bg-orange-600 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {saving
                  ? "Saving..."
                  : editingItem
                  ? "Save Changes"
                  : "Add Menu Item"}
              </button>

            </div>
          </form>
        </div>

        {/* MENU HEADER */}

        <div className="mb-6 flex flex-col justify-between gap-5 sm:flex-row sm:items-end">

          <div>
            <p className="text-sm font-bold uppercase tracking-wider text-orange-500">
              Your Menu
            </p>

            <h2 className="mt-1 text-3xl font-black text-slate-950">
              {menuItems.length}{" "}
              {menuItems.length === 1
                ? "item"
                : "items"}
            </h2>
          </div>

          <Link
            href={`/menu/${cafe?.id || ""}`}
            target="_blank"
            className="rounded-xl bg-slate-950 px-5 py-3 text-center text-sm font-bold text-white transition hover:bg-slate-800"
          >
            View Customer Menu →
          </Link>

        </div>

        {/* CATEGORY FILTER */}

        {categories.length > 1 && (
          <div className="mb-8 flex gap-2 overflow-x-auto pb-2">

            {categories.map((category) => (
              <button
                key={category}
                onClick={() =>
                  setFilterCategory(category)
                }
                className={`whitespace-nowrap rounded-full px-5 py-2.5 text-sm font-bold transition ${
                  filterCategory === category
                    ? "bg-slate-950 text-white"
                    : "border border-slate-200 bg-white text-slate-600 hover:border-orange-400 hover:text-orange-600"
                }`}
              >
                {category}
              </button>
            ))}

          </div>
        )}

        {/* EMPTY STATE */}

        {visibleItems.length === 0 && (
          <div className="rounded-3xl border border-dashed border-slate-300 bg-white p-12 text-center">

            <div className="mx-auto mb-5 flex h-20 w-20 items-center justify-center rounded-3xl bg-slate-950 text-4xl">
              🍽️
            </div>

            <h3 className="text-xl font-bold text-slate-900">
              No menu items yet
            </h3>

            <p className="mx-auto mt-2 max-w-md text-slate-500">
              Add your first food item to create
              your digital menu.
            </p>

            <button
              onClick={openAddForm}
              className="mt-6 rounded-xl bg-orange-500 px-6 py-3 font-bold text-white transition hover:bg-orange-600"
            >
              + Add First Item
            </button>

          </div>
        )}

        {/* MENU CARDS */}

        <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-3">

          {visibleItems.map((item) => (
            <article
              key={item.id}
              className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm transition hover:-translate-y-1 hover:shadow-xl"
            >

              {/* FOOD ICON AREA */}

              <div className="relative flex aspect-[4/3] items-center justify-center bg-gradient-to-br from-slate-950 via-slate-900 to-slate-800">

                <div className="flex h-28 w-28 items-center justify-center rounded-full border border-slate-700 bg-slate-950 text-6xl shadow-2xl">
                  🍽️
                </div>

                <div className="absolute left-3 top-3">

                  <span
                    className={`rounded-full px-3 py-1.5 text-xs font-bold ${
                      item.available
                        ? "bg-emerald-500/90 text-white"
                        : "bg-slate-950/90 text-slate-300"
                    }`}
                  >
                    {item.available
                      ? "Available"
                      : "Unavailable"}
                  </span>

                </div>

                <div className="absolute right-3 top-3">

                  <span
                    className={`rounded-full px-3 py-1.5 text-xs font-bold ${
                      item.isVeg
                        ? "bg-emerald-50 text-emerald-700"
                        : "bg-red-50 text-red-700"
                    }`}
                  >
                    {item.isVeg
                      ? "● Veg"
                      : "● Non-Veg"}
                  </span>

                </div>

              </div>

              {/* CONTENT */}

              <div className="p-5">

                <div className="flex items-start justify-between gap-4">

                  <div className="min-w-0">

                    <p className="mb-1 text-xs font-bold uppercase tracking-wider text-orange-500">
                      {item.category}
                    </p>

                    <h3 className="text-xl font-black text-slate-950">
                      {item.name}
                    </h3>

                  </div>

                  <div className="whitespace-nowrap text-lg font-black text-slate-950">
                    ₹{item.price.toFixed(2)}
                  </div>

                </div>

                {item.description && (
                  <p className="mt-3 line-clamp-2 text-sm leading-6 text-slate-500">
                    {item.description}
                  </p>
                )}

                {/* ACTIONS */}

                <div className="mt-5 grid grid-cols-3 gap-2">

                  <button
                    onClick={() =>
                      startEdit(item)
                    }
                    className="rounded-xl border border-slate-200 px-3 py-2.5 text-sm font-bold text-slate-700 transition hover:border-orange-500 hover:text-orange-600"
                  >
                    Edit
                  </button>

                  <button
                    onClick={() =>
                      toggleAvailability(item)
                    }
                    className="rounded-xl border border-slate-200 px-3 py-2.5 text-sm font-bold text-slate-700 transition hover:border-orange-500 hover:text-orange-600"
                  >
                    {item.available
                      ? "Hide"
                      : "Show"}
                  </button>

                  <button
                    onClick={() =>
                      deleteMenuItem(item)
                    }
                    className="rounded-xl border border-red-100 px-3 py-2.5 text-sm font-bold text-red-600 transition hover:bg-red-50"
                  >
                    Delete
                  </button>

                </div>

              </div>

            </article>
          ))}

        </div>

      </section>

      {/* FOOTER */}

      <footer className="border-t border-slate-200 bg-white">

        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-4 px-4 py-8 sm:flex-row sm:px-6 lg:px-8">

          <div className="flex items-center gap-3">

            <Image
              src="/logo.jpeg"
              alt="CafeFlow"
              width={36}
              height={36}
              className="h-9 w-9 rounded-xl object-cover"
            />

            <div>
              <p className="font-bold text-slate-900">
                CafeFlow
              </p>

              <p className="text-xs text-slate-500">
                Smart tools for modern cafes
              </p>
            </div>

          </div>

          <p className="text-sm text-slate-400">
            © {new Date().getFullYear()} CafeFlow
          </p>

        </div>

      </footer>

    </main>
  );
}