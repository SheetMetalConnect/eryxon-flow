import { useState, useEffect, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { Delete, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";

interface PinKeypadProps {
  value: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
  maxLength?: number;
  disabled?: boolean;
}

/**
 * Touch-friendly PIN keypad for factory terminal login
 * Designed for large touch displays and quick operator access
 */
export function PinKeypad({
  value,
  onChange,
  onSubmit,
  maxLength = 6,
  disabled = false,
}: PinKeypadProps) {
  const { t } = useTranslation();

  const handleKeyPress = useCallback(
    (key: string) => {
      if (disabled) return;
      if (value.length < maxLength) {
        onChange(value + key);
      }
    },
    [value, onChange, maxLength, disabled]
  );

  const handleBackspace = useCallback(() => {
    if (disabled) return;
    onChange(value.slice(0, -1));
  }, [value, onChange, disabled]);

  const handleClear = useCallback(() => {
    if (disabled) return;
    onChange("");
  }, [onChange, disabled]);

  // Keyboard support
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (disabled) return;

      if (e.key >= "0" && e.key <= "9") {
        handleKeyPress(e.key);
      } else if (e.key === "Backspace") {
        handleBackspace();
      } else if (e.key === "Enter" && value.length >= 4) {
        onSubmit();
      } else if (e.key === "Escape") {
        handleClear();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyPress, handleBackspace, handleClear, onSubmit, value, disabled]);

  const keypadButtons = [
    ["1", "2", "3"],
    ["4", "5", "6"],
    ["7", "8", "9"],
    ["clear", "0", "backspace"],
  ];

  return (
    <div className="flex flex-col items-center gap-4">
      {/* PIN Display */}
      <div className="flex gap-2 mb-2">
        {Array.from({ length: maxLength }).map((_, i) => (
          <div
            key={i}
            className={`
              w-4 h-4 rounded-full border-2 transition-all duration-200
              ${
                i < value.length
                  ? "bg-primary border-primary scale-110"
                  : "bg-transparent border-muted-foreground/30"
              }
            `}
          />
        ))}
      </div>

      {/* Keypad Grid */}
      <div className="grid grid-cols-3 gap-3">
        {keypadButtons.map((row, rowIndex) =>
          row.map((key, keyIndex) => {
            if (key === "clear") {
              return (
                <Button
                  key={`${rowIndex}-${keyIndex}`}
                  variant="outline"
                  className="w-20 h-16 text-lg font-medium touch-target-comfortable transition-all
                           hover:bg-destructive/10 hover:border-destructive/50 hover:text-destructive
                           active:scale-95"
                  onClick={handleClear}
                  disabled={disabled || value.length === 0}
                >
                  {t("terminalLogin.clear")}
                </Button>
              );
            }

            if (key === "backspace") {
              return (
                <Button
                  key={`${rowIndex}-${keyIndex}`}
                  variant="outline"
                  className="w-20 h-16 text-lg font-medium touch-target-comfortable transition-all
                           hover:bg-muted active:scale-95"
                  onClick={handleBackspace}
                  disabled={disabled || value.length === 0}
                >
                  <Delete className="h-6 w-6" />
                </Button>
              );
            }

            return (
              <Button
                key={`${rowIndex}-${keyIndex}`}
                variant="outline"
                className="w-20 h-16 text-2xl font-bold touch-target-comfortable transition-all
                         hover:bg-primary/10 hover:border-primary/50 hover:text-primary
                         active:scale-95 active:bg-primary/20"
                onClick={() => handleKeyPress(key)}
                disabled={disabled}
              >
                {key}
              </Button>
            );
          })
        )}
      </div>

      {/* Submit Button */}
      <Button
        className="w-full mt-4 h-14 text-lg font-semibold cta-button"
        onClick={onSubmit}
        disabled={disabled || value.length < 4}
      >
        {t("terminalLogin.login")}
        <ArrowRight className="ml-2 h-5 w-5 arrow-icon" />
      </Button>
    </div>
  );
}

export default PinKeypad;
