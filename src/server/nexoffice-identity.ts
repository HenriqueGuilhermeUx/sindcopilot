export type SindCopilotAccountRole = "owner" | "assistant" | "viewer";
export type NexOfficeMemberRole = "owner" | "admin" | "member" | "viewer";

export function mapSindCopilotRole(
  role: string | null | undefined,
  isOwner: boolean,
): NexOfficeMemberRole {
  if (isOwner) return "owner";
  if (role === "viewer") return "viewer";
  return "member";
}
