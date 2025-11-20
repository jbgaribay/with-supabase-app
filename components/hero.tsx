import Link from "next/link";
import { Button } from "./ui/button";
import { Check, Target, Gem, Gamepad2 } from "lucide-react";

export function Hero() {
  return (
    <div className="flex flex-col items-center gap-16 px-4">
      {/* Main Hero Section */}
      <div className="flex flex-col items-center gap-8 text-center max-w-3xl">
        <div className="flex flex-col items-center gap-4">
          <h1 className="text-5xl md:text-6xl font-bold tracking-tight">
            Track Your Pokémon Journey
          </h1>
          <p className="text-xl text-muted-foreground max-w-2xl">
            Your ultimate companion for completing the Pokédex across Gen 1 & 2 games.
            Never lose track of your progress again.
          </p>
        </div>
        
        <div className="flex gap-4">
          <Button asChild size="lg" className="text-lg px-8">
            <Link href="/auth/sign-up">Start Your Journey</Link>
          </Button>
          <Button asChild size="lg" variant="outline" className="text-lg px-8">
            <Link href="/auth/login">Sign In</Link>
          </Button>
        </div>

        {/* Stats */}
        <div className="flex gap-8 mt-4 text-center">
          <div>
            <p className="text-3xl font-bold">251</p>
            <p className="text-sm text-muted-foreground">Pokémon</p>
          </div>
          <div>
            <p className="text-3xl font-bold">7</p>
            <p className="text-sm text-muted-foreground">Games</p>
          </div>
          <div>
            <p className="text-3xl font-bold">100%</p>
            <p className="text-sm text-muted-foreground">Free</p>
          </div>
        </div>
      </div>

      {/* Features Grid */}
      <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 w-full max-w-5xl mt-8">
        <div className="flex flex-col items-center gap-3 p-6 border rounded-lg bg-card hover:bg-accent/50 transition-colors">
          <div className="p-3 rounded-full bg-primary/10">
            <Check className="h-6 w-6 text-primary" />
          </div>
          <h3 className="font-semibold">Track Progress</h3>
          <p className="text-sm text-muted-foreground text-center">
            Mark Pokémon as caught across multiple games and see your completion percentage
          </p>
        </div>

        <div className="flex flex-col items-center gap-3 p-6 border rounded-lg bg-card hover:bg-accent/50 transition-colors">
          <div className="p-3 rounded-full bg-primary/10">
            <Target className="h-6 w-6 text-primary" />
          </div>
          <h3 className="font-semibold">Target Pokémon</h3>
          <p className="text-sm text-muted-foreground text-center">
            Create a hunt list with exact locations, encounter rates, and level ranges
          </p>
        </div>

        <div className="flex flex-col items-center gap-3 p-6 border rounded-lg bg-card hover:bg-accent/50 transition-colors">
          <div className="p-3 rounded-full bg-primary/10">
            <Gem className="h-6 w-6 text-primary" />
          </div>
          <h3 className="font-semibold">Evolution Items</h3>
          <p className="text-sm text-muted-foreground text-center">
            Never miss evolution stones or items with automatic tracking and locations
          </p>
        </div>

        <div className="flex flex-col items-center gap-3 p-6 border rounded-lg bg-card hover:bg-accent/50 transition-colors">
          <div className="p-3 rounded-full bg-primary/10">
            <Gamepad2 className="h-6 w-6 text-primary" />
          </div>
          <h3 className="font-semibold">Version Exclusives</h3>
          <p className="text-sm text-muted-foreground text-center">
            Easily see which Pokémon are exclusive to each game version
          </p>
        </div>
      </div>

      {/* How It Works */}
      <div className="flex flex-col items-center gap-8 w-full max-w-4xl mt-8">
        <h2 className="text-3xl font-bold">How It Works</h2>
        <div className="grid md:grid-cols-3 gap-8 w-full">
          <div className="flex flex-col items-center gap-3 text-center">
            <div className="w-12 h-12 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xl font-bold">
              1
            </div>
            <h3 className="font-semibold text-lg">Create a Journey</h3>
            <p className="text-sm text-muted-foreground">
              Select which games you're playing
            </p>
          </div>

          <div className="flex flex-col items-center gap-3 text-center">
            <div className="w-12 h-12 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xl font-bold">
              2
            </div>
            <h3 className="font-semibold text-lg">Track Your Pokédex</h3>
            <p className="text-sm text-muted-foreground">
              Mark Pokémon as caught, target specific ones, and track your completion
            </p>
          </div>

          <div className="flex flex-col items-center gap-3 text-center">
            <div className="w-12 h-12 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xl font-bold">
              3
            </div>
            <h3 className="font-semibold text-lg">Complete Your Journey</h3>
            <p className="text-sm text-muted-foreground">
              Get location data, evolution requirements, and complete that 100%!
            </p>
          </div>
        </div>
      </div>

      {/* CTA Section */}
      <div className="flex flex-col items-center gap-6 p-12 border rounded-lg bg-card w-full max-w-3xl mt-8">
        <h2 className="text-3xl font-bold text-center">Ready to catch 'em all?</h2>
        <p className="text-muted-foreground text-center max-w-xl">
          Join PokePlace today and never lose track of your Pokémon journey again. 
          It's completely free and takes less than a minute to get started.
        </p>
        <Button asChild size="lg" className="text-lg px-12">
          <Link href="/auth/sign-up">Get Started Free</Link>
        </Button>
      </div>
    </div>
  );
}