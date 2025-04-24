import { CheckIcon } from "lucide-react"
import { cn } from "@/lib/utils"

interface PublishStepperProps {
  steps: string[]
  currentStep: number
}

export default function PublishStepper({ steps, currentStep }: PublishStepperProps) {
  return (
    <div className="w-full">
      <div className="hidden sm:flex items-center justify-between">
        {steps.map((step, index) => (
          <div key={step} className="relative flex flex-col items-center">
            <div
              className={cn(
                "flex h-10 w-10 items-center justify-center rounded-full border-2 text-sm font-semibold",
                currentStep > index
                  ? "border-primary bg-primary text-primary-foreground"
                  : currentStep === index
                    ? "border-primary text-primary"
                    : "border-muted text-muted-foreground",
              )}
            >
              {currentStep > index ? <CheckIcon className="h-5 w-5" /> : index + 1}
            </div>
            <span
              className={cn(
                "absolute top-12 text-xs font-medium",
                currentStep >= index ? "text-primary" : "text-muted-foreground",
              )}
            >
              {step}
            </span>
            {index < steps.length - 1 && (
              <div
                className={cn(
                  "absolute left-[calc(100%+0.5rem)] top-5 h-0.5 w-[calc(100%-2rem)]",
                  currentStep > index ? "bg-primary" : "bg-muted",
                )}
              />
            )}
          </div>
        ))}
      </div>

      {/* Mobile stepper */}
      <div className="sm:hidden">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium">
            Step {currentStep + 1} of {steps.length}
          </span>
          <span className="text-sm font-medium">{steps[currentStep]}</span>
        </div>
        <div className="mt-2 h-1 w-full bg-muted">
          <div
            className="h-1 bg-primary transition-all"
            style={{ width: `${((currentStep + 1) / steps.length) * 100}%` }}
          />
        </div>
      </div>
    </div>
  )
}

