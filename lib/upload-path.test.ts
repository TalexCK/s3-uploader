import { describe, expect, it } from "vitest";
import {
  buildDisplayObjectKey,
  normalizeRelativePrefix,
  resolveRootDirPrefix,
} from "./upload-path";

describe("upload path helpers", () => {
  it("resolves absolute root dir prefixes", () => {
    expect(resolveRootDirPrefix("/xxx")).toBe("/xxx/");
  });

  it("expands today token in root dir", () => {
    const date = new Date(2026, 5, 17);

    expect(resolveRootDirPrefix("/xxx/{{today}}", date)).toBe("/xxx/20260617/");
  });

  it("normalizes relative prefixes without leading slash", () => {
    expect(normalizeRelativePrefix("/uploads/images")).toBe("uploads/images/");
  });

  it("drops unsafe path segments", () => {
    expect(resolveRootDirPrefix("/root/../safe/./file")).toBe("/root/safe/file/");
  });

  it("builds display object keys with the resolved prefix", () => {
    expect(buildDisplayObjectKey("/xxx/", "demo.png")).toBe("/xxx/demo.png");
  });

  it("expands today token in object data directories", () => {
    const date = new Date(2026, 5, 17);

    expect(resolveRootDirPrefix("/{{today}}", date)).toBe("/20260617/");
  });
});
