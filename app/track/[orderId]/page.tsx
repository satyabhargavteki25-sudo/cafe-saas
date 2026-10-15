import Link from "next/link";

type Props = {
  params: Promise<{ orderId: string }>;
};

export default async function TrackOrderPage({ params }: Props) {
  const { orderId } = await params;

  return (
    <main className="min-h-screen bg-gray-50 p-8 text-gray-900">
      <h1 className="text-2xl font-bold">Order Tracking</h1>
      <p className="mt-3 text-gray-600">
        Order tracking details are not implemented yet.
      </p>
      <p className="mt-3 text-sm text-gray-500">
        Order reference: {orderId}
      </p>
      <Link className="mt-5 inline-block text-blue-600 underline" href="/">
        Back to CafeFlow
      </Link>
    </main>
  );
}
