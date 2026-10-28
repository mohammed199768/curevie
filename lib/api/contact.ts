import { publicApiClient } from "./client";

export interface ContactMessagePayload {
  name: string;
  email: string;
  phone?: string;
  message: string;
}

export const contactApi = {
  submit: (payload: ContactMessagePayload) =>
    publicApiClient.post<{ message: string; id: string }>("/contact", payload, { timeout: 15_000 }),
};
