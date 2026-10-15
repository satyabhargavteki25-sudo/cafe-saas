"use client";

import Image from "next/image";
import { useEffect, useMemo, useState } from "react";
import {
  addDoc,
  collection,
  doc,
  getDoc,
  getDocs,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "@/src/lib/firebase";

type MenuItem = {
  id: string;
  name: string;
  description: string;
  price: number;
  category: string;
  isVeg: boolean;
  available: boolean;
};

type CartItem = MenuItem & {
  quantity: number;
};

type Props = {
  params: Promise<{
    cafeId: string;
  }>;
};

type OrderStep = "cart" | "details" | "success";

export default function CustomerMenuPage({ params }: Props) {
  const [cafeId, setCafeId] = useState("");

  const [cafeName, setCafeName] = useState("CafeFlow Cafe");
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [loading, setLoading] = useState(true);

  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("All");

  const [cart, setCart] = useState<CartItem[]>([]);
  const [cartOpen, setCartOpen] = useState(false);

  const [orderStep, setOrderStep] = useState<OrderStep>("cart");

  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [tableNumber, setTableNumber] = useState("");

  const [placingOrder, setPlacingOrder] = useState(false);
  const [orderId, setOrderId] = useState("");

  // =========================================================
  // LOAD CAFE ID
  // =========================================================

  useEffect(() => {
    async function loadParams() {
      const resolvedParams = await params;
      setCafeId(resolvedParams.cafeId);
    }

    loadParams();
  }, [params]);

  // =========================================================
  // LOAD CAFE + MENU
  // =========================================================

  useEffect(() => {
    if (!cafeId) return;

    async function loadCafeAndMenu() {
      try {
        setLoading(true);

        // ---------------------------------------------------
        // LOAD CAFE DIRECTLY
        // ---------------------------------------------------

        const cafeRef = doc(db, "cafes", cafeId);
        const cafeSnapshot = await getDoc(cafeRef);

        if (!cafeSnapshot.exists()) {
          console.error("Cafe not found:", cafeId);
          setLoading(false);
          return;
        }

        const cafeData = cafeSnapshot.data();

        if (cafeData.name) {
          setCafeName(cafeData.name);
        }

        // ---------------------------------------------------
        // LOAD MENU ITEMS
        // ---------------------------------------------------

        const menuSnapshot = await getDocs(
          collection(db, "cafes", cafeId, "menuItems")
        );

        const items: MenuItem[] = menuSnapshot.docs.map((menuDoc) => {
          const data = menuDoc.data();

          return {
            id: menuDoc.id,
            name: data.name || "",
            description: data.description || "",
            price: Number(data.price || 0),
            category: data.category || "Other",
            isVeg: Boolean(data.isVeg),
            available: Boolean(data.available),
          };
        });

        setMenuItems(items);

        // ---------------------------------------------------
        // LOAD SAVED CART
        // ---------------------------------------------------

        const savedCart = localStorage.getItem(
          `cafeflow-cart-${cafeId}`
        );

        if (savedCart) {
          try {
            setCart(JSON.parse(savedCart));
          } catch {
            setCart([]);
          }
        }
      } catch (error) {
        console.error("Error loading menu:", error);
      } finally {
        setLoading(false);
      }
    }

    loadCafeAndMenu();
  }, [cafeId]);

  // =========================================================
  // SAVE CART
  // =========================================================

  useEffect(() => {
    if (!cafeId) return;

    localStorage.setItem(
      `cafeflow-cart-${cafeId}`,
      JSON.stringify(cart)
    );
  }, [cart, cafeId]);

  // =========================================================
  // CATEGORIES
  // =========================================================

  const categories = useMemo(() => {
    const uniqueCategories = Array.from(
      new Set(
        menuItems
          .filter((item) => item.available)
          .map((item) => item.category)
      )
    );

    return ["All", ...uniqueCategories];
  }, [menuItems]);

  // =========================================================
  // FILTERED ITEMS
  // =========================================================

  const filteredItems = useMemo(() => {
    return menuItems.filter((item) => {
      if (!item.available) return false;

      const matchesCategory =
        selectedCategory === "All" ||
        item.category === selectedCategory;

      const searchText = search.toLowerCase().trim();

      const matchesSearch =
        !searchText ||
        item.name.toLowerCase().includes(searchText) ||
        item.description.toLowerCase().includes(searchText) ||
        item.category.toLowerCase().includes(searchText);

      return matchesCategory && matchesSearch;
    });
  }, [menuItems, selectedCategory, search]);

  // =========================================================
  // GROUP ITEMS
  // =========================================================

  const groupedItems = useMemo(() => {
    const groups: Record<string, MenuItem[]> = {};

    filteredItems.forEach((item) => {
      if (!groups[item.category]) {
        groups[item.category] = [];
      }

      groups[item.category].push(item);
    });

    return groups;
  }, [filteredItems]);

  // =========================================================
  // CART COUNT
  // =========================================================

  const cartCount = useMemo(() => {
    return cart.reduce(
      (total, item) => total + item.quantity,
      0
    );
  }, [cart]);

  // =========================================================
  // CART TOTAL
  // =========================================================

  const cartTotal = useMemo(() => {
    return cart.reduce(
      (total, item) =>
        total + item.price * item.quantity,
      0
    );
  }, [cart]);

  // =========================================================
  // ADD TO CART
  // =========================================================

  function addToCart(item: MenuItem) {
    setCart((currentCart) => {
      const existing = currentCart.find(
        (cartItem) => cartItem.id === item.id
      );

      if (existing) {
        return currentCart.map((cartItem) =>
          cartItem.id === item.id
            ? {
                ...cartItem,
                quantity: cartItem.quantity + 1,
              }
            : cartItem
        );
      }

      return [
        ...currentCart,
        {
          ...item,
          quantity: 1,
        },
      ];
    });
  }

  // =========================================================
  // INCREASE
  // =========================================================

  function increaseQuantity(itemId: string) {
    setCart((currentCart) =>
      currentCart.map((item) =>
        item.id === itemId
          ? {
              ...item,
              quantity: item.quantity + 1,
            }
          : item
      )
    );
  }

  // =========================================================
  // DECREASE
  // =========================================================

  function decreaseQuantity(itemId: string) {
    setCart((currentCart) =>
      currentCart
        .map((item) =>
          item.id === itemId
            ? {
                ...item,
                quantity: item.quantity - 1,
              }
            : item
        )
        .filter((item) => item.quantity > 0)
    );
  }

  // =========================================================
  // REMOVE
  // =========================================================

  function removeFromCart(itemId: string) {
    setCart((currentCart) =>
      currentCart.filter(
        (item) => item.id !== itemId
      )
    );
  }

  // =========================================================
  // CLEAR
  // =========================================================

  function clearCart() {
    setCart([]);
  }

  // =========================================================
  // GET QUANTITY
  // =========================================================

  function getQuantity(itemId: string) {
    return (
      cart.find((item) => item.id === itemId)
        ?.quantity || 0
    );
  }

  // =========================================================
  // OPEN ORDER DETAILS
  // =========================================================

  function openOrderDetails() {
    if (cart.length === 0) {
      alert("Your cart is empty.");
      return;
    }

    setOrderStep("details");
  }

  // =========================================================
  // PLACE ORDER
  // =========================================================

  async function placeOrder() {
    if (!cafeId) {
      alert("Cafe information is missing.");
      return;
    }

    if (!customerName.trim()) {
      alert("Please enter your name.");
      return;
    }

    if (!customerPhone.trim()) {
      alert("Please enter your phone number.");
      return;
    }

    if (!/^[0-9]{10}$/.test(customerPhone.trim())) {
      alert("Please enter a valid 10-digit phone number.");
      return;
    }

    if (!tableNumber.trim()) {
      alert("Please enter your table number.");
      return;
    }

    if (cart.length === 0) {
      alert("Your cart is empty.");
      return;
    }

    try {
      setPlacingOrder(true);

      // -----------------------------------------------------
      // GET CAFE
      // -----------------------------------------------------

      const cafeRef = doc(db, "cafes", cafeId);

      const cafeSnapshot = await getDoc(cafeRef);

      if (!cafeSnapshot.exists()) {
        alert("Cafe not found.");
        return;
      }

      const cafeData = cafeSnapshot.data();

      // -----------------------------------------------------
      // GET REAL OWNER ID
      // -----------------------------------------------------

      const ownerId = cafeData.ownerId;

      if (!ownerId || typeof ownerId !== "string") {
        console.error(
          "Cafe ownerId is missing:",
          cafeData
        );

        alert(
          "Cafe owner information is missing. Please contact the cafe."
        );

        return;
      }

      // -----------------------------------------------------
      // CREATE ORDER
      // -----------------------------------------------------

      const orderData = {
        cafeId,

        // IMPORTANT:
        // This allows secure owner/reception queries.
        ownerId,

        customerName: customerName.trim(),

        customerPhone: customerPhone.trim(),

        tableNumber: tableNumber.trim(),

        items: cart.map((item) => ({
          menuItemId: item.id,
          name: item.name,
          price: item.price,
          quantity: item.quantity,
          isVeg: item.isVeg,
        })),

        total: cartTotal,

        status: "pending",

        paymentStatus: "unpaid",

        createdAt: serverTimestamp(),
      };

      console.log(
        "Creating CafeFlow order:",
        orderData
      );

      const orderRef = await addDoc(
        collection(db, "orders"),
        orderData
      );

      console.log(
        "Order created successfully:",
        orderRef.id
      );

      // -----------------------------------------------------
      // SUCCESS
      // -----------------------------------------------------

      setOrderId(orderRef.id);

      setCart([]);

      localStorage.removeItem(
        `cafeflow-cart-${cafeId}`
      );

      setOrderStep("success");
    } catch (error) {
      console.error(
        "Error placing order:",
        error
      );

      alert(
        "Unable to place order. Please try again."
      );
    } finally {
      setPlacingOrder(false);
    }
  }

  // =========================================================
  // CLOSE CART
  // =========================================================

  function closeCart() {
    setCartOpen(false);
    setOrderStep("cart");
  }

  // =========================================================
  // LOADING
  // =========================================================

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#f8fafc]">
        <div className="text-center">
          <div className="mx-auto mb-4 h-10 w-10 animate-spin rounded-full border-4 border-[#f97316] border-t-transparent" />

          <p className="text-sm font-medium text-slate-600">
            Loading menu...
          </p>
        </div>
      </main>
    );
  }

  // =========================================================
  // UI
  // =========================================================

  return (
    <main className="min-h-screen bg-[#f8fafc] text-slate-900">

      {/* =====================================================
          HEADER
      ===================================================== */}

      <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/95 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4 sm:px-6">

          <div className="flex items-center gap-3">

            <Image
              src="/logo.jpeg"
              alt="CafeFlow"
              width={44}
              height={44}
              className="h-11 w-11 rounded-xl object-cover"
            />

            <div>
              <h1 className="text-lg font-bold text-[#0f172a]">
                {cafeName}
              </h1>

              <p className="text-xs text-slate-500">
                Digital Menu
              </p>
            </div>

          </div>

          <button
            onClick={() => {
              setCartOpen(true);
              setOrderStep("cart");
            }}
            className="relative flex items-center gap-2 rounded-xl bg-[#f97316] px-4 py-2.5 text-sm font-bold text-white shadow-sm transition hover:bg-[#ea580c]"
          >
            <span className="text-lg">
              🛒
            </span>

            <span className="hidden sm:inline">
              Cart
            </span>

            {cartCount > 0 && (
              <span className="absolute -right-2 -top-2 flex h-6 min-w-6 items-center justify-center rounded-full bg-[#0f172a] px-1.5 text-xs font-bold text-white">
                {cartCount}
              </span>
            )}
          </button>

        </div>
      </header>

      {/* =====================================================
          HERO
      ===================================================== */}

      <section className="border-b border-slate-200 bg-white">
        <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">

          <p className="mb-2 text-sm font-semibold text-[#f97316]">
            Welcome
          </p>

          <h2 className="text-3xl font-black tracking-tight text-[#0f172a] sm:text-4xl">
            What would you like to order?
          </h2>

          <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-500 sm:text-base">
            Browse our menu, choose your favourites and add them
            to your cart.
          </p>

          {/* SEARCH */}

          <div className="mt-6">
            <div className="relative">

              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-lg">
                🔎
              </span>

              <input
                value={search}
                onChange={(event) =>
                  setSearch(event.target.value)
                }
                placeholder="Search food..."
                className="w-full rounded-2xl border border-slate-200 bg-[#f8fafc] py-3.5 pl-11 pr-4 text-sm outline-none transition focus:border-[#f97316] focus:bg-white focus:ring-2 focus:ring-orange-100"
              />

            </div>
          </div>

          {/* CATEGORIES */}

          <div className="mt-5 flex gap-2 overflow-x-auto pb-1">

            {categories.map((category) => {

              const active =
                selectedCategory === category;

              return (
                <button
                  key={category}
                  onClick={() =>
                    setSelectedCategory(category)
                  }
                  className={`whitespace-nowrap rounded-full px-4 py-2 text-sm font-semibold transition ${
                    active
                      ? "bg-[#0f172a] text-white"
                      : "border border-slate-200 bg-white text-slate-600 hover:border-slate-300"
                  }`}
                >
                  {category}
                </button>
              );
            })}

          </div>

        </div>
      </section>

      {/* =====================================================
          MENU
      ===================================================== */}

      <section className="mx-auto max-w-6xl px-4 py-8 sm:px-6">

        {Object.keys(groupedItems).length === 0 ? (

          <div className="rounded-3xl border border-dashed border-slate-300 bg-white px-6 py-16 text-center">

            <div className="text-5xl">
              🍽️
            </div>

            <h3 className="mt-4 text-lg font-bold text-slate-900">
              No items found
            </h3>

            <p className="mt-2 text-sm text-slate-500">
              Try another search or category.
            </p>

          </div>

        ) : (

          <div className="space-y-10">

            {Object.entries(groupedItems).map(
              ([category, items]) => (

                <div key={category}>

                  <div className="mb-4 flex items-center justify-between">

                    <h3 className="text-xl font-black text-[#0f172a]">
                      {category}
                    </h3>

                    <span className="text-xs font-semibold text-slate-400">
                      {items.length} item
                      {items.length !== 1
                        ? "s"
                        : ""}
                    </span>

                  </div>

                  <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">

                    {items.map((item) => {

                      const quantity =
                        getQuantity(item.id);

                      return (

                        <div
                          key={item.id}
                          className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
                        >

                          <div className="flex h-40 items-center justify-center bg-gradient-to-br from-orange-50 to-amber-100">

                            <span className="text-6xl">
                              🍽️
                            </span>

                          </div>

                          <div className="p-5">

                            <div className="flex items-start justify-between gap-3">

                              <div className="min-w-0">

                                <h4 className="text-lg font-bold text-slate-900">
                                  {item.name}
                                </h4>

                                {item.description && (
                                  <p className="mt-1 line-clamp-2 text-sm leading-5 text-slate-500">
                                    {item.description}
                                  </p>
                                )}

                              </div>

                              <span
                                className={`mt-1 flex h-5 w-5 shrink-0 items-center justify-center rounded border-2 ${
                                  item.isVeg
                                    ? "border-green-600"
                                    : "border-red-600"
                                }`}
                              >

                                <span
                                  className={`h-2 w-2 rounded-full ${
                                    item.isVeg
                                      ? "bg-green-600"
                                      : "bg-red-600"
                                  }`}
                                />

                              </span>

                            </div>

                            <div className="mt-5 flex items-center justify-between gap-3">

                              <span className="text-xl font-black text-[#0f172a]">
                                ₹{item.price.toFixed(2)}
                              </span>

                              {quantity === 0 ? (

                                <button
                                  onClick={() =>
                                    addToCart(item)
                                  }
                                  className="rounded-xl bg-[#f97316] px-5 py-2.5 text-sm font-bold text-white transition hover:bg-[#ea580c]"
                                >
                                  + Add
                                </button>

                              ) : (

                                <div className="flex items-center gap-2 rounded-xl bg-slate-100 p-1">

                                  <button
                                    onClick={() =>
                                      decreaseQuantity(
                                        item.id
                                      )
                                    }
                                    className="flex h-9 w-9 items-center justify-center rounded-lg bg-white text-lg font-bold text-slate-700 shadow-sm"
                                  >
                                    −
                                  </button>

                                  <span className="w-7 text-center text-sm font-bold">
                                    {quantity}
                                  </span>

                                  <button
                                    onClick={() =>
                                      increaseQuantity(
                                        item.id
                                      )
                                    }
                                    className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#f97316] text-lg font-bold text-white"
                                  >
                                    +
                                  </button>

                                </div>

                              )}

                            </div>

                          </div>

                        </div>

                      );
                    })}

                  </div>

                </div>

              )
            )}

          </div>

        )}

      </section>

      {/* =====================================================
          BOTTOM CART
      ===================================================== */}

      {cartCount > 0 && (

        <div className="fixed bottom-0 left-0 right-0 z-40 border-t border-slate-200 bg-white/95 p-3 shadow-[0_-5px_25px_rgba(0,0,0,0.08)] backdrop-blur">

          <div className="mx-auto flex max-w-6xl items-center justify-between gap-3">

            <div>

              <p className="text-xs font-semibold text-slate-500">
                {cartCount} item
                {cartCount !== 1 ? "s" : ""} in cart
              </p>

              <p className="text-lg font-black text-[#0f172a]">
                ₹{cartTotal.toFixed(2)}
              </p>

            </div>

            <button
              onClick={() => {
                setCartOpen(true);
                setOrderStep("cart");
              }}
              className="rounded-xl bg-[#f97316] px-6 py-3 text-sm font-bold text-white"
            >
              View Cart →
            </button>

          </div>

        </div>

      )}

      {/* =====================================================
          CART DRAWER
      ===================================================== */}

      {cartOpen && (

        <div className="fixed inset-0 z-50">

          <button
            aria-label="Close cart"
            onClick={closeCart}
            className="absolute inset-0 bg-black/40"
          />

          <aside className="absolute right-0 top-0 flex h-full w-full max-w-md flex-col bg-white shadow-2xl">

            {/* =================================================
                CART
            ================================================= */}

            {orderStep === "cart" && (

              <>

                <div className="flex items-center justify-between border-b border-slate-200 px-5 py-5">

                  <div>

                    <h2 className="text-xl font-black">
                      Your Cart
                    </h2>

                    <p className="mt-1 text-xs text-slate-500">
                      {cartCount} item
                      {cartCount !== 1 ? "s" : ""}
                    </p>

                  </div>

                  <button
                    onClick={closeCart}
                    className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-100 text-xl"
                  >
                    ×
                  </button>

                </div>

                <div className="flex-1 overflow-y-auto px-5 py-5">

                  {cart.length === 0 ? (

                    <div className="flex h-full flex-col items-center justify-center text-center">

                      <div className="text-6xl">
                        🛒
                      </div>

                      <h3 className="mt-5 text-lg font-bold">
                        Your cart is empty
                      </h3>

                      <p className="mt-2 text-sm text-slate-500">
                        Add some delicious items.
                      </p>

                      <button
                        onClick={closeCart}
                        className="mt-5 rounded-xl bg-[#f97316] px-5 py-3 text-sm font-bold text-white"
                      >
                        Browse Menu
                      </button>

                    </div>

                  ) : (

                    <div className="space-y-4">

                      {cart.map((item) => (

                        <div
                          key={item.id}
                          className="rounded-2xl border border-slate-200 p-4"
                        >

                          <div className="flex justify-between gap-3">

                            <div>

                              <h3 className="font-bold">
                                {item.name}
                              </h3>

                              <p className="mt-1 text-sm font-semibold text-[#f97316]">
                                ₹{item.price.toFixed(2)}
                              </p>

                            </div>

                            <button
                              onClick={() =>
                                removeFromCart(
                                  item.id
                                )
                              }
                              className="text-sm font-semibold text-red-500"
                            >
                              Remove
                            </button>

                          </div>

                          <div className="mt-4 flex items-center justify-between">

                            <div className="flex items-center gap-2 rounded-xl bg-slate-100 p-1">

                              <button
                                onClick={() =>
                                  decreaseQuantity(
                                    item.id
                                  )
                                }
                                className="flex h-8 w-8 items-center justify-center rounded-lg bg-white font-bold"
                              >
                                −
                              </button>

                              <span className="w-7 text-center text-sm font-bold">
                                {item.quantity}
                              </span>

                              <button
                                onClick={() =>
                                  increaseQuantity(
                                    item.id
                                  )
                                }
                                className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#f97316] font-bold text-white"
                              >
                                +
                              </button>

                            </div>

                            <span className="font-black">
                              ₹
                              {(
                                item.price *
                                item.quantity
                              ).toFixed(2)}
                            </span>

                          </div>

                        </div>

                      ))}

                      <button
                        onClick={clearCart}
                        className="w-full rounded-xl border border-red-200 py-3 text-sm font-semibold text-red-500"
                      >
                        Clear Cart
                      </button>

                    </div>

                  )}

                </div>

                {cart.length > 0 && (

                  <div className="border-t border-slate-200 p-5">

                    <div className="flex items-center justify-between">

                      <span className="text-sm font-semibold text-slate-500">
                        Total
                      </span>

                      <span className="text-2xl font-black">
                        ₹{cartTotal.toFixed(2)}
                      </span>

                    </div>

                    <button
                      onClick={openOrderDetails}
                      className="mt-4 w-full rounded-2xl bg-[#f97316] py-4 text-sm font-black text-white"
                    >
                      Continue to Order →
                    </button>

                  </div>

                )}

              </>

            )}

            {/* =================================================
                CUSTOMER DETAILS
            ================================================= */}

            {orderStep === "details" && (

              <>

                <div className="flex items-center justify-between border-b border-slate-200 px-5 py-5">

                  <div>

                    <h2 className="text-xl font-black">
                      Order Details
                    </h2>

                    <p className="mt-1 text-xs text-slate-500">
                      Enter your details
                    </p>

                  </div>

                  <button
                    onClick={closeCart}
                    className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-100 text-xl"
                  >
                    ×
                  </button>

                </div>

                <div className="flex-1 overflow-y-auto px-5 py-6">

                  <div className="space-y-5">

                    {/* NAME */}

                    <div>

                      <label className="mb-2 block text-sm font-bold">
                        Your Name
                      </label>

                      <input
                        value={customerName}
                        onChange={(event) =>
                          setCustomerName(
                            event.target.value
                          )
                        }
                        placeholder="Enter your name"
                        className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-[#f97316] focus:ring-2 focus:ring-orange-100"
                      />

                    </div>

                    {/* PHONE */}

                    <div>

                      <label className="mb-2 block text-sm font-bold">
                        Phone Number
                      </label>

                      <input
                        value={customerPhone}
                        onChange={(event) =>
                          setCustomerPhone(
                            event.target.value.replace(
                              /\D/g,
                              ""
                            )
                          )
                        }
                        placeholder="10-digit mobile number"
                        inputMode="numeric"
                        maxLength={10}
                        className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-[#f97316] focus:ring-2 focus:ring-orange-100"
                      />

                    </div>

                    {/* TABLE */}

                    <div>

                      <label className="mb-2 block text-sm font-bold">
                        Table Number
                      </label>

                      <input
                        value={tableNumber}
                        onChange={(event) =>
                          setTableNumber(
                            event.target.value
                          )
                        }
                        placeholder="Example: 5"
                        className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-[#f97316] focus:ring-2 focus:ring-orange-100"
                      />

                    </div>

                    {/* SUMMARY */}

                    <div className="rounded-2xl bg-slate-50 p-4">

                      <div className="mb-3 flex items-center justify-between">

                        <span className="text-sm font-bold">
                          Order Summary
                        </span>

                        <span className="text-sm font-bold text-[#f97316]">
                          {cartCount} items
                        </span>

                      </div>

                      <div className="space-y-2">

                        {cart.map((item) => (

                          <div
                            key={item.id}
                            className="flex justify-between gap-3 text-sm"
                          >

                            <span className="text-slate-600">
                              {item.name} ×{" "}
                              {item.quantity}
                            </span>

                            <span className="font-semibold">
                              ₹
                              {(
                                item.price *
                                item.quantity
                              ).toFixed(2)}
                            </span>

                          </div>

                        ))}

                      </div>

                      <div className="mt-4 flex justify-between border-t border-slate-200 pt-4">

                        <span className="font-bold">
                          Total
                        </span>

                        <span className="text-lg font-black">
                          ₹{cartTotal.toFixed(2)}
                        </span>

                      </div>

                    </div>

                  </div>

                </div>

                <div className="border-t border-slate-200 p-5">

                  <button
                    onClick={placeOrder}
                    disabled={placingOrder}
                    className="w-full rounded-2xl bg-[#f97316] py-4 text-sm font-black text-white disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {placingOrder
                      ? "Placing Order..."
                      : "Place Order ✓"}
                  </button>

                  <button
                    onClick={() =>
                      setOrderStep("cart")
                    }
                    disabled={placingOrder}
                    className="mt-2 w-full py-3 text-sm font-semibold text-slate-500"
                  >
                    ← Back to Cart
                  </button>

                </div>

              </>

            )}

            {/* =================================================
                SUCCESS
            ================================================= */}

            {orderStep === "success" && (

              <div className="flex h-full flex-col items-center justify-center px-6 text-center">

                <div className="flex h-20 w-20 items-center justify-center rounded-full bg-green-100 text-4xl">
                  ✓
                </div>

                <h2 className="mt-6 text-2xl font-black text-slate-900">
                  Order Placed!
                </h2>

                <p className="mt-3 text-sm leading-6 text-slate-500">
                  Your order has been successfully sent
                  to the cafe.
                </p>

                <div className="mt-6 w-full rounded-2xl bg-slate-50 p-5">

                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                    Order ID
                  </p>

                  <p className="mt-2 break-all text-sm font-bold text-slate-800">
                    {orderId}
                  </p>

                </div>

                <p className="mt-5 text-sm text-slate-500">

                  Table:{" "}

                  <span className="font-bold text-slate-900">
                    {tableNumber}
                  </span>

                </p>

                <p className="mt-1 text-lg font-black text-[#f97316]">
                  ₹{cartTotal.toFixed(2)}
                </p>

                <button
                  onClick={closeCart}
                  className="mt-8 w-full rounded-2xl bg-[#0f172a] py-4 text-sm font-black text-white"
                >
                  Back to Menu
                </button>

              </div>

            )}

          </aside>

        </div>

      )}

      {/* =====================================================
          FOOTER
      ===================================================== */}

      <footer
        className={`border-t border-slate-200 bg-white px-4 py-8 text-center ${
          cartCount > 0 ? "pb-28" : ""
        }`}
      >

        <div className="flex items-center justify-center gap-2">

          <Image
            src="/logo.jpeg"
            alt="CafeFlow"
            width={28}
            height={28}
            className="h-7 w-7 rounded-lg object-cover"
          />

          <span className="text-sm font-bold text-slate-700">
            Powered by CafeFlow
          </span>

        </div>

        <p className="mt-2 text-xs text-slate-400">
          Digital menu & customer experience platform
        </p>

      </footer>

    </main>
  );
}