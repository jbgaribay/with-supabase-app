"use client";

import { useState } from "react";
import { PokedexGrid } from "@/components/pokedex-grid";
import { TargetedPokemonList } from "@/components/targeted-pokemon-list";
import { JourneyNav } from "@/components/journey-nav";

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
              />
            </div>
          </div>
        </section>

        {/* Version Exclusives Section */}
        <section id="version-exclusives" className="scroll-mt-20">
          <h2 className="text-2xl font-bold mb-4">Version Exclusives</h2>
          <div className="border rounded-lg p-8 text-center text-muted-foreground">
            <p>Version Exclusives feature coming soon...</p>
          </div>
        </section>
      </div>
    </div>
  );
}