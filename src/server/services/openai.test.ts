import { beforeAll, describe, expect, it } from "vitest";

beforeAll(() => {
  process.env.NODE_ENV = "test";
  process.env.SUPABASE_URL = "https://example.supabase.co";
  process.env.SUPABASE_SERVICE_ROLE_KEY = "test-service-role-key-1234567890";
});

describe("document chunking", () => {
  it("preserves page references and creates sequential indexes", async () => {
    const { chunkPages } = await import("./openai");
    const chunks = chunkPages([
      { pageNumber: 1, text: "A".repeat(900) + ". " + "B".repeat(900) },
      { pageNumber: 2, text: "Cláusula décima. Animais são permitidos com responsabilidade." },
    ], 1000, 100);

    expect(chunks.length).toBeGreaterThanOrEqual(3);
    expect(chunks.map((chunk) => chunk.chunkIndex)).toEqual(chunks.map((_, index) => index));
    expect(chunks.some((chunk) => chunk.pageNumber === 2 && chunk.content.includes("Animais"))).toBe(true);
  });

  it("skips blank pages", async () => {
    const { chunkPages } = await import("./openai");
    expect(chunkPages([{ pageNumber: 1, text: "   " }])).toEqual([]);
  });
});
