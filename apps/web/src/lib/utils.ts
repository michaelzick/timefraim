import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatTime(isoString: string) {
  return new Intl.DateTimeFormat("en-US", {
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(isoString));
}

export function formatDateTime(isoString: string) {
  const parts = new Intl.DateTimeFormat("en-US", {
    month: "2-digit",
    day: "2-digit",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
  }).formatToParts(new Date(isoString));
  const values = new Map(parts.map((part) => [part.type, part.value]));
  return [
    `${values.get("month")}/${values.get("day")}/${values.get("year")}`,
    `${values.get("hour")}:${values.get("minute")}:${values.get("second")} ${values.get("dayPeriod")}`,
  ].join(" ");
}

export function getTodayDate() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export function getTimezoneOffsetForDate(date: string) {
  return new Date(`${date}T12:00:00`).getTimezoneOffset();
}
