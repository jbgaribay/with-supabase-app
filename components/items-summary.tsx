"use client";

import { useState, useEffect } from "react";
import { getMaxGeneration } from "@/lib/sprite-utils";
import Image from "next/image";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface ItemsSummaryProps {
  journeyId: string;
  journeyGames: string[];
  caughtPokemonIds: Set<number>;
}

interface PokemonNeedingItem {
  id: number;
  name: string;
  sprite: string;
  evolvesInto: string;
  evolvesIntoId: number;
}

interface ItemInfo {
  itemName: string;
  itemSprite: string;
  count: number;
  topLocation: string;
  allLocations: string[];
  pokemon: PokemonNeedingItem[];
}

const GENERATION_MAX_ID: Record<number, number> = {
  1: 151,
  2: 251,
};

export function ItemsSummary({ journeyId, journeyGames, caughtPokemonIds }: ItemsSummaryProps) {
  const [items, setItems] = useState<ItemInfo[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedItem, setSelectedItem] = useState<ItemInfo | null>(null);

  useEffect(() => {
    async function fetchItemsSummary() {
      try {
        setIsLoading(true);

        const maxGeneration = getMaxGeneration(journeyGames);
        const maxPokemonId = GENERATION_MAX_ID[maxGeneration] || 151;

        const allPokemon = Array.from({ length: maxPokemonId }, (_, i) => i + 1);
        const uncaughtPokemon = allPokemon.filter(id => !caughtPokemonIds.has(id));

        const itemsMap: Record<string, ItemInfo> = {};

        for (const pokemonId of uncaughtPokemon) {
          try {
            const speciesRes = await fetch(`https://pokeapi.co/api/v2/pokemon-species/${pokemonId}`);
            const speciesData = await speciesRes.json();

            const evolutionRes = await fetch(speciesData.evolution_chain.url);
            const evolutionData = await evolutionRes.json();

            // Fetch Pokemon data for sprite
            const pokemonRes = await fetch(`https://pokeapi.co/api/v2/pokemon/${pokemonId}`);
            const pokemonData = await pokemonRes.json();

            const checkEvolutionChain = (chain: any, currentPokemon: string) => {
              if (chain.evolves_to) {
                for (const evolution of chain.evolves_to) {
                  if (chain.species.name === currentPokemon) {
                    const detail = evolution.evolution_details[0];
                    
                    if (detail.item) {
                      const itemSlug = detail.item.name;
                      const itemName = itemSlug
                        .split("-")
                        .map((word: string) => word.charAt(0).toUpperCase() + word.slice(1))
                        .join(" ");

                      if (!itemsMap[itemName]) {
                        const locations = getItemLocations(itemSlug, journeyGames);
                        itemsMap[itemName] = {
                          itemName,
                          itemSprite: `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/${itemSlug}.png`,
                          count: 0,
                          topLocation: locations[0],
                          allLocations: locations,
                          pokemon: [],
                        };
                      }

                      const evolvesIntoId = parseInt(evolution.species.url.split("/").slice(-2, -1)[0]);
                      
                      // Get sprite for the current Pokemon
                      const sprite = pokemonData.sprites.versions?.["generation-i"]?.["red-blue"]?.front_transparent 
                        || pokemonData.sprites.front_default;

                      itemsMap[itemName].pokemon.push({
                        id: pokemonId,
                        name: currentPokemon,
                        sprite,
                        evolvesInto: evolution.species.name,
                        evolvesIntoId,
                      });
                      
                      itemsMap[itemName].count = itemsMap[itemName].pokemon.length;
                    }
                  }
                  checkEvolutionChain(evolution, currentPokemon);
                }
              }
            };

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
            console.error(`Error fetching data for Pokemon ${pokemonId}:`, err);
          }
        }

        const itemsList = Object.values(itemsMap).sort((a, b) => b.count - a.count);
        setItems(itemsList);
      } catch (err) {
        console.error("Error fetching items summary:", err);
      } finally {
        setIsLoading(false);
      }
    }

    fetchItemsSummary();
  }, [journeyGames, caughtPokemonIds]);

  if (isLoading) {
    return (
      <div>
        <h3 className="text-sm font-semibold mb-3">Evolution Items Needed</h3>
        <p className="text-sm text-muted-foreground">Loading...</p>
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div>
        <h3 className="text-sm font-semibold mb-3">Evolution Items Needed</h3>
        <p className="text-sm text-muted-foreground">None needed! 🎉</p>
      </div>
    );
  }

  return (
    <>
      <div>
        <h3 className="text-sm font-semibold mb-3">Evolution Items Needed</h3>
        <div className="space-y-3 max-h-64 overflow-y-auto pr-2">
          {items.map((item) => (
            <div
              key={item.itemName}
              className="border rounded-lg p-3 cursor-pointer hover:bg-accent transition-colors"
              onClick={() => setSelectedItem(item)}
            >
              <div className="flex items-start gap-3">
                {/* Item sprite */}
                <Image
                  src={item.itemSprite}
                  alt={item.itemName}
                  width={32}
                  height={32}
                  className="pixelated flex-shrink-0"
                  unoptimized
                />
                
                <div className="flex-1 min-w-0">
                  {/* Item name and count */}
                  <div className="flex items-center justify-between mb-1">
                    <p className="font-semibold text-sm">{item.itemName}</p>
                    <span className="text-sm text-muted-foreground">×{item.count}</span>
                  </div>
                  
                  {/* Location */}
                  <p className="text-xs text-muted-foreground mb-2">
                    {item.topLocation}
                  </p>
                  
                  {/* Pokemon sprites */}
                  <div className="flex gap-1 flex-wrap">
                    {item.pokemon.slice(0, 5).map((pokemon) => (
                      <Image
                        key={pokemon.id}
                        src={pokemon.sprite}
                        alt={pokemon.name}
                        width={24}
                        height={24}
                        className="pixelated"
                        unoptimized
                      />
                    ))}
                    {item.pokemon.length > 5 && (
                      <span className="text-xs text-muted-foreground self-center">
                        +{item.pokemon.length - 5}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Item Details Modal */}
      {selectedItem && (
        <Dialog open={!!selectedItem} onOpenChange={() => setSelectedItem(null)}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-3">
                <Image
                  src={selectedItem.itemSprite}
                  alt={selectedItem.itemName}
                  width={40}
                  height={40}
                  className="pixelated"
                  unoptimized
                />
                {selectedItem.itemName}
              </DialogTitle>
            </DialogHeader>

            <div className="space-y-4">
              {/* Locations */}
              <div>
                <h3 className="text-sm font-semibold mb-2">Where to Find:</h3>
                <div className="space-y-1">
                  {selectedItem.allLocations.map((location, idx) => (
                    <p key={idx} className="text-sm text-muted-foreground">
                      • {location}
                    </p>
                  ))}
                </div>
              </div>

              {/* Pokemon that need this item */}
              <div>
                <h3 className="text-sm font-semibold mb-2">
                  Needed for {selectedItem.count} Pokémon:
                </h3>
                <div className="grid grid-cols-2 gap-3 max-h-96 overflow-y-auto">
                  {selectedItem.pokemon.map((pokemon) => (
                    <div
                      key={pokemon.id}
                      className="border rounded-lg p-3 flex items-center gap-3"
                    >
                      <Image
                        src={pokemon.sprite}
                        alt={pokemon.name}
                        width={48}
                        height={48}
                        className="pixelated"
                        unoptimized
                      />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold capitalize">
                          {pokemon.name}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          #{pokemon.id.toString().padStart(3, "0")} → #{pokemon.evolvesIntoId.toString().padStart(3, "0")}
                        </p>
                        <p className="text-xs text-muted-foreground capitalize">
                          Evolves to {pokemon.evolvesInto}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </>
  );
}

// Helper function to get item locations based on game
function getItemLocations(itemName: string, journeyGames: string[]): string[] {
  const itemLocations: Record<string, Record<string, string[]>> = {
    "fire-stone": {
      gen1: ["Celadon Department Store (4F)"],
      gen2: ["Goldenrod Department Store (4F)", "Route 36 (Bill's grandfather)"],
    },
    "water-stone": {
      gen1: ["Celadon Department Store (4F)"],
      gen2: ["Goldenrod Department Store (4F)", "Route 42 (Fisherman)", "Ruins of Alph"],
    },
    "thunder-stone": {
      gen1: ["Celadon Department Store (4F)"],
      gen2: ["Goldenrod Department Store (4F)", "Route 25 (Bill's house)"],
    },
    "leaf-stone": {
      gen1: ["Celadon Department Store (4F)"],
      gen2: ["Goldenrod Department Store (4F)", "Route 34 (Picnicker Gina)"],
    },
    "moon-stone": {
      gen1: ["Mt. Moon (2F)", "Celadon Department Store (4F)"],
      gen2: ["Mt. Moon", "Goldenrod Department Store (4F)", "Mom (random gift)"],
    },
    "sun-stone": {
      gen2: ["Bug Catching Contest (1st place)", "Ruins of Alph", "National Park"],
    },
    "kings-rock": {
      gen2: ["Slowpoke Well", "Held by wild Poliwhirl"],
    },
    "metal-coat": {
      gen2: ["S.S. Aqua", "Held by wild Magnemite"],
    },
    "dragon-scale": {
      gen2: ["Dragon's Den", "Held by wild Horsea/Seadra"],
    },
    "upgrade": {
      gen2: ["Silph Co. (Saffron City)", "Held by wild Porygon"],
    },
  };

  const hasGen2 = journeyGames.some(game => ["gold", "silver", "crystal"].includes(game));
  const generation = hasGen2 ? "gen2" : "gen1";

  return itemLocations[itemName]?.[generation] || ["Unknown location"];
}