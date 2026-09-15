import { describe, expect, it } from "vitest";
import { mapSindCopilotRole } from "./nexoffice-identity";

describe("SindCopilot → NexOffice role mapping", () => {
  it("keeps the account owner as owner", () => {
    expect(mapSindCopilotRole("owner", true)).toBe("owner");
    expect(mapSindCopilotRole("viewer", true)).toBe("owner");
  });

  it("maps assistants to member", () => {
    expect(mapSindCopilotRole("assistant", false)).toBe("member");
  });

  it("preserves viewer as least privilege", () => {
    expect(mapSindCopilotRole("viewer", false)).toBe("viewer");
  });

  it("defaults unknown shared roles to member, never owner", () => {
    expect(mapSindCopilotRole(null, false)).toBe("member");
    expect(mapSindCopilotRole("unexpected", false)).toBe("member");
  });
});
