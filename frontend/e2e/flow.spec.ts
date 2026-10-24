import { expect, test } from "@playwright/test";

// Recorre la interfaz con respuestas HTTP de prueba, manteniendo real el catálogo.
test("formulario, revisión médica, resultados y borrado", async ({ page }) => {
  const issues: string[] = [];
  page.on("pageerror", (error) => issues.push(error.message));
  await page.route("**/api/next-question", async (route) => {
    const data = route.request().postDataJSON();
    const response = await page.request.get("/api/catalog");
    const catalog = await response.json();
    const answered = Object.keys(data.answers).length;
    await route.fulfill({
      json: {
        status: answered ? "complete" : "question",
        question: answered ? null : catalog.questions[0],
        source: "model",
        answered,
        warnings: [],
      },
    });
  });
  await page.route("**/api/classify", async (route) => {
    const data = route.request().postDataJSON();
    expect(data.reviewed).toBe(true);
    expect(data.gender).toBe("non_binary");
    const response = await page.request.get("/api/catalog");
    const catalog = await response.json();
    const rows = catalog.specialties.map(
      (item: { id: string; name: string }) => ({
        ...item,
        probability: item.id === "podiatry" ? 0.78 : 0.01,
      }),
    );
    rows.sort(
      (a: { probability: number }, b: { probability: number }) =>
        b.probability - a.probability,
    );
    await route.fulfill({
      json: {
        status: "classified",
        rankings: rows,
        warnings: [],
        model: "tev1:4b",
        catalog_version: catalog.version,
        latency_ms: 125,
        considered_data: data,
        label:
          "Puntuaciones del modelo; no son probabilidades clínicas validadas.",
      },
    });
  });
  await page.goto("/");
  await expect(
    page.getByRole("heading", { name: "Empecemos por conocerte" }),
  ).toBeVisible();
  await page.getByLabel("Edad del paciente").fill("35");
  await page.getByLabel("Género del paciente").selectOption("non_binary");
  await page
    .getByLabel("¿Qué te trae a consulta?")
    .fill("Dolor en la planta del pie derecho al caminar");
  await page.getByRole("button", { name: "Continuar", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "¿Dónde notas la molestia?" }),
  ).toBeVisible();
  await page
    .getByRole("checkbox", { name: "Pie derecho", exact: true })
    .click();
  await expect(
    page.getByRole("checkbox", { name: "Pie derecho", exact: true }),
  ).toHaveAttribute("aria-checked", "true");
  await page.getByRole("button", { name: "Ver espalda" }).click();
  await page.getByRole("checkbox", { name: "Espalda baja" }).press("Space");
  await expect(
    page.getByRole("checkbox", { name: "Espalda baja", exact: true }),
  ).toHaveAttribute("aria-checked", "true");
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
  await page
    .getByRole("button", { name: "Dolor 4 de 10", exact: true })
    .click();
  await page.getByLabel("Poco a poco", { exact: true }).check();
  await page.getByLabel("Semanas", { exact: true }).check();
  await page.getByLabel("Sigue igual", { exact: true }).check();
  await page.getByRole("button", { name: "Continuar", exact: true }).click();
  await page.getByLabel("Ninguno de estos", { exact: true }).check();
  await page.getByLabel("Ninguna de estas señales", { exact: true }).check();
  await page.getByRole("button", { name: "Continuar", exact: true }).click();
  await page.getByLabel("No", { exact: true }).check();
  await page.getByRole("button", { name: "Guardar y continuar" }).click();
  await expect(
    page.getByRole("heading", { name: "Una visión completa del caso" }),
  ).toBeVisible();
  await expect(page.locator(".review-summary")).toContainText("No binario");
  await page
    .getByLabel("O pega y edita el historial aquí")
    .fill("Antecedentes ficticios. Sin alergias conocidas.");
  await page.getByLabel("Cargar historial TXT o Markdown").setInputFiles({
    name: "historial.md",
    mimeType: "text/markdown",
    buffer: Buffer.from("# Historial ficticio\nSin alergias conocidas."),
  });
  await expect(page.getByLabel("O pega y edita el historial aquí")).toHaveValue(
    "# Historial ficticio\nSin alergias conocidas.",
  );
  await page.getByRole("button", { name: "Continuar como médico" }).click();
  await expect(
    page.getByRole("button", { name: "Obtener orientación" }),
  ).toBeDisabled();
  await page.getByRole("checkbox", { name: /He revisado/ }).check();
  await page.getByRole("button", { name: "Obtener orientación" }).click();
  await expect(page.getByRole("heading", { name: "Podología" })).toBeVisible();
  await expect(page.locator(".ranking-row")).toHaveCount(23);
  await expect(page.locator(".ranking-row:visible")).toHaveCount(5);
  await expect(page.locator(".ranking-others > summary > strong")).toHaveText("18,00 %");
  await page.emulateMedia({ media: "print" });
  await expect(page.locator(".ranking-print li:visible")).toHaveCount(23);
  await expect(page.locator(".rankings-screen")).not.toBeVisible();
  await page.emulateMedia({ media: "screen" });
  const download = page.waitForEvent("download");
  await page.getByRole("button", { name: "Descargar resumen" }).click();
  expect((await download).suggestedFilename()).toBe("deriva-resumen.txt");
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
  await page.getByRole("button", { name: "Nuevo caso", exact: true }).click();
  await page.getByRole("button", { name: "Borrar y empezar" }).click();
  await expect(page.getByLabel("¿Qué te trae a consulta?")).toHaveValue("");
  await expect(page.getByLabel("Género del paciente")).toHaveValue("not_specified");
  expect(await page.evaluate(() => Object.keys(localStorage).length)).toBe(0);
  expect(issues).toEqual([]);
});

// Comprueba la visualización de una alarma y la persistencia nula al recargar.
test("señales de alarma visibles y recarga sin datos", async ({ page }) => {
  await page.goto("/");
  await page.getByLabel("Edad del paciente").fill("3");
  await page
    .getByLabel("¿Qué te trae a consulta?")
    .fill("Caso ficticio de consulta pediátrica");
  await expect(
    page.getByText("Adaptaremos las preguntas a la edad del menor."),
  ).toBeVisible();
  await page.getByRole("button", { name: "Continuar", exact: true }).click();
  await page.getByRole("button", { name: "Pecho", exact: true }).click();
  await page.getByLabel("De repente", { exact: true }).check();
  await page.getByLabel("Horas", { exact: true }).check();
  await page.getByLabel("Empeora", { exact: true }).check();
  await page.getByRole("button", { name: "Continuar", exact: true }).click();
  await page.getByLabel("Falta de aire", { exact: true }).check();
  await page
    .getByLabel(
      "El menor hace mucho esfuerzo al respirar o se le hunden las costillas",
      { exact: true },
    )
    .check();
  await expect(
    page.getByText("Has indicado una señal de alarma."),
  ).toBeVisible();
  await page.getByRole("button", { name: "Continuar", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Una visión completa del caso" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Continuar como médico" }).click();
  await page.getByRole("checkbox", { name: /He revisado/ }).check();
  await page
    .getByRole("button", { name: "Ver indicación prioritaria" })
    .click();
  await expect(
    page.getByText(
      "Se ha declarado una señal de alarma. Solicita valoración médica inmediata; no esperes a una clasificación de especialidades.",
    ),
  ).toBeVisible();
  await expect(page.locator(".ranking-row")).toHaveCount(0);
  await page.reload();
  await expect(page.getByLabel("Edad del paciente")).toHaveValue("");
  await expect(page.getByLabel("¿Qué te trae a consulta?")).toHaveValue("");
});

// Verifica que los pasos iniciales caben en ventanas habituales de portátil.
for (const viewport of [
  { width: 1280, height: 720 },
  { width: 1366, height: 768 },
  { width: 1920, height: 1080 },
]) {
  test(`formulario sin scroll en ${viewport.width}×${viewport.height}`, async ({
    page,
  }, testInfo) => {
    test.skip(testInfo.project.name === "mobile", "Comprobación de escritorio");
    await page.setViewportSize(viewport);
    await page.goto("/");
    await page.getByLabel("Edad del paciente").fill("3");
    await page
      .getByLabel("¿Qué te trae a consulta?")
      .fill("Consulta pediátrica ficticia");

    async function expectNoScroll() {
      const layout = await page.evaluate(() => {
        const content = document.querySelector(".card-content")!;
        return {
          pageWidth: document.documentElement.scrollWidth,
          pageHeight: document.documentElement.scrollHeight,
          width: window.innerWidth,
          height: window.innerHeight,
          contentHeight: content.scrollHeight,
          contentViewport: content.clientHeight,
        };
      });
      expect(layout.pageWidth).toBeLessThanOrEqual(layout.width);
      expect(layout.pageHeight).toBeLessThanOrEqual(layout.height);
      expect(layout.contentHeight).toBeLessThanOrEqual(layout.contentViewport + 1);
      await expect(
        page.getByRole("button", { name: "Continuar", exact: true }),
      ).toBeInViewport();
    }

    await expectNoScroll();
    await page.getByRole("button", { name: "Continuar", exact: true }).click();
    await page.getByRole("button", { name: "Pecho", exact: true }).click();
    await page.getByLabel("De repente", { exact: true }).check();
    await page.getByLabel("Horas", { exact: true }).check();
    await page.getByLabel("Empeora", { exact: true }).check();
    await expectNoScroll();
    await page.getByRole("button", { name: "Continuar", exact: true }).click();
    await expectNoScroll();
  });
}

// Comprueba porcentajes bajos, casi empatados y la opción explícita no concluyente.
for (const scenario of [
  { name: "porcentajes bajos", leader: "podiatry", top: 0.06, second: 0.05 },
  { name: "casi empate", leader: "podiatry", top: 0.46, second: 0.44 },
  { name: "sin orientación", leader: "inconclusive", top: 1, second: 0 },
]) {
  test(`muestra todos los porcentajes con ${scenario.name}`, async ({ page }) => {
    await page.route("**/api/next-question", (route) =>
      route.fulfill({
        json: { status: "complete", source: "model", answered: 0, warnings: [] },
      }),
    );
    await page.route("**/api/classify", async (route) => {
      const response = await page.request.get("/api/catalog");
      const catalog = await response.json();
      const rankings = catalog.specialties
        .map((item: { id: string; name: string }) => ({
          ...item,
          probability:
            item.id === scenario.leader
              ? scenario.top
              : item.id === "orthopedics"
                ? scenario.second
                : (1 - scenario.top - scenario.second) / 21,
        }))
        .sort((a: { probability: number }, b: { probability: number }) =>
          b.probability - a.probability,
        );
      await route.fulfill({
        json: {
          status: "inconclusive",
          rankings,
          warnings: [],
          model: "tev1:4b",
          catalog_version: catalog.version,
          latency_ms: 100,
          considered_data: route.request().postDataJSON(),
          label: "Puntuaciones del modelo; no son probabilidades clínicas validadas.",
        },
      });
    });
    await page.goto("/");
    await page.getByLabel("Edad del paciente").fill("35");
    await page.getByLabel("¿Qué te trae a consulta?").fill("Dolor de pie ficticio");
    await page.getByRole("button", { name: "Continuar", exact: true }).click();
    await page.getByRole("button", { name: "Pie derecho", exact: true }).click();
    await page.getByLabel("Poco a poco", { exact: true }).check();
    await page.getByLabel("Días", { exact: true }).check();
    await page.getByLabel("Sigue igual", { exact: true }).check();
    await page.getByRole("button", { name: "Continuar", exact: true }).click();
    await page.getByLabel("Ninguno de estos", { exact: true }).check();
    await page.getByLabel("Ninguna de estas señales", { exact: true }).check();
    await page.getByRole("button", { name: "Continuar", exact: true }).click();
    await page.getByRole("button", { name: "Continuar como médico" }).click();
    await page.getByRole("checkbox", { name: /He revisado/ }).check();
    await page.getByRole("button", { name: "Obtener orientación" }).click();
    await expect(
      page.getByRole("heading", {
        name: "No se ha encontrado un resultado claro",
      }),
    ).toBeVisible();
    const expected = [
      scenario.top,
      scenario.second,
      ...Array(21).fill((1 - scenario.top - scenario.second) / 21),
    ].sort((a, b) => b - a);
    const others = page.locator(".ranking-others");
    await expect(page.locator(".ranking-top .ranking-row")).toHaveCount(5);
    await expect(page.locator(".ranking-row:visible")).toHaveCount(5);
    await expect(others).not.toHaveAttribute("open", "");
    await expect(others.locator("summary > strong")).toHaveText(
      `${(expected.slice(5).reduce((sum, value) => sum + value, 0) * 100).toLocaleString("es-ES", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      })} %`,
    );
    await others.locator("summary").press("Enter");
    await expect(others).toHaveAttribute("open", "");
    await expect(page.locator(".ranking-row:visible")).toHaveCount(23);
    await expect(others.locator(".ranking-number").first()).toHaveText("06");
    await expect(page.locator(".ranking-row strong")).toHaveText(
      expected.map((value) =>
        `${(value * 100).toLocaleString("es-ES", {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        })} %`,
      ),
    );
    await others.locator("summary").press("Enter");
    await expect(page.locator(".ranking-row:visible")).toHaveCount(5);
    expect(
      await page.evaluate(() =>
        document.documentElement.scrollWidth <= window.innerWidth,
      ),
    ).toBe(true);
  });
}
