import nodemailer, { type Transporter } from "nodemailer";
import { getDb, schema } from "@/db";
import type { EmailContent } from "./templates";

// Gmail SMTP sender. Every attempt is written to email_logs, including failures and skips, so
// finance can see what went out. Message bodies and credentials are never logged.
let transport: Transporter | undefined;

function getTransport() {
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  if (!user || !pass) return null;
  return (transport ??= nodemailer.createTransport({ host: "smtp.gmail.com", port: 465, secure: true, auth: { user, pass } }));
}

export async function sendOrderEmail(input: { orderUuid: string; template: string; to: string; content: EmailContent }) {
  let result = "sent";
  try {
    const t = getTransport();
    if (!t) {
      result = "skipped: SMTP is not configured";
    } else {
      await t.sendMail({
        from: `"START: COLLECTIONS" <${process.env.SMTP_USER}>`,
        to: input.to,
        subject: input.content.subject,
        text: input.content.text,
        headers: { "Auto-Submitted": "auto-generated" },
      });
    }
  } catch (e) {
    const code = typeof e === "object" && e && "code" in e ? String((e as { code?: unknown }).code) : "error";
    result = `failed: ${code}`;
  }
  try {
    await getDb().insert(schema.emailLogs).values({ orderUuid: input.orderUuid, template: input.template, recipient: input.to, result });
  } catch {
    console.error("could not write email log");
  }
  return result;
}
