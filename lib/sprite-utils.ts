// Helper function to determine which generation sprite to use based on journey games
export function getSpriteForGames(journeyGames: string[]): {
    generation: string;
    versionGroup: string;
  } {
    // Map games to their generations
    const gameGenerations: Record<string, number> = {
      red: 1,
      blue: 1,
      yellow: 1,
      gold: 2,
      silver: 2,
      crystal: 2,
      // Add more as needed
    };
  
    // Find the highest generation in the user's games
    const maxGen = Math.max(
      ...journeyGames.map((game) => gameGenerations[game] || 1)
    );
  
    // Map generation to sprite path
    const spriteMap: Record<number, { generation: string; versionGroup: string }> = {
      1: { generation: "generation-i", versionGroup: "red-blue" },
      2: { generation: "generation-ii", versionGroup: "crystal" },
      // Add more as needed
    };
  
    return spriteMap[maxGen] || spriteMap[1];
  }
  
  // Helper function to extract sprite from Pokemon data
  export function getSpriteFromPokemonData(
    pokemonData: any,
    journeyGames: string[]
  ): string {
    const { generation, versionGroup } = getSpriteForGames(journeyGames);
    
    return (
      pokemonData.sprites.versions[generation]?.[versionGroup]?.front_transparent ||
      pokemonData.sprites.front_default
    );
  }