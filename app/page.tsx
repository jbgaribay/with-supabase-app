"use client";

import { useState } from "react";
import { HomeNav } from "@/components/home-nav";
import { PokemonSearch } from "@/components/pokemon-search";

const SECTIONS = [
  { id: "poketerminal", label: "PokéTerminal" },
  { id: "pokeplace", label: "PokePlace" },
];

export default function HomePage() {
  return (
    <div className="flex-1 w-full p-5">
      <div className="max-w-7xl mx-auto">
        <div className="mb-6">
          <h1 className="text-3xl font-bold mb-2">PokéTools</h1>
          <p className="text-muted-foreground">
            Your comprehensive Pokémon information hub
          </p>
        </div>

        <div className="flex gap-6">
          {/* Left Navigation */}
          <div className="w-32 flex-shrink-0">
            <HomeNav sections={SECTIONS} />
          </div>

          {/* Main Content */}
          <div className="flex-1 space-y-12">
            {/* PokéTerminal Section */}
            <section id="poketerminal" className="scroll-mt-20">
              <h2 className="text-2xl font-bold mb-4">PokéTerminal</h2>
              <p className="text-muted-foreground mb-6">
                Quick Pokémon lookup - no account required
              </p>
              <PokemonSearch />
            </section>

            {/* PokePlace Section */}
            <section id="pokeplace" className="scroll-mt-20">
              <h2 className="text-2xl font-bold mb-4">PokePlace</h2>
              <div className="border rounded-lg p-8 text-center">
                <p className="text-lg mb-4">Track your Pokémon journey across multiple games!</p>
                <p className="text-muted-foreground mb-6">
                  PokePlace lets you manage your Pokédex completion across different Pokémon games,
                  track caught Pokémon, find version exclusives, discover breeding opportunities, and more.
                </p>
                <a
                  href="/auth/login"
                  className="inline-block px-6 py-3 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors"
                >
                  Sign in to use PokePlace
                </a>
              </div>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
}