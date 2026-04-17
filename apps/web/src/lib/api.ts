import { integrationApi } from "@/lib/api-integrations";
import { plannerApi } from "@/lib/api-planner";

export { API_BASE_URL } from "@/lib/api-client";

export const api = {
  ...integrationApi,
  ...plannerApi,
};
