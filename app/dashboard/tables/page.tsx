import Link from "next/link";

export default function TablesPage() {
  return (
    <main className="min-h-screen bg-gray-50 p-8 text-gray-900">
      <h1 className="text-2xl font-bold">Table Management</h1>
      <p className="mt-3 text-gray-600">
        Table management is not implemented yet. Existing QR tools remain available.
      </p>
      <Link className="mt-5 inline-block text-blue-600 underline" href="/dashboard/qr">
        Open QR Management
      </Link>
      <p className="mt-3">
        <Link className="text-blue-600 underline" href="/dashboard">Back to Dashboard</Link>
      </p>
    </main>
  );
}
