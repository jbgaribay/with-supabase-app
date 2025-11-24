"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { getSpriteFromPokemonData } from "@/lib/sprite-utils";

interface BreedingOpportunitiesProps {
  journeyGames: string[];
  caughtPokemonIds: Set<number>;
}

interface BreedingOpportunity {
  babyId: number;
  babyName: string;
  babySprite: string;
  parent1Id: number;
  parent1Name: string;
  parent2Options: string; // Description of what parent2 can be
  requiresFemaleParent1: boolean;
  requiredItem?: string;
  eggGroup: string;
}

const ITEMS_PER_PAGE = 10;

export function BreedingOpportunities({
  journeyGames,
  caughtPokemonIds,
}: BreedingOpportunitiesProps) {
  const [opportunities, setOpportunities] = useState<BreedingOpportunity[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);

  useEffect(() => {
    async function fetchBreedingData() {
      setIsLoading(true);
      setError(null);

      try {
        const caughtArray = Array.from(caughtPokemonIds);
        const opportunities: BreedingOpportunity[] = [];

        // First, get data for all caught Pokemon
        const caughtPokemonData = await Promise.all(
          caughtArray.map(async (id) => {
            try {
              const [pokemonRes, speciesRes] = await Promise.all([
                fetch(`https://pokeapi.co/api/v2/pokemon/${id}`),
                fetch(`https://pokeapi.co/api/v2/pokemon-species/${id}`)
              ]);
              
              const pokemonData = await pokemonRes.json();
              const speciesData = await speciesRes.json();
              
              return {
                id,
                name: pokemonData.name,
                eggGroups: speciesData.egg_groups.map((eg: any) => eg.name),
              };
            } catch (err) {
              console.error(`Error fetching data for Pokemon ${id}:`, err);
              return null;
            }
          })
        );

        const validCaughtPokemon = caughtPokemonData.filter(p => p !== null);

        // Now check Gen 1 baby Pokemon (these are the ones that can only be obtained through breeding)
        // Gen 1 doesn't have many baby Pokemon, but let's check for evolutions
        // For now, let's check Pokemon 1-151 that aren't caught
        for (let pokemonId = 1; pokemonId <= 151; pokemonId++) {
          if (caughtPokemonIds.has(pokemonId)) continue;

          try {
            const [pokemonRes, speciesRes] = await Promise.all([
              fetch(`https://pokeapi.co/api/v2/pokemon/${pokemonId}`),
              fetch(`https://pokeapi.co/api/v2/pokemon-species/${pokemonId}`)
            ]);
            
            const pokemonData = await pokemonRes.json();
            const speciesData = await speciesRes.json();
            
            const eggGroups = speciesData.egg_groups.map((eg: any) => eg.name);
            
            // Check if any caught Pokemon can breed to produce this one
            // For basic breeding: need same egg group
            const compatibleParents = validCaughtPokemon.filter(parent => 
              parent.eggGroups.some(eg => eggGroups.includes(eg))
            );

            if (compatibleParents.length > 0) {
              // Found at least one compatible parent
              const parent = compatibleParents[0];
              
              opportunities.push({
                babyId: pokemonId,
                babyName: pokemonData.name,
                babySprite: getSpriteFromPokemonData(pokemonData, journeyGames),
                parent1Id: parent.id,
                parent1Name: parent.name,
                parent2Options: `Any Pokémon in ${eggGroups[0]} egg group`,
                requiresFemaleParent1: false,
                eggGroup: eggGroups[0],
              });
            }
          } catch (err) {
            console.error(`Error checking breeding for Pokemon ${pokemonId}:`, err);
          }
        }

        setOpportunities(opportunities);
      } catch (err) {
        setError("Failed to load breeding opportunities");
        console.error(err);
      } finally {
        setIsLoading(false);
      }
    }

    fetchBreedingData();
  }, [journeyGames, caughtPokemonIds]);

  if (isLoading) {
    return (
      <div className="border rounded-lg p-8 text-center text-muted-foreground">
        <p>Loading breeding opportunities...</p>
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

  if (opportunities.length === 0) {
    return (
      <div className="border rounded-lg p-8 text-center text-muted-foreground">
        <p>No breeding opportunities found. Catch more Pokémon to unlock breeding possibilities!</p>
      </div>
    );
  }

  // Pagination logic
  const totalPages = Math.ceil(opportunities.length / ITEMS_PER_PAGE);
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const endIndex = startIndex + ITEMS_PER_PAGE;
  const currentOpportunities = opportunities.slice(startIndex, endIndex);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          Found {opportunities.length} Pokémon you can obtain through breeding
        </p>
        {totalPages > 1 && (
          <p className="text-sm text-muted-foreground">
            Page {currentPage} of {totalPages}
          </p>
        )}
      </div>
      
      <div className="space-y-3">
        {currentOpportunities.map((opp) => (
          <div
            key={opp.babyId}
            className="border rounded-lg p-4 flex items-center gap-4 hover:bg-accent/50 transition-colors"
          >
            {/* Baby Pokemon */}
            <div className="flex items-center gap-2">
              <img src={opp.babySprite} alt={opp.babyName} className="w-16 h-16" />
              <div>
                <p className="font-semibold capitalize">{opp.babyName}</p>
                <p className="text-xs text-muted-foreground">#{opp.babyId}</p>
              </div>
            </div>

            <div className="text-2xl text-muted-foreground">←</div>

            {/* Breeding Info */}
            <div className="flex-1">
              <p className="text-sm">
                <span className="font-medium capitalize">{opp.parent1Name}</span>
                {opp.requiresFemaleParent1 && <span className="text-pink-500"> (♀)</span>}
                {" + "}
                <span className="text-muted-foreground">{opp.parent2Options}</span>
              </p>
              {opp.requiredItem && (
                <p className="text-xs text-amber-600 mt-1">
                  Requires: {opp.requiredItem}
                </p>
              )}
              <p className="text-xs text-muted-foreground mt-1">
                Egg Group: {opp.eggGroup}
              </p>
            </div>
          </div>
        ))}
      </div>

      {/* Pagination Controls */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 pt-4">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
            disabled={currentPage === 1}
          >
            Previous
          </Button>
          <span className="text-sm text-muted-foreground">
            {currentPage} / {totalPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
            disabled={currentPage === totalPages}
          >
            Next
          </Button>
        </div>
      )}
    </div>
  );
}