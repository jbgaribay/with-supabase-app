"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

const GAMES = [
  { code: "red", name: "Pokémon Red", color: "text-red-600" },
  { code: "blue", name: "Pokémon Blue", color: "text-blue-600" },
  { code: "yellow", name: "Pokémon Yellow", color: "text-yellow-600" },
];

export default function NewJourneyPage() {
  const [selectedGames, setSelectedGames] = useState<string[]>([]);
  const [hostGame, setHostGame] = useState<string>("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const toggleGame = (gameCode: string) => {
    setSelectedGames((prev) => {
      const isRemoving = prev.includes(gameCode);
      const newGames = isRemoving
        ? prev.filter((g) => g !== gameCode)
        : [...prev, gameCode];
      
      // If removing the host game, clear host selection
      if (isRemoving && hostGame === gameCode) {
        setHostGame("");
      }
      
      // If this is the first game selected, auto-set as host
      if (!isRemoving && prev.length === 0) {
        setHostGame(gameCode);
      }
      
      return newGames;
    });
  };

  const handleStartJourney = async () => {
    if (selectedGames.length === 0) {
      setError("Please select at least one game");
      return;
    }

    if (!hostGame) {
      setError("Please select a host game");
      return;
    }

    if (!selectedGames.includes(hostGame)) {
      setError("Host game must be one of your selected games");
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const supabase = createClient();
      
      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      // Create journey
      const { data: journey, error: journeyError } = await supabase
        .from("journeys")
        .insert({
          user_id: user.id,
          title: "Gen 1 Journey",
          status: "in_progress",
          host_game_code: hostGame,
        })
        .select()
        .single();

      if (journeyError) throw journeyError;

      // Add selected games to journey
      const journeyGames = selectedGames.map((gameCode) => ({
        journey_id: journey.id,
        game_code: gameCode,
      }));

      const { error: gamesError } = await supabase
        .from("journey_games")
        .insert(journeyGames);

      if (gamesError) throw gamesError;

      // Redirect to the journey page
      router.push(`/protected/journey/${journey.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex-1 w-full flex items-center justify-center p-5">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Start Your Journey</CardTitle>
          <CardDescription>
            Select which Generation 1 games you'll be using to complete your Pokédex
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            <div className="space-y-3">
              <h3 className="text-sm font-medium">Select Your Games</h3>
              {GAMES.map((game) => (
                <div
                  key={game.code}
                  className="flex items-center space-x-3 p-3 border rounded-lg hover:bg-accent cursor-pointer"
                  onClick={() => toggleGame(game.code)}
                >
                  <Checkbox
                    id={game.code}
                    checked={selectedGames.includes(game.code)}
                    onCheckedChange={() => toggleGame(game.code)}
                  />
                  <label
                    htmlFor={game.code}
                    className={`text-lg font-semibold cursor-pointer ${game.color}`}
                  >
                    {game.name}
                  </label>
                </div>
              ))}
            </div>

            {selectedGames.length > 0 && (
              <div className="space-y-3">
                <h3 className="text-sm font-medium">Select Host Game</h3>
                <p className="text-xs text-muted-foreground">
                  The host game is where you want your completed Pokédex
                </p>
                <RadioGroup value={hostGame} onValueChange={setHostGame}>
                  {selectedGames.map((gameCode) => {
                    const game = GAMES.find((g) => g.code === gameCode);
                    return (
                      <div key={gameCode} className="flex items-center space-x-2">
                        <RadioGroupItem value={gameCode} id={`host-${gameCode}`} />
                        <Label htmlFor={`host-${gameCode}`} className={game?.color}>
                          {game?.name}
                        </Label>
                      </div>
                    );
                  })}
                </RadioGroup>
              </div>
            )}

            {error && <p className="text-sm text-red-500">{error}</p>}

            <Button
              onClick={handleStartJourney}
              disabled={isLoading || selectedGames.length === 0 || !hostGame}
              className="w-full"
              size="lg"
            >
              {isLoading ? "Creating Journey..." : "Start Journey"}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}