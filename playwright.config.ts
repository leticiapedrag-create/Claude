import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "tests/e2e",
  timeout: 360_000,
  expect: { timeout: 20_000 },
  fullyParallel: false,
  workers: 1,
  reporter: [["list"]],
  use: {
    baseURL: "http://localhost:3200",
    trace: "off",
    // Sem GPU neste ambiente o WebGL é renderizado por software (~2 quadros/s);
    // o modo de movimento reduzido do app renderiza sob demanda e mantém a página responsiva.
    contextOptions: { reducedMotion: "reduce" },
    launchOptions: { args: ["--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader"] },
  },
  projects: [
    { name: "computador", use: { viewport: { width: 1366, height: 820 } } },
    // Tela de iPad (Chromium com toque). O Safari/WebKit real não está disponível neste ambiente.
    { name: "ipad", use: { viewport: { width: 1180, height: 820 }, hasTouch: true } },
  ],
  webServer: { command: "npx next start -p 3200", url: "http://localhost:3200", reuseExistingServer: true, timeout: 120_000 },
});
