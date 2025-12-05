import { DetailedStats } from "@/lib/riot-api";
import { Trophy, TrendingUp, Target, Swords, Loader2 } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

interface AccountDetailsPanelProps {
  stats: DetailedStats | null;
  isLoading: boolean;
  error: string | null;
}

export function AccountDetailsPanel({ stats, isLoading, error }: AccountDetailsPanelProps) {
  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        <span className="ml-2 text-muted-foreground">Loading statistics...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="py-4 px-6 bg-destructive/10 rounded-lg">
        <p className="text-destructive text-sm">{error}</p>
      </div>
    );
  }

  if (!stats) {
    return null;
  }

  const { championMastery, matchHistory, winrate, averageKDA, averageCS } = stats;

  return (
    <div className="space-y-6 py-4 px-6 bg-background/50 rounded-lg border-t border-border">
      {/* Stats Overview */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {/* Winrate */}
        <div className="bg-card border border-border rounded-lg p-4">
          <div className="flex items-center gap-2 mb-2">
            <Trophy className="h-4 w-4 text-yellow-500" />
            <span className="text-xs font-medium text-muted-foreground">Winrate</span>
          </div>
          <div className="text-2xl font-bold text-card-foreground">
            {winrate.percentage.toFixed(1)}%
          </div>
          <div className="text-xs text-muted-foreground mt-1">
            {winrate.wins}W / {winrate.losses}L
          </div>
        </div>

        {/* KDA */}
        <div className="bg-card border border-border rounded-lg p-4">
          <div className="flex items-center gap-2 mb-2">
            <Swords className="h-4 w-4 text-red-500" />
            <span className="text-xs font-medium text-muted-foreground">Average KDA</span>
          </div>
          <div className="text-2xl font-bold text-card-foreground">
            {averageKDA.ratio.toFixed(2)}
          </div>
          <div className="text-xs text-muted-foreground mt-1">
            {averageKDA.kills.toFixed(1)} / {averageKDA.deaths.toFixed(1)} / {averageKDA.assists.toFixed(1)}
          </div>
        </div>

        {/* CS */}
        <div className="bg-card border border-border rounded-lg p-4">
          <div className="flex items-center gap-2 mb-2">
            <Target className="h-4 w-4 text-blue-500" />
            <span className="text-xs font-medium text-muted-foreground">Average CS</span>
          </div>
          <div className="text-2xl font-bold text-card-foreground">
            {averageCS.toFixed(0)}
          </div>
          <div className="text-xs text-muted-foreground mt-1">
            per game
          </div>
        </div>

        {/* Games */}
        <div className="bg-card border border-border rounded-lg p-4">
          <div className="flex items-center gap-2 mb-2">
            <TrendingUp className="h-4 w-4 text-green-500" />
            <span className="text-xs font-medium text-muted-foreground">Games</span>
          </div>
          <div className="text-2xl font-bold text-card-foreground">
            {winrate.total}
          </div>
          <div className="text-xs text-muted-foreground mt-1">
            analyzed
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Champion Mastery */}
        <div className="bg-card border border-border rounded-lg p-4">
          <h3 className="font-semibold text-card-foreground mb-4 flex items-center gap-2">
            <Trophy className="h-5 w-5 text-yellow-500" />
            Top Mastered Champions
          </h3>
          <div className="space-y-3">
            {championMastery.map((champ, index) => (
              <div key={champ.championId} className="flex items-center gap-3">
                <div className="text-sm font-medium text-muted-foreground w-6">
                  #{index + 1}
                </div>
                {champ.championIcon && (
                  <img
                    src={champ.championIcon}
                    alt={champ.championName}
                    className="w-10 h-10 rounded-full border-2 border-border"
                  />
                )}
                <div className="flex-1">
                  <div className="font-medium text-card-foreground">{champ.championName}</div>
                  <div className="text-xs text-muted-foreground">
                    Level {champ.championLevel} • {champ.championPoints.toLocaleString()} pts
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Match History */}
        <div className="bg-card border border-border rounded-lg p-4">
          <h3 className="font-semibold text-card-foreground mb-4 flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-blue-500" />
            Match History
          </h3>
          <div className="space-y-2 max-h-[300px] overflow-y-auto">
            {matchHistory.map((match) => (
              <div
                key={match.matchId}
                className={`flex items-center gap-3 p-2 rounded-lg ${
                  match.win ? 'bg-green-500/10' : 'bg-red-500/10'
                }`}
              >
                {match.championIcon && (
                  <img
                    src={match.championIcon}
                    alt={match.champion}
                    className="w-8 h-8 rounded-full"
                  />
                )}
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className={`text-xs font-semibold ${match.win ? 'text-green-600' : 'text-red-600'}`}>
                      {match.win ? 'VICTORY' : 'DEFEAT'}
                    </span>
                    <span className="text-xs text-muted-foreground">{match.champion}</span>
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {match.kills}/{match.deaths}/{match.assists} • {match.cs} CS
                  </div>
                </div>
                <div className="text-xs text-muted-foreground text-right">
                  {formatDistanceToNow(new Date(match.timestamp), {
                    addSuffix: true
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
