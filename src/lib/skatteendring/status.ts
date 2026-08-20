export type SkatteendringStatus =
  | "not_started"
  | "proposal_ready"
  | "response_interpreted"
  | "new_documentation_needed";

export interface SkatteendringStatusInfo {
  status: SkatteendringStatus;
  label: string;
  description: string;
}

/**
 * Deterministic status derived from what actually exists in the case --
 * no separate "state" column to drift out of sync with the real rows.
 * new_documentation_needed takes priority over response_interpreted
 * because it's the most actionable of the two: the user has something
 * concrete to do, not just something to read.
 */
export function computeSkatteendringStatus(params: {
  hasProposal: boolean;
  latestResponse: { newDocumentationNeeds: string[] } | null;
}): SkatteendringStatusInfo {
  if (params.latestResponse) {
    if (params.latestResponse.newDocumentationNeeds.length > 0) {
      return {
        status: "new_documentation_needed",
        label: "Nye dokumentasjonsbehov er funnet",
        description:
          "Skatteetaten har bedt om mer dokumentasjon i svaret sitt. Se hva som mangler i dokumentasjonshullene under.",
      };
    }
    return {
      status: "response_interpreted",
      label: "Svar fra Skatteetaten er mottatt og tolket",
      description: "Se tolkningen under for hva svaret faktisk betyr, og hva som eventuelt er neste steg.",
    };
  }

  if (params.hasProposal) {
    return {
      status: "proposal_ready",
      label: "Forslaget ditt er klart til gjennomgang",
      description: "Les gjennom henvendelsen under. Last den ned og send den til Skatteetaten når du er klar.",
    };
  }

  return {
    status: "not_started",
    label: "Klar til å generere forslag",
    description: "Bygg et forslag til henvendelse basert på det som allerede er dokumentert i saken.",
  };
}
