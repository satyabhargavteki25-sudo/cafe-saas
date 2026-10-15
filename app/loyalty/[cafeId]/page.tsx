import Link from "next/link";

type Props = {
  params: Promise<{ cafeId: string }>;
};

export default async function CustomerLoyaltyPage({ params }: Props) {
  const { cafeId } = await params;

  return (
    <main className="min-h-screen bg-gray-50 p-8 text-gray-900">
      <h1 className="text-2xl font-bold">Customer Loyalty</h1>
      <p className="mt-3 text-gray-600">
        The customer loyalty wallet is not implemented yet.
      </p>
      <Link
        className="mt-5 inline-block text-blue-600 underline"
        href={`/c/${encodeURIComponent(cafeId)}`}
      >
        Open Cafe Feedback
      </Link>
    </main>
  );
}
