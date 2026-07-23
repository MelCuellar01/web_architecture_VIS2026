import { describe, expect, it } from "vitest";
import { validatePassword } from "../utils/validatePassword.js";

describe("validatePassword", () => {
  it("returns true for a valid password with 8 or more characters", () => {
    expect(validatePassword("Password123")).toBe(true);
  });

  it("returns true for exactly 8 characters", () => {
    expect(validatePassword("12345678")).toBe(true);
  });

  it("returns false for an empty string", () => {
    expect(validatePassword("")).toBe(false);
  });

  it("returns false for passwords shorter than 8 characters", () => {
    expect(validatePassword("short7")).toBe(false);
  });

  it("returns false for null", () => {
    expect(validatePassword(null)).toBe(false);
  });

  it("returns false for undefined", () => {
    expect(validatePassword(undefined)).toBe(false);
  });

  it("returns false for number input", () => {
    expect(validatePassword(12345678)).toBe(false);
  });

  it("returns false for object input", () => {
    expect(validatePassword({ password: "12345678" })).toBe(false);
  });

  it("treats eight spaces as valid because the current implementation only checks type and length", () => {
    expect(validatePassword("        ")).toBe(true);
  });
});
