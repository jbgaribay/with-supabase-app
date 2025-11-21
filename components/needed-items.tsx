"use client";

import React, { useState, useEffect } from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { ChevronDown, ChevronRight } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import Image from "next/image";
import { getMaxGeneration } from "@/lib/sprite-utils";

interface NeededItemsProps {
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

export function NeededItems({ journeyId, journeyGames, caughtPokemonIds }: NeededItemsProps) {
  const [items, setItems] = useState<ItemInfo[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [expandedItem, setExpandedItem] = useState<string | null>(null);
  const [showOnlyCaught, setShowOnlyCaught] = useState(false);

  useEffect(() => {
    async function fetchItemsSummary() {
      try {
        setIsLoading(true);

        const maxGeneration = getMaxGeneration(journeyGames);
        const maxPokemonId = GENERATION_MAX_ID[maxGeneration] || 151;

        const allPokemon = Array.from({ length: maxPokemonId }, (_, i) => i + 1);

        const itemsMap: Record<string, ItemInfo> = {};

        for (const pokemonId of allPokemon) {
          try {
            const speciesRes = await fetch(`https://pokeapi.co/api/v2/pokemon-species/${pokemonId}`);
            const speciesData = await speciesRes.json();

            const evolutionRes = await fetch(speciesData.evolution_chain.url);
            const evolutionData = await evolutionRes.json();

            const pokemonRes = await fetch(`https://pokeapi.co/api/v2/pokemon/${pokemonId}`);
            const pokemonData = await pokemonRes.json();

            const checkEvolutionChain = (chain: any, currentPokemon: string, currentPokemonId: number) => {
              if (chain.evolves_to) {
                for (const evolution of chain.evolves_to) {
                  if (chain.species.name === currentPokemon) {
                    const detail = evolution.evolution_details[0];
                    
                    if (detail.item) {
                      const evolvesIntoId = parseInt(evolution.species.url.split("/").slice(-2, -1)[0]);
                      
                      const preEvoCaught = caughtPokemonIds.has(currentPokemonId);
                      const evolutionCaught = caughtPokemonIds.has(evolvesIntoId);
                      
                      // Skip if evolution is already caught
                      if (evolutionCaught) {
                        return;
                      }
                      
                      // If "caught only" is enabled, skip if pre-evolution isn't caught
                      if (showOnlyCaught && !preEvoCaught) {
                        return;
                      }

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
                      
                      const sprite = pokemonData.sprites.versions?.["generation-i"]?.["red-blue"]?.front_transparent 
                        || pokemonData.sprites.front_default;

                      itemsMap[itemName].pokemon.push({
                        id: currentPokemonId,
                        name: currentPokemon,
                        sprite,
                        evolvesInto: evolution.species.name,
                        evolvesIntoId,
                      });
                      
                      itemsMap[itemName].count = itemsMap[itemName].pokemon.length;
                    }
                  }
                  checkEvolutionChain(evolution, currentPokemon, currentPokemonId);
                }
              }
            };

            const findPokemonInChain = (chain: any): boolean => {
              if (chain.species.name === speciesData.name) {
                checkEvolutionChain(chain, speciesData.name, pokemonId);
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
  }, [journeyGames, Array.from(caughtPokemonIds).join(','), showOnlyCaught]);

  const toggleExpand = (itemName: string) => {
    setExpandedItem(expandedItem === itemName ? null : itemName);
  };

  if (isLoading) {
    return (
      <div className="border rounded-lg p-8 text-center text-muted-foreground">
        <p>Loading needed items...</p>
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
      {/* Toggle for "Caught Only" */}
      <div className="flex items-center justify-end gap-2">
        <Switch
          id="show-only-caught"
          checked={showOnlyCaught}
          onCheckedChange={setShowOnlyCaught}
        />
        <Label htmlFor="show-only-caught" className="text-sm cursor-pointer">
          Caught only
        </Label>
      </div>

      <div className="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-12"></TableHead>
              <TableHead className="w-16"></TableHead>
              <TableHead>Item Name</TableHead>
              <TableHead>Location</TableHead>
              <TableHead className="text-right">Needed</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.map((item) => (
              <React.Fragment key={item.itemName}>
                <TableRow
                  className="cursor-pointer hover:bg-accent"
                  onClick={() => toggleExpand(item.itemName)}
                >
                  <TableCell>
                    <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                      {expandedItem === item.itemName ? (
                        <ChevronDown className="h-4 w-4" />
                      ) : (
                        <ChevronRight className="h-4 w-4" />
                      )}
                    </Button>
                  </TableCell>
                  <TableCell>
                    <Image
                      src={item.itemSprite}
                      alt={item.itemName}
                      width={32}
                      height={32}
                      className="pixelated"
                      unoptimized
                    />
                  </TableCell>
                  <TableCell className="font-medium">{item.itemName}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {item.topLocation}
                  </TableCell>
                  <TableCell className="text-right font-semibold">
                    ×{item.count}
                  </TableCell>
                </TableRow>
                
                {expandedItem === item.itemName && (
                  <TableRow>
                    <TableCell colSpan={5} className="bg-muted/50">
                      <div className="p-4 space-y-4">
                        {/* All Locations */}
                        <div>
                          <h4 className="text-sm font-semibold mb-2">Where to find:</h4>
                          <div className="space-y-1">
                            {item.allLocations.map((location, idx) => (
                              <p key={idx} className="text-sm text-muted-foreground">
                                • {location}
                              </p>
                            ))}
                          </div>
                        </div>
                        
                        {/* Pokemon that need this item */}
                        <div>
                          <h4 className="text-sm font-semibold mb-2">
                            Needed for {item.count} Pokémon:
                          </h4>
                          <div className="grid grid-cols-3 gap-2">
                            {item.pokemon.map((pokemon) => (
                              <div
                                key={pokemon.id}
                                className="flex items-center gap-2 px-3 py-2 bg-background border rounded-md"
                              >
                                <Image
                                  src={pokemon.sprite}
                                  alt={pokemon.name}
                                  width={32}
                                  height={32}
                                  className="pixelated flex-shrink-0"
                                  unoptimized
                                />
                                <div className="min-w-0 flex-1">
                                  <p className="capitalize text-sm font-medium truncate">
                                    {pokemon.name}
                                  </p>
                                  <p className="text-xs text-muted-foreground">
                                    #{pokemon.id.toString().padStart(3, "0")} → #{pokemon.evolvesIntoId.toString().padStart(3, "0")}
                                  </p>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    </TableCell>
                  </TableRow>
                )}
              </React.Fragment>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
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