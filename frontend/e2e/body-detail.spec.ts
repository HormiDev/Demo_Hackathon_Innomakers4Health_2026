import { expect, test, type Page } from "@playwright/test";

// Abre el mapa con un caso ficticio adulto y la silueta femenina.
async function openMap(page: Page) {
  await page.goto("/");
  await page.getByLabel("Edad del paciente").fill("35");
  await page.getByLabel("Género del paciente").selectOption("female");
  await page.getByLabel("¿Qué te trae a consulta?").fill("Caso ficticio: molestia en la mano izquierda");
  await page.getByRole("button", { name: "Continuar", exact: true }).click();
}

// Selecciona dedos y muñeca, conserva el lado al girar y envía todos los puntos a revisión.
test("precisa mano izquierda y pie sin perder la localización", async ({ page }) => {
  await page.route("**/api/next-question", async (route) => {
    const data = route.request().postDataJSON();
    expect(data.body_zones).toEqual(["left_hand", "right_foot"]);
    expect(data.body_details).toEqual({ left_hand: ["index", "wrist", "dorsum"], right_foot: ["heel"] });
    await route.fulfill({ json: { status: "complete", source: "model", answered: 0, warnings: [] } });
  });
  await openMap(page);
  const body = page.getByRole("group", { name: "Mapa corporal femenino, vista frontal", exact: true });
  await body.getByRole("checkbox", { name: "Mano izquierda", exact: true }).click();
  const hand = page.getByRole("region", { name: "Ampliación de mano izquierda", exact: true });
  await expect(hand).toBeVisible();
  await hand.getByRole("checkbox", { name: "Dedo índice", exact: true }).click();
  await hand.getByRole("checkbox", { name: "Muñeca", exact: true }).press("Space");
  await hand.getByRole("button", { name: "Ver dorso", exact: true }).click();
  await expect(hand.getByRole("checkbox", { name: "Dedo índice", exact: true })).toBeChecked();
  await hand.getByRole("checkbox", { name: "Dorso", exact: true }).click();
  await body.getByRole("checkbox", { name: "Pie derecho", exact: true }).click();
  const foot = page.getByRole("region", { name: "Ampliación de pie derecho", exact: true });
  await foot.getByRole("checkbox", { name: "Talón", exact: true }).click();
  await page.getByRole("combobox", { name: "Zona ampliada", exact: true }).selectOption("left_hand");
  await expect(hand.getByRole("checkbox", { name: "Muñeca", exact: true })).toBeChecked();
  await page.getByLabel("Poco a poco", { exact: true }).check();
  await page.getByLabel("Semanas", { exact: true }).check();
  await page.getByLabel("Sigue igual", { exact: true }).check();
  await page.getByRole("button", { name: "Continuar", exact: true }).click();
  await page.getByLabel("Ninguno de estos", { exact: true }).check();
  await page.getByLabel("Ninguna de estas señales", { exact: true }).check();
  await page.getByRole("button", { name: "Continuar", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Una visión completa del caso" })).toBeVisible();
  const details = page.locator(".review-summary > div").filter({ has: page.getByText("Localización detallada", { exact: true }) });
  await expect(details).toContainText("Mano izquierda: Dedo índice, Muñeca, Dorso");
  await expect(details).toContainText("Pie derecho: Talón");
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
});

// Desmarcar una región elimina sus puntos y nunca los traslada al lado contrario.
test("retira el detalle al quitar su región y permite continuar sin precisar", async ({ page }) => {
  await page.route("**/api/next-question", async (route) => {
    expect(route.request().postDataJSON().body_details).toEqual({});
    await route.fulfill({ json: { status: "complete", source: "model", answered: 0, warnings: [] } });
  });
  await openMap(page);
  const body = page.getByRole("group", { name: "Mapa corporal femenino, vista frontal", exact: true });
  await body.getByRole("checkbox", { name: "Mano izquierda", exact: true }).click();
  await page.getByRole("region", { name: "Ampliación de mano izquierda" }).getByRole("checkbox", { name: "Pulgar", exact: true }).press("Space");
  await page.getByRole("button", { name: "Quitar Mano izquierda", exact: true }).click();
  await expect(page.locator(".body-detail")).toHaveCount(0);
  await body.getByRole("checkbox", { name: "Mano derecha", exact: true }).click();
  await expect(page.getByRole("region", { name: "Ampliación de mano derecha" }).getByRole("checkbox", { name: "Pulgar", exact: true })).not.toBeChecked();
  await page.getByLabel("Poco a poco", { exact: true }).check();
  await page.getByLabel("Días", { exact: true }).check();
  await page.getByLabel("Sigue igual", { exact: true }).check();
  await page.getByRole("button", { name: "Continuar", exact: true }).click();
  await page.getByLabel("Ninguno de estos", { exact: true }).check();
  await page.getByLabel("Ninguna de estas señales", { exact: true }).check();
  await page.getByRole("button", { name: "Continuar", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Una visión completa del caso" })).toBeVisible();
});

// Todas las ampliaciones representan las opciones publicadas y permiten seleccionar sus bordes.
test("catálogo y dibujos coinciden para cada región y vista", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name === "mobile", "La interacción móvil se comprueba en los recorridos completos");
  await openMap(page);
  const response = await page.request.get("/api/catalog");
  const catalog = await response.json();
  await page.getByRole("checkbox", { name: "Cabeza y cara", exact: true }).click();
  for (const [zone, definition] of Object.entries(catalog.body_details) as [string, { views: string[]; options: { id: string; label: string; views: string[] }[] }][]) {
    await page.getByRole("combobox", { name: "Zona ampliada" }).selectOption(zone);
    const detail = page.locator(".body-detail");
    for (let view = 0; view < definition.views.length; view++) {
      const current = definition.views[view];
      const svg = detail.getByRole("group");
      const labels = await svg.locator('[role="checkbox"]').evaluateAll((elements) => elements.map((element) => element.getAttribute("aria-label")).sort());
      expect(labels).toEqual(definition.options.filter((option) => option.views.includes(current)).map((option) => option.label).sort());
      if (await svg.getByRole("checkbox").last().isChecked()) await svg.getByRole("checkbox").last().click();
      await svg.getByRole("checkbox").last().click();
      await expect(svg.getByRole("checkbox").last()).toBeChecked();
      if (view + 1 < definition.views.length) await detail.locator(".detail-view-button").click();
    }
  }
});
