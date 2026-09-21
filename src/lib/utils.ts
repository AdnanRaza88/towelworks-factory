import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatRs(n: number): string {
  return `Rs.${n.toLocaleString("en-IN")}`;
}
