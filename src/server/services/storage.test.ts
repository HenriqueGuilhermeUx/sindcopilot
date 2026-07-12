import { beforeAll, describe, expect, it } from "vitest";

beforeAll(() => {
  process.env.NODE_ENV = "test";
  process.env.SUPABASE_URL = "https://example.supabase.co";
  process.env.SUPABASE_SERVICE_ROLE_KEY = "test-service-role-key-1234567890";
});

describe("upload validation", () => {
  it("accepts PDF and sanitizes the filename", async () => {
    const { validateUpload } = await import("./storage");
    const result = validateUpload("Convenção prédio 01.pdf", "application/pdf", Buffer.from("pdf"));
    expect(result).toBe("Conven--o-pr-dio-01.pdf");
  });

  it("rejects unsupported formats", async () => {
    const { validateUpload } = await import("./storage");
    expect(() => validateUpload("arquivo.exe", "application/x-msdownload", Buffer.from("x"))).toThrow(/Formato não permitido/);
  });

  it("rejects empty and oversized files", async () => {
    const { validateUpload } = await import("./storage");
    expect(() => validateUpload("vazio.pdf", "application/pdf", Buffer.alloc(0))).toThrow(/Arquivo vazio/);
    expect(() => validateUpload("grande.pdf", "application/pdf", Buffer.alloc(20 * 1024 * 1024 + 1))).toThrow(/20 MB/);
  });
});
