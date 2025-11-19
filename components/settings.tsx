"use client";

import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";

interface SettingsProps {
  journeyId: string;
  currentGames: string[];
  onGamesUpdate: (newGames: string[]) => void;
}

const AVAILABLE_GAMES = [
  // Gen 1
  { code: "red", name: "Red", generation: 1, color: "text-red-500" },
  { code: "blue", name: "Blue", generation: 1, color: "text-blue-500" },
  { code: "yellow", name: "Yellow", generation: 1, color: "text-yellow-500" },
  // Gen 2
  { code: "gold", name: "Gold", generation: 2, color: "text-yellow-600" },
  { code: "silver", name: "Silver", generation: 2, color: "text-gray-400" },
  { code: "crystal", name: "Crystal", generation: 2, color: "text-cyan-400" },
];

export function Settings({ journeyId, currentGames, onGamesUpdate }: SettingsProps) {
  const [selectedGames, setSelectedGames] = useState<string[]>(currentGames);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const toggleGame = (gameCode: string) => {
    setSelectedGames((prev) => {
      if (prev.includes(gameCode)) {
        return prev.filter((g) => g !== gameCode);
      } else {
        return [...prev, gameCode];
      }
    });
    setSuccessMessage(null);
    setError(null);
  };

  const handleSave = async () => {
    if (selectedGames.length === 0) {
      setError("You must select at least one game");
      return;
    }

    setIsSaving(true);
    setError(null);
    setSuccessMessage(null);

    const supabase = createClient();

    try {
      // First, delete all existing journey_games entries
      const { error: deleteError } = await supabase
        .from("journey_games")
        .delete()
        .eq("journey_id", journeyId);

      if (deleteError) throw deleteError;

      // Then insert the new selections
      const gamesToInsert = selectedGames.map((gameCode) => ({
        journey_id: journeyId,
        game_code: gameCode,
      }));

      const { error: insertError } = await supabase
        .from("journey_games")
        .insert(gamesToInsert);

      if (insertError) throw insertError;

      setSuccessMessage("Games updated successfully!");
      onGamesUpdate(selectedGames);
    } catch (err: any) {
      setError(err.message || "Failed to update games");
      console.error("Error updating games:", err);
    } finally {
      setIsSaving(false);
    }
  };

  const hasChanges = JSON.stringify(selectedGames.sort()) !== JSON.stringify(currentGames.sort());

  // Group games by generation
  const gen1Games = AVAILABLE_GAMES.filter((g) => g.generation === 1);
  const gen2Games = AVAILABLE_GAMES.filter((g) => g.generation === 2);

  return (
    <div className="max-w-2xl">
      <Card>
        <CardHeader>
          <CardTitle>Journey Settings</CardTitle>
          <CardDescription>
            Add or remove games from your journey. Your Pokédex will automatically update to include Pokémon from the selected generations.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Generation 1 */}
          <div className="space-y-3">
            <h3 className="text-sm font-semibold">Generation 1</h3>
            <div className="space-y-2">
              {gen1Games.map((game) => (
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
          </div>

          {/* Generation 2 */}
          <div className="space-y-3">
            <h3 className="text-sm font-semibold">Generation 2</h3>
            <div className="space-y-2">
              {gen2Games.map((game) => (
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
          </div>

          {/* Messages */}
          {error && <p className="text-sm text-red-500">{error}</p>}
          {successMessage && <p className="text-sm text-green-500">{successMessage}</p>}

          {/* Save Button */}
          <Button
            onClick={handleSave}
            disabled={isSaving || !hasChanges}
            className="w-full"
            size="lg"
          >
            {isSaving ? "Saving..." : "Save Changes"}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}