import { describe, expect, it } from "vitest";
import { SCHOOL_ACRONYMS } from "./school-acronyms.generated";
import { expandSchoolAbbreviation, suggestSchoolNames } from "./school-abbreviations";

describe("suggestSchoolNames", () => {
  it("suggests the full name for an abbreviation, ignoring case and dots", () => {
    expect(expandSchoolAbbreviation("DLSU")).toBe("De La Salle University");
    expect(expandSchoolAbbreviation("u.p.")).toBe("University of the Philippines");
  });
  it("uses the generated list for schools the hand-picked list lacks", () => {
    expect(suggestSchoolNames("HAU", SCHOOL_ACRONYMS)).toContain("Holy Angel University");
    expect(suggestSchoolNames("lpu", SCHOOL_ACRONYMS)).toContain("Lyceum of the Philippines University");
  });
  it("offers several when an abbreviation is ambiguous, never repeating one", () => {
    const r = suggestSchoolNames("CIT", SCHOOL_ACRONYMS);
    expect(r.length).toBeGreaterThan(1);
    expect(new Set(r.map((n) => n.toLowerCase())).size).toBe(r.length);
  });
  it("leaves full names and unknown words alone", () => {
    expect(suggestSchoolNames("University of Cebu", SCHOOL_ACRONYMS)).toEqual([]);
    expect(suggestSchoolNames("Xyzzy", SCHOOL_ACRONYMS)).toEqual([]);
    expect(suggestSchoolNames("", SCHOOL_ACRONYMS)).toEqual([]);
  });
});
