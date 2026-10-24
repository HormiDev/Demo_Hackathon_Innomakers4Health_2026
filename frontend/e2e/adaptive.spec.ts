import { expect, test, type Page } from "@playwright/test";

// Prepara los tres primeros bloques conservando el catálogo y la interfaz reales.
async function openSymptoms(page: Page, zone: string, gender = "not_specified", age = "35", unit = "years") {
  await page.goto("/");
  await page.getByLabel("Edad del paciente").fill(age);
  await page.getByLabel("Unidad de edad").selectOption(unit);
  await page.getByLabel("Género del paciente").selectOption(gender);
  await page.getByLabel("¿Qué te trae a consulta?").fill("Caso ficticio para comprobar síntomas adaptados");
  await page.getByRole("button", { name: "Continuar", exact: true }).click();
  await page.getByRole("button", { name: zone, exact: true }).click();
  await page.getByLabel("Poco a poco", { exact: true }).check();
  await page.getByLabel("Semanas", { exact: true }).check();
  await page.getByLabel("Sigue igual", { exact: true }).check();
  await page.getByRole("button", { name: "Continuar", exact: true }).click();
}

// Quita síntomas del pie al cambiar a cabeza y envía solo las selecciones actuales.
test("cambia el perfil regional y limpia síntomas anteriores", async ({ page }) => {
  await page.route("**/api/next-question", async (route) => {
    const data = route.request().postDataJSON();
    expect(data.body_zones).toEqual(["head"]);
    expect(data.symptoms).toEqual(["vision"]);
    expect(data.answers).toEqual({});
    await route.fulfill({ json: { status: "complete", source: "model", answered: 0, warnings: [] } });
  });
  await openSymptoms(page, "Pie derecho");
  const primary = page.getByRole("group", { name: "¿Notas alguno de estos síntomas?", exact: true });
  await expect(primary.getByLabel("Molestia en el talón", { exact: true })).toBeVisible();
  await expect(primary.getByLabel("Molestias visuales", { exact: true })).toHaveCount(0);
  await primary.getByLabel("Cambios en las uñas", { exact: true }).check();
  await page.getByRole("button", { name: "Atrás", exact: true }).click();
  await page.getByRole("button", { name: "Quitar Pie derecho", exact: true }).click();
  await page.getByRole("button", { name: "Cabeza y cara", exact: true }).click();
  await page.getByRole("button", { name: "Continuar", exact: true }).click();
  await expect(primary.getByLabel("Molestia en el talón", { exact: true })).toHaveCount(0);
  await expect(primary.getByLabel("Molestias visuales", { exact: true })).toBeVisible();
  await expect(page.getByLabel("Cambios en las uñas", { exact: true })).not.toBeChecked();
  await primary.getByLabel("Molestias visuales", { exact: true }).check();
  await page.getByLabel("Ninguna de estas señales", { exact: true }).check();
  await page.getByRole("button", { name: "Continuar", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Una visión completa del caso" })).toBeVisible();
  await expect(page.locator(".review-summary")).toContainText("Molestias visuales");
  await expect(page.locator(".review-summary")).not.toContainText("Cambios en las uñas");
});

// Varía sugerencias íntimas sin impedir declarar un síntoma de la otra familia.
test("adapta por género y conserva síntomas declarados manualmente", async ({ page }) => {
  await openSymptoms(page, "Pelvis", "female");
  const primary = page.getByRole("group", { name: "¿Notas alguno de estos síntomas?", exact: true });
  await expect(primary.getByLabel("Cambios en la regla", { exact: true })).toBeVisible();
  await expect(primary.getByLabel("Molestia testicular", { exact: true })).toHaveCount(0);
  await page.locator(".more-symptoms summary").click();
  await page.getByLabel("Molestia testicular", { exact: true }).check();
  await expect(page.locator(".more-symptoms summary")).toContainText("1 seleccionado");
  await page.getByRole("button", { name: "Paso 1: El paciente", exact: true }).click();
  await page.getByLabel("Género del paciente").selectOption("male");
  await page.getByRole("button", { name: "Continuar", exact: true }).click();
  await page.getByRole("button", { name: "Continuar", exact: true }).click();
  await expect(primary.getByLabel("Molestia testicular", { exact: true })).toBeChecked();
  await expect(primary.getByLabel("Cambios en la regla", { exact: true })).toHaveCount(0);
  const details = page.locator(".more-symptoms");
  if (!(await details.evaluate((element) => (element as HTMLDetailsElement).open))) {
    await details.locator("summary").click();
  }
  await expect(page.getByLabel("Cambios en la regla", { exact: true })).toBeVisible();
  await page.getByLabel("Cambios en la regla", { exact: true }).check();
  await primary.getByLabel("Ninguno de estos", { exact: true }).check();
  await expect(page.getByLabel("Cambios en la regla", { exact: true })).not.toBeChecked();
  await expect(primary.getByLabel("Molestia testicular", { exact: true })).not.toBeChecked();
});

// Ofrece síntomas observables de lactante y conserva todas las alarmas pediátricas.
test("adapta las opciones al lactante", async ({ page }) => {
  await openSymptoms(page, "Abdomen", "not_specified", "4", "months");
  await expect(page.getByLabel("Menos tomas", { exact: true })).toBeVisible();
  await expect(page.getByLabel("Llanto o irritabilidad", { exact: true })).toBeVisible();
  await expect(page.getByLabel("Cambios en la regla", { exact: true })).toHaveCount(0);
  await expect(page.getByLabel("Cuesta caminar", { exact: true })).toHaveCount(0);
  await expect(page.getByLabel("El menor hace mucho esfuerzo al respirar o se le hunden las costillas", { exact: true })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
});

// Usa preguntas del catálogo real; el transporte controlado comprueba ambos recorridos.
test("muestra preguntas encadenadas de la mano y explica la finalización", async ({ page }) => {
  const catalog = await (await page.request.get("/api/catalog")).json();
  let calls = 0;
  await page.route("**/api/next-question", async (route) => {
    const data = route.request().postDataJSON();
    expect(data.body_details).toEqual({ left_hand: ["index"] });
    calls++;
    if (calls < 3) {
      const id = calls === 1 ? "finger_motion" : "finger_locking";
      if (calls === 2) expect(data.answers).toEqual({ finger_motion: "locks" });
      await route.fulfill({ json: {
        status: "question", source: "model", answered: calls - 1, warnings: [],
        question: catalog.questions.find((question: { id: string }) => question.id === id),
      } });
    } else {
      expect(data.answers).toEqual({ finger_motion: "locks", finger_locking: "morning" });
      await route.fulfill({ json: {
        status: "complete", source: "model", answered: 2, warnings: [], completion_reason: "model_enough",
        candidates_considered: 1, eligible_count: 1,
        considered_questions: [{ id: "hand_use", label: "¿Qué gesto hace que notes más la molestia de la mano?" }],
      } });
    }
  });
  await openSymptoms(page, "Mano izquierda");
  await page.getByRole("button", { name: "Atrás", exact: true }).click();
  await page.getByRole("region", { name: "Ampliación de mano izquierda" }).getByRole("checkbox", { name: "Dedo índice", exact: true }).click();
  await page.getByRole("button", { name: "Continuar", exact: true }).click();
  const primary = page.getByRole("group", { name: "¿Notas alguno de estos síntomas?", exact: true });
  await expect(primary.getByLabel("Se atasca un dedo", { exact: true })).toBeVisible();
  await expect(primary.getByLabel("Chasquidos de muñeca", { exact: true })).toHaveCount(0);
  await primary.getByLabel("No sé", { exact: true }).check();
  await page.getByLabel("Ninguna de estas señales", { exact: true }).check();
  await page.getByRole("button", { name: "Continuar", exact: true }).click();
  await page.getByLabel("Se atasca o bloquea", { exact: true }).check();
  await page.getByRole("button", { name: "Guardar y continuar", exact: true }).click();
  await page.getByLabel("Sobre todo al despertar", { exact: true }).check();
  await page.getByRole("button", { name: "Guardar y continuar", exact: true }).click();
  const note = page.getByRole("region", { name: "Revisión de preguntas a medida" });
  await expect(note).toContainText("Tev ha valorado 1 pregunta relacionada y no propone más");
  await note.locator("summary").click();
  await expect(note).toContainText("¿Qué gesto hace que notes más la molestia de la mano?");
  await expect(page.locator(".review-summary")).toContainText("Sobre todo al despertar");
});

// Completar sin preguntar es una salida válida y debe comunicarse al usuario.
test("permite continuar sin ninguna pregunta adicional", async ({ page }) => {
  await page.route("**/api/next-question", async (route) => {
    expect(route.request().postDataJSON().answers).toEqual({});
    await route.fulfill({ json: {
      status: "complete", source: "model", answered: 0, warnings: [], completion_reason: "model_enough",
      candidates_considered: 6, eligible_count: 6, considered_questions: [],
    } });
  });
  await openSymptoms(page, "Pie derecho");
  await page.getByLabel("Ninguno de estos", { exact: true }).check();
  await page.getByLabel("Ninguna de estas señales", { exact: true }).check();
  await page.getByRole("button", { name: "Continuar", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Una visión completa del caso" })).toBeVisible();
  await expect(page.getByRole("region", { name: "Revisión de preguntas a medida" })).toContainText("No se ha añadido ninguna pregunta adicional");
});
