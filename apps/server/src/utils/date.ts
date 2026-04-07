export function startOfDay(date: string, tzOffsetMinutes = 0): Date {
  return new Date(new Date(`${date}T00:00:00.000Z`).getTime() + tzOffsetMinutes * 60000);
}

export function endOfDay(date: string, tzOffsetMinutes = 0): Date {
  return new Date(new Date(`${date}T23:59:59.999Z`).getTime() + tzOffsetMinutes * 60000);
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
