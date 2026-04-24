import { HomePage } from "@/components/HomePage";
import { isPublicSignupEnabled } from "@/lib/authConfig";
import { getAuthenticatedUser } from "@/lib/supabaseAuthServer";

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<{ auth?: string }>;
}) {
  const user = await getAuthenticatedUser();
  const resolvedSearchParams = await searchParams;

  return (
    <HomePage
      allowPublicSignup={isPublicSignupEnabled()}
      isAuthenticated={Boolean(user)}
      openAuthOnLoad={resolvedSearchParams.auth === "1"}
    />
  );
}
