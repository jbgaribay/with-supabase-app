"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { X } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface TargetedPokemon {
  id: string;
  pokemon_id: number;
  pokemon_name: string;
  sprite: string;
  selected_location: string;
  available_locations: string[];
}

interface TargetedPokemonListProps {
  journeyId: string;
  journeyGames: string[];
}

export function TargetedPokemonList({ journeyId, journeyGames }: TargetedPokemonListProps) {
  const [targets, setTargets] = useState<TargetedPokemon[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchTargets();
  }, [journeyId]);

  const fetchTargets = async () => {
    setLoading(true);
    const supabase = createClient();

    try {
      const { data, error } = await supabase
        .from("targeted_pokemon")
        .select("*")
        .eq("journey_id", journeyId)
        .order("created_at", { ascending: true });

      if (error) throw error;

      // Fetch pokemon details and locations for each target
      const targetsWithDetails = await Promise.all(
        (data || []).map(async (target) => {
          // Fetch pokemon basic info
          const pokemonResponse = await fetch(
            `https://pokeapi.co/api/v2/pokemon/${target.pokemon_id}`
          );
          const pokemonData = await pokemonResponse.json();

          // Fetch encounter locations
          const encountersResponse = await fetch(
            `https://pokeapi.co/api/v2/pokemon/${target.pokemon_id}/encounters`
          );
          const encountersData = await encountersResponse.json();

          // Filter locations for journey games
          const availableLocations: string[] = [];
          encountersData.forEach((encounter: any) => {
            const locationName = encounter.location_area.name
              .split("-")
              .join(" ")
              .replace(/\b\w/g, (l: string) => l.toUpperCase());

            const relevantVersions = encounter.version_details.filter((vd: any) =>
              journeyGames.includes(vd.version.name)
            );

            if (relevantVersions.length > 0 && !availableLocations.includes(locationName)) {
              availableLocations.push(locationName);
            }
          });

          return {
            id: target.id,
            pokemon_id: target.pokemon_id,
            pokemon_name: pokemonData.name,
            sprite: pokemonData.sprites.versions["generation-i"]["red-blue"].front_transparent,
            selected_location: target.selected_location || availableLocations[0] || "Unknown",
            available_locations: availableLocations,
          };
        })
      );

      setTargets(targetsWithDetails);
    } catch (error) {
      console.error("Error fetching targets:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveTarget = async (targetId: string) => {
    const supabase = createClient();
    const { error } = await supabase
      .from("targeted_pokemon")
      .delete()
      .eq("id", targetId);

    if (!error) {
      setTargets((prev) => prev.filter((t) => t.id !== targetId));
    }
  };

  const handleLocationChange = async (targetId: string, newLocation: string) => {
    const supabase = createClient();
    const { error } = await supabase
      .from("targeted_pokemon")
      .update({ selected_location: newLocation })
      .eq("id", targetId);

    if (!error) {
      setTargets((prev) =>
        prev.map((t) =>
          t.id === targetId ? { ...t, selected_location: newLocation } : t
        )
      );
    }
  };

  if (loading) {
    return (
      <div className="w-80 border-l pl-4">
        <h2 className="text-lg font-semibold mb-4">Targets</h2>
        <p className="text-sm text-muted-foreground">Loading targets...</p>
      </div>
    );
  }

  if (targets.length === 0) {
    return (
      <div className="w-80 border-l pl-4">
        <h2 className="text-lg font-semibold mb-4">Targets</h2>
        <p className="text-sm text-muted-foreground">
          No Pokémon targeted yet. Click on a Pokémon and press "Target" to add it here.
        </p>
      </div>
    );
  }

  return (
    <div className="w-80 border-l pl-4">
      <h2 className="text-lg font-semibold mb-4">Targets ({targets.length})</h2>
      <div className="space-y-3">
        {targets.map((target) => (
          <div
            key={target.id}
            className="border rounded-lg p-3 space-y-2 bg-card"
          >
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-2">
                <Image
                  src={target.sprite}
                  alt={target.pokemon_name}
                  width={40}
                  height={40}
                  className="pixelated"
                  unoptimized
                />
                <div>
                  <p className="font-medium capitalize text-sm">
                    {target.pokemon_name}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    #{target.pokemon_id.toString().padStart(3, "0")}
                  </p>
                </div>
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6"
                onClick={() => handleRemoveTarget(target.id)}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>

            {target.available_locations.length > 0 ? (
              <Select
                value={target.selected_location}
                onValueChange={(value) => handleLocationChange(target.id, value)}
              >
                <SelectTrigger className="w-full text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {target.available_locations.map((loc) => (
                    <SelectItem key={loc} value={loc} className="text-xs">
                      {loc}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : (
              <p className="text-xs text-muted-foreground">
                Evolution/Trading only
              </p>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}