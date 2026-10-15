import Link from "next/link";

export default function SettingsPage() {
  return (
    <main className="min-h-screen bg-gray-50 p-8 text-gray-900">
      <h1 className="text-2xl font-bold">Settings</h1>
      <p className="mt-3 text-gray-600">
        Manage your cafe settings from the CafeFlow cafe settings page.
      </p>
      <Link className="mt-5 inline-block text-blue-600 underline" href="/dashboard/cafe">
        Open Cafe Settings
      </Link>
      <p className="mt-3">
        <Link className="text-blue-600 underline" href="/dashboard">Back to Dashboard</Link>
      </p>
    </main>
  );
}
