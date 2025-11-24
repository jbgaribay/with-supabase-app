"use client";

import { useState } from "react";
import { PokedexGrid } from "@/components/pokedex-grid";
import { TargetedPokemonList } from "@/components/targeted-pokemon-list";
import { JourneyNav } from "@/components/journey-nav";
import { PokemonCard } from "@/components/pokemon-card";
import { VersionExclusives } from "@/components/version-exclusives";
import { Settings } from "@/components/settings";
import { NeededItems } from "@/components/needed-items";
import { ItemsSummary } from "@/components/items-summary";
import { BreedingOpportunities } from "@/components/breeding-opportunities";
interface JourneyContentProps {
  journeyId: string;
  journeyGames: string[];
  initialCaughtIds: Set<number>;
  initialTargetedIds: Set<number>;
}

const SECTIONS = [
  { id: "home", label: "Home" },
  { id: "version-exclusives", label: "Version Exclusives" },
  { id: "needed-items", label: "Needed Items" },
  { id: "breeding", label: "Breeding" },
  { id: "settings", label: "Settings" },
];

export function JourneyContent({
  journeyId,
  journeyGames,
  initialCaughtIds,
  initialTargetedIds,
}: JourneyContentProps) {
  const [currentGames, setCurrentGames] = useState(journeyGames);
  const [caughtIds, setCaughtIds] = useState(initialCaughtIds);
  const [targetedIds, setTargetedIds] = useState(initialTargetedIds);
  const [refreshKey, setRefreshKey] = useState(0);
  const [selectedPokemon, setSelectedPokemon] = useState<{
    id: number;
    name: string;
    sprite: string;
  } | null>(null);

  const handleGamesUpdate = (newGames: string[]) => {
    setCurrentGames(newGames);
    setRefreshKey(prev => prev + 1);
  };

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
    // Force items summary to refresh when Pokemon are caught
    setRefreshKey(prev => prev + 1);
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
          <div className="flex">
            <div className="flex-1">
              <PokedexGrid
                key={`pokedex-${refreshKey}`}
                caughtPokemonIds={caughtIds}
                journeyId={journeyId}
                journeyGames={currentGames}
                targetedPokemonIds={targetedIds}
                onCatchToggle={handleCatchToggle}
                onTargetToggle={handleTargetToggle}
              />
            </div>
            
            {/* Right sidebar with Targets and Items - unified border */}
            <div className="w-80 ml-4 border-l pl-4 space-y-6">
              {/* Targeted Pokemon List */}
              <div className="h-[calc(50vh-100px)]">
                <TargetedPokemonList
                  key={`targets-${refreshKey}`}
                  journeyId={journeyId}
                  journeyGames={currentGames}
                  caughtPokemonIds={caughtIds}
                  onCatchToggle={handleCatchToggle}
                  onTargetRemove={(pokemonId) => handleTargetToggle(pokemonId, false)}
                  onOpenPokemonCard={handleOpenPokemonCard}
                />
              </div>

              {/* Items Summary */}
              <ItemsSummary
                key={`items-summary-${refreshKey}`}
                journeyId={journeyId}
                journeyGames={currentGames}
                caughtPokemonIds={caughtIds}
                onOpenPokemonCard={handleOpenPokemonCard}
              />
            </div>
          </div>
        </section>
        

        {/* Version Exclusives Section */}
        <section id="version-exclusives" className="scroll-mt-20">
          <h2 className="text-2xl font-bold mb-4">Version Exclusives</h2>
          <VersionExclusives 
            key={`exclusives-${refreshKey}`}
            journeyId={journeyId}
            journeyGames={currentGames}
            caughtPokemonIds={caughtIds}
          />
        </section>

        {/* Needed Items Section */}
        <section id="needed-items" className="scroll-mt-20">
          <h2 className="text-2xl font-bold mb-4">Needed Items</h2>
          <NeededItems
            key={`items-${refreshKey}`}
            journeyId={journeyId}
            journeyGames={currentGames}
            caughtPokemonIds={caughtIds}
          />
        </section>
                {/* Breeding Section */}
                <section id="breeding" className="scroll-mt-20">
          <h2 className="text-2xl font-bold mb-4">Breeding</h2>
          <BreedingOpportunities 
            journeyGames={journeyGames}
            caughtPokemonIds={caughtIds}
          />
        </section>
        {/* Settings Section */}
        <section id="settings" className="scroll-mt-20">
          <h2 className="text-2xl font-bold mb-4">Settings</h2>
          <Settings 
            journeyId={journeyId}
            currentGames={currentGames}
            onGamesUpdate={handleGamesUpdate}
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
          journeyGames={currentGames}
          onCatchToggle={handleCatchToggle}
          isTargeted={targetedIds.has(selectedPokemon.id)}
          onTargetToggle={(pokemonId, pokemonName, sprite, location) => {
            const isNowTargeted = !targetedIds.has(pokemonId);
            handleTargetToggle(pokemonId, isNowTargeted);
        }}
        onEvolutionClick={handleOpenPokemonCard}
      />
    )}
    </div>
  );
}