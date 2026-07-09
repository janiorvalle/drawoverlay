import * as drawover from "drawover";
import type { ElementRef } from "drawover";

interface DrawoverDevOptions {
  outputFixture: boolean;
}

export async function installDrawoverDev({
  outputFixture,
}: DrawoverDevOptions): Promise<void> {
  drawover.init({ position: "bottom-right", theme: "auto" });
  document
    .querySelector("#drawover-root")
    ?.addEventListener("drawover:element-selected", (event) => {
      const output = document.querySelector("#targeting-output");
      const reference = (event as CustomEvent<ElementRef>).detail;
      if (!output) return;
      const component = reference.component
        ? ` | ${reference.component.framework}:${reference.component.name}`
        : "";
      output.textContent = `${reference.selector.primary} | ${reference.facts.tag}${component}`;
    });

  if (outputFixture) {
    const { installOutputFixture } = await import("./output-fixture.js");
    installOutputFixture(drawover);
  }
}
