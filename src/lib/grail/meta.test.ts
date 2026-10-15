import { describe, expect, it } from "vitest";
import { activityLabel, chainOf, personName, profileActivityLabel } from "./meta";

describe("prototype-safe metadata lookups", () => {
  const keys = [
    "__proto__",
    "constructor",
    "toString",
    "valueOf",
    "hasOwnProperty",
    "isPrototypeOf",
    "propertyIsEnumerable",
    "toLocaleString",
  ];

  it.each(keys)("returns strings for the upstream key %s", (key) => {
    expect(typeof personName({ symbol: key, name: key })).toBe("string");
    expect(typeof personName({ symbol: `g${key}`, name: "x" })).toBe("string");
    expect(typeof activityLabel(key)).toBe("string");
    expect(typeof activityLabel(key.toUpperCase())).toBe("string");
    expect(typeof profileActivityLabel(key)).toBe("string");
    expect(typeof profileActivityLabel(key.toUpperCase())).toBe("string");
  });

  it("preserves known labels and chain names", () => {
    expect(personName({ symbol: "gMJ", name: "gMJ" })).toBe("Michael Jordan");
    expect(activityLabel("LP_ADD")).toBe("Add liquidity");
    expect(profileActivityLabel("PACK_OPEN")).toBe("Opened pack");
    expect(profileActivityLabel("LP_FEE_COLLECT")).toBe("Collect fees");
    expect(chainOf(8453).name).toBe("Base");
    expect(chainOf(999).name).toBe("Chain 999");
    expect(chainOf(Number("NaN")).name).toBe("Chain NaN");
  });
});
