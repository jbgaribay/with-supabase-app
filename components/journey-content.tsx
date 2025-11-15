"use client";

import { useState } from "react";
import { PokedexGrid } from "@/components/pokedex-grid";
import { TargetedPokemonList } from "@/components/targeted-pokemon-list";
import { JourneyNav } from "@/components/journey-nav";
import { PokemonCard } from "@/components/pokemon-card";
import { VersionExclusives } from "@/components/version-exclusives";

interface JourneyContentProps {
  journeyId: string;
  journeyGames: string[];
  initialCaughtIds: Set<number>;
  initialTargetedIds: Set<number>;
}

const SECTIONS = [
  { id: "home", label: "Home" },
  { id: "version-exclusives", label: "Version Exclusives" },
];

export function JourneyContent({
  journeyId,
  journeyGames,
  initialCaughtIds,
  initialTargetedIds,
}: JourneyContentProps) {
  const [caughtIds, setCaughtIds] = useState(initialCaughtIds);
  const [targetedIds, setTargetedIds] = useState(initialTargetedIds);
  const [refreshKey, setRefreshKey] = useState(0);
  const [selectedPokemon, setSelectedPokemon] = useState<{
    id: number;
    name: string;
    sprite: string;
  } | null>(null);

  const handleCatchToggle = (pokemonId: number, newCaughtState: boolean) => {
    setCaughtIds((prev) => {
      const newSet = new Set(prev);
      if (newCaughtState) {
        newSet.add(pokemonId);
      } else {
        newSet.delete(pokemonId);
      }
      return newSet;
    });
  };

  const handleTargetToggle = (pokemonId: number, isNowTargeted: boolean) => {
    setTargetedIds((prev) => {
      const newSet = new Set(prev);
      if (isNowTargeted) {
        newSet.add(pokemonId);
      } else {
        newSet.delete(pokemonId);
      }
      return newSet;
    });
    
    // Force targets list to refetch
    if (isNowTargeted) {
      setRefreshKey(prev => prev + 1);
    }
  };

  const handleOpenPokemonCard = (pokemonId: number, pokemonName: string, sprite: string) => {
    setSelectedPokemon({ id: pokemonId, name: pokemonName, sprite });
  };

  const handleClosePokemonCard = () => {
    setSelectedPokemon(null);
  };

  return (
    <div className="flex gap-6">
      {/* Left Navigation */}
      <div className="w-32 flex-shrink-0">
        <JourneyNav sections={SECTIONS} />
      </div>

      {/* Main Content */}
      <div className="flex-1 space-y-12">
        {/* Home Section */}
        <section id="home" className="scroll-mt-20">
          <div className="flex gap-4">
            <div className="flex-1">
              <PokedexGrid
                caughtPokemonIds={caughtIds}
                journeyId={journeyId}
                journeyGames={journeyGames}
                targetedPokemonIds={targetedIds}
                onCatchToggle={handleCatchToggle}
                onTargetToggle={handleTargetToggle}
              />
            </div>
            <div className="h-[calc(100vh-200px)]">
              <TargetedPokemonList
                key={refreshKey}
                journeyId={journeyId}
                journeyGames={journeyGames}
                caughtPokemonIds={caughtIds}
                onCatchToggle={handleCatchToggle}
                onTargetRemove={(pokemonId) => handleTargetToggle(pokemonId, false)}
                onOpenPokemonCard={handleOpenPokemonCard}
              />
            </div>
          </div>
        </section>

        {/* Version Exclusives Section */}
        <section id="version-exclusives" className="scroll-mt-20">
          <h2 className="text-2xl font-bold mb-4">Version Exclusives</h2>
          <VersionExclusives 
            journeyGames={journeyGames}
            caughtPokemonIds={caughtIds}
          />
        </section>
      </div>

      {/* Pokemon Card Modal from Targets List */}
      {selectedPokemon && (
        <PokemonCard
          pokemonId={selectedPokemon.id}
          pokemonName={selectedPokemon.name}
          sprite={selectedPokemon.sprite}
          isOpen={!!selectedPokemon}
          onClose={handleClosePokemonCard}
          isCaught={caughtIds.has(selectedPokemon.id)}
          journeyId={journeyId}
          journeyGames={journeyGames}
          onCatchToggle={handleCatchToggle}
          isTargeted={targetedIds.has(selectedPokemon.id)}
          onTargetToggle={(pokemonId, pokemonName, sprite, location) => {
            const isNowTargeted = !targetedIds.has(pokemonId);
            handleTargetToggle(pokemonId, isNowTargeted);
          }}
        />
      )}
    </div>
  );
}