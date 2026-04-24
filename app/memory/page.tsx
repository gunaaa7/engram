import { EngramApp } from "@/components/EngramApp";
import { requireAuthenticatedUser } from "@/lib/supabaseAuthServer";

export default async function MemoryPage() {
  const user = await requireAuthenticatedUser();

  return (
    <main className="flex min-h-[100dvh] flex-1 overflow-hidden">
      <EngramApp userEmail={user.email ?? null} />
    </main>
  );
}
