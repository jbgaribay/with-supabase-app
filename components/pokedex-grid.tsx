"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import { Button } from "@/components/ui/button";

interface Pokemon {
  id: number;
  name: string;
  sprite: string;
}

interface PokedexGridProps {
  caughtPokemonIds: Set<number>;
  journeyId: string;
}

const POKEMON_PER_PAGE = 25;

export function PokedexGrid({ caughtPokemonIds, journeyId }: PokedexGridProps) {
  const [pokemon, setPokemon] = useState<Pokemon[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);

  const totalPages = Math.ceil(151 / POKEMON_PER_PAGE);
  const startIndex = (currentPage - 1) * POKEMON_PER_PAGE;
  const endIndex = startIndex + POKEMON_PER_PAGE;
  const currentPokemon = pokemon.slice(startIndex, endIndex);

  useEffect(() => {
    const fetchPokemon = async () => {
      try {
        const promises = Array.from({ length: 151 }, (_, i) => {
          const id = i + 1;
          return fetch(`https://pokeapi.co/api/v2/pokemon/${id}`)
            .then((res) => res.json())
            .then((data) => ({
              id: data.id,
              name: data.name,
              sprite: data.sprites.versions["generation-i"]["red-blue"].front_default,
            }));
        });

        const results = await Promise.all(promises);
        setPokemon(results);
      } catch (error) {
        console.error("Error fetching Pokémon:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchPokemon();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <p className="text-muted-foreground">Loading Pokédex...</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-5 gap-1">
        {currentPokemon.map((p) => {
          const isCaught = caughtPokemonIds.has(p.id);
          
          return (
            <div
              key={p.id}
              className="aspect-square border border-foreground/20 bg-background flex flex-col items-center justify-center p-2 hover:bg-accent cursor-pointer transition-colors"
            >
              <div className="relative w-full h-16 flex items-center justify-center">
                {p.sprite && (
                  <Image
                    src={p.sprite}
                    alt={p.name}
                    width={56}
                    height={56}
                    className="pixelated"
                    unoptimized
                  />
                )}
              </div>
              <p className="text-xs text-center capitalize mt-1">
                {p.name}
              </p>
              <p className="text-xs text-muted-foreground">#{p.id.toString().padStart(3, "0")}</p>
            </div>
          );
        })}
      </div>

      <div className="flex items-center justify-between">
        <Button
          onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
          disabled={currentPage === 1}
          variant="outline"
        >
          Previous
        </Button>
        
        <p className="text-sm text-muted-foreground">
          Page {currentPage} of {totalPages}
        </p>
        
        <Button
          onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
          disabled={currentPage === totalPages}
          variant="outline"
        >
          Next
        </Button>
      </div>
    </div>
  );
}