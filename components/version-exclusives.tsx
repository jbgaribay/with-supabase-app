"use client";

import { useState, useEffect } from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Checkbox } from "@/components/ui/checkbox";
import { PokemonCard } from "@/components/pokemon-card";
import Image from "next/image";
import { getSpriteFromPokemonData } from "@/lib/sprite-utils";
import { MoreHorizontal } from "lucide-react";

interface VersionExclusivesProps {
  journeyId: string;
  journeyGames: string[];
  caughtPokemonIds: Set<number>;
}

interface ExclusivePokemon {
  id: number;
  name: string;
  sprite: string;
  exclusiveTo: string;
}

interface GroupedExclusives {
  [game: string]: ExclusivePokemon[];
}

export function VersionExclusives({ journeyId, journeyGames, caughtPokemonIds }: VersionExclusivesProps) {
  const [exclusives, setExclusives] = useState<ExclusivePokemon[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedGames, setSelectedGames] = useState<Set<string>>(new Set(journeyGames));
  const [selectedPokemon, setSelectedPokemon] = useState<ExclusivePokemon | null>(null);
  
  const ITEMS_PER_PAGE = 10;

  useEffect(() => {
    async function fetchVersionExclusives() {
      try {
        setIsLoading(true);
        setError(null);

        // For Gen 1, Pokemon IDs are 1-151
        const allPokemon = Array.from({ length: 151 }, (_, i) => i + 1);
        
        // Filter out already caught Pokemon
        const uncaughtPokemon = allPokemon.filter(id => !caughtPokemonIds.has(id));

        const exclusivesList: ExclusivePokemon[] = [];

        // Check each uncaught Pokemon
        for (const pokemonId of uncaughtPokemon) {
          try {
            // Fetch Pokemon details
            const pokemonRes = await fetch(`https://pokeapi.co/api/v2/pokemon/${pokemonId}`);
            const pokemonData = await pokemonRes.json();

            // Fetch encounter data
            const encountersRes = await fetch(`https://pokeapi.co/api/v2/pokemon/${pokemonId}/encounters`);
            const encountersData = await encountersRes.json();

            // Map game codes to PokeAPI version names
            const gameVersionMap: Record<string, string> = {
              red: "red",
              blue: "blue",
              yellow: "yellow"
            };

            // Check which of the user's games this Pokemon appears in
            const appearsInGames = new Set<string>();
            
            encountersData.forEach((encounter: any) => {
              encounter.version_details.forEach((versionDetail: any) => {
                const versionName = versionDetail.version.name;
                
                // Check if this version matches any of the user's games
                journeyGames.forEach(gameCode => {
                  if (gameVersionMap[gameCode] === versionName) {
                    appearsInGames.add(gameCode);
                  }
                });
              });
            });

            // If Pokemon appears in exactly one of the user's games, it's exclusive
            if (appearsInGames.size === 1) {
              const exclusiveGame = Array.from(appearsInGames)[0];
              exclusivesList.push({
                id: pokemonId,
                name: pokemonData.name,
                sprite: getSpriteFromPokemonData(pokemonData, journeyGames),
                exclusiveTo: exclusiveGame
              });
            }
          } catch (err) {
            console.error(`Error fetching data for Pokemon ${pokemonId}:`, err);
          }
        }

        setExclusives(exclusivesList);
      } catch (err) {
        setError("Failed to load version exclusives");
        console.error(err);
      } finally {
        setIsLoading(false);
      }
    }

    fetchVersionExclusives();
  }, [journeyGames, caughtPokemonIds]);

  // Filter exclusives based on selected games
  const filteredExclusives = exclusives.filter(pokemon => 
    selectedGames.has(pokemon.exclusiveTo)
  );

  // Group filtered exclusives by game
  const groupedExclusives: GroupedExclusives = filteredExclusives.reduce((acc, pokemon) => {
    if (!acc[pokemon.exclusiveTo]) {
      acc[pokemon.exclusiveTo] = [];
    }
    acc[pokemon.exclusiveTo].push(pokemon);
    return acc;
  }, {} as GroupedExclusives);

  // Flatten grouped exclusives for pagination
  const flattenedForDisplay: (ExclusivePokemon | { type: 'header', game: string, count: number })[] = [];
  Object.entries(groupedExclusives).forEach(([game, pokemons]) => {
    flattenedForDisplay.push({ type: 'header', game, count: pokemons.length });
    flattenedForDisplay.push(...pokemons.map(p => ({ ...p, type: 'pokemon' })));
  });

  const totalPages = Math.ceil(flattenedForDisplay.length / ITEMS_PER_PAGE);
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const endIndex = startIndex + ITEMS_PER_PAGE;
  const currentItems = flattenedForDisplay.slice(startIndex, endIndex);

  const toggleGame = (game: string) => {
    setSelectedGames(prev => {
      const newSet = new Set(prev);
      if (newSet.has(game)) {
        newSet.delete(game);
      } else {
        newSet.add(game);
      }
      return newSet;
    });
    setCurrentPage(1); // Reset to first page when filter changes
  };

  const toggleAllGames = () => {
    if (selectedGames.size === journeyGames.length) {
      setSelectedGames(new Set());
    } else {
      setSelectedGames(new Set(journeyGames));
    }
    setCurrentPage(1);
  };

  const getGameColor = (game: string) => {
    const colorMap: Record<string, string> = {
      red: 'text-red-600',
      blue: 'text-blue-600',
      yellow: 'text-yellow-600',
    };
    return colorMap[game] || '';
  };

  const getGameName = (game: string) => {
    const nameMap: Record<string, string> = {
      red: 'Red',
      blue: 'Blue',
      yellow: 'Yellow',
    };
    return nameMap[game] || game;
  };

  // Determine visible games and overflow games
  const visibleGames = journeyGames.slice(0, 2);
  const overflowGames = journeyGames.slice(2);
  const hasOverflow = overflowGames.length > 0;

  if (isLoading) {
    return (
      <div className="border rounded-lg p-8 text-center text-muted-foreground">
        <p>Loading version exclusives...</p>
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

  if (exclusives.length === 0) {
    return (
      <div className="border rounded-lg p-8 text-center text-muted-foreground">
        <p>No version exclusives found for your selected games!</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Game Filter Buttons */}
      <div className="flex gap-2 flex-wrap">
        <Button
          variant={selectedGames.size === journeyGames.length ? "default" : "outline"}
          size="sm"
          onClick={toggleAllGames}
        >
          All
        </Button>
        
        {visibleGames.map(game => (
          <Button
            key={game}
            variant={selectedGames.has(game) ? "default" : "outline"}
            size="sm"
            onClick={() => toggleGame(game)}
            className={selectedGames.has(game) ? getGameColor(game) : ''}
          >
            {getGameName(game)}
          </Button>
        ))}

        {hasOverflow && (
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" size="sm">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-48">
              <div className="space-y-2">
                <p className="text-sm font-semibold mb-2">More Games</p>
                {overflowGames.map(game => (
                  <div key={game} className="flex items-center space-x-2">
                    <Checkbox
                      id={`filter-${game}`}
                      checked={selectedGames.has(game)}
                      onCheckedChange={() => toggleGame(game)}
                    />
                    <label
                      htmlFor={`filter-${game}`}
                      className={`text-sm font-medium cursor-pointer ${getGameColor(game)}`}
                    >
                      Pokémon {getGameName(game)}
                    </label>
                  </div>
                ))}
              </div>
            </PopoverContent>
          </Popover>
        )}
      </div>

      {filteredExclusives.length === 0 ? (
        <div className="border rounded-lg p-8 text-center text-muted-foreground">
          <p>No exclusives found for the selected games.</p>
        </div>
      ) : (
        <>
          <div className="border rounded-lg overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-16">#</TableHead>
                  <TableHead className="w-20">Sprite</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Exclusive To</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {currentItems.map((item: any, idx) => {
                  if (item.type === 'header') {
                    return (
                      <TableRow key={`header-${item.game}`} className="bg-muted/50">
                        <TableCell colSpan={4} className="font-semibold">
                          <span className={getGameColor(item.game)}>
                            Pokémon {getGameName(item.game)}
                          </span>
                          {' '}({item.count})
                        </TableCell>
                      </TableRow>
                    );
                  }
                  
                  return (
                    <TableRow 
                      key={item.id}
                      className="cursor-pointer hover:bg-accent/50"
                      onClick={() => setSelectedPokemon(item)}
                    >
                      <TableCell className="font-mono text-muted-foreground">
                        #{item.id.toString().padStart(3, '0')}
                      </TableCell>
                      <TableCell>
                        <Image
                          src={item.sprite}
                          alt={item.name}
                          width={48}
                          height={48}
                          className="pixelated"
                        />
                      </TableCell>
                      <TableCell className="font-semibold capitalize">
                        {item.name}
                      </TableCell>
                      <TableCell>
                        <span className={`font-semibold capitalize ${getGameColor(item.exclusiveTo)}`}>
                          Pokémon {getGameName(item.exclusiveTo)}
                        </span>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>

          {totalPages > 1 && (
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
          )}
        </>
      )}

      {/* Pokemon Card Modal */}
      {selectedPokemon && (
        <PokemonCard
          pokemonId={selectedPokemon.id}
          pokemonName={selectedPokemon.name}
          sprite={selectedPokemon.sprite}
          isOpen={!!selectedPokemon}
          onClose={() => setSelectedPokemon(null)}
          isCaught={caughtPokemonIds.has(selectedPokemon.id)}
          journeyId={journeyId}
          journeyGames={journeyGames}
          onCatchToggle={() => {}} // Read-only for now
          isTargeted={false}
          onTargetToggle={() => {}} // Read-only for now
        />
      )}
    </div>
  );
}