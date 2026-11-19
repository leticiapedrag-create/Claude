import { expect, test, type Page } from "@playwright/test";

async function falar(page: Page, texto: string) {
  const antes = await page.locator('[data-testid="transcricao"] > div').count();
  await page.getByLabel("Sua fala").fill(texto);
  await page.getByLabel("Sua fala").press("Enter");
  await expect.poll(async () => page.locator('[data-testid="transcricao"] > div').count()).toBeGreaterThan(antes + 1);
}

async function manobra(page: Page, nome: string, tecnica: RegExp) {
  await page.locator('[data-testid="painel-exame"]').getByRole("button", { name: nome, exact: true }).click();
  await page.getByRole("dialog").locator("label").filter({ hasText: tecnica }).click();
  await page.getByRole("button", { name: "Executar" }).click();
}

async function decidir(page: Page, campo: string, textos: RegExp[]) {
  const bloco = page.locator(`fieldset[data-campo="${campo}"]`);
  for (const t of textos) await bloco.locator("label").filter({ hasText: t }).click();
  await bloco.getByRole("button", { name: "Registrar" }).click();
}

test("estação de AVC completa no modo OSCE gera relatório e alimenta o painel", async ({ page }) => {
  const erros: string[] = [];
  page.on("pageerror", (e) => erros.push(e.message));

  await page.goto("/");
  await page.locator('[data-caso="avc-isquemico-pa"]').getByRole("link", { name: "Modo OSCE" }).click();
  await expect(page.getByRole("dialog", { name: "Enunciado da estação" })).toBeVisible();
  await expect(page.locator("canvas")).toBeVisible();
  await page.getByTestId("entrar").click();
  await expect(page.getByTestId("transcricao")).toContainText("minha boca ficou torta", { timeout: 10_000 });
  await expect(page.getByTestId("cronometro")).toBeVisible();

  for (const q of [
    "Bom dia, meu nome é Letícia, sou estudante de Medicina. O que trouxe o senhor ao hospital?",
    "Qual o nome completo do senhor?",
    "Quando começou essa fraqueza?",
    "Qual foi a última vez que o senhor estava bem?",
    "Teve dor de cabeça, vômito ou convulsão?",
    "Caiu ou bateu a cabeça?",
    "O senhor tem pressão alta, diabetes? Fuma?",
    "Sente palpitação, o coração disparar?",
    "Já teve derrame antes? Algum sangramento ou cirurgia recente?",
    "Usa algum remédio para afinar o sangue?",
    "Toma algum remédio?",
    "Tem alergia a algum medicamento?",
    "Quanto o senhor pesa?",
    "Qual é o seu time de futebol?",
  ]) await falar(page, q);
  await expect(page.getByTestId("transcricao")).toContainText("8h40");
  await expect(page.getByTestId("transcricao")).toContainText("não sei");

  await page.getByTestId("higienizar").click();
  await page.getByRole("button", { name: "Exame físico" }).click();
  await falar(page, "Posso examinar o senhor?");
  await manobra(page, "Glicemia capilar", /Antissepsia, lanceta/);
  await manobra(page, "Pressão arterial", /dois braços/);
  await manobra(page, "Pulso / frequência cardíaca", /60 segundos/);
  await manobra(page, "Saturação de O₂ e FR", /Oxímetro/);
  await manobra(page, "Temperatura", /axilar/);
  await manobra(page, "Mímica facial", /sorrir/);
  await manobra(page, "Prova dos braços estendidos", /palmas para cima/);
  await manobra(page, "Prova das pernas (Mingazzini)", /coxas a 30/);
  await manobra(page, "Pupilas e reflexo fotomotor", /pouca luz/);
  await manobra(page, "Motricidade ocular extrínseca", /'H'/);
  await manobra(page, "Linguagem (nomeação, repetição, compreensão)", /Nomear/);
  await manobra(page, "Sensibilidade tátil e dolorosa", /Comparar/);
  await expect(page.getByTestId("achados")).toContainText("142 mg/dL");
  await expect(page.getByTestId("achados")).toContainText("3D");

  await page.getByRole("button", { name: "NIHSS" }).click();
  const nihss: Record<string, string> = { "4. Paralisia facial": "2", "5a. Motor — braço esquerdo": "2", "6a. Motor — perna esquerda": "1", "8. Sensibilidade": "1", "10. Disartria": "1", "11. Extinção / desatenção": "1" };
  const selects = page.locator('[data-testid="painel-nihss"] select');
  for (let i = 0; i < (await selects.count()); i++) {
    const s = selects.nth(i);
    const nome = (await s.getAttribute("aria-label")) ?? "";
    await s.selectOption(nihss[nome] ?? "0");
  }
  await page.getByRole("button", { name: /Registrar NIHSS/ }).click();

  await page.getByRole("button", { name: "Exames" }).click();
  for (const e of ["TC de crânio sem contraste", "Angiotomografia de vasos intra e extracranianos", "Eletrocardiograma", "Hemograma com plaquetas", "Coagulograma (TP/INR, TTPa)"]) {
    await page.locator('[data-testid="painel-exames"]').getByRole("button", { name: e }).click();
  }
  await expect(page.getByTestId("resultados-exames")).toContainText("Oclusão do segmento M1");

  await page.getByRole("button", { name: "Decisões" }).click();
  await decidir(page, "hipotese", [/^AVC isquêmico agudo/]);
  await decidir(page, "diferenciais", [/^AVC hemorrágico$/, /^Hipoglicemia$/]);
  await decidir(page, "janela", [/^Dentro da janela/]);
  await decidir(page, "conduta", [/protocolo de AVC/, /Reduzir a PA para < 185/, /^Trombólise EV/, /trombectomia/, /Após trombólise/, /jejum até avaliação/]);
  await decidir(page, "orientacoes", [/riscos da trombólise/, /dor de cabeça, vômitos/, /não comer nem beber/]);
  await falar(page, "Seu Sebastião, o senhor está tendo um AVC, vou explicar o tratamento.");
  await falar(page, "Ficou alguma dúvida?");

  await page.getByTestId("encerrar").click();
  await page.getByTestId("confirmar-encerrar").click();
  await expect(page.getByTestId("relatorio")).toBeVisible({ timeout: 15_000 });
  const pct = Number((await page.getByTestId("nota-pct").textContent())!.replace("%", ""));
  expect(pct).toBeGreaterThanOrEqual(85);
  expect(pct).toBeLessThan(100); // empatia depende de revisão humana
  await expect(page.locator('[data-item="a_horario"]')).toHaveAttribute("data-status", "cumprido");
  await expect(page.locator('[data-item="e_nihss"]')).toHaveAttribute("data-status", "cumprido");
  await expect(page.locator('[data-item="c_empatia"]')).toHaveAttribute("data-status", "pendente_revisao");
  await expect(page.getByText("Erros críticos", { exact: true })).toHaveCount(0);

  // revisão manual com justificativa
  await page.locator('[data-item="c_empatia"]').getByLabel("Revisar item manualmente").click();
  await page.getByPlaceholder("Justificativa (obrigatória)").fill("Avaliado pela colega de dupla");
  await page.getByRole("button", { name: "Salvar" }).click();
  await expect(page.locator('[data-item="c_empatia"]')).toHaveAttribute("data-status", "cumprido");
  await expect(page.getByText(/Histórico de alterações manuais \(1\)/)).toBeVisible();

  await page.goto("/painel");
  await expect(page.getByTestId("painel")).toBeVisible();
  await expect(page.locator(".recharts-surface").first()).toBeVisible();
  await expect(page.getByRole("link", { name: "Relatório" }).first()).toBeVisible();
  expect(erros).toEqual([]);
});

test("erros críticos e treino focado nos erros", async ({ page }) => {
  await page.goto("/simulacao?caso=avc-isquemico-pa&modo=osce");
  await page.getByTestId("entrar").click();
  await page.getByRole("button", { name: "Decisões" }).click();
  await decidir(page, "hipotese", [/^AVC isquêmico agudo/]);
  await decidir(page, "conduta", [/^Trombólise EV/, /AAS 300 mg imediatamente/]);
  await page.getByTestId("encerrar").click();
  await page.getByTestId("confirmar-encerrar").click();
  await expect(page.getByRole("heading", { name: "Erros críticos" })).toBeVisible();
  await expect(page.getByText("Indicou trombólise sem TC de crânio.")).toBeVisible();
  await page.getByRole("link", { name: "Treinar apenas meus erros" }).click();
  await expect(page.getByRole("dialog", { name: "Enunciado da estação" })).toContainText("Treino focado nos seus erros");
  await page.getByTestId("entrar").click();
  await expect(page.getByTestId("painel-foco")).toBeVisible();
  await page.getByRole("button", { name: "Dica" }).click();
  await expect(page.getByText(/Higienize|horas|Glicemia|Hipoglicemia/i).first()).toBeVisible();
});

test("modo emergência: exames de imagem consomem relógio clínico e a evolução segue o caso", async ({ page }) => {
  await page.goto("/simulacao?caso=avc-isquemico-pa&modo=emergencia");
  await page.getByTestId("entrar").click();
  await expect(page.getByTestId("relogio-clinico")).toContainText("0h0");
  await page.getByRole("button", { name: "Exames" }).click();
  await page.locator('[data-testid="painel-exames"]').getByRole("button", { name: /TC de crânio sem contraste/ }).click();
  await expect(page.getByTestId("relogio-clinico")).toContainText("0h15");
  await page.locator('[data-testid="painel-exames"]').getByRole("button", { name: /Hemograma/ }).click();
  await expect(page.getByTestId("resultados-exames")).toContainText("Em processamento");
  await page.getByRole("button", { name: "Decisões" }).click();
  await decidir(page, "conduta", [/Reduzir a PA para < 185/]);
  await expect(page.getByTestId("relogio-clinico")).toBeVisible();
});

test("ferida: estação cirúrgica com sequência asséptica", async ({ page }) => {
  await page.goto("/simulacao?caso=ferida-sutura&modo=aprendizado");
  await page.getByTestId("entrar").click();
  await page.getByRole("button", { name: "Exame físico" }).click();
  // anestesiar antes de testar a sensibilidade = erro crítico, avisado no modo aprendizado
  await manobra(page, "Anestesia local", /Lidocaína 1% infiltrada/);
  await expect(page.getByText(/Erro crítico: Anestesiou antes de avaliar a sensibilidade/)).toBeVisible();
  await manobra(page, "Inspeção da ferida", /Boa iluminação/);
  await expect(page.getByTestId("achados")).toContainText("Ferida incisa linear de 4 cm");
});

test("configurações e biblioteca de casos", async ({ page }) => {
  await page.goto("/configuracoes");
  await page.getByTestId("cfg-meta").fill("33");
  await page.getByTestId("cfg-salvar").click();
  await page.goto("/");
  await expect(page.getByText(/meta de 33 pontos/)).toBeVisible();
  await page.goto("/casos?id=avc-isquemico-pa");
  await expect(page.getByTestId("ficha-caso")).toContainText("Critérios de erros críticos");
  await expect(page.getByTestId("ficha-caso")).toContainText("Powers WJ");
  await page.goto("/casos");
  await page.getByTestId("importar").setInputFiles({ name: "ruim.json", mimeType: "application/json", buffer: Buffer.from('{"id":"x"}') });
  await expect(page.getByText("Problemas na importação:")).toBeVisible();
});
