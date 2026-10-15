import Link from "next/link";

export default function StaffPage() {
  return (
    <main className="min-h-screen bg-gray-50 p-8 text-gray-900">
      <h1 className="text-2xl font-bold">Staff Management</h1>
      <p className="mt-3 text-gray-600">
        Staff management is not implemented yet.
      </p>
      <Link className="mt-5 inline-block text-blue-600 underline" href="/dashboard">
        Back to Dashboard
      </Link>
    </main>
  );
}
