import {
  applyTheme,
  currentTheme,
  readStoredTheme,
  resolveTheme,
  type Theme,
} from "../lib/theme";

function syncToggle(theme: Theme) {
  const button = document.querySelector<HTMLButtonElement>("#theme-toggle");
  if (!button) return;
  const next = theme === "dark" ? "light" : "dark";
  button.setAttribute("aria-label", `Switch to ${next} mode`);
  button.setAttribute("aria-pressed", theme === "dark" ? "true" : "false");
}

function setTheme(theme: Theme, persist: boolean) {
  applyTheme(theme, persist);
  syncToggle(theme);
}

setTheme(resolveTheme(), false);

const toggle = document.querySelector<HTMLButtonElement>("#theme-toggle");
toggle?.addEventListener("click", () => {
  setTheme(currentTheme() === "dark" ? "light" : "dark", true);
});

window.matchMedia("(prefers-color-scheme: dark)").addEventListener("change", (event) => {
  if (readStoredTheme() != null) return;
  setTheme(event.matches ? "dark" : "light", false);
});
