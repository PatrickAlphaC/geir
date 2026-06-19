import { describe, expect, it } from "vitest";
import { configTemplate, justfileBlock } from "@/scaffold/templates.js";

describe("configTemplate", () => {
  it("uses defineConfig and the detected package manager (Next.js)", () => {
    const ts = configTemplate({ pm: "pnpm", framework: "next" });
    expect(ts).toContain('from "geir/config"');
    expect(ts).toContain("pnpm run build");
    expect(ts).toContain("NEXT_BUILD_ID");
    expect(ts).toContain('buildId: "commit"');
  });

  it("uses a version build id for generic projects", () => {
    const ts = configTemplate({ pm: "npm", framework: "generic" });
    expect(ts).toContain("npm run build");
    expect(ts).toContain('buildId: "version"');
  });
});

describe("justfileBlock", () => {
  it("wires recipes to the package manager", () => {
    expect(justfileBlock("yarn")).toContain("yarn run release {{bump}}");
  });
});
