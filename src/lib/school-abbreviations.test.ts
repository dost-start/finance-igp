import { describe, expect, it } from "vitest";
import { expandSchoolAbbreviation } from "./school-abbreviations";

describe("expandSchoolAbbreviation", () => {
  it("suggests the full name for an abbreviation, ignoring case and dots", () => {
    expect(expandSchoolAbbreviation("DLSU")).toBe("De La Salle University");
    expect(expandSchoolAbbreviation("u.p.")).toBe("University of the Philippines");
  });
  it("leaves full names and unknown words alone", () => {
    expect(expandSchoolAbbreviation("University of Cebu")).toBeNull();
    expect(expandSchoolAbbreviation("Xyzzy")).toBeNull();
    expect(expandSchoolAbbreviation("")).toBeNull();
  });
});
