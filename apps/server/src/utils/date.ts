export function startOfDay(date: string): Date {
  return new Date(`${date}T00:00:00.000Z`);
}

export function endOfDay(date: string): Date {
  return new Date(`${date}T23:59:59.999Z`);
}

export function asIso(value: string | Date | null | undefined): string | null {
  if (!value) {
    return null;
  }

  return new Date(value).toISOString();
}

export function todayIsoDate(): string {
  return new Date().toISOString().slice(0, 10);
}
