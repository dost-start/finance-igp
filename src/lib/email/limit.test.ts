import { describe, expect, it } from "vitest";
import { isProblem, resultLabel, templateLabel } from "./log";
import { DEFAULT_EMAIL_DAILY_LIMIT, budgetOf, checkBudget, emailDailyLimit, isNearLimit } from "./limit";

describe("daily email limit", () => {
  it("uses Gmail's ordinary cap unless one is set", () => {
    expect(emailDailyLimit({})).toBe(DEFAULT_EMAIL_DAILY_LIMIT);
    expect(emailDailyLimit({ EMAIL_DAILY_LIMIT: "2000" })).toBe(2000);
    for (const bad of ["", "abc", "0", "-3", "1.5", "99999999"]) expect(emailDailyLimit({ EMAIL_DAILY_LIMIT: bad })).toBe(DEFAULT_EMAIL_DAILY_LIMIT);
  });

  it("allows what fits and refuses what does not, with a clear message", () => {
    const b = budgetOf(10, 7);
    expect(b).toEqual({ limit: 10, used: 7, remaining: 3 });
    expect(checkBudget(b, 3)).toEqual({ ok: true });
    const no = checkBudget(b, 4);
    expect(no.ok).toBe(false);
    if (!no.ok) {
      expect(no.message).toContain("7 of 10 sent in the last 24 hours");
      expect(no.message).toContain("4 buyer emails would be needed");
      expect(no.message).toContain("Nothing was changed");
      expect(no.message).toContain("Choose 3 or fewer");
    }
  });

  it("says try later when nothing is left, and never goes negative", () => {
    const b = budgetOf(10, 12);
    expect(b.remaining).toBe(0);
    const no = checkBudget(b, 1);
    expect(no.ok).toBe(false);
    if (!no.ok) {
      expect(no.message).toContain("1 buyer email would be needed");
      expect(no.message).toContain("Try again later.");
    }
  });

  it("warns when the last tenth of the limit is reached", () => {
    expect(isNearLimit(budgetOf(500, 449))).toBe(false);
    expect(isNearLimit(budgetOf(500, 450))).toBe(true);
    expect(isNearLimit(budgetOf(20, 11))).toBe(true); // always warns inside the last 10
  });
});

describe("email log labels", () => {
  it("names all nine emails", () => {
    expect(templateLabel("2-payment-confirmation")).toBe("2 Payment confirmation");
    expect(templateLabel("9-payment-rejected")).toBe("9 Payment rejected");
    expect(templateLabel("something-new")).toBe("something-new");
  });
  it("flags everything that is not a sent email", () => {
    expect(isProblem("sent")).toBe(false);
    for (const r of ["failed: EAUTH", "skipped: SMTP is not configured", "blocked: daily limit reached"]) expect(isProblem(r)).toBe(true);
  });
  it("explains each result in plain words", () => {
    expect(resultLabel("sent")).toBe("Sent");
    expect(resultLabel("failed: EAUTH")).toBe("Failed (EAUTH)");
    expect(resultLabel("failed")).toBe("Failed (unknown reason)");
    expect(resultLabel("blocked: daily limit reached")).toBe("Not sent: daily email limit reached");
    expect(resultLabel("skipped: SMTP is not configured")).toBe("Not sent: email is not set up on this server");
  });
});
