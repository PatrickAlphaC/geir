import { describe, expect, it } from "vitest";
import { parseCliArgs } from "@/cli/flags.js";

describe("parseCliArgs", () => {
  it("parses a command, positionals, and boolean flags", () => {
    const { command, rest, values } = parseCliArgs(["release", "patch", "--dry-run", "--ui"]);
    expect(command).toBe("release");
    expect(rest).toEqual(["patch"]);
    expect(values["dry-run"]).toBe(true);
    expect(values.ui).toBe(true);
  });

  it("parses string options", () => {
    const { values } = parseCliArgs(["publish", "--tag", "v1.2.3"]);
    expect(values.tag).toBe("v1.2.3");
  });

  it("throws on unknown flags", () => {
    expect(() => parseCliArgs(["build", "--nope"])).toThrow();
  });
});
