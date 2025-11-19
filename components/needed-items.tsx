"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getMaxGeneration } from "@/lib/sprite-utils";

interface NeededItemsProps {
  journeyId: string;
  journeyGames: string[];
  caughtPokemonIds: Set<number>;
}

interface ItemInfo {
  itemName: string;
  pokemonNeeded: {
    id: number;
    name: string;
    evolvesInto: string;
    evolvesintoId: number;
  }[];
  whereToFind: string[];
}

// Generation to max Pokemon ID mapping
const GENERATION_MAX_ID: Record<number, number> = {
  1: 151,
  2: 251,
};

export function NeededItems({ journeyId, journeyGames, caughtPokemonIds }: NeededItemsProps) {
  const [items, setItems] = useState<ItemInfo[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchNeededItems() {
      try {
        setIsLoading(true);
        setError(null);

        const maxGeneration = getMaxGeneration(journeyGames);
        const maxPokemonId = GENERATION_MAX_ID[maxGeneration] || 151;

        // Get all Pokemon IDs for the generation
        const allPokemon = Array.from({ length: maxPokemonId }, (_, i) => i + 1);
        
        // Filter to only uncaught Pokemon
        const uncaughtPokemon = allPokemon.filter(id => !caughtPokemonIds.has(id));

        const itemsMap: Record<string, ItemInfo> = {};

        // Check each uncaught Pokemon to see if it needs an item to evolve
        for (const pokemonId of uncaughtPokemon) {
          try {
            // Fetch species data to get evolution chain
            const speciesRes = await fetch(`https://pokeapi.co/api/v2/pokemon-species/${pokemonId}`);
            const speciesData = await speciesRes.json();

            // Fetch evolution chain
            const evolutionRes = await fetch(speciesData.evolution_chain.url);
            const evolutionData = await evolutionRes.json();

            // Check if this Pokemon evolves WITH an item (not FROM using an item on another Pokemon)
            const checkEvolutionChain = (chain: any, currentPokemon: string) => {
              if (chain.evolves_to) {
                for (const evolution of chain.evolves_to) {
                  const evolvesIntoPokemonName = evolution.species.name;
                  const evolvesIntoPokemonId = parseInt(evolution.species.url.split("/").slice(-2, -1)[0]);
                  
                  // Check if the current chain link matches our Pokemon
                  if (chain.species.name === currentPokemon) {
                    const detail = evolution.evolution_details[0];
                    
                    // Check if it needs an item to evolve
                    if (detail.item) {
                      const itemName = detail.item.name
                        .split("-")
                        .map((word: string) => word.charAt(0).toUpperCase() + word.slice(1))
                        .join(" ");

                      if (!itemsMap[itemName]) {
                        itemsMap[itemName] = {
                          itemName,
                          pokemonNeeded: [],
                          whereToFind: getItemLocations(detail.item.name, journeyGames),
                        };
                      }

                      itemsMap[itemName].pokemonNeeded.push({
                        id: pokemonId,
                        name: currentPokemon,
                        evolvesInto: evolvesIntoPokemonName,
                        evolvesintoId: evolvesIntoPokemonId,
                      });
                    }
                  }

                  // Recursively check the next evolution
                  checkEvolutionChain(evolution, currentPokemon);
                }
              }
            };

            // Start checking from the base of the chain
            const findPokemonInChain = (chain: any): boolean => {
              if (chain.species.name === speciesData.name) {
                checkEvolutionChain(chain, speciesData.name);
                return true;
              }
              if (chain.evolves_to) {
                for (const evolution of chain.evolves_to) {
                  if (findPokemonInChain(evolution)) {
                    return true;
                  }
                }
              }
              return false;
            };

            findPokemonInChain(evolutionData.chain);
          } catch (err) {
            console.error(`Error fetching evolution data for Pokemon ${pokemonId}:`, err);
          }
        }

        // Convert map to array and sort by number of Pokemon needed
        const itemsList = Object.values(itemsMap).sort(
          (a, b) => b.pokemonNeeded.length - a.pokemonNeeded.length
        );

        setItems(itemsList);
      } catch (err) {
        setError("Failed to load needed items");
        console.error(err);
      } finally {
        setIsLoading(false);
      }
    }

    fetchNeededItems();
  }, [journeyGames, caughtPokemonIds]);

  if (isLoading) {
    return (
      <div className="border rounded-lg p-8 text-center text-muted-foreground">
        <p>Loading needed items...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="border rounded-lg p-8 text-center text-red-500">
        <p>{error}</p>
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="border rounded-lg p-8 text-center text-muted-foreground">
        <p>No evolution items needed! 🎉</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {items.map((item) => (
          <Card key={item.itemName}>
            <CardHeader>
              <CardTitle className="text-lg">{item.itemName}</CardTitle>
              <CardDescription>
                Needed for {item.pokemonNeeded.length} Pokémon
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Pokemon that need this item */}
              <div>
                <p className="text-sm font-semibold mb-2">Required For:</p>
                <div className="space-y-1">
                  {item.pokemonNeeded.map((pokemon) => (
                    <div key={pokemon.id} className="text-sm">
                      <span className="capitalize">{pokemon.name}</span>
                      <span className="text-muted-foreground"> → </span>
                      <span className="capitalize">{pokemon.evolvesInto}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Where to find */}
              <div>
                <p className="text-sm font-semibold mb-2">Where to Find:</p>
                <div className="space-y-1">
                  {item.whereToFind.map((location, idx) => (
                    <p key={idx} className="text-sm text-muted-foreground">
                      • {location}
                    </p>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

// Helper function to get item locations based on game
function getItemLocations(itemName: string, journeyGames: string[]): string[] {
  // This is a simplified version - you can expand this with actual locations
  const itemLocations: Record<string, Record<string, string[]>> = {
    "fire-stone": {
      gen1: ["Celadon Department Store"],
      gen2: ["Goldenrod Department Store", "Route 36 (Bill's grandfather)"],
    },
    "water-stone": {
      gen1: ["Celadon Department Store"],
      gen2: ["Goldenrod Department Store", "Route 42 (Fisherman)"],
    },
    "thunder-stone": {
      gen1: ["Celadon Department Store"],
      gen2: ["Goldenrod Department Store"],
    },
    "leaf-stone": {
      gen1: ["Celadon Department Store"],
      gen2: ["Goldenrod Department Store", "Route 34 (Picnicker)"],
    },
    "moon-stone": {
      gen1: ["Mt. Moon", "Celadon Department Store"],
      gen2: ["Mt. Moon", "Goldenrod Department Store"],
    },
    "sun-stone": {
      gen2: ["Bug Catching Contest", "Route 41 (Ruins of Alph)"],
    },
  };

  const hasGen2 = journeyGames.some(game => ["gold", "silver", "crystal"].includes(game));
  const generation = hasGen2 ? "gen2" : "gen1";

  return itemLocations[itemName]?.[generation] || ["Unknown location"];
}