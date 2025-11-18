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
import { getSpriteFromPokemonData, getMaxGeneration, isPokemonAvailableInGeneration } from "@/lib/sprite-utils";
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
  onEvolutionClick?: (pokemonId: number, pokemonName: string, sprite: string) => void;
}

interface EncounterLocation {
  locationArea: string;
  methods: string[];
  games: string[];
  maxEncounterRate: number;
  minLevel: number;
  maxLevel: number;
}

interface EvolutionInfo {
  fromPokemon: string;
  fromPokemonId: number;
  method: string;
}

interface PokemonDetails {
  types: string[];
  stats: {
    hp: number;
    attack: number;
    defense: number;
    specialAttack: number;
    specialDefense: number;
    speed: number;
  };
  abilities: string[];
  eggGroups: string[];
  height: number; // in decimeters
  weight: number; // in hectograms
}

interface EvolutionChainMember {
  name: string;
  id: number;
  sprite: string;
  evolutionMethod?: string;
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
  onEvolutionClick,
}: PokemonCardProps) {
  const [locations, setLocations] = useState<EncounterLocation[]>([]);
  const [evolutionInfo, setEvolutionInfo] = useState<EvolutionInfo | null>(null);
  const [pokemonDetails, setPokemonDetails] = useState<PokemonDetails | null>(null);
  const [evolutionChain, setEvolutionChain] = useState<EvolutionChainMember[]>([]);
  const [loading, setLoading] = useState(false);
  const [toggling, setToggling] = useState(false);
  const [targeting, setTargeting] = useState(false);

  useEffect(() => {
    if (isOpen && pokemonId) {
      fetchPokemonDetails();
      fetchLocations();
      fetchEvolutionData();
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

          // Get level range
          const allLevels = relevantVersions.flatMap((vd: any) =>
            vd.encounter_details.map((ed: any) => ({
              min: ed.min_level,
              max: ed.max_level,
            }))
          );

          const minLevel = Math.min(...allLevels.map((l) => l.min));
          const maxLevel = Math.max(...allLevels.map((l) => l.max));

          filteredLocations.push({
            locationArea: locationName,
            methods,
            games,
            maxEncounterRate,
            minLevel,
            maxLevel,
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

  const fetchPokemonDetails = async () => {
    try {
      // Fetch basic pokemon data
      const pokemonResponse = await fetch(
        `https://pokeapi.co/api/v2/pokemon/${pokemonId}`
      );
      const pokemonData = await pokemonResponse.json();

      // Fetch species data for egg groups
      const speciesResponse = await fetch(
        `https://pokeapi.co/api/v2/pokemon-species/${pokemonId}`
      );
      const speciesData = await speciesResponse.json();

      // Extract types
      const types = pokemonData.types.map((t: any) => t.type.name);

      // Extract stats
      const stats = {
        hp: pokemonData.stats[0].base_stat,
        attack: pokemonData.stats[1].base_stat,
        defense: pokemonData.stats[2].base_stat,
        specialAttack: pokemonData.stats[3].base_stat,
        specialDefense: pokemonData.stats[4].base_stat,
        speed: pokemonData.stats[5].base_stat,
      };

      // Extract abilities
      const abilities = pokemonData.abilities.map((a: any) =>
        a.ability.name
          .split("-")
          .map((word: string) => word.charAt(0).toUpperCase() + word.slice(1))
          .join(" ")
      );

      // Extract egg groups
      const eggGroups = speciesData.egg_groups.map((eg: any) =>
        eg.name
          .split("-")
          .map((word: string) => word.charAt(0).toUpperCase() + word.slice(1))
          .join(" ")
      );

      setPokemonDetails({
        types,
        stats,
        abilities,
        eggGroups,
        height: pokemonData.height,
        weight: pokemonData.weight,
      });
    } catch (error) {
      console.error("Error fetching pokemon details:", error);
    }
  };

  const fetchEvolutionData = async () => {
    try {
      // First get pokemon species to get evolution chain URL
      const speciesResponse = await fetch(
        `https://pokeapi.co/api/v2/pokemon-species/${pokemonId}`
      );
      const speciesData = await speciesResponse.json();

      // Then get evolution chain
      const evolutionResponse = await fetch(speciesData.evolution_chain.url);
      const evolutionData = await evolutionResponse.json();

      // Build full evolution chain
      const chain: EvolutionChainMember[] = [];
      const maxGen = getMaxGeneration(journeyGames);
            
      const buildChain = async (chainLink: any, previousMethod?: string) => {
        const id = parseInt(chainLink.species.url.split("/").slice(-2, -1)[0]);
        
        // Check if this Pokemon is available in the user's generation
        const isCurrentAvailable = isPokemonAvailableInGeneration(id, maxGen);
        
        if (isCurrentAvailable) {
          // Fetch sprite for this pokemon
          const pokemonResponse = await fetch(
            `https://pokeapi.co/api/v2/pokemon/${id}`
          );
          const pokemonData = await pokemonResponse.json();

          chain.push({
            name: chainLink.species.name,
            id,
            sprite: getSpriteFromPokemonData(pokemonData, journeyGames),
            evolutionMethod: previousMethod,
          });
        }

        // Process evolutions - continue even if current Pokemon isn't available
        // (to handle baby Pokemon that aren't in Gen 1)
        if (chainLink.evolves_to && chainLink.evolves_to.length > 0) {
          for (const evolution of chainLink.evolves_to) {
            const evolutionId = parseInt(evolution.species.url.split("/").slice(-2, -1)[0]);
            
            // Only process if the evolution is available OR if we haven't added current Pokemon
            // (allows skipping baby Pokemon but continuing with the rest of the chain)
            if (isPokemonAvailableInGeneration(evolutionId, maxGen) || !isCurrentAvailable) {
              const detail = evolution.evolution_details[0];
              let method = "";

              if (detail.min_level) {
                method = `Lv${detail.min_level}`;
              } else if (detail.item) {
                const itemName = detail.item.name.split("-").pop();
                method = itemName?.charAt(0).toUpperCase() + (itemName?.slice(1) || "");
              } else if (detail.trigger.name === "trade") {
                method = detail.held_item ? "Trade+Item" : "Trade";
              }

              await buildChain(evolution, method);
            }
          }
        }
      };

      await buildChain(evolutionData.chain);
      setEvolutionChain(chain);

      // Also find evolution info for "where to find" section
      const findEvolutionDetails = (chain: any): EvolutionInfo | null => {
        if (chain.evolves_to) {
          for (const evolution of chain.evolves_to) {
            if (evolution.species.name === pokemonName) {
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

      const evolInfo = findEvolutionDetails(evolutionData.chain);
      setEvolutionInfo(evolInfo);
    } catch (error) {
      console.error("Error fetching evolution data:", error);
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
      <DialogContent className="max-w-6xl">
        <DialogHeader>
          <DialogTitle className="capitalize text-2xl">
            {pokemonName} #{pokemonId.toString().padStart(3, "0")}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Top: Two Column Layout */}
          <div className="grid grid-cols-2 gap-6">
            {/* LEFT COLUMN */}
            <div className="space-y-4">
              {/* Sprite */}
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

              {/* Types (no header) */}
              {pokemonDetails && (
                <div className="flex gap-2 justify-center">
                  {pokemonDetails.types.map((type) => (
                    <span
                      key={type}
                      className="px-3 py-1 rounded-full text-xs font-semibold uppercase bg-primary text-primary-foreground"
                    >
                      {type}
                    </span>
                  ))}
                </div>
              )}

              {/* Height & Weight */}
              {pokemonDetails && (
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div>
                    <span className="text-muted-foreground">Height:</span>{" "}
                    <span className="font-medium">{(pokemonDetails.height / 10).toFixed(1)}m</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Weight:</span>{" "}
                    <span className="font-medium">{(pokemonDetails.weight / 10).toFixed(1)}kg</span>
                  </div>
                </div>
              )}

              {/* Abilities */}
              {pokemonDetails && (
                <div>
                  <h3 className="text-sm font-semibold mb-2">Abilities</h3>
                  <p className="text-sm">{pokemonDetails.abilities.join(", ")}</p>
                </div>
              )}

              {/* Egg Groups */}
              {pokemonDetails && (
                <div>
                  <h3 className="text-sm font-semibold mb-2">Egg Groups</h3>
                  <p className="text-sm">{pokemonDetails.eggGroups.join(", ")}</p>
                </div>
              )}
            </div>

            {/* RIGHT COLUMN */}
            <div className="space-y-4">
              {/* Stats */}
              {pokemonDetails && (
                <div>
                  <h3 className="text-sm font-semibold mb-3">Base Stats</h3>
                  <div className="space-y-2">
                    {Object.entries(pokemonDetails.stats).map(([stat, value]) => (
                      <div key={stat} className="space-y-1">
                        <div className="flex justify-between text-xs">
                          <span className="capitalize text-muted-foreground">
                            {stat.replace(/([A-Z])/g, " $1").trim()}
                          </span>
                          <span className="font-medium">{value}</span>
                        </div>
                        <div className="h-2 bg-muted rounded-full overflow-hidden">
                          <div
                            className="h-full bg-primary"
                            style={{ width: `${(value / 255) * 100}%` }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Where to Find */}
              <div>
                <h3 className="text-sm font-semibold mb-3">Where to Find</h3>
                {loading ? (
                  <p className="text-sm text-muted-foreground">Loading locations...</p>
                ) : (
                  <div className="space-y-3">
                    {/* Show top 2 locations + evolution (limited view) */}
                    {locations.length === 0 && evolutionInfo && (
                      <div className="border-2 border-primary rounded-lg p-3 space-y-1 bg-primary/5">
                        <p className="font-semibold text-primary text-sm">Evolution Only</p>
                        <p className="text-sm">
                          Evolve from{" "}
                          <span className="font-semibold capitalize">{evolutionInfo.fromPokemon}</span>
                          {" "}#{evolutionInfo.fromPokemonId.toString().padStart(3, "0")}
                        </p>
                        <p className="text-sm font-medium">{evolutionInfo.method}</p>
                      </div>
                    )}

                    {locations.length === 0 && !evolutionInfo && (
                      <p className="text-sm text-muted-foreground">
                        Not available in your selected games.
                      </p>
                    )}

                    {locations.length > 0 && (
                      <>
                        {/* Recommended */}
                        <div>
                          <p className="text-xs font-semibold text-primary mb-1">⭐ Recommended</p>
                          <div className="border-2 border-primary rounded-lg p-2 bg-primary/5">
                            <p className="font-medium text-sm">{locations[0].locationArea}</p>
                            <p className="text-xs text-muted-foreground">
                              {locations[0].games.map(g => g.charAt(0).toUpperCase() + g.slice(1)).join(", ")} • {locations[0].methods.map(m => m.split("-").join(" ")).join(", ")}
                            </p>
                            <p className="text-xs font-semibold">
                              Level {locations[0].minLevel === locations[0].maxLevel 
                                ? locations[0].minLevel 
                                : `${locations[0].minLevel}-${locations[0].maxLevel}`} • Rate: {locations[0].maxEncounterRate}%
                            </p>
                          </div>
                        </div>

                        {/* Second location */}
                        {locations[1] && (
                          <div className="border rounded-lg p-2">
                            <p className="font-medium text-sm">{locations[1].locationArea}</p>
                            <p className="text-xs text-muted-foreground">
                              {locations[1].games.map(g => g.charAt(0).toUpperCase() + g.slice(1)).join(", ")} • {locations[1].methods.map(m => m.split("-").join(" ")).join(", ")}
                            </p>
                            <p className="text-xs">
                              Level {locations[1].minLevel === locations[1].maxLevel 
                                ? locations[1].minLevel 
                                : `${locations[1].minLevel}-${locations[1].maxLevel}`} • Rate: {locations[1].maxEncounterRate}%
                            </p>
                          </div>
                        )}

                        {/* Evolution alternative */}
                        {evolutionInfo && (
                          <div className="border rounded-lg p-2 bg-muted/30">
                            <p className="font-medium text-sm">Evolution Alternative</p>
                            <p className="text-xs">
                              Evolve from{" "}
                              <span className="font-semibold capitalize">{evolutionInfo.fromPokemon}</span>
                              {" "}#{evolutionInfo.fromPokemonId.toString().padStart(3, "0")}
                            </p>
                            <p className="text-xs font-medium">{evolutionInfo.method}</p>
                          </div>
                        )}

                        {/* More locations indicator */}
                        {locations.length > 2 && (
                          <p className="text-xs text-muted-foreground italic">
                            + {locations.length - 2} more location{locations.length - 2 > 1 ? "s" : ""}...
                          </p>
                        )}
                      </>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Bottom: Evolution Chain */}
          {evolutionChain.length > 0 && (
            <div className="border-t pt-4">
              <h3 className="text-sm font-semibold mb-3">Evolution Chain</h3>
              <div className="flex items-center justify-center gap-3">
                {evolutionChain.map((member, idx) => (
                  <div key={member.id} className="flex items-center gap-3">
                    <div
                      className={`flex flex-col items-center p-2 rounded-lg border cursor-pointer hover:bg-accent/50 transition-colors ${
                        member.name === pokemonName ?
                        "border-primary bg-primary/10" : ""
                      }`}
                      onClick={() => {
                        if (onEvolutionClick && member.name !== pokemonName) {
                          onEvolutionClick(member.id, member.name, member.sprite);
                        }
                      }}
                    >
                      <Image
                        src={member.sprite}
                        alt={member.name}
                        width={48}
                        height={48}
                        className="pixelated"
                        unoptimized
                      />
                      <p className="text-xs capitalize mt-1">{member.name}</p>
                      <p className="text-xs text-muted-foreground">
                        #{member.id.toString().padStart(3, "0")}
                      </p>
                    </div>
                    {idx < evolutionChain.length - 1 && evolutionChain[idx + 1].evolutionMethod && (
                      <div className="text-xs text-muted-foreground font-medium">
                        → {evolutionChain[idx + 1].evolutionMethod}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Bottom Right: Action Buttons */}
          <div className="flex justify-end gap-3 pt-2">
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
        </div>
      </DialogContent>
    </Dialog>
  );
}