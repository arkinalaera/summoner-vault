import { useState, useEffect, useCallback } from "react";
import { Button } from "./ui/button";
import {
  Plus,
  Check,
  Swords,
  Circle,
  Clock,
  RefreshCw,
  Settings,
  ChevronLeft,
  ChevronRight,
  X,
  ArrowDown,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface OnboardingStep {
  target: string;
  title: string;
  description: string;
  icon: React.ElementType;
  position: "top" | "bottom" | "left" | "right";
}

const STEPS: OnboardingStep[] = [
  {
    target: "add-account",
    title: "Add Account",
    description: "Click here to add your League of Legends accounts. You can save your credentials and view your stats.",
    icon: Plus,
    position: "bottom",
  },
  {
    target: "auto-accept",
    title: "Auto Accept",
    description: "Enable this option to automatically accept matches when a game is found.",
    icon: Check,
    position: "bottom",
  },
  {
    target: "auto-pick-ban",
    title: "Auto Pick/Ban",
    description: "Configure the champion to pick and ban automatically in champion select.",
    icon: Swords,
    position: "bottom",
  },
  {
    target: "availability",
    title: "Online Status",
    description: "Change your status in the LoL client (Online, Away, Offline, Mobile).",
    icon: Circle,
    position: "bottom",
  },
  {
    target: "decay-refresh",
    title: "Decay",
    description: "Refresh the decay of the account currently connected to the LoL client. Decay updates automatically when you log in.",
    icon: Clock,
    position: "bottom",
  },
  {
    target: "refresh-all",
    title: "Refresh",
    description: "Update data for all your accounts via the Riot API (rank, LP, icon...).",
    icon: RefreshCw,
    position: "bottom",
  },
  {
    target: "settings",
    title: "Settings",
    description: "Configure the path to RiotClientServices.exe and your Riot Games API key.",
    icon: Settings,
    position: "left",
  },
];

interface OnboardingGuideProps {
  onComplete: () => void;
}

interface Position {
  top: number;
  left: number;
  width: number;
  height: number;
}

export function OnboardingGuide({ onComplete }: OnboardingGuideProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [targetPosition, setTargetPosition] = useState<Position | null>(null);

  const step = STEPS[currentStep];
  const StepIcon = step.icon;

  const updateTargetPosition = useCallback(() => {
    const target = document.querySelector(`[data-onboarding="${step.target}"]`);
    if (target) {
      const rect = target.getBoundingClientRect();
      setTargetPosition({
        top: rect.top,
        left: rect.left,
        width: rect.width,
        height: rect.height,
      });
    }
  }, [step.target]);

  useEffect(() => {
    updateTargetPosition();
    window.addEventListener("resize", updateTargetPosition);
    window.addEventListener("scroll", updateTargetPosition);

    return () => {
      window.removeEventListener("resize", updateTargetPosition);
      window.removeEventListener("scroll", updateTargetPosition);
    };
  }, [updateTargetPosition]);

  const handleNext = () => {
    if (currentStep < STEPS.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      onComplete();
    }
  };

  const handlePrev = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleSkip = () => {
    onComplete();
  };

  // Calculate tooltip position
  const getTooltipStyle = (): React.CSSProperties => {
    if (!targetPosition) return { opacity: 0 };

    const padding = 16;
    const tooltipWidth = 320;
    const tooltipHeight = 180;
    const arrowSize = 40;

    let top = 0;
    let left = 0;

    switch (step.position) {
      case "bottom":
        top = targetPosition.top + targetPosition.height + arrowSize + padding;
        left = targetPosition.left + targetPosition.width / 2 - tooltipWidth / 2;
        break;
      case "top":
        top = targetPosition.top - tooltipHeight - arrowSize - padding;
        left = targetPosition.left + targetPosition.width / 2 - tooltipWidth / 2;
        break;
      case "left":
        top = targetPosition.top + targetPosition.height / 2 - tooltipHeight / 2;
        left = targetPosition.left - tooltipWidth - arrowSize - padding;
        break;
      case "right":
        top = targetPosition.top + targetPosition.height / 2 - tooltipHeight / 2;
        left = targetPosition.left + targetPosition.width + arrowSize + padding;
        break;
    }

    // Keep tooltip within viewport
    left = Math.max(padding, Math.min(left, window.innerWidth - tooltipWidth - padding));
    top = Math.max(padding, Math.min(top, window.innerHeight - tooltipHeight - padding));

    return { top, left, width: tooltipWidth };
  };

  // Calculate arrow position
  const getArrowStyle = (): React.CSSProperties => {
    if (!targetPosition) return { opacity: 0 };

    const arrowOffset = 12;

    switch (step.position) {
      case "bottom":
        return {
          top: targetPosition.top + targetPosition.height + arrowOffset,
          left: targetPosition.left + targetPosition.width / 2 - 12,
          transform: "rotate(0deg)",
        };
      case "top":
        return {
          top: targetPosition.top - 24 - arrowOffset,
          left: targetPosition.left + targetPosition.width / 2 - 12,
          transform: "rotate(180deg)",
        };
      case "left":
        return {
          top: targetPosition.top + targetPosition.height / 2 - 12,
          left: targetPosition.left - 24 - arrowOffset,
          transform: "rotate(90deg)",
        };
      case "right":
        return {
          top: targetPosition.top + targetPosition.height / 2 - 12,
          left: targetPosition.left + targetPosition.width + arrowOffset,
          transform: "rotate(-90deg)",
        };
    }
  };

  if (!targetPosition) return null;

  return (
    <div className="fixed inset-0 z-[100]">
      {/* Overlay with spotlight hole */}
      <div className="absolute inset-0 onboarding-overlay">
        <svg className="w-full h-full">
          <defs>
            <mask id="spotlight-mask">
              <rect x="0" y="0" width="100%" height="100%" fill="white" />
              <rect
                x={targetPosition.left - 8}
                y={targetPosition.top - 8}
                width={targetPosition.width + 16}
                height={targetPosition.height + 16}
                rx="8"
                fill="black"
              />
            </mask>
          </defs>
          <rect
            x="0"
            y="0"
            width="100%"
            height="100%"
            fill="rgba(0, 0, 0, 0.8)"
            mask="url(#spotlight-mask)"
          />
        </svg>
      </div>

      {/* Spotlight border/glow effect */}
      <div
        className="absolute rounded-lg border-2 border-primary shadow-lg shadow-primary/30 pointer-events-none"
        style={{
          top: targetPosition.top - 8,
          left: targetPosition.left - 8,
          width: targetPosition.width + 16,
          height: targetPosition.height + 16,
        }}
      />

      {/* Animated arrow */}
      <div
        className="absolute onboarding-arrow text-primary z-10"
        style={getArrowStyle()}
      >
        <ArrowDown className="h-6 w-6" />
      </div>

      {/* Tooltip */}
      <div
        className="absolute onboarding-tooltip bg-card border border-border rounded-xl shadow-2xl p-5 z-10"
        style={getTooltipStyle()}
      >
        {/* Header with icon */}
        <div className="flex items-center gap-3 mb-3">
          <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
            <StepIcon className="h-5 w-5 text-primary" />
          </div>
          <h3 className="text-lg font-semibold text-card-foreground">
            {step.title}
          </h3>
        </div>

        {/* Description */}
        <p className="text-sm text-muted-foreground mb-4 leading-relaxed">
          {step.description}
        </p>

        {/* Footer with navigation */}
        <div className="flex items-center justify-between">
          {/* Step indicator */}
          <div className="flex items-center gap-1.5">
            {STEPS.map((_, index) => (
              <div
                key={index}
                className={cn(
                  "w-2 h-2 rounded-full transition-colors",
                  index === currentStep
                    ? "bg-primary"
                    : index < currentStep
                    ? "bg-primary/50"
                    : "bg-muted"
                )}
              />
            ))}
            <span className="text-xs text-muted-foreground ml-2">
              {currentStep + 1}/{STEPS.length}
            </span>
          </div>

          {/* Navigation buttons */}
          <div className="flex items-center gap-2">
            {currentStep > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handlePrev}
                className="h-8 px-2"
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
            )}
            <Button
              size="sm"
              onClick={handleNext}
              className="h-8 gap-1"
            >
              {currentStep === STEPS.length - 1 ? (
                "Finish"
              ) : (
                <>
                  Next
                  <ChevronRight className="h-4 w-4" />
                </>
              )}
            </Button>
          </div>
        </div>

        {/* Skip button */}
        <button
          onClick={handleSkip}
          className="absolute top-3 right-3 text-muted-foreground hover:text-foreground transition-colors"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
