import { existsSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { AREAS, INSTRUMENTOS } from "@/data/instrumentos";

describe("mesa cirúrgica", () => {
  it("cada instrumento tem foto, crédito e área válida", () => {
    expect(INSTRUMENTOS.length).toBeGreaterThanOrEqual(12);
    for (const i of INSTRUMENTOS) {
      expect(existsSync(`public/instrumentos/${i.id}.webp`), i.id).toBe(true);
      expect(i.credito.autor.length).toBeGreaterThan(0);
      expect(i.credito.pagina).toMatch(/^https:\/\/commons\.wikimedia\.org\//);
      expect(AREAS.map((a) => a.id)).toContain(i.area);
    }
  });
  it("todas as 6 áreas da mesa têm ao menos um instrumento", () => {
    for (const a of AREAS) expect(INSTRUMENTOS.some((i) => i.area === a.id), a.id).toBe(true);
  });
  it("nomes únicos", () => {
    expect(new Set(INSTRUMENTOS.map((i) => i.nome)).size).toBe(INSTRUMENTOS.length);
  });
});
