"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";

interface PokemonCardProps {
  pokemonId: number;
  pokemonName: string;
  sprite: string;
  isOpen: boolean;
  onClose: () => void;
  isCaught: boolean;
  journeyId: string;
  journeyGames: string[];
  onCatchToggle: (pokemonId: number, newCaughtState: boolean) => void;
  isTargeted: boolean;
  onTargetToggle: (pokemonId: number, pokemonName: string, sprite: string, recommendedLocation: string) => void;
}

interface EncounterLocation {
  locationArea: string;
  methods: string[];
  games: string[];
  maxEncounterRate: number;
}

export function PokemonCard({
  pokemonId,
  pokemonName,
  sprite,
  isOpen,
  onClose,
  isCaught,
  journeyId,
  journeyGames,
  onCatchToggle,
  isTargeted,
  onTargetToggle,
}: PokemonCardProps) {
  const [locations, setLocations] = useState<EncounterLocation[]>([]);
  const [loading, setLoading] = useState(false);
  const [toggling, setToggling] = useState(false);
  const [targeting, setTargeting] = useState(false);

  useEffect(() => {
    if (isOpen && pokemonId) {
      fetchLocations();
    }
  }, [isOpen, pokemonId]);

  const fetchLocations = async () => {
    setLoading(true);
    try {
      const response = await fetch(
        `https://pokeapi.co/api/v2/pokemon/${pokemonId}/encounters`
      );
      const data = await response.json();

      // Filter and format locations for journey games
      const filteredLocations: EncounterLocation[] = [];
      
      data.forEach((encounter: any) => {
        const locationName = encounter.location_area.name
          .split("-")
          .join(" ")
          .replace(/\b\w/g, (l: string) => l.toUpperCase());

        const relevantVersions = encounter.version_details.filter((vd: any) =>
          journeyGames.includes(vd.version.name)
        );

        if (relevantVersions.length > 0) {
          const methods = [
            ...new Set(
              relevantVersions.flatMap((vd: any) =>
                vd.encounter_details.map((ed: any) => ed.method.name)
              )
            ),
          ];

          const games = [
            ...new Set(relevantVersions.map((vd: any) => vd.version.name)),
          ];

          // Calculate max encounter rate across all versions and methods for this location
          const maxEncounterRate = Math.max(
            ...relevantVersions.flatMap((vd: any) =>
              vd.encounter_details.map((ed: any) => ed.chance)
            )
          );

          filteredLocations.push({
            locationArea: locationName,
            methods,
            games,
            maxEncounterRate,
          });
        }
      });

      // Sort by encounter rate (highest first)
      filteredLocations.sort((a, b) => b.maxEncounterRate - a.maxEncounterRate);

      setLocations(filteredLocations);
    } catch (error) {
      console.error("Error fetching locations:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleCatchToggle = async () => {
    setToggling(true);
    const supabase = createClient();

    try {
      if (isCaught) {
        // Uncatch - delete from database
        const { error } = await supabase
          .from("caught_pokemon")
          .delete()
          .eq("journey_id", journeyId)
          .eq("pokemon_id", pokemonId);

        if (!error) {
          onCatchToggle(pokemonId, false);
        }
      } else {
        // Catch - insert into database
        const { error } = await supabase
          .from("caught_pokemon")
          .insert({
            journey_id: journeyId,
            pokemon_id: pokemonId,
          });

        if (!error) {
          onCatchToggle(pokemonId, true);
        }
      }
    } catch (error) {
      console.error("Error toggling catch status:", error);
    } finally {
      setToggling(false);
    }
  };

  const handleTargetToggle = async () => {
    setTargeting(true);
    const supabase = createClient();

    try {
      if (isTargeted) {
        // Untarget - delete from database
        const { error } = await supabase
          .from("targeted_pokemon")
          .delete()
          .eq("journey_id", journeyId)
          .eq("pokemon_id", pokemonId);

        if (!error) {
          onTargetToggle(pokemonId, pokemonName, sprite, "");
        }
      } else {
        // Target - insert into database with recommended location
        const recommendedLocation = locations.length > 0 ? locations[0].locationArea : "";
        
        const { error } = await supabase
          .from("targeted_pokemon")
          .insert({
            journey_id: journeyId,
            pokemon_id: pokemonId,
            selected_location: recommendedLocation,
          });

        if (!error) {
          onTargetToggle(pokemonId, pokemonName, sprite, recommendedLocation);
        }
      }
    } catch (error) {
      console.error("Error toggling target status:", error);
    } finally {
      setTargeting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="capitalize text-2xl">
            {pokemonName} #{pokemonId.toString().padStart(3, "0")}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          <div className="flex items-center justify-center">
            {sprite && (
              <Image
                src={sprite}
                alt={pokemonName}
                width={112}
                height={112}
                className="pixelated"
                style={{ opacity: isCaught ? 1 : 0.6 }}
                unoptimized
              />
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Button
              onClick={handleCatchToggle}
              disabled={toggling}
              variant={isCaught ? "outline" : "default"}
            >
              {toggling
                ? "Updating..."
                : isCaught
                ? "Mark as Uncaught"
                : "Mark as Caught"}
            </Button>

            <Button
              onClick={handleTargetToggle}
              disabled={targeting || loading}
              variant={isTargeted ? "destructive" : "secondary"}
            >
              {targeting
                ? "Updating..."
                : isTargeted
                ? "Remove Target"
                : "Target"}
            </Button>
          </div>

          <div>
            <h3 className="font-semibold text-lg mb-3">Where to Find</h3>
            {loading ? (
              <p className="text-sm text-muted-foreground">Loading locations...</p>
            ) : locations.length > 0 ? (
              <div className="space-y-4">
                {/* Recommended Location */}
                <div>
                  <h4 className="text-sm font-semibold text-primary mb-2">
                    ⭐ Recommended Location
                  </h4>
                  <div className="border-2 border-primary rounded-lg p-3 space-y-1 bg-primary/5">
                    <p className="font-medium">{locations[0].locationArea}</p>
                    <p className="text-sm text-muted-foreground">
                      Games: {locations[0].games.map(g => g.charAt(0).toUpperCase() + g.slice(1)).join(", ")}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Methods: {locations[0].methods.map(m => m.split("-").join(" ")).join(", ")}
                    </p>
                    <p className="text-sm font-semibold text-primary">
                      Encounter Rate: {locations[0].maxEncounterRate}%
                    </p>
                  </div>
                </div>

                {/* Other Locations */}
                {locations.length > 1 && (
                  <div>
                    <h4 className="text-sm font-semibold mb-2">Other Locations</h4>
                    <div className="space-y-3">
                      {locations.slice(1).map((loc, idx) => (
                        <div
                          key={idx}
                          className="border rounded-lg p-3 space-y-1"
                        >
                          <p className="font-medium">{loc.locationArea}</p>
                          <p className="text-sm text-muted-foreground">
                            Games: {loc.games.map(g => g.charAt(0).toUpperCase() + g.slice(1)).join(", ")}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            Methods: {loc.methods.map(m => m.split("-").join(" ")).join(", ")}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            Encounter Rate: {loc.maxEncounterRate}%
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                Not available in your selected games, or only obtainable through evolution/trading.
              </p>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}