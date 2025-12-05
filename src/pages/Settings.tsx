import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { FolderOpen, ArrowLeft, FlaskConical, BookOpen } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { reloadApiKey } from "@/lib/riot-api";

const Settings = () => {
  const [leaguePath, setLeaguePath] = useState("");
  const [isPersistingLeaguePath, setIsPersistingLeaguePath] = useState(false);
  const [riotApiKey, setRiotApiKey] = useState("");
  const [isPersistingApiKey, setIsPersistingApiKey] = useState(false);
  const [rankedStatsResult, setRankedStatsResult] = useState<string | null>(null);
  const [isTestingRankedStats, setIsTestingRankedStats] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    const api = window.api;
    if (!api?.getLeaguePath || !api?.getRiotApiKey) {
      return;
    }

    const fetchSettings = async () => {
      try {
        const storedPath = await api.getLeaguePath();
        if (storedPath) {
          setLeaguePath(storedPath);
        }

        const storedApiKey = await api.getRiotApiKey();
        if (storedApiKey) {
          setRiotApiKey(storedApiKey);
        }
      } catch (error) {
        console.error("Failed to retrieve settings:", error);
      }
    };

    fetchSettings();
  }, []);

  const saveLeaguePath = async (
    nextPath: string,
    options: { showBusy?: boolean } = {}
  ) => {
    if (!window.api?.setLeaguePath) {
      return;
    }
    const showBusy = options.showBusy ?? true;

    if (showBusy) {
      setIsPersistingLeaguePath(true);
    }

    try {
      await window.api.setLeaguePath(nextPath);
      toast({
        title: "Path saved",
        description: "The Riot client path has been updated.",
      });
    } catch (error) {
      console.error("Failed to save League path:", error);
      toast({
        title: "Unable to save path",
        description:
          error instanceof Error
            ? error.message
            : "An unknown error occurred.",
        variant: "destructive",
      });
    } finally {
      if (showBusy) {
        setIsPersistingLeaguePath(false);
      }
    }
  };

  const handleLeaguePathBlur = () => {
    if (!window.api?.setLeaguePath) {
      return;
    }
    void saveLeaguePath(leaguePath);
  };

  const handleSelectLeaguePath = async () => {
    const api = window.api;
    if (!api?.selectLeaguePath) {
      toast({
        title: "Action unavailable",
        description: "Unable to open native dialog.",
        variant: "destructive",
      });
      return;
    }

    setIsPersistingLeaguePath(true);
    try {
      const selectedPath = await api.selectLeaguePath();
      if (selectedPath) {
        setLeaguePath(selectedPath);
        await saveLeaguePath(selectedPath, { showBusy: false });
      }
    } catch (error) {
      console.error("Failed to select League path:", error);
      toast({
        title: "Selection failed",
        description:
          error instanceof Error
            ? error.message
            : "Unable to retrieve League of Legends path.",
        variant: "destructive",
      });
    } finally {
      setIsPersistingLeaguePath(false);
    }
  };

  const handleApiKeyBlur = async () => {
    if (!window.api?.setRiotApiKey) {
      return;
    }

    setIsPersistingApiKey(true);
    try {
      await window.api.setRiotApiKey(riotApiKey);
      // Reload the API key in riot-api.ts
      await reloadApiKey();
      toast({
        title: "API Key saved",
        description: "Your Riot API key has been saved successfully.",
      });
    } catch (error) {
      console.error("Failed to save Riot API key:", error);
      toast({
        title: "Unable to save API key",
        description:
          error instanceof Error
            ? error.message
            : "An unknown error occurred.",
        variant: "destructive",
      });
    } finally {
      setIsPersistingApiKey(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-4xl mx-auto px-4 py-8 space-y-6">
        <div className="flex items-center gap-2">
          <Button variant="ghost" asChild>
            <Link to="/">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Link>
          </Button>
          <h1 className="text-2xl font-bold text-card-foreground">Settings</h1>
        </div>

        <div className="bg-card rounded-xl p-6 shadow-card border border-border space-y-4">
          <div>
            <h2 className="font-semibold text-card-foreground">
              Riot Client Path
            </h2>
            <p className="text-sm text-muted-foreground">
              Select the RiotClientServices.exe executable to enable
              automation.
            </p>
          </div>

          <div className="flex flex-col gap-3 md:flex-row md:items-center">
            <Input
              placeholder="C:\\Riot Games\\Riot Client\\RiotClientServices.exe"
              value={leaguePath}
              onChange={(event) => setLeaguePath(event.target.value)}
              onBlur={handleLeaguePathBlur}
              disabled={isPersistingLeaguePath}
            />
            <Button
              type="button"
              variant="outline"
              onClick={handleSelectLeaguePath}
              disabled={isPersistingLeaguePath}
              className="gap-2"
            >
              <FolderOpen className="h-4 w-4" />
              Browse
            </Button>
          </div>

          <p className="text-xs text-muted-foreground">
            This path will be reused on future launches.
          </p>
        </div>

        <div className="bg-card rounded-xl p-6 shadow-card border border-border space-y-4">
          <div>
            <h2 className="font-semibold text-card-foreground">
              Riot API Key (Optional)
            </h2>
            <p className="text-sm text-muted-foreground">
              Enter your own Riot Games API key to avoid rate limits.
              Get it at{" "}
              <a
                href="https://developer.riotgames.com/"
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary hover:underline"
              >
                developer.riotgames.com
              </a>
            </p>
          </div>

          <div className="flex flex-col gap-3">
            <Input
              type="password"
              placeholder="RGAPI-xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
              value={riotApiKey}
              onChange={(event) => setRiotApiKey(event.target.value)}
              onBlur={handleApiKeyBlur}
              disabled={isPersistingApiKey}
            />
          </div>

          <p className="text-xs text-muted-foreground">
            If empty, the application will use the default API key (lower rate limits).
          </p>
        </div>

        {/* Restart Onboarding Guide */}
        <div className="bg-card rounded-xl p-6 shadow-card border border-border space-y-4">
          <div>
            <h2 className="font-semibold text-card-foreground">
              User Guide
            </h2>
            <p className="text-sm text-muted-foreground">
              Restart the interactive tutorial to discover the application's features.
            </p>
          </div>

          <Button
            onClick={() => {
              localStorage.removeItem('onboarding-completed');
              toast({
                title: "Guide restarted",
                description: "The tutorial will start on the home page.",
              });
              navigate('/');
            }}
            className="gap-2"
          >
            <BookOpen className="h-4 w-4" />
            Restart guide
          </Button>
        </div>

        {/* Test Ranked Stats / Decay Info */}
        <div className="bg-card rounded-xl p-6 shadow-card border border-border space-y-4">
          <div>
            <h2 className="font-semibold text-card-foreground">
              Test LCU API - Ranked Stats
            </h2>
            <p className="text-sm text-muted-foreground">
              Test LCU endpoints to retrieve decay information.
              The League client must be open.
            </p>
          </div>

          <Button
            onClick={async () => {
              const api = window.api;
              if (!api?.getRankedStats) {
                toast({
                  title: "Feature unavailable",
                  description: "The test API is not available.",
                  variant: "destructive",
                });
                return;
              }

              setIsTestingRankedStats(true);
              setRankedStatsResult(null);

              try {
                const result = await api.getRankedStats();
                setRankedStatsResult(JSON.stringify(result, null, 2));
                toast({
                  title: "Test successful",
                  description: "Results are displayed below.",
                });
              } catch (error) {
                setRankedStatsResult(
                  `Error: ${error instanceof Error ? error.message : "Unknown error"}`
                );
                toast({
                  title: "Error",
                  description: "Unable to retrieve stats. Is the League client open?",
                  variant: "destructive",
                });
              } finally {
                setIsTestingRankedStats(false);
              }
            }}
            disabled={isTestingRankedStats}
            className="gap-2"
          >
            <FlaskConical className="h-4 w-4" />
            {isTestingRankedStats ? "Testing..." : "Test endpoints"}
          </Button>

          {rankedStatsResult && (
            <pre className="bg-muted p-4 rounded-lg text-xs overflow-auto max-h-[400px] whitespace-pre-wrap">
              {rankedStatsResult}
            </pre>
          )}
        </div>
      </div>
    </div>
  );
};

export default Settings;
