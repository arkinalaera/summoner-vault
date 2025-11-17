import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { FolderOpen, ArrowLeft } from "lucide-react";
import { Link } from "react-router-dom";
import { reloadApiKey } from "@/lib/riot-api";

const Settings = () => {
  const [leaguePath, setLeaguePath] = useState("");
  const [isPersistingLeaguePath, setIsPersistingLeaguePath] = useState(false);
  const [riotApiKey, setRiotApiKey] = useState("");
  const [isPersistingApiKey, setIsPersistingApiKey] = useState(false);
  const { toast } = useToast();

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
      </div>
    </div>
  );
};

export default Settings;
