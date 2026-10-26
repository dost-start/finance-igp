// Order ID region codes: PSGC region codes from PRD Appendix E.
// Code 15 is unused (former ARMM). Caraga is Region XIII but has code 16, so 13 is NCR.
export const REGIONS = [
  { code: "01", name: "Ilocos Region (Region I)" },
  { code: "02", name: "Cagayan Valley (Region II)" },
  { code: "03", name: "Central Luzon (Region III)" },
  { code: "04", name: "CALABARZON (Region IV-A)" },
  { code: "05", name: "Bicol Region (Region V)" },
  { code: "06", name: "Western Visayas (Region VI)" },
  { code: "07", name: "Central Visayas (Region VII)" },
  { code: "08", name: "Eastern Visayas (Region VIII)" },
  { code: "09", name: "Zamboanga Peninsula (Region IX)" },
  { code: "10", name: "Northern Mindanao (Region X)" },
  { code: "11", name: "Davao Region (Region XI)" },
  { code: "12", name: "SOCCSKSARGEN (Region XII)" },
  { code: "13", name: "National Capital Region (NCR)" },
  { code: "14", name: "Cordillera Administrative Region (CAR)" },
  { code: "16", name: "Caraga (Region XIII)" },
  { code: "17", name: "MIMAROPA" },
  { code: "18", name: "Negros Island Region (NIR)" },
  { code: "19", name: "Bangsamoro Autonomous Region in Muslim Mindanao (BARMM)" },
] as const;

export type RegionCode = (typeof REGIONS)[number]["code"];

export function isRegionCode(value: string): value is RegionCode {
  return REGIONS.some((r) => r.code === value);
}
