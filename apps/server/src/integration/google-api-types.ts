// Minimal shapes of the Google Calendar v3 / Tasks v1 resources TimeFraim
// reads. Fields are optional and nullable exactly as the REST API returns them.

export type GoogleCalendarListItem = {
  id?: string | null;
  summary?: string | null;
  primary?: boolean | null;
  accessRole?: string | null;
  backgroundColor?: string | null;
  foregroundColor?: string | null;
  colorId?: string | null;
};

export type GoogleCalendarListResponse = {
  items?: GoogleCalendarListItem[] | null;
  nextPageToken?: string | null;
};

export type GoogleEventDateTime = {
  dateTime?: string | null;
  date?: string | null;
  timeZone?: string | null;
};

export type GoogleEventResource = {
  id?: string | null;
  summary?: string | null;
  start?: GoogleEventDateTime | null;
  end?: GoogleEventDateTime | null;
  updated?: string | null;
  colorId?: string | null;
  extendedProperties?: { private?: Record<string, string> | null } | null;
};

export type GoogleEventsListResponse = {
  items?: GoogleEventResource[] | null;
  nextPageToken?: string | null;
};

export type GoogleColorDefinition = {
  background?: string | null;
  foreground?: string | null;
};

export type GoogleColorsResponse = {
  calendar?: Record<string, GoogleColorDefinition> | null;
  event?: Record<string, GoogleColorDefinition> | null;
};

export type GoogleTaskResource = {
  id?: string | null;
  title?: string | null;
  notes?: string | null;
  status?: string | null;
  due?: string | null;
  updated?: string | null;
  completed?: string | null;
  deleted?: boolean | null;
  hidden?: boolean | null;
};

export type GoogleTasksListResponse = {
  items?: GoogleTaskResource[] | null;
  nextPageToken?: string | null;
};
