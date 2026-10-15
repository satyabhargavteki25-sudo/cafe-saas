import { NextRequest, NextResponse } from "next/server";
import { getApps, initializeApp, cert } from "firebase-admin/app";
import {
  getFirestore,
  FieldValue,
} from "firebase-admin/firestore";
import { getAuth } from "firebase-admin/auth";

function getAdminApp() {
  if (getApps().length > 0) {
    return getApps()[0];
  }

  const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(
    /\\n/g,
    "\n"
  );

  if (
    !process.env.FIREBASE_PROJECT_ID ||
    !process.env.FIREBASE_CLIENT_EMAIL ||
    !privateKey
  ) {
    throw new Error(
      "Firebase Admin environment variables are missing."
    );
  }

  return initializeApp({
    credential: cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey,
    }),
  });
}

export async function POST(request: NextRequest) {
  try {
    const adminApp = getAdminApp();

    const adminAuth = getAuth(adminApp);
    const db = getFirestore(adminApp);

    // =========================================================
    // AUTHENTICATION
    // =========================================================

    const authorization =
      request.headers.get("authorization");

    if (!authorization?.startsWith("Bearer ")) {
      return NextResponse.json(
        {
          success: false,
          message: "Authentication required.",
        },
        {
          status: 401,
        }
      );
    }

    const idToken = authorization.substring(7);

    const decodedToken =
      await adminAuth.verifyIdToken(idToken);

    const ownerId = decodedToken.uid;

    // =========================================================
    // REQUEST DATA
    // =========================================================

    const body = await request.json();

    const orderId = body.orderId;

    if (!orderId || typeof orderId !== "string") {
      return NextResponse.json(
        {
          success: false,
          message: "Order ID is required.",
        },
        {
          status: 400,
        }
      );
    }

    // =========================================================
    // GET ORDER
    // =========================================================

    const orderRef =
      db.collection("orders").doc(orderId);

    const orderSnapshot =
      await orderRef.get();

    if (!orderSnapshot.exists) {
      return NextResponse.json(
        {
          success: false,
          message: "Order not found.",
        },
        {
          status: 404,
        }
      );
    }

    const order = orderSnapshot.data();

    if (!order) {
      return NextResponse.json(
        {
          success: false,
          message: "Order data is missing.",
        },
        {
          status: 404,
        }
      );
    }

    // =========================================================
    // OWNER CHECK
    // =========================================================

    if (order.ownerId !== ownerId) {
      return NextResponse.json(
        {
          success: false,
          message:
            "You are not authorized to process this order.",
        },
        {
          status: 403,
        }
      );
    }

    // =========================================================
    // STATUS CHECK
    // =========================================================

    if (
      order.status !== "completed" ||
      order.paymentStatus !== "paid"
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Loyalty points can only be awarded for completed and paid orders.",
        },
        {
          status: 400,
        }
      );
    }

    // =========================================================
    // DUPLICATE PROTECTION
    // =========================================================

    if (order.loyaltyProcessed === true) {
      return NextResponse.json({
        success: true,
        alreadyProcessed: true,
        pointsAwarded:
          order.loyaltyPointsAwarded || 0,
        message:
          "Loyalty points were already awarded for this order.",
      });
    }

    // =========================================================
    // VALIDATE ORDER
    // =========================================================

    const cafeId = order.cafeId;
    const customerName = order.customerName;
    const customerPhone = order.customerPhone;
    const total = Number(order.total);

    if (
      typeof cafeId !== "string" ||
      typeof customerName !== "string" ||
      typeof customerPhone !== "string" ||
      !Number.isFinite(total) ||
      total <= 0
    ) {
      return NextResponse.json(
        {
          success: false,
          message: "Invalid order data.",
        },
        {
          status: 400,
        }
      );
    }

    // =========================================================
    // LOYALTY CALCULATION
    //
    // ₹100 = 10 points
    // ₹10 = 1 point
    // =========================================================

    const pointsEarned = Math.floor(total / 10);

    if (pointsEarned <= 0) {
      return NextResponse.json(
        {
          success: false,
          message:
            "This order does not earn loyalty points.",
        },
        {
          status: 400,
        }
      );
    }

    // =========================================================
    // CUSTOMER ID
    // =========================================================

    const customerId =
      `${cafeId}_${customerPhone}`;

    const customerRef =
      db
        .collection("loyaltyCustomers")
        .doc(customerId);

    // =========================================================
    // FIRESTORE TRANSACTION
    // =========================================================

    await db.runTransaction(async (transaction) => {
      const latestOrderSnapshot =
        await transaction.get(orderRef);

      const latestOrder =
        latestOrderSnapshot.data();

      if (!latestOrder) {
        throw new Error(
          "Order no longer exists."
        );
      }

      // Double protection against duplicate points.
      if (latestOrder.loyaltyProcessed === true) {
        return;
      }

      const customerSnapshot =
        await transaction.get(customerRef);

      // =======================================================
      // EXISTING CUSTOMER
      // =======================================================

      if (customerSnapshot.exists) {
        const customer =
          customerSnapshot.data() || {};

        const currentPoints =
          Number(customer.points || 0);

        const lifetimePoints =
          Number(
            customer.lifetimePoints || 0
          );

        const lifetimeSpent =
          Number(
            customer.lifetimeSpent || 0
          );

        const totalOrders =
          Number(
            customer.totalOrders || 0
          );

        const newPoints =
          currentPoints + pointsEarned;

        const newLifetimePoints =
          lifetimePoints + pointsEarned;

        const newLifetimeSpent =
          lifetimeSpent + total;

        const newTotalOrders =
          totalOrders + 1;

        let tier = "Bronze";

        if (newPoints >= 500) {
          tier = "Gold";
        } else if (newPoints >= 200) {
          tier = "Silver";
        }

        transaction.update(
          customerRef,
          {
            cafeId,
            customerName,
            phone: customerPhone,

            points: newPoints,

            lifetimePoints:
              newLifetimePoints,

            lifetimeSpent:
              newLifetimeSpent,

            totalOrders:
              newTotalOrders,

            tier,

            updatedAt:
              FieldValue.serverTimestamp(),
          }
        );
      }

      // =======================================================
      // NEW CUSTOMER
      // =======================================================

      else {
        let tier = "Bronze";

        if (pointsEarned >= 500) {
          tier = "Gold";
        } else if (pointsEarned >= 200) {
          tier = "Silver";
        }

        transaction.set(
          customerRef,
          {
            cafeId,

            customerName,

            phone: customerPhone,

            points: pointsEarned,

            lifetimePoints:
              pointsEarned,

            lifetimeSpent:
              total,

            totalOrders: 1,

            tier,

            createdAt:
              FieldValue.serverTimestamp(),

            updatedAt:
              FieldValue.serverTimestamp(),
          }
        );
      }

      // =======================================================
      // MARK ORDER AS PROCESSED
      // =======================================================

      transaction.update(
        orderRef,
        {
          loyaltyProcessed: true,

          loyaltyPointsAwarded:
            pointsEarned,

          loyaltyProcessedAt:
            FieldValue.serverTimestamp(),
        }
      );
    });

    return NextResponse.json({
      success: true,

      alreadyProcessed: false,

      pointsAwarded:
        pointsEarned,

      customerId,

      message:
        `${pointsEarned} loyalty points awarded successfully.`,
    });
  } catch (error) {
    console.error(
      "LOYALTY PROCESSING ERROR:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        message:
          "Unable to process loyalty points.",
      },
      {
        status: 500,
      }
    );
  }
}