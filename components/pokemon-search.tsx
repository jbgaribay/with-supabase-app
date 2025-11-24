"use client";

import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Send } from "lucide-react";

// Generation to version group mappings
const GEN_VERSION_GROUPS: Record<number, string[]> = {
  1: ['red-blue', 'yellow'],
  2: ['gold-silver', 'crystal'],
  3: ['ruby-sapphire', 'emerald', 'firered-leafgreen'],
  4: ['diamond-pearl', 'platinum', 'heartgold-soulsilver'],
  5: ['black-white', 'black-2-white-2'],
  6: ['x-y', 'omega-ruby-alpha-sapphire'],
  7: ['sun-moon', 'ultra-sun-ultra-moon'],
  8: ['sword-shield'],
  9: ['scarlet-violet'],
};

// Game name to version group mapping
const GAME_TO_VERSION_GROUP: Record<string, string> = {
  'red': 'red-blue', 'blue': 'red-blue', 'yellow': 'yellow',
  'gold': 'gold-silver', 'silver': 'gold-silver', 'crystal': 'crystal',
  'ruby': 'ruby-sapphire', 'sapphire': 'ruby-sapphire', 'emerald': 'emerald',
  'firered': 'firered-leafgreen', 'leafgreen': 'firered-leafgreen',
  'diamond': 'diamond-pearl', 'pearl': 'diamond-pearl', 'platinum': 'platinum',
  'heartgold': 'heartgold-soulsilver', 'soulsilver': 'heartgold-soulsilver',
  'black': 'black-white', 'white': 'black-white',
  'black-2': 'black-2-white-2', 'white-2': 'black-2-white-2',
  'x': 'x-y', 'y': 'x-y',
  'omega-ruby': 'omega-ruby-alpha-sapphire', 'alpha-sapphire': 'omega-ruby-alpha-sapphire',
  'sun': 'sun-moon', 'moon': 'sun-moon',
  'ultra-sun': 'ultra-sun-ultra-moon', 'ultra-moon': 'ultra-sun-ultra-moon',
  'sword': 'sword-shield', 'shield': 'sword-shield',
  'scarlet': 'scarlet-violet', 'violet': 'scarlet-violet',
};

interface Message {
  id: string;
  type: 'user' | 'system' | 'pokemon' | 'moves' | 'locations' | 'evolution' | 'breeding' | 'effectiveness' | 'error';
  content: any;
  timestamp: Date;
}

interface PokemonData {
  id: number;
  name: string;
  sprite: string;
  types: string[];
  height: number;
  weight: number;
  stats: {
    hp: number;
    attack: number;
    defense: number;
    specialAttack: number;
    specialDefense: number;
    speed: number;
  };
  abilities: string[];
  description: string;
  eggGroups: string[];
  growthRate: string;
  genderRatio: string;
}

export function PokemonSearch() {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '0',
      type: 'system',
      content: 'Welcome to PokéTerminal! Type a Pokémon name or ID to begin.',
      timestamp: new Date(),
    }
  ]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [currentPokemon, setCurrentPokemon] = useState<PokemonData | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messageIdCounter = useRef(1);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const addMessage = (message: Omit<Message, 'id' | 'timestamp'>) => {
    setMessages(prev => [...prev, {
      ...message,
      id: `msg-${messageIdCounter.current++}`,
      timestamp: new Date(),
    }]);
  };

  const parseCommand = (input: string): { 
    command: string; 
    generation?: number; 
    game?: string;
    versionGroups?: string[];
  } => {
    const parts = input.toLowerCase().trim().split(/\s+/);
    const command = parts[0];

    // Check if it has "gen X" pattern
    const genIndex = parts.indexOf('gen');
    if (genIndex !== -1 && parts[genIndex + 1]) {
      const generation = parseInt(parts[genIndex + 1]);
      
      // Check if there's a game name after the generation
      if (parts[genIndex + 2]) {
        const game = parts.slice(genIndex + 2).join('-');
        const versionGroup = GAME_TO_VERSION_GROUP[game];
        
        return {
          command,
          generation,
          game,
          versionGroups: versionGroup ? [versionGroup] : undefined,
        };
      }
      
      // Just generation, no specific game
      return {
        command,
        generation,
        versionGroups: GEN_VERSION_GROUPS[generation],
      };
    }

    // Check if it's just a game name (e.g., "location firered")
    if (parts.length > 1) {
      const potentialGame = parts.slice(1).join('-');
      const versionGroup = GAME_TO_VERSION_GROUP[potentialGame];
      
      if (versionGroup) {
        // Find which generation this game belongs to
        const generation = Object.entries(GEN_VERSION_GROUPS).find(([_, groups]) => 
          groups.includes(versionGroup)
        )?.[0];
        
        return {
          command,
          game: potentialGame,
          generation: generation ? parseInt(generation) : undefined,
          versionGroups: [versionGroup],
        };
      }
    }

    return { command };
  };

  const fetchPokemonData = async (query: string): Promise<PokemonData | null> => {
    try {
      const pokemonRes = await fetch(
        `https://pokeapi.co/api/v2/pokemon/${query.toLowerCase().trim()}`
      );
      
      if (!pokemonRes.ok) return null;

      const pokemon = await pokemonRes.json();
      const speciesRes = await fetch(
        `https://pokeapi.co/api/v2/pokemon-species/${pokemon.id}`
      );
      const species = await speciesRes.json();

      let description = "No description available.";
      const flavorText = species.flavor_text_entries.find(
        (entry: any) => entry.language.name === "en"
      );
      if (flavorText) {
        description = flavorText.flavor_text.replace(/\n|\f/g, " ");
      }

      const eggGroups = species.egg_groups.map((eg: any) =>
        eg.name
          .split("-")
          .map((word: string) => word.charAt(0).toUpperCase() + word.slice(1))
          .join(" ")
      );

      const growthRate = species.growth_rate?.name
        .split("-")
        .map((word: string) => word.charAt(0).toUpperCase() + word.slice(1))
        .join(" ") || "Unknown";

      let genderRatio = "Genderless";
      if (species.gender_rate !== -1) {
        const femaleRatio = (species.gender_rate / 8) * 100;
        const maleRatio = 100 - femaleRatio;
        genderRatio = `${maleRatio}% ♂ / ${femaleRatio}% ♀`;
      }

      return {
        id: pokemon.id,
        name: pokemon.name,
        sprite: pokemon.sprites.front_default,
        types: pokemon.types.map((t: any) => t.type.name),
        height: pokemon.height / 10,
        weight: pokemon.weight / 10,
        stats: {
          hp: pokemon.stats[0].base_stat,
          attack: pokemon.stats[1].base_stat,
          defense: pokemon.stats[2].base_stat,
          specialAttack: pokemon.stats[3].base_stat,
          specialDefense: pokemon.stats[4].base_stat,
          speed: pokemon.stats[5].base_stat,
        },
        abilities: pokemon.abilities.map((a: any) =>
          a.ability.name
            .split("-")
            .map((word: string) => word.charAt(0).toUpperCase() + word.slice(1))
            .join(" ")
        ),
        description,
        eggGroups,
        growthRate,
        genderRatio,
      };
    } catch (err) {
      return null;
    }
  };

  const handleCommand = async (command: string) => {
    if (!command.trim()) return;

    setIsLoading(true);
    
    // Add user message
    addMessage({
      type: 'user',
      content: command,
    });

    const cmdLower = command.toLowerCase().trim();

    // Help command
    if (cmdLower === 'help' || cmdLower === 'commands') {
      addMessage({
        type: 'system',
        content: `Available commands:
• Search: Type any Pokémon name or ID
• help - Show this message
• clear - Clear chat history

After searching a Pokémon:
• moves - Show all level-up moves
• moves gen X - Show all moves for generation X
• moves gen X [game] - Show moves for specific game
• learnset gen X - Show only level-up moves for gen X
• tm gen X - Show only TM/HM moves for gen X
• egg gen X - Show only egg moves for gen X
• tutor gen X - Show only tutor moves for gen X
• locations - Show all encounter locations
• location gen X - Show locations for generation X
• location [game] - Show locations for specific game
• evo - Show evolution chain
• breeding - Show breeding info
• type - Show type effectiveness

Examples:
• moves gen 3 - All Gen 3 moves
• learnset gen 3 firered - FireRed level-up moves
• tm gen 4 platinum - Platinum TMs
• location emerald - Emerald locations`,
      });
      setIsLoading(false);
      return;
    }

    // Clear command
    if (cmdLower === 'clear') {
      setMessages([{
        id: '0',
        type: 'system',
        content: 'Chat cleared. Type a Pokémon name to begin.',
        timestamp: new Date(),
      }]);
      setCurrentPokemon(null);
      setIsLoading(false);
      return;
    }

    // Context-aware commands (require current pokemon)
    const parsed = parseCommand(cmdLower);
    const commandTypes = ['moves', 'learnset', 'tm', 'egg', 'tutor', 'locations', 'location', 'evo', 'evolution', 'breeding', 'breed', 'type', 'effectiveness'];
    
    if (commandTypes.includes(parsed.command)) {
      if (!currentPokemon) {
        addMessage({
          type: 'error',
          content: 'Please search for a Pokémon first!',
        });
        setIsLoading(false);
        return;
      }

      // Handle moves-related commands
      if (['moves', 'learnset', 'tm', 'egg', 'tutor'].includes(parsed.command)) {
        try {
          const pokemonRes = await fetch(`https://pokeapi.co/api/v2/pokemon/${currentPokemon.id}`);
          const pokemon = await pokemonRes.json();

          let moveType = parsed.command;
          let filteredMoves = pokemon.moves;

          // Filter by learn method
          if (moveType === 'learnset') {
            filteredMoves = filteredMoves.filter((m: any) =>
              m.version_group_details.some((vg: any) => 
                vg.move_learn_method.name === "level-up"
              )
            );
          } else if (moveType === 'tm') {
            filteredMoves = filteredMoves.filter((m: any) =>
              m.version_group_details.some((vg: any) => 
                vg.move_learn_method.name === "machine"
              )
            );
          } else if (moveType === 'egg') {
            filteredMoves = filteredMoves.filter((m: any) =>
              m.version_group_details.some((vg: any) => 
                vg.move_learn_method.name === "egg"
              )
            );
          } else if (moveType === 'tutor') {
            filteredMoves = filteredMoves.filter((m: any) =>
              m.version_group_details.some((vg: any) => 
                vg.move_learn_method.name === "tutor"
              )
            );
          }

          const moves = [];
          for (const moveEntry of filteredMoves.slice(0, 30)) {
            const moveRes = await fetch(moveEntry.move.url);
            const moveData = await moveRes.json();
            
            // Filter by version group if specified
            let versionDetail;
            if (parsed.versionGroups) {
              versionDetail = moveEntry.version_group_details.find((vg: any) =>
                parsed.versionGroups!.includes(vg.version_group.name) &&
                (moveType === 'moves' || 
                 moveType === 'learnset' && vg.move_learn_method.name === 'level-up' ||
                 moveType === 'tm' && vg.move_learn_method.name === 'machine' ||
                 moveType === 'egg' && vg.move_learn_method.name === 'egg' ||
                 moveType === 'tutor' && vg.move_learn_method.name === 'tutor')
              );
            } else {
              // No filter, just get the first one matching the learn method
              versionDetail = moveEntry.version_group_details.find((vg: any) =>
                moveType === 'moves' || 
                moveType === 'learnset' && vg.move_learn_method.name === 'level-up' ||
                moveType === 'tm' && vg.move_learn_method.name === 'machine' ||
                moveType === 'egg' && vg.move_learn_method.name === 'egg' ||
                moveType === 'tutor' && vg.move_learn_method.name === 'tutor'
              );
            }

            if (!versionDetail) continue;

            moves.push({
              name: moveData.name
                .split("-")
                .map((word: string) => word.charAt(0).toUpperCase() + word.slice(1))
                .join(" "),
              type: moveData.type.name,
              category: moveData.damage_class.name,
              power: moveData.power,
              accuracy: moveData.accuracy,
              level: versionDetail.level_learned_at || 0,
              learnMethod: versionDetail.move_learn_method.name,
            });
          }

          moves.sort((a, b) => {
            if (a.level !== b.level) return a.level - b.level;
            return a.name.localeCompare(b.name);
          });

          const displayName = parsed.game 
            ? `${currentPokemon.name} (${parsed.game})`
            : parsed.generation
            ? `${currentPokemon.name} (Gen ${parsed.generation})`
            : currentPokemon.name;

          addMessage({
            type: 'moves',
            content: { 
              pokemon: displayName, 
              moves,
              moveType: moveType === 'moves' ? 'all' : moveType,
            },
          });
        } catch (err) {
          addMessage({
            type: 'error',
            content: 'Failed to load moves data.',
          });
        }
      } else if (parsed.command === 'locations' || parsed.command === 'location') {
      } else if (parsed.command === 'locations' || parsed.command === 'location') {
        try {
          const pokemonRes = await fetch(`https://pokeapi.co/api/v2/pokemon/${currentPokemon.id}`);
          const pokemon = await pokemonRes.json();
          const encountersRes = await fetch(pokemon.location_area_encounters);
          const encountersData = await encountersRes.json();

          const locations = [];
          const locationMap = new Map();

          // Version name to version group for filtering
          const versionToGroup: Record<string, string> = {
            'red': 'red-blue', 'blue': 'red-blue', 'yellow': 'yellow',
            'gold': 'gold-silver', 'silver': 'gold-silver', 'crystal': 'crystal',
            'ruby': 'ruby-sapphire', 'sapphire': 'ruby-sapphire', 'emerald': 'emerald',
            'firered': 'firered-leafgreen', 'leafgreen': 'firered-leafgreen',
            'diamond': 'diamond-pearl', 'pearl': 'diamond-pearl', 'platinum': 'platinum',
            'heartgold': 'heartgold-soulsilver', 'soulsilver': 'heartgold-soulsilver',
            'black': 'black-white', 'white': 'black-white',
            'black-2': 'black-2-white-2', 'white-2': 'black-2-white-2',
            'x': 'x-y', 'y': 'x-y',
            'omega-ruby': 'omega-ruby-alpha-sapphire', 'alpha-sapphire': 'omega-ruby-alpha-sapphire',
            'sun': 'sun-moon', 'moon': 'sun-moon',
            'ultra-sun': 'ultra-sun-ultra-moon', 'ultra-moon': 'ultra-sun-ultra-moon',
            'sword': 'sword-shield', 'shield': 'sword-shield',
            'scarlet': 'scarlet-violet', 'violet': 'scarlet-violet',
          };

          for (const encounter of encountersData) {
            const locationName = encounter.location_area.name
              .split("-")
              .join(" ")
              .replace(/\b\w/g, (l: string) => l.toUpperCase());

            for (const versionDetail of encounter.version_details) {
              const game = versionDetail.version.name;
              const versionGroup = versionToGroup[game];

              // Filter by version group if specified
              // If no filter, include all versions
              if (parsed.versionGroups) {
                if (!parsed.versionGroups.includes(versionGroup)) {
                  continue;
                }
              }

              const methods = versionDetail.encounter_details.map((ed: any) => 
                ed.method.name
                  .split("-")
                  .map((word: string) => word.charAt(0).toUpperCase() + word.slice(1))
                  .join(" ")
              );

              const levels = versionDetail.encounter_details.map((ed: any) => ({
                min: ed.min_level,
                max: ed.max_level,
              }));

              const minLevel = Math.min(...levels.map((l: { min: number; max: number }) => l.min));
              const maxLevel = Math.max(...levels.map((l: { min: number; max: number }) => l.max));
              const levelRange = minLevel === maxLevel ? `Lv. ${minLevel}` : `Lv. ${minLevel}-${maxLevel}`;

              const key = `${locationName}-${levelRange}`;
              
              if (locationMap.has(key)) {
                const existing = locationMap.get(key);
                existing.methods = [...new Set([...existing.methods, ...methods])];
                existing.games = [...new Set([...existing.games, game])];
              } else {
                locationMap.set(key, {
                  location: locationName,
                  methods,
                  games: [game],
                  levelRange,
                });
              }
            }
          }

          locations.push(...Array.from(locationMap.values()).slice(0, 20));

          const displayName = parsed.game 
            ? `${currentPokemon.name} (${parsed.game})`
            : parsed.generation
            ? `${currentPokemon.name} (Gen ${parsed.generation})`
            : currentPokemon.name;

          addMessage({
            type: 'locations',
            content: { pokemon: displayName, locations },
          });
        } catch (err) {
          const displayName = parsed.game 
            ? `${currentPokemon.name} (${parsed.game})`
            : parsed.generation
            ? `${currentPokemon.name} (Gen ${parsed.generation})`
            : currentPokemon.name;
            
          addMessage({
            type: 'locations',
            content: { pokemon: displayName, locations: [] },
          });
        }
      } else if (parsed.command === 'evo' || parsed.command === 'evolution') {
        try {
          const speciesRes = await fetch(`https://pokeapi.co/api/v2/pokemon-species/${currentPokemon.id}`);
          const species = await speciesRes.json();
          
          const evolutionRes = await fetch(species.evolution_chain.url);
          const evolutionData = await evolutionRes.json();

          const evolutionChain = [];

          const buildChain = async (chainLink: any, previousMethod?: string) => {
            const id = parseInt(chainLink.species.url.split("/").slice(-2, -1)[0]);
            const pokemonResponse = await fetch(`https://pokeapi.co/api/v2/pokemon/${id}`);
            const pokemonData = await pokemonResponse.json();

            evolutionChain.push({
              name: chainLink.species.name,
              id,
              sprite: pokemonData.sprites.front_default,
              evolutionMethod: previousMethod,
            });

            if (chainLink.evolves_to && chainLink.evolves_to.length > 0) {
              for (const evolution of chainLink.evolves_to) {
                const detail = evolution.evolution_details[0];
                let method = "";

                if (detail.min_level) {
                  method = `Level ${detail.min_level}`;
                } else if (detail.item) {
                  const itemName = detail.item.name
                    .split("-")
                    .map((word: string) => word.charAt(0).toUpperCase() + word.slice(1))
                    .join(" ");
                  method = `Use ${itemName}`;
                } else if (detail.trigger.name === "trade") {
                  if (detail.held_item) {
                    const itemName = detail.held_item.name
                      .split("-")
                      .map((word: string) => word.charAt(0).toUpperCase() + word.slice(1))
                      .join(" ");
                    method = `Trade holding ${itemName}`;
                  } else {
                    method = "Trade";
                  }
                }

                await buildChain(evolution, method);
              }
            }
          };

          await buildChain(evolutionData.chain);

          addMessage({
            type: 'evolution',
            content: { pokemon: currentPokemon.name, evolutionChain },
          });
        } catch (err) {
          addMessage({
            type: 'error',
            content: 'Failed to load evolution data.',
          });
        }
      } else if (cmdLower === 'breeding' || cmdLower === 'breed') {
        addMessage({
          type: 'breeding',
          content: currentPokemon,
        });
      } else if (cmdLower === 'type' || cmdLower === 'effectiveness') {
        addMessage({
          type: 'effectiveness',
          content: { pokemon: currentPokemon.name, types: currentPokemon.types },
        });
      }

      setIsLoading(false);
      return;
    }

    // Default: Search for Pokemon
    const pokemonData = await fetchPokemonData(command);
    
    if (pokemonData) {
      setCurrentPokemon(pokemonData);
      addMessage({
        type: 'pokemon',
        content: pokemonData,
      });
    } else {
      addMessage({
        type: 'error',
        content: `Pokémon "${command}" not found. Check spelling or try using the Pokédex number.`,
      });
    }

    setIsLoading(false);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (input.trim() && !isLoading) {
      handleCommand(input);
      setInput("");
    }
  };

  return (
    <div className="flex flex-col h-[600px] border rounded-lg bg-background">
      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((message) => (
          <MessageCard key={message.id} message={message} />
        ))}
        {isLoading && (
          <div className="flex items-center gap-2 text-muted-foreground">
            <div className="animate-spin h-4 w-4 border-2 border-primary border-t-transparent rounded-full" />
            <span>Processing...</span>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="border-t p-4">
        <form onSubmit={handleSubmit} className="flex gap-2">
          <Input
            type="text"
            placeholder={
              currentPokemon 
                ? `Current: ${currentPokemon.name} | Type a command...`
                : "Type a Pokémon name or 'help'..."
            }
            value={input}
            onChange={(e) => setInput(e.target.value)}
            disabled={isLoading}
            className="flex-1"
          />
          <Button type="submit" disabled={isLoading || !input.trim()}>
            <Send className="h-4 w-4" />
          </Button>
        </form>
      </div>
    </div>
  );
}

function MessageCard({ message }: { message: Message }) {
  if (message.type === 'user') {
    return (
      <div className="flex justify-end">
        <div className="bg-primary text-primary-foreground rounded-lg px-4 py-2 max-w-[80%]">
          <p className="text-sm font-mono">{message.content}</p>
        </div>
      </div>
    );
  }

  if (message.type === 'system') {
    return (
      <div className="flex justify-center">
        <div className="bg-muted rounded-lg px-4 py-2 max-w-[80%] text-center">
          <p className="text-sm text-muted-foreground whitespace-pre-line">{message.content}</p>
        </div>
      </div>
    );
  }

  if (message.type === 'error') {
    return (
      <div className="flex justify-start">
        <div className="bg-red-500/10 border border-red-500/20 rounded-lg px-4 py-2 max-w-[80%]">
          <p className="text-sm text-red-500">{message.content}</p>
        </div>
      </div>
    );
  }

  if (message.type === 'pokemon') {
    const pokemon = message.content as PokemonData;
    return (
      <div className="flex justify-start">
        <div className="border rounded-lg p-4 max-w-[90%] bg-card">
          <div className="flex items-start gap-4">
            <img
              src={pokemon.sprite}
              alt={pokemon.name}
              className="w-24 h-24"
            />
            <div className="flex-1">
              <h3 className="text-xl font-bold capitalize mb-2">
                #{pokemon.id.toString().padStart(3, "0")} - {pokemon.name}
              </h3>
              <div className="flex gap-2 mb-2">
                {pokemon.types.map((type) => (
                  <span
                    key={type}
                    className="px-3 py-1 rounded-full text-xs font-medium bg-primary/10 text-primary capitalize"
                  >
                    {type}
                  </span>
                ))}
              </div>
              <p className="text-sm text-muted-foreground mb-2">
                Height: {pokemon.height}m | Weight: {pokemon.weight}kg
              </p>
              <p className="text-sm mb-3">{pokemon.description}</p>
              
              {/* Stats */}
              <div className="space-y-1">
                <StatBar label="HP" value={pokemon.stats.hp} />
                <StatBar label="Attack" value={pokemon.stats.attack} />
                <StatBar label="Defense" value={pokemon.stats.defense} />
                <StatBar label="Sp. Atk" value={pokemon.stats.specialAttack} />
                <StatBar label="Sp. Def" value={pokemon.stats.specialDefense} />
                <StatBar label="Speed" value={pokemon.stats.speed} />
              </div>

              {/* Quick Commands */}
              <div className="mt-3 pt-3 border-t">
                <p className="text-xs text-muted-foreground mb-2">Try: moves | locations | evo | breeding | type</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (message.type === 'breeding') {
    const pokemon = message.content as PokemonData;
    return (
      <div className="flex justify-start">
        <div className="border rounded-lg p-4 max-w-[90%] bg-card">
          <h4 className="font-semibold mb-2 capitalize">Breeding Info - {pokemon.name}</h4>
          <div className="space-y-2 text-sm">
            <div>
              <span className="font-medium">Egg Groups: </span>
              <span className="text-muted-foreground">{pokemon.eggGroups.join(", ")}</span>
            </div>
            <div>
              <span className="font-medium">Gender Ratio: </span>
              <span className="text-muted-foreground">{pokemon.genderRatio}</span>
            </div>
            <div>
              <span className="font-medium">Growth Rate: </span>
              <span className="text-muted-foreground">{pokemon.growthRate}</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (message.type === 'moves') {
    const { pokemon, moves, moveType } = message.content;
    const moveTypeLabel = moveType === 'all' ? 'All Moves' :
                          moveType === 'learnset' ? 'Level-up Moves' :
                          moveType === 'tm' ? 'TM/HM Moves' :
                          moveType === 'egg' ? 'Egg Moves' :
                          moveType === 'tutor' ? 'Tutor Moves' : 'Moves';
    
    return (
      <div className="flex justify-start">
        <div className="border rounded-lg p-4 max-w-[95%] bg-card">
          <h4 className="font-semibold mb-3 capitalize">{moveTypeLabel} - {pokemon}</h4>
          {moves.length > 0 ? (
            <div className="border rounded-lg overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-accent">
                  <tr>
                    <th className="text-left p-2">Level</th>
                    <th className="text-left p-2">Move</th>
                    <th className="text-left p-2">Type</th>
                    <th className="text-left p-2">Category</th>
                    <th className="text-right p-2">Power</th>
                    <th className="text-right p-2">Acc</th>
                  </tr>
                </thead>
                <tbody>
                  {moves.map((move: any, index: number) => (
                    <tr key={index} className="border-t">
                      <td className="p-2">{move.level || "—"}</td>
                      <td className="p-2 font-medium">{move.name}</td>
                      <td className="p-2">
                        <span className="px-2 py-0.5 rounded text-xs bg-primary/10 capitalize">
                          {move.type}
                        </span>
                      </td>
                      <td className="p-2 capitalize">{move.category}</td>
                      <td className="p-2 text-right">{move.power || "—"}</td>
                      <td className="p-2 text-right">{move.accuracy || "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              No moves found for this generation/game combination.
            </p>
          )}
        </div>
      </div>
    );
  }

  if (message.type === 'locations') {
    const { pokemon, locations } = message.content;
    return (
      <div className="flex justify-start">
        <div className="border rounded-lg p-4 max-w-[95%] bg-card">
          <h4 className="font-semibold mb-3 capitalize">Locations - {pokemon}</h4>
          {locations.length > 0 ? (
            <div className="border rounded-lg overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-accent">
                  <tr>
                    <th className="text-left p-2">Location</th>
                    <th className="text-left p-2">Method</th>
                    <th className="text-left p-2">Level</th>
                    <th className="text-left p-2">Games</th>
                  </tr>
                </thead>
                <tbody>
                  {locations.map((location: any, index: number) => (
                    <tr key={index} className="border-t">
                      <td className="p-2">{location.location}</td>
                      <td className="p-2">{location.methods.join(", ")}</td>
                      <td className="p-2">{location.levelRange}</td>
                      <td className="p-2">
                        <div className="flex gap-1 flex-wrap">
                          {location.games.map((game: string) => (
                            <span
                              key={game}
                              className="px-1.5 py-0.5 rounded text-xs bg-primary/10 capitalize"
                            >
                              {game}
                            </span>
                          ))}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              No wild encounter locations found. This Pokémon may be obtained through evolution, trading, or events.
            </p>
          )}
        </div>
      </div>
    );
  }

  if (message.type === 'evolution') {
    const { pokemon, evolutionChain } = message.content;
    return (
      <div className="flex justify-start">
        <div className="border rounded-lg p-4 max-w-[95%] bg-card">
          <h4 className="font-semibold mb-3 capitalize">Evolution Chain - {pokemon}</h4>
          <div className="flex items-center gap-4 flex-wrap">
            {evolutionChain.map((evo: any, index: number) => (
              <div key={evo.id} className="flex items-center gap-4">
                <div className="flex flex-col items-center gap-2">
                  <img src={evo.sprite} alt={evo.name} className="w-20 h-20" />
                  <span className="text-sm font-medium capitalize">{evo.name}</span>
                </div>
                {index < evolutionChain.length - 1 && (
                  <div className="flex flex-col items-center">
                    <span className="text-2xl text-muted-foreground">→</span>
                    {evolutionChain[index + 1].evolutionMethod && (
                      <span className="text-xs text-muted-foreground">
                        {evolutionChain[index + 1].evolutionMethod}
                      </span>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (message.type === 'effectiveness') {
    const { pokemon, types } = message.content;
    
    // Type chart
    const TYPE_CHART: Record<string, { weakTo: string[]; resistantTo: string[]; immuneTo: string[] }> = {
      normal: { weakTo: ['fighting'], resistantTo: [], immuneTo: ['ghost'] },
      fire: { weakTo: ['water', 'ground', 'rock'], resistantTo: ['fire', 'grass', 'ice', 'bug', 'steel', 'fairy'], immuneTo: [] },
      water: { weakTo: ['electric', 'grass'], resistantTo: ['fire', 'water', 'ice', 'steel'], immuneTo: [] },
      electric: { weakTo: ['ground'], resistantTo: ['electric', 'flying', 'steel'], immuneTo: [] },
      grass: { weakTo: ['fire', 'ice', 'poison', 'flying', 'bug'], resistantTo: ['water', 'electric', 'grass', 'ground'], immuneTo: [] },
      ice: { weakTo: ['fire', 'fighting', 'rock', 'steel'], resistantTo: ['ice'], immuneTo: [] },
      fighting: { weakTo: ['flying', 'psychic', 'fairy'], resistantTo: ['bug', 'rock', 'dark'], immuneTo: [] },
      poison: { weakTo: ['ground', 'psychic'], resistantTo: ['grass', 'fighting', 'poison', 'bug', 'fairy'], immuneTo: [] },
      ground: { weakTo: ['water', 'grass', 'ice'], resistantTo: ['poison', 'rock'], immuneTo: ['electric'] },
      flying: { weakTo: ['electric', 'ice', 'rock'], resistantTo: ['grass', 'fighting', 'bug'], immuneTo: ['ground'] },
      psychic: { weakTo: ['bug', 'ghost', 'dark'], resistantTo: ['fighting', 'psychic'], immuneTo: [] },
      bug: { weakTo: ['fire', 'flying', 'rock'], resistantTo: ['grass', 'fighting', 'ground'], immuneTo: [] },
      rock: { weakTo: ['water', 'grass', 'fighting', 'ground', 'steel'], resistantTo: ['normal', 'fire', 'poison', 'flying'], immuneTo: [] },
      ghost: { weakTo: ['ghost', 'dark'], resistantTo: ['poison', 'bug'], immuneTo: ['normal', 'fighting'] },
      dragon: { weakTo: ['ice', 'dragon', 'fairy'], resistantTo: ['fire', 'water', 'electric', 'grass'], immuneTo: [] },
      dark: { weakTo: ['fighting', 'bug', 'fairy'], resistantTo: ['ghost', 'dark'], immuneTo: ['psychic'] },
      steel: { weakTo: ['fire', 'fighting', 'ground'], resistantTo: ['normal', 'grass', 'ice', 'flying', 'psychic', 'bug', 'rock', 'dragon', 'steel', 'fairy'], immuneTo: ['poison'] },
      fairy: { weakTo: ['poison', 'steel'], resistantTo: ['fighting', 'bug', 'dark'], immuneTo: ['dragon'] },
    };

    // Calculate effectiveness
    const effectiveness: Record<string, number> = {};
    types.forEach((type: string) => {
      const typeData = TYPE_CHART[type.toLowerCase()];
      if (!typeData) return;

      typeData.weakTo.forEach((attackType) => {
        effectiveness[attackType] = (effectiveness[attackType] || 1) * 2;
      });
      typeData.resistantTo.forEach((attackType) => {
        effectiveness[attackType] = (effectiveness[attackType] || 1) * 0.5;
      });
      typeData.immuneTo.forEach((attackType) => {
        effectiveness[attackType] = 0;
      });
    });

    const weakTo: string[] = [];
    const resistantTo: string[] = [];
    const immuneTo: string[] = [];

    Object.entries(effectiveness).forEach(([type, multiplier]) => {
      if (multiplier === 0) {
        immuneTo.push(type);
      } else if (multiplier >= 2) {
        weakTo.push(type);
      } else if (multiplier <= 0.5) {
        resistantTo.push(type);
      }
    });

    return (
      <div className="flex justify-start">
        <div className="border rounded-lg p-4 max-w-[90%] bg-card">
          <h4 className="font-semibold mb-3 capitalize">Type Effectiveness - {pokemon}</h4>
          <div className="space-y-2 text-sm">
            {weakTo.length > 0 && (
              <div>
                <span className="font-medium text-red-500">Weak to: </span>
                <div className="inline-flex gap-1 flex-wrap">
                  {weakTo.map((type) => (
                    <span
                      key={type}
                      className="px-2 py-0.5 rounded text-xs bg-red-500/20 text-red-500 capitalize"
                    >
                      {type}
                    </span>
                  ))}
                </div>
              </div>
            )}
            {resistantTo.length > 0 && (
              <div>
                <span className="font-medium text-green-500">Resistant to: </span>
                <div className="inline-flex gap-1 flex-wrap">
                  {resistantTo.map((type) => (
                    <span
                      key={type}
                      className="px-2 py-0.5 rounded text-xs bg-green-500/20 text-green-500 capitalize"
                    >
                      {type}
                    </span>
                  ))}
                </div>
              </div>
            )}
            {immuneTo.length > 0 && (
              <div>
                <span className="font-medium text-blue-500">Immune to: </span>
                <div className="inline-flex gap-1 flex-wrap">
                  {immuneTo.map((type) => (
                    <span
                      key={type}
                      className="px-2 py-0.5 rounded text-xs bg-blue-500/20 text-blue-500 capitalize"
                    >
                      {type}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  return null;
}

function StatBar({ label, value }: { label: string; value: number }) {
  const percentage = (value / 255) * 100;

  return (
    <div className="flex items-center gap-2">
      <span className="text-xs w-16 font-medium">{label}</span>
      <span className="text-xs w-8 text-right">{value}</span>
      <div className="flex-1 bg-accent rounded-full h-1.5 overflow-hidden">
        <div
          className="bg-primary h-full transition-all"
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
}