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

interface EvolutionInfo {
  fromPokemon: string;
  fromPokemonId: number;
  method: string;
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
  const [evolutionInfo, setEvolutionInfo] = useState<EvolutionInfo | null>(null);
  const [loading, setLoading] = useState(false);
  const [toggling, setToggling] = useState(false);
  const [targeting, setTargeting] = useState(false);

  useEffect(() => {
    if (isOpen && pokemonId) {
      fetchLocations();
      fetchEvolutionInfo();
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

  const fetchEvolutionInfo = async () => {
    try {
      // First get pokemon species to get evolution chain URL
      const speciesResponse = await fetch(
        `https://pokeapi.co/api/v2/pokemon-species/${pokemonId}`
      );
      const speciesData = await speciesResponse.json();

      // Then get evolution chain
      const evolutionResponse = await fetch(speciesData.evolution_chain.url);
      const evolutionData = await evolutionResponse.json();

      // Find this pokemon in the evolution chain
      const findEvolutionDetails = (chain: any): EvolutionInfo | null => {
        // Check if this chain entry evolves TO our pokemon
        if (chain.evolves_to) {
          for (const evolution of chain.evolves_to) {
            if (evolution.species.name === pokemonName) {
              // Found it! Get the evolution details
              const detail = evolution.evolution_details[0];
              const fromPokemonName = chain.species.name;
              const fromPokemonId = parseInt(chain.species.url.split("/").slice(-2, -1)[0]);

              let method = "";

              if (detail.min_level) {
                method = `Level ${detail.min_level}`;
              } else if (detail.item) {
                const itemName = detail.item.name
                  .split("-")
                  .map((word: string) => word.charAt(0).toUpperCase() + word.slice(1))
                  .join(" ");
                method = `Use ${itemName}`;
              } else if (detail.trigger.name === "trade") {
                if (detail.held_item) {
                  const itemName = detail.held_item.name
                    .split("-")
                    .map((word: string) => word.charAt(0).toUpperCase() + word.slice(1))
                    .join(" ");
                  method = `Trade while holding ${itemName}`;
                } else {
                  method = "Trade";
                }
              } else if (detail.trigger.name === "use-item") {
                const itemName = detail.item.name
                  .split("-")
                  .map((word: string) => word.charAt(0).toUpperCase() + word.slice(1))
                  .join(" ");
                method = `Use ${itemName}`;
              }

              return {
                fromPokemon: fromPokemonName,
                fromPokemonId,
                method,
              };
            }

            // Recursively check deeper in the chain
            const result = findEvolutionDetails(evolution);
            if (result) return result;
          }
        }

        return null;
      };

      const evolInfo = findEvolutionDetails(evolutionData.chain);
      setEvolutionInfo(evolInfo);
    } catch (error) {
      console.error("Error fetching evolution info:", error);
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
            ) : (
              <div className="space-y-4">
                {/* If no encounters but has evolution info */}
                {locations.length === 0 && evolutionInfo && (
                  <div className="border-2 border-primary rounded-lg p-3 space-y-1 bg-primary/5">
                    <p className="font-semibold text-primary mb-2">Evolution Only</p>
                    <p className="text-sm">
                      Evolve from{" "}
                      <span className="font-semibold capitalize">{evolutionInfo.fromPokemon}</span>
                      {" "}#{evolutionInfo.fromPokemonId.toString().padStart(3, "0")}
                    </p>
                    <p className="text-sm font-medium">{evolutionInfo.method}</p>
                  </div>
                )}

                {/* If no encounters and no evolution info */}
                {locations.length === 0 && !evolutionInfo && (
                  <p className="text-sm text-muted-foreground">
                    Not available in your selected games, or only obtainable through special events.
                  </p>
                )}

                {/* If has encounters */}
                {locations.length > 0 && (
                  <>
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

                    {/* Evolution Alternative */}
                    {evolutionInfo && (
                      <div>
                        <h4 className="text-sm font-semibold mb-2">Alternative: Evolution</h4>
                        <div className="border rounded-lg p-3 space-y-1 bg-muted/30">
                          <p className="text-sm">
                            Evolve from{" "}
                            <span className="font-semibold capitalize">{evolutionInfo.fromPokemon}</span>
                            {" "}#{evolutionInfo.fromPokemonId.toString().padStart(3, "0")}
                          </p>
                          <p className="text-sm font-medium">{evolutionInfo.method}</p>
                        </div>
                      </div>
                    )}
                  </>
                )}
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}