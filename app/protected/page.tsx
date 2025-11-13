import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Button } from "@/components/ui/button";
import Link from "next/link";

export default async function ProtectedPage() {
  const supabase = await createClient();

  const { data, error } = await supabase.auth.getClaims();
  if (error || !data?.claims) {
    redirect("/auth/login");
  }

  // Check if user has any existing journeys
  const { data: journeys } = await supabase
    .from("journeys")
    .select("id, status")
    .eq("user_id", data.claims.sub)
    .order("updated_at", { ascending: false });

  const hasJourneys = journeys && journeys.length > 0;
  const activeJourney = journeys?.find((j) => j.status === "in_progress");

  return (
    <div className="flex-1 w-full flex items-center justify-center">
      <div className="flex flex-col gap-4 items-center">
        <h1 className="text-3xl font-bold mb-4">Welcome to Your Journey</h1>
        
        <div className="flex flex-col gap-3 w-64">
          <Button asChild size="lg" className="w-full">
            <Link href="/protected/journey/new">Start New Journey</Link>
          </Button>
          
          {hasJourneys && activeJourney && (
            <Button asChild size="lg" variant="outline" className="w-full">
              <Link href={`/protected/journey/${activeJourney.id}`}>
                Continue Journey
              </Link>
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}