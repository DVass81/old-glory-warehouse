import { existsSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const appDir = join(process.cwd(), "src", "app");
const rootAppDir = join(process.cwd(), "src", "app");

describe("separate route/page build contract", () => {
  it("keeps each primary workspace view on its own app route page", () => {
    const requiredPageRoutes = [
      "advisor",
      "dashboard",
      "fifo",
      "ftz",
      "inventory",
      "labels",
      "pull",
      "real-import",
      "receive",
      "reports",
      "warehouse"
    ];

    expect(existsSync(join(rootAppDir, "layout.tsx"))).toBe(true);
    expect(
      requiredPageRoutes.map((route) => ({
        route,
        hasPage: existsSync(join(appDir, route, "page.tsx"))
      }))
    ).toEqual(requiredPageRoutes.map((route) => ({ route, hasPage: true })));
  });
});
