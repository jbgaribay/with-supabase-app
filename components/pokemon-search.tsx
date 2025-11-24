"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface PokemonData {
  id: number;
  name: string;
  sprite: string;
  types: string[];
  height: number;
  weight: number;
  stats: {
    hp: number;
    attack: number;
    defense: number;
    specialAttack: number;
    specialDefense: number;
    speed: number;
  };
  abilities: string[];
  description: string;
  evolutionChain: EvolutionMember[];
  eggGroups: string[];
  typeEffectiveness: {
    weakTo: string[];
    resistantTo: string[];
    immuneTo: string[];
  };
  moves: MoveData[];
  growthRate: string;
  genderRatio: string;
  locations: LocationData[];
}

interface LocationData {
  location: string;
  area: string;
  methods: string[];
  games: string[];
  levelRange: string;
}

interface MoveData {
  name: string;
  type: string;
  category: string;
  power: number | null;
  accuracy: number | null;
  learnMethod: string;
  level?: number;
}

interface EvolutionMember {
  id: number;
  name: string;
  sprite: string;
  evolutionMethod?: string;
}

// Type chart for calculating effectiveness
const TYPE_CHART: Record<string, { weakTo: string[]; resistantTo: string[]; immuneTo: string[] }> = {
  normal: { weakTo: ['fighting'], resistantTo: [], immuneTo: ['ghost'] },
  fire: { weakTo: ['water', 'ground', 'rock'], resistantTo: ['fire', 'grass', 'ice', 'bug', 'steel', 'fairy'], immuneTo: [] },
  water: { weakTo: ['electric', 'grass'], resistantTo: ['fire', 'water', 'ice', 'steel'], immuneTo: [] },
  electric: { weakTo: ['ground'], resistantTo: ['electric', 'flying', 'steel'], immuneTo: [] },
  grass: { weakTo: ['fire', 'ice', 'poison', 'flying', 'bug'], resistantTo: ['water', 'electric', 'grass', 'ground'], immuneTo: [] },
  ice: { weakTo: ['fire', 'fighting', 'rock', 'steel'], resistantTo: ['ice'], immuneTo: [] },
  fighting: { weakTo: ['flying', 'psychic', 'fairy'], resistantTo: ['bug', 'rock', 'dark'], immuneTo: [] },
  poison: { weakTo: ['ground', 'psychic'], resistantTo: ['grass', 'fighting', 'poison', 'bug', 'fairy'], immuneTo: [] },
  ground: { weakTo: ['water', 'grass', 'ice'], resistantTo: ['poison', 'rock'], immuneTo: ['electric'] },
  flying: { weakTo: ['electric', 'ice', 'rock'], resistantTo: ['grass', 'fighting', 'bug'], immuneTo: ['ground'] },
  psychic: { weakTo: ['bug', 'ghost', 'dark'], resistantTo: ['fighting', 'psychic'], immuneTo: [] },
  bug: { weakTo: ['fire', 'flying', 'rock'], resistantTo: ['grass', 'fighting', 'ground'], immuneTo: [] },
  rock: { weakTo: ['water', 'grass', 'fighting', 'ground', 'steel'], resistantTo: ['normal', 'fire', 'poison', 'flying'], immuneTo: [] },
  ghost: { weakTo: ['ghost', 'dark'], resistantTo: ['poison', 'bug'], immuneTo: ['normal', 'fighting'] },
  dragon: { weakTo: ['ice', 'dragon', 'fairy'], resistantTo: ['fire', 'water', 'electric', 'grass'], immuneTo: [] },
  dark: { weakTo: ['fighting', 'bug', 'fairy'], resistantTo: ['ghost', 'dark'], immuneTo: ['psychic'] },
  steel: { weakTo: ['fire', 'fighting', 'ground'], resistantTo: ['normal', 'grass', 'ice', 'flying', 'psychic', 'bug', 'rock', 'dragon', 'steel', 'fairy'], immuneTo: ['poison'] },
  fairy: { weakTo: ['poison', 'steel'], resistantTo: ['fighting', 'bug', 'dark'], immuneTo: ['dragon'] },
};

export function PokemonSearch() {
  const [searchQuery, setSearchQuery] = useState("");
  const [pokemonData, setPokemonData] = useState<PokemonData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const calculateTypeEffectiveness = (types: string[]) => {
    const effectiveness: Record<string, number> = {};

    // Calculate effectiveness for each type
    types.forEach((type) => {
      const typeData = TYPE_CHART[type.toLowerCase()];
      if (!typeData) return;

      // Weak to (2x damage)
      typeData.weakTo.forEach((attackType) => {
        effectiveness[attackType] = (effectiveness[attackType] || 1) * 2;
      });

      // Resistant to (0.5x damage)
      typeData.resistantTo.forEach((attackType) => {
        effectiveness[attackType] = (effectiveness[attackType] || 1) * 0.5;
      });

      // Immune to (0x damage)
      typeData.immuneTo.forEach((attackType) => {
        effectiveness[attackType] = 0;
      });
    });

    // Categorize
    const weakTo: string[] = [];
    const resistantTo: string[] = [];
    const immuneTo: string[] = [];

    Object.entries(effectiveness).forEach(([type, multiplier]) => {
      if (multiplier === 0) {
        immuneTo.push(type);
      } else if (multiplier >= 2) {
        weakTo.push(type);
      } else if (multiplier <= 0.5) {
        resistantTo.push(type);
      }
    });

    return { weakTo, resistantTo, immuneTo };
  };

  const searchPokemon = async (query: string) => {
    if (!query.trim()) {
      setError("Please enter a Pokémon name or ID");
      return;
    }

    setIsLoading(true);
    setError(null);
    setPokemonData(null);

    try {
      // Fetch basic pokemon data
      const pokemonRes = await fetch(
        `https://pokeapi.co/api/v2/pokemon/${query.toLowerCase().trim()}`
      );
      
      if (!pokemonRes.ok) {
        throw new Error("Pokémon not found");
      }

      const pokemon = await pokemonRes.json();

      // Fetch species data for description
      const speciesRes = await fetch(
        `https://pokeapi.co/api/v2/pokemon-species/${pokemon.id}`
      );
      const species = await speciesRes.json();

      // Extract description
      let description = "No description available.";
      const flavorText = species.flavor_text_entries.find(
        (entry: any) => entry.language.name === "en"
      );
      if (flavorText) {
        description = flavorText.flavor_text.replace(/\n|\f/g, " ");
      }

      // Extract egg groups
      const eggGroups = species.egg_groups.map((eg: any) =>
        eg.name
          .split("-")
          .map((word: string) => word.charAt(0).toUpperCase() + word.slice(1))
          .join(" ")
      );

      // Extract growth rate
      const growthRate = species.growth_rate?.name
        .split("-")
        .map((word: string) => word.charAt(0).toUpperCase() + word.slice(1))
        .join(" ") || "Unknown";

      // Extract gender ratio
      let genderRatio = "Genderless";
      if (species.gender_rate !== -1) {
        const femaleRatio = (species.gender_rate / 8) * 100;
        const maleRatio = 100 - femaleRatio;
        genderRatio = `${maleRatio}% ♂ / ${femaleRatio}% ♀`;
      }

      // Fetch evolution chain
      const evolutionChain: EvolutionMember[] = [];
      if (species.evolution_chain?.url) {
        try {
          const evolutionRes = await fetch(species.evolution_chain.url);
          const evolutionData = await evolutionRes.json();

          const buildChain = async (chainLink: any, previousMethod?: string) => {
            const id = parseInt(chainLink.species.url.split("/").slice(-2, -1)[0]);
            
            // Fetch sprite for this pokemon
            const pokemonResponse = await fetch(
              `https://pokeapi.co/api/v2/pokemon/${id}`
            );
            const pokemonData = await pokemonResponse.json();

            evolutionChain.push({
              name: chainLink.species.name,
              id,
              sprite: pokemonData.sprites.front_default,
              evolutionMethod: previousMethod,
            });

            // Process evolutions
            if (chainLink.evolves_to && chainLink.evolves_to.length > 0) {
              for (const evolution of chainLink.evolves_to) {
                const detail = evolution.evolution_details[0];
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
                    method = `Trade holding ${itemName}`;
                  } else {
                    method = "Trade";
                  }
                }

                await buildChain(evolution, method);
              }
            }
          };

          await buildChain(evolutionData.chain);
        } catch (err) {
          console.error("Error fetching evolution chain:", err);
        }
      }

      // Fetch moves - get level-up moves and limit to 20 most recent
      const moves: MoveData[] = [];
      const levelUpMoves = pokemon.moves.filter((m: any) =>
        m.version_group_details.some((vg: any) => 
          vg.move_learn_method.name === "level-up"
        )
      );

      // Get move details for level-up moves
      for (const moveEntry of levelUpMoves.slice(0, 20)) {
        try {
          const moveRes = await fetch(moveEntry.move.url);
          const moveData = await moveRes.json();
          
          // Get level learned
          const versionDetail = moveEntry.version_group_details.find(
            (vg: any) => vg.move_learn_method.name === "level-up"
          );

          moves.push({
            name: moveData.name
              .split("-")
              .map((word: string) => word.charAt(0).toUpperCase() + word.slice(1))
              .join(" "),
            type: moveData.type.name,
            category: moveData.damage_class.name,
            power: moveData.power,
            accuracy: moveData.accuracy,
            learnMethod: "Level-up",
            level: versionDetail?.level_learned_at || 0,
          });
        } catch (err) {
          console.error("Error fetching move data:", err);
        }
      }

      // Sort by level
      moves.sort((a, b) => (a.level || 0) - (b.level || 0));

      // Fetch location data
      const locations: LocationData[] = [];
      try {
        const encountersRes = await fetch(pokemon.location_area_encounters);
        const encountersData = await encountersRes.json();

        const locationMap = new Map<string, LocationData>();

        for (const encounter of encountersData) {
          const locationName = encounter.location_area.name
            .split("-")
            .join(" ")
            .replace(/\b\w/g, (l: string) => l.toUpperCase());

          for (const versionDetail of encounter.version_details) {
            const game = versionDetail.version.name;
            const methods = versionDetail.encounter_details.map((ed: any) => 
              ed.method.name
                .split("-")
                .map((word: string) => word.charAt(0).toUpperCase() + word.slice(1))
                .join(" ")
            );

            const levels = versionDetail.encounter_details.map((ed: any) => ({
              min: ed.min_level,
              max: ed.max_level,
            }));

            const minLevel = Math.min(...levels.map((l) => l.min));
            const maxLevel = Math.max(...levels.map((l) => l.max));
            const levelRange = minLevel === maxLevel ? `Lv. ${minLevel}` : `Lv. ${minLevel}-${maxLevel}`;

            const key = `${locationName}-${levelRange}`;
            
            if (locationMap.has(key)) {
              const existing = locationMap.get(key)!;
              existing.methods = [...new Set([...existing.methods, ...methods])];
              existing.games = [...new Set([...existing.games, game])];
            } else {
              locationMap.set(key, {
                location: locationName,
                area: locationName,
                methods,
                games: [game],
                levelRange,
              });
            }
          }
        }

        locations.push(...Array.from(locationMap.values()).slice(0, 15));
      } catch (err) {
        console.error("Error fetching location data:", err);
      }

      // Format the data
      const types = pokemon.types.map((t: any) => t.type.name);
      const typeEffectiveness = calculateTypeEffectiveness(types);

      const formattedData: PokemonData = {
        id: pokemon.id,
        name: pokemon.name,
        sprite: pokemon.sprites.front_default,
        types,
        height: pokemon.height / 10, // Convert to meters
        weight: pokemon.weight / 10, // Convert to kg
        stats: {
          hp: pokemon.stats[0].base_stat,
          attack: pokemon.stats[1].base_stat,
          defense: pokemon.stats[2].base_stat,
          specialAttack: pokemon.stats[3].base_stat,
          specialDefense: pokemon.stats[4].base_stat,
          speed: pokemon.stats[5].base_stat,
        },
        abilities: pokemon.abilities.map((a: any) =>
          a.ability.name
            .split("-")
            .map((word: string) => word.charAt(0).toUpperCase() + word.slice(1))
            .join(" ")
        ),
        description,
        evolutionChain,
        eggGroups,
        typeEffectiveness,
        moves,
        growthRate,
        genderRatio,
        locations,
      };

      setPokemonData(formattedData);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to fetch Pokémon data"
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    await searchPokemon(searchQuery);
  };

  const handleEvolutionClick = async (pokemonName: string) => {
    setSearchQuery(pokemonName);
    await searchPokemon(pokemonName);
  };

  return (
    <div className="space-y-6">
      {/* Search Bar */}
      <form onSubmit={handleSearch} className="flex gap-2">
        <Input
          type="text"
          placeholder="Enter Pokémon name or ID..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="flex-1"
        />
        <Button type="submit" disabled={isLoading}>
          {isLoading ? "Searching..." : "Search"}
        </Button>
      </form>

      {/* Error Message */}
      {error && (
        <div className="border border-red-500 rounded-lg p-4 text-red-500">
          {error}
        </div>
      )}

      {/* Pokemon Data Display */}
      {pokemonData && (
        <div className="border rounded-lg p-6 space-y-6">
          {/* Basic Info */}
          <div className="flex items-start gap-6">
            <img
              src={pokemonData.sprite}
              alt={pokemonData.name}
              className="w-32 h-32"
            />
            <div className="flex-1">
              <h3 className="text-2xl font-bold capitalize mb-2">
                #{pokemonData.id.toString().padStart(3, "0")} - {pokemonData.name}
              </h3>
              <div className="flex gap-2 mb-2">
                {pokemonData.types.map((type) => (
                  <span
                    key={type}
                    className="px-3 py-1 rounded-full text-sm font-medium bg-primary/10 text-primary capitalize"
                  >
                    {type}
                  </span>
                ))}
              </div>
              <p className="text-sm text-muted-foreground mb-2">
                Height: {pokemonData.height}m | Weight: {pokemonData.weight}kg
              </p>
              <p className="text-sm">{pokemonData.description}</p>
            </div>
          </div>

          {/* Abilities */}
          <div>
            <h4 className="font-semibold mb-2">Abilities</h4>
            <div className="flex gap-2">
              {pokemonData.abilities.map((ability) => (
                <span
                  key={ability}
                  className="px-3 py-1 rounded-md text-sm bg-accent"
                >
                  {ability}
                </span>
              ))}
            </div>
          </div>

          {/* Stats */}
          <div>
            <h4 className="font-semibold mb-2">Base Stats</h4>
            <div className="space-y-2">
              <StatBar label="HP" value={pokemonData.stats.hp} />
              <StatBar label="Attack" value={pokemonData.stats.attack} />
              <StatBar label="Defense" value={pokemonData.stats.defense} />
              <StatBar label="Sp. Atk" value={pokemonData.stats.specialAttack} />
              <StatBar label="Sp. Def" value={pokemonData.stats.specialDefense} />
              <StatBar label="Speed" value={pokemonData.stats.speed} />
            </div>
          </div>

          {/* Egg Groups */}
          {pokemonData.eggGroups.length > 0 && (
            <div>
              <h4 className="font-semibold mb-2">Breeding Information</h4>
              <div className="space-y-2">
                <div>
                  <span className="text-sm font-medium">Egg Groups: </span>
                  <span className="text-sm text-muted-foreground">
                    {pokemonData.eggGroups.join(", ")}
                  </span>
                </div>
                <div>
                  <span className="text-sm font-medium">Gender Ratio: </span>
                  <span className="text-sm text-muted-foreground">
                    {pokemonData.genderRatio}
                  </span>
                </div>
                <div>
                  <span className="text-sm font-medium">Growth Rate: </span>
                  <span className="text-sm text-muted-foreground">
                    {pokemonData.growthRate}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Type Effectiveness */}
          {pokemonData.typeEffectiveness && (
            <div>
              <h4 className="font-semibold mb-2">Type Effectiveness</h4>
              <div className="space-y-2">
                {pokemonData.typeEffectiveness.weakTo.length > 0 && (
                  <div>
                    <span className="text-sm font-medium text-red-500">Weak to: </span>
                    <div className="inline-flex gap-2 flex-wrap">
                      {pokemonData.typeEffectiveness.weakTo.map((type) => (
                        <span
                          key={type}
                          className="px-2 py-1 rounded text-xs bg-red-500/20 text-red-500 capitalize"
                        >
                          {type}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
                {pokemonData.typeEffectiveness.resistantTo.length > 0 && (
                  <div>
                    <span className="text-sm font-medium text-green-500">Resistant to: </span>
                    <div className="inline-flex gap-2 flex-wrap">
                      {pokemonData.typeEffectiveness.resistantTo.map((type) => (
                        <span
                          key={type}
                          className="px-2 py-1 rounded text-xs bg-green-500/20 text-green-500 capitalize"
                        >
                          {type}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
                {pokemonData.typeEffectiveness.immuneTo.length > 0 && (
                  <div>
                    <span className="text-sm font-medium text-blue-500">Immune to: </span>
                    <div className="inline-flex gap-2 flex-wrap">
                      {pokemonData.typeEffectiveness.immuneTo.map((type) => (
                        <span
                          key={type}
                          className="px-2 py-1 rounded text-xs bg-blue-500/20 text-blue-500 capitalize"
                        >
                          {type}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Evolution Chain */}
          {pokemonData.evolutionChain.length > 1 && (
            <div>
              <h4 className="font-semibold mb-2">Evolution Chain</h4>
              <div className="flex items-center gap-4 flex-wrap">
                {pokemonData.evolutionChain.map((evolution, index) => (
                  <div key={evolution.id} className="flex items-center gap-4">
                    <button
                      onClick={() => handleEvolutionClick(evolution.name)}
                      className="flex flex-col items-center gap-2 p-3 rounded-lg hover:bg-accent transition-colors cursor-pointer border border-transparent hover:border-primary"
                    >
                      <img
                        src={evolution.sprite}
                        alt={evolution.name}
                        className="w-20 h-20"
                      />
                      <span className="text-sm font-medium capitalize">
                        {evolution.name}
                      </span>
                    </button>
                    {index < pokemonData.evolutionChain.length - 1 && (
                      <div className="flex flex-col items-center">
                        <span className="text-2xl text-muted-foreground">→</span>
                        {pokemonData.evolutionChain[index + 1].evolutionMethod && (
                          <span className="text-xs text-muted-foreground">
                            {pokemonData.evolutionChain[index + 1].evolutionMethod}
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Moves */}
          {pokemonData.moves.length > 0 && (
            <div>
              <h4 className="font-semibold mb-2">Level-up Moves (First 20)</h4>
              <div className="border rounded-lg overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-accent">
                    <tr>
                      <th className="text-left p-2">Level</th>
                      <th className="text-left p-2">Move</th>
                      <th className="text-left p-2">Type</th>
                      <th className="text-left p-2">Category</th>
                      <th className="text-right p-2">Power</th>
                      <th className="text-right p-2">Accuracy</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pokemonData.moves.map((move, index) => (
                      <tr key={index} className="border-t">
                        <td className="p-2">{move.level || "—"}</td>
                        <td className="p-2 font-medium">{move.name}</td>
                        <td className="p-2">
                          <span className="px-2 py-1 rounded text-xs bg-primary/10 capitalize">
                            {move.type}
                          </span>
                        </td>
                        <td className="p-2 capitalize">{move.category}</td>
                        <td className="p-2 text-right">{move.power || "—"}</td>
                        <td className="p-2 text-right">{move.accuracy || "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Locations */}
          {pokemonData.locations && pokemonData.locations.length > 0 ? (
            <div>
              <h4 className="font-semibold mb-2">Locations (First 15)</h4>
              <div className="border rounded-lg overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-accent">
                    <tr>
                      <th className="text-left p-2">Location</th>
                      <th className="text-left p-2">Method</th>
                      <th className="text-left p-2">Level</th>
                      <th className="text-left p-2">Games</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pokemonData.locations.map((location, index) => (
                      <tr key={index} className="border-t">
                        <td className="p-2">{location.location}</td>
                        <td className="p-2">{location.methods.join(", ")}</td>
                        <td className="p-2">{location.levelRange}</td>
                        <td className="p-2">
                          <div className="flex gap-1 flex-wrap">
                            {location.games.map((game) => (
                              <span
                                key={game}
                                className="px-2 py-0.5 rounded text-xs bg-primary/10 capitalize"
                              >
                                {game}
                              </span>
                            ))}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            <div>
              <h4 className="font-semibold mb-2">Locations</h4>
              <p className="text-sm text-muted-foreground">
                No wild encounter locations found. This Pokémon may be obtained through:
                evolution, trading, events, or it may be a legendary/mythical Pokémon.
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function StatBar({ label, value }: { label: string; value: number }) {
  const percentage = (value / 255) * 100;

  return (
    <div className="flex items-center gap-3">
      <span className="text-sm w-20 font-medium">{label}</span>
      <span className="text-sm w-12 text-right">{value}</span>
      <div className="flex-1 bg-accent rounded-full h-2 overflow-hidden">
        <div
          className="bg-primary h-full transition-all"
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
}