import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function getPasswordStrength(pwd: string): { level: number; label: string; colorClass: string } {
  if (!pwd) return { level: 0, label: "", colorClass: "" };
  let score = 0;
  if (pwd.length >= 6) score++;
  if (pwd.length >= 10) score++;
  if (/[A-Z]/.test(pwd)) score++;
  if (/[0-9]/.test(pwd)) score++;
  if (/[^A-Za-z0-9]/.test(pwd)) score++;
  const level = Math.min(4, score);
  const configs = [
    { label: "", colorClass: "" },
    { label: "Muy débil", colorClass: "bg-destructive" },
    { label: "Débil", colorClass: "bg-orange-400" },
    { label: "Media", colorClass: "bg-yellow-400" },
    { label: "Fuerte", colorClass: "bg-[hsl(var(--peerly-secondary))]" },
  ];
  return { level, ...configs[level] };
}
