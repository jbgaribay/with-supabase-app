"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getMaxGeneration } from "@/lib/sprite-utils";
import { Sparkles } from "lucide-react";

interface ItemsSummaryProps {
  journeyId: string;
  journeyGames: string[];
  caughtPokemonIds: Set<number>;
}

interface ItemSummary {
  itemName: string;
  count: number;
}

const GENERATION_MAX_ID: Record<number, number> = {
  1: 151,
  2: 251,
};

export function ItemsSummary({ journeyId, journeyGames, caughtPokemonIds }: ItemsSummaryProps) {
  const [topItems, setTopItems] = useState<ItemSummary[]>([]);
  const [totalItems, setTotalItems] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function fetchItemsSummary() {
      try {
        setIsLoading(true);

        const maxGeneration = getMaxGeneration(journeyGames);
        const maxPokemonId = GENERATION_MAX_ID[maxGeneration] || 151;

        const allPokemon = Array.from({ length: maxPokemonId }, (_, i) => i + 1);
        const uncaughtPokemon = allPokemon.filter(id => !caughtPokemonIds.has(id));

        const itemsMap: Record<string, number> = {};

        for (const pokemonId of uncaughtPokemon) {
          try {
            const speciesRes = await fetch(`https://pokeapi.co/api/v2/pokemon-species/${pokemonId}`);
            const speciesData = await speciesRes.json();

            const evolutionRes = await fetch(speciesData.evolution_chain.url);
            const evolutionData = await evolutionRes.json();

            const checkEvolutionChain = (chain: any, currentPokemon: string) => {
              if (chain.evolves_to) {
                for (const evolution of chain.evolves_to) {
                  if (chain.species.name === currentPokemon) {
                    const detail = evolution.evolution_details[0];
                    
                    if (detail.item) {
                      const itemName = detail.item.name
                        .split("-")
                        .map((word: string) => word.charAt(0).toUpperCase() + word.slice(1))
                        .join(" ");

                      itemsMap[itemName] = (itemsMap[itemName] || 0) + 1;
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

        const itemsList = Object.entries(itemsMap)
          .map(([itemName, count]) => ({ itemName, count }))
          .sort((a, b) => b.count - a.count);

        setTopItems(itemsList.slice(0, 5));
        setTotalItems(Object.keys(itemsMap).length);
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
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Sparkles className="h-4 w-4" />
            Evolution Items Needed
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">Loading...</p>
        </CardContent>
      </Card>
    );
  }

  if (totalItems === 0) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Sparkles className="h-4 w-4" />
            Evolution Items Needed
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">None needed! 🎉</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Sparkles className="h-4 w-4" />
          Evolution Items Needed
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-2xl font-bold">{totalItems} {totalItems === 1 ? 'type' : 'types'}</p>
        
        <div className="space-y-1">
          {topItems.map((item) => (
            <div key={item.itemName} className="flex justify-between text-sm">
              <span>{item.itemName}</span>
              <span className="text-muted-foreground">×{item.count}</span>
            </div>
          ))}
        </div>

        {totalItems > 5 && (
          <p className="text-xs text-muted-foreground italic">
            + {totalItems - 5} more item{totalItems - 5 > 1 ? 's' : ''}
          </p>
        )}
      </CardContent>
    </Card>
  );
}