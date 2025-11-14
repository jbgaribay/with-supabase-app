import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { PokedexGrid } from "@/components/pokedex-grid";

export default async function JourneyPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const supabase = await createClient();
  const { id } = await params;

  // Check authentication
  const { data, error } = await supabase.auth.getClaims();
  if (error || !data?.claims) {
    redirect("/auth/login");
  }

  // Get journey details
  const { data: journey, error: journeyError } = await supabase
    .from("journeys")
    .select("*, journey_games(game_code)")
    .eq("id", id)
    .eq("user_id", data.claims.sub)
    .single();

  if (journeyError || !journey) {
    redirect("/protected");
  }

  // Get caught Pokémon for this journey
  const { data: caughtPokemon } = await supabase
    .from("caught_pokemon")
    .select("pokemon_id")
    .eq("journey_id", id);

  const caughtIds = new Set(caughtPokemon?.map((p) => p.pokemon_id) || []);

  return (
    <div className="flex-1 w-full p-5">
      <div className="max-w-7xl mx-auto">
        <div className="mb-6">
          <h1 className="text-3xl font-bold mb-2">{journey.title}</h1>
          <p className="text-muted-foreground">
            Host Game: <span className="font-semibold capitalize">{journey.host_game_code}</span>
          </p>
          <p className="text-sm text-muted-foreground">
            Games: {journey.journey_games.map((g: any) => g.game_code).join(", ")}
          </p>
        </div>
        
        <PokedexGrid 
          caughtPokemonIds={caughtIds} 
          journeyId={id}
          journeyGames={journey.journey_games.map((g: any) => g.game_code)}
        />
      </div>
    </div>
  );
}