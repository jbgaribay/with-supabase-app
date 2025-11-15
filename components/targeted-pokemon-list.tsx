"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { X, Check } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface LocationDetails {
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

interface TargetedPokemon {
  id: string;
  pokemon_id: number;
  pokemon_name: string;
  sprite: string;
  selected_location: string;
  available_locations: LocationDetails[];
  selectedLocationDetails: LocationDetails | null;
  evolutionInfo: EvolutionInfo | null;
}

interface TargetedPokemonListProps {
  journeyId: string;
  journeyGames: string[];
  caughtPokemonIds?: Set<number>;
  onCatchToggle?: (pokemonId: number, newCaughtState: boolean) => void;
  onTargetRemove?: (pokemonId: number) => void;
}

export function TargetedPokemonList({ journeyId, journeyGames, caughtPokemonIds = new Set(), onCatchToggle, onTargetRemove }: TargetedPokemonListProps) {
  const [targets, setTargets] = useState<TargetedPokemon[]>([]);
  const [loading, setLoading] = useState(true);
  const [locationDialogOpen, setLocationDialogOpen] = useState(false);
  const [selectedTarget, setSelectedTarget] = useState<TargetedPokemon | null>(null);
  const [caught, setCaught] = useState(caughtPokemonIds);

  // Sync local caught state with props when they change
  useEffect(() => {
    setCaught(caughtPokemonIds);
  }, [caughtPokemonIds]);

  useEffect(() => {
    fetchTargets();
    
    // Refetch when window gains focus (catches updates from modal)
    const handleFocus = () => fetchTargets();
    window.addEventListener('focus', handleFocus);
    
    return () => {
      window.removeEventListener('focus', handleFocus);
    };
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
          const availableLocations: LocationDetails[] = [];
          encountersData.forEach((encounter: any) => {
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

              const maxEncounterRate = Math.max(
                ...relevantVersions.flatMap((vd: any) =>
                  vd.encounter_details.map((ed: any) => ed.chance)
                )
              );

              // Check if location already exists (avoid duplicates)
              if (!availableLocations.find(loc => loc.locationArea === locationName)) {
                availableLocations.push({
                  locationArea: locationName,
                  methods,
                  games,
                  maxEncounterRate,
                });
              }
            }
          });

          // Sort by encounter rate
          availableLocations.sort((a, b) => b.maxEncounterRate - a.maxEncounterRate);

          // Fetch evolution info
          let evolutionInfo: EvolutionInfo | null = null;
          try {
            const speciesResponse = await fetch(
              `https://pokeapi.co/api/v2/pokemon-species/${target.pokemon_id}`
            );
            const speciesData = await speciesResponse.json();

            const evolutionResponse = await fetch(speciesData.evolution_chain.url);
            const evolutionData = await evolutionResponse.json();

            const findEvolutionDetails = (chain: any): EvolutionInfo | null => {
              if (chain.evolves_to) {
                for (const evolution of chain.evolves_to) {
                  if (evolution.species.name === pokemonData.name) {
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

                  const result = findEvolutionDetails(evolution);
                  if (result) return result;
                }
              }

              return null;
            };

            evolutionInfo = findEvolutionDetails(evolutionData.chain);
          } catch (error) {
            console.error("Error fetching evolution info:", error);
          }

          // Find the selected location details
          const selectedLocationDetails = availableLocations.find(
            loc => loc.locationArea === target.selected_location
          ) || availableLocations[0] || null;

          return {
            id: target.id,
            pokemon_id: target.pokemon_id,
            pokemon_name: pokemonData.name,
            sprite: pokemonData.sprites.versions["generation-i"]["red-blue"].front_transparent,
            selected_location: target.selected_location || availableLocations[0]?.locationArea || "Evolution",
            available_locations: availableLocations,
            selectedLocationDetails,
            evolutionInfo,
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

  const handleRemoveTarget = async (targetId: string, pokemonId: number) => {
    const supabase = createClient();
    const { error } = await supabase
      .from("targeted_pokemon")
      .delete()
      .eq("id", targetId);

    if (!error) {
      setTargets((prev) => prev.filter((t) => t.id !== targetId));
      onTargetRemove?.(pokemonId);
    }
  };

  const handleCatchToggle = async (pokemonId: number) => {
    const supabase = createClient();
    const isCaught = caught.has(pokemonId);

    try {
      if (isCaught) {
        // Uncatch
        const { error } = await supabase
          .from("caught_pokemon")
          .delete()
          .eq("journey_id", journeyId)
          .eq("pokemon_id", pokemonId);

        if (!error) {
          setCaught((prev) => {
            const newSet = new Set(prev);
            newSet.delete(pokemonId);
            return newSet;
          });
          onCatchToggle?.(pokemonId, false);
        }
      } else {
        // Catch
        const { error } = await supabase
          .from("caught_pokemon")
          .insert({
            journey_id: journeyId,
            pokemon_id: pokemonId,
          });

        if (!error) {
          setCaught((prev) => new Set([...prev, pokemonId]));
          onCatchToggle?.(pokemonId, true);
        }
      }
    } catch (error) {
      console.error("Error toggling catch status:", error);
    }
  };

  const handleLocationChange = async (targetId: string, newLocation: string, newLocationDetails?: LocationDetails) => {
    const supabase = createClient();
    const { error } = await supabase
      .from("targeted_pokemon")
      .update({ selected_location: newLocation })
      .eq("id", targetId);

    if (!error) {
      setTargets((prev) =>
        prev.map((t) =>
          t.id === targetId 
            ? { 
                ...t, 
                selected_location: newLocation,
                selectedLocationDetails: newLocationDetails || null
              } 
            : t
        )
      );
      setLocationDialogOpen(false);
    }
  };

  if (loading) {
    return (
      <div className="w-80 border-l pl-4 flex flex-col h-full">
        <h2 className="text-lg font-semibold mb-4">Targets</h2>
        <p className="text-sm text-muted-foreground">Loading targets...</p>
      </div>
    );
  }

  if (targets.length === 0) {
    return (
      <div className="w-80 border-l pl-4 flex flex-col h-full">
        <h2 className="text-lg font-semibold mb-4">Targets</h2>
        <p className="text-sm text-muted-foreground">
          No Pokémon targeted yet. Click on a Pokémon and press "Target" to add it here.
        </p>
      </div>
    );
  }

  return (
    <div className="w-80 border-l pl-4 flex flex-col h-full">
      <h2 className="text-lg font-semibold mb-4 flex-shrink-0">Targets ({targets.length})</h2>
      <div className="space-y-3 overflow-y-auto pr-2 flex-1">
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
              <div className="flex gap-1">
                <Button
                  variant="ghost"
                  size="icon"
                  className={`h-6 w-6 ${caught.has(target.pokemon_id) ? "text-green-600" : ""}`}
                  onClick={() => handleCatchToggle(target.pokemon_id)}
                >
                  <Check className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6"
                  onClick={() => handleRemoveTarget(target.id, target.pokemon_id)}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {target.selected_location === "Evolution" && target.evolutionInfo ? (
              <div
                className="border rounded-lg p-2 cursor-pointer hover:bg-accent transition-colors"
                onClick={() => {
                  setSelectedTarget(target);
                  setLocationDialogOpen(true);
                }}
              >
                <p className="font-medium text-sm">Evolution</p>
                <p className="text-xs">
                  Evolve from{" "}
                  <span className="font-semibold capitalize">{target.evolutionInfo.fromPokemon}</span>
                  {" "}#{target.evolutionInfo.fromPokemonId.toString().padStart(3, "0")}
                </p>
                <p className="text-xs font-semibold">{target.evolutionInfo.method}</p>
              </div>
            ) : target.selectedLocationDetails ? (
              <div
                className="border rounded-lg p-2 cursor-pointer hover:bg-accent transition-colors"
                onClick={() => {
                  setSelectedTarget(target);
                  setLocationDialogOpen(true);
                }}
              >
                <p className="font-medium text-sm">{target.selectedLocationDetails.locationArea}</p>
                <p className="text-xs text-muted-foreground">
                  Games: {target.selectedLocationDetails.games.map(g => g.charAt(0).toUpperCase() + g.slice(1)).join(", ")}
                </p>
                <p className="text-xs text-muted-foreground">
                  Methods: {target.selectedLocationDetails.methods.map(m => m.split("-").join(" ")).join(", ")}
                </p>
                <p className="text-xs font-semibold">
                  Encounter Rate: {target.selectedLocationDetails.maxEncounterRate}%
                </p>
              </div>
            ) : target.evolutionInfo ? (
              <div
                className="border rounded-lg p-2 cursor-pointer hover:bg-accent transition-colors"
                onClick={() => {
                  setSelectedTarget(target);
                  setLocationDialogOpen(true);
                }}
              >
                <p className="font-medium text-sm">Evolution</p>
                <p className="text-xs">
                  Evolve from{" "}
                  <span className="font-semibold capitalize">{target.evolutionInfo.fromPokemon}</span>
                  {" "}#{target.evolutionInfo.fromPokemonId.toString().padStart(3, "0")}
                </p>
                <p className="text-xs font-semibold">{target.evolutionInfo.method}</p>
              </div>
            ) : (
              <p className="text-xs text-muted-foreground">
                No location data available
              </p>
            )}
          </div>
        ))}
      </div>

      {/* Location Selector Dialog */}
      <Dialog open={locationDialogOpen} onOpenChange={setLocationDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              Select Location for{" "}
              <span className="capitalize">{selectedTarget?.pokemon_name}</span>
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            {/* Wild Encounter Locations */}
            {selectedTarget?.available_locations.map((loc, idx) => (
              <div
                key={idx}
                className="border rounded-lg p-3 cursor-pointer hover:bg-accent transition-colors"
                onClick={() => handleLocationChange(selectedTarget.id, loc.locationArea, loc)}
              >
                <p className="font-medium">{loc.locationArea}</p>
                <p className="text-sm text-muted-foreground">
                  Games: {loc.games.map(g => g.charAt(0).toUpperCase() + g.slice(1)).join(", ")}
                </p>
                <p className="text-sm text-muted-foreground">
                  Methods: {loc.methods.map(m => m.split("-").join(" ")).join(", ")}
                </p>
                <p className="text-sm font-semibold">
                  Encounter Rate: {loc.maxEncounterRate}%
                </p>
              </div>
            ))}

            {/* Evolution Option */}
            {selectedTarget?.evolutionInfo && (
              <div
                className="border-2 border-primary rounded-lg p-3 cursor-pointer hover:bg-accent transition-colors bg-primary/5"
                onClick={() => handleLocationChange(selectedTarget.id, "Evolution")}
              >
                <p className="font-medium text-primary">Evolution</p>
                <p className="text-sm">
                  Evolve from{" "}
                  <span className="font-semibold capitalize">{selectedTarget.evolutionInfo.fromPokemon}</span>
                  {" "}#{selectedTarget.evolutionInfo.fromPokemonId.toString().padStart(3, "0")}
                </p>
                <p className="text-sm font-semibold">{selectedTarget.evolutionInfo.method}</p>
              </div>
            )}

            {/* No options available */}
            {selectedTarget?.available_locations.length === 0 && !selectedTarget?.evolutionInfo && (
              <p className="text-sm text-muted-foreground text-center py-4">
                No location data available for this Pokémon
              </p>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}