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
        title: "Chemin sauvegardé",
        description: "Le chemin du client Riot a été mis à jour.",
      });
    } catch (error) {
      console.error("Failed to save League path:", error);
      toast({
        title: "Impossible de sauvegarder le chemin",
        description:
          error instanceof Error
            ? error.message
            : "Une erreur inconnue est survenue.",
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
        title: "Action indisponible",
        description: "Impossible d'ouvrir la boîte de dialogue native.",
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
        title: "Sélection impossible",
        description:
          error instanceof Error
            ? error.message
            : "Impossible de récupérer le chemin League of Legends.",
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
        title: "API Key sauvegardée",
        description: "Ta clé API Riot a été enregistrée avec succès.",
      });
    } catch (error) {
      console.error("Failed to save Riot API key:", error);
      toast({
        title: "Impossible de sauvegarder l'API key",
        description:
          error instanceof Error
            ? error.message
            : "Une erreur inconnue est survenue.",
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
              Retour
            </Link>
          </Button>
          <h1 className="text-2xl font-bold text-card-foreground">Paramètres</h1>
        </div>

        <div className="bg-card rounded-xl p-6 shadow-card border border-border space-y-4">
          <div>
            <h2 className="font-semibold text-card-foreground">
              Chemin Riot Client
            </h2>
            <p className="text-sm text-muted-foreground">
              Sélectionne l'exécutable RiotClientServices.exe pour permettre
              l'automatisation.
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
              Parcourir
            </Button>
          </div>

          <p className="text-xs text-muted-foreground">
            Ce chemin sera réutilisé lors des prochains lancements.
          </p>
        </div>

        <div className="bg-card rounded-xl p-6 shadow-card border border-border space-y-4">
          <div>
            <h2 className="font-semibold text-card-foreground">
              Riot API Key (Optionnel)
            </h2>
            <p className="text-sm text-muted-foreground">
              Entre ta propre clé API Riot Games pour éviter les limites de taux.
              Obtiens-la sur{" "}
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
            Si vide, l'application utilisera la clé API par défaut (limites plus basses).
          </p>
        </div>

        {/* Restart Onboarding Guide */}
        <div className="bg-card rounded-xl p-6 shadow-card border border-border space-y-4">
          <div>
            <h2 className="font-semibold text-card-foreground">
              Guide d'utilisation
            </h2>
            <p className="text-sm text-muted-foreground">
              Relance le tutoriel interactif pour découvrir les fonctionnalités de l'application.
            </p>
          </div>

          <Button
            onClick={() => {
              localStorage.removeItem('onboarding-completed');
              toast({
                title: "Guide relancé",
                description: "Le tutoriel va démarrer sur la page d'accueil.",
              });
              navigate('/');
            }}
            className="gap-2"
          >
            <BookOpen className="h-4 w-4" />
            Relancer le guide
          </Button>
        </div>

        {/* Test Ranked Stats / Decay Info */}
        <div className="bg-card rounded-xl p-6 shadow-card border border-border space-y-4">
          <div>
            <h2 className="font-semibold text-card-foreground">
              Test API LCU - Ranked Stats
            </h2>
            <p className="text-sm text-muted-foreground">
              Teste les endpoints LCU pour trouver les informations de decay.
              Le client League doit être ouvert.
            </p>
          </div>

          <Button
            onClick={async () => {
              const api = window.api;
              if (!api?.getRankedStats) {
                toast({
                  title: "Fonctionnalité indisponible",
                  description: "L'API de test n'est pas disponible.",
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
                  title: "Test réussi",
                  description: "Les résultats sont affichés ci-dessous.",
                });
              } catch (error) {
                setRankedStatsResult(
                  `Erreur: ${error instanceof Error ? error.message : "Erreur inconnue"}`
                );
                toast({
                  title: "Erreur",
                  description: "Impossible de récupérer les stats. Le client League est-il ouvert ?",
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
            {isTestingRankedStats ? "Test en cours..." : "Tester les endpoints"}
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
