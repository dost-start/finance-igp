// The demo orders for the finance walkthrough (docs/demo-script.md): one of every situation the
// admin area is built for, so the list is full and every screen has something to show. Everything about
// them is recognisable and removable: buyer names start with "DEMO ", and the email is a plus-address of the
// tech lead's own Gmail, so nothing ever reaches a stranger.
export const DEMO_NAME_PREFIX = "DEMO ";
export const DEMO_EMAIL_MARK = "+demo@";
export const isDemoOrder = (buyerName: string, email: string): boolean => buyerName.startsWith(DEMO_NAME_PREFIX) && email.includes(DEMO_EMAIL_MARK);

export type DemoOcr = "match" | "mismatch" | "unreadable";
export type DemoStatus = "order_received" | "pending_payment" | "payment_confirmation" | "in_production" | "out_for_shipping" | "received_successfully" | "canceled" | "refund_in_process" | "payment_rejected";

export type DemoOrder = {
  name: string;
  region: string;
  status: DemoStatus;
  items: { slug: string; size: string; quantity: number }[];
  channel?: string;
  reference?: string;
  ocr?: DemoOcr;
  /** What the buyer's receipt shows as the amount, in pesos, when it differs from the order total. */
  receiptAmountPesos?: number;
  hoursAgo: number;
  note?: string;
};

export const DEMO_ORDERS: DemoOrder[] = [
  { name: "Ana Reyes", region: "13", status: "pending_payment", items: [{ slug: "tshirt-design-a", size: "M", quantity: 1 }], channel: "gcash", reference: "0046567041001", ocr: "match", hoursAgo: 30 },
  { name: "Ben Santos", region: "07", status: "pending_payment", items: [{ slug: "tshirt-design-b", size: "L", quantity: 2 }], channel: "landbank", reference: "LBP2026102701002", ocr: "match", hoursAgo: 26 },
  { name: "Carla Dizon", region: "04", status: "pending_payment", items: [{ slug: "jacket", size: "M", quantity: 1 }], channel: "gotyme", reference: "CAR261026120058269003", ocr: "mismatch", receiptAmountPesos: 1000, hoursAgo: 22, note: "The receipt shows 1,000 pesos but the order total is 1,200." },
  { name: "Dan Uy", region: "11", status: "pending_payment", items: [{ slug: "lanyard-dark", size: "One size", quantity: 3 }], channel: "maribank", reference: "181004", ocr: "unreadable", hoursAgo: 18, note: "A blurry photo of the receipt that could not be read." },
  { name: "Eli Cruz", region: "13", status: "pending_payment", items: [{ slug: "tote-dark", size: "One size", quantity: 1 }, { slug: "sticker-01", size: "One size", quantity: 1 }], channel: "gcash", reference: "0046567041005", ocr: "match", hoursAgo: 14, note: "Shares a reference number with Fe Lim's order: the same payment claimed twice." },
  { name: "Fe Lim", region: "13", status: "pending_payment", items: [{ slug: "sticker-02", size: "One size", quantity: 2 }], channel: "gcash", reference: "0046567041005", ocr: "mismatch", receiptAmountPesos: 280, hoursAgo: 12 },
  { name: "Gio Tan", region: "03", status: "payment_confirmation", items: [{ slug: "tshirt-design-a", size: "S", quantity: 1 }], channel: "gcash", reference: "0046567041007", ocr: "match", hoursAgo: 70 },
  { name: "Hana Ong", region: "06", status: "in_production", items: [{ slug: "tshirt-design-b", size: "M", quantity: 2 }], channel: "landbank", reference: "LBP2026102701008", ocr: "match", hoursAgo: 96 },
  { name: "Ian Go", region: "10", status: "out_for_shipping", items: [{ slug: "jacket", size: "L", quantity: 1 }], channel: "gotyme", reference: "CAR261026120058269009", ocr: "match", hoursAgo: 120 },
  { name: "Jill Lee", region: "13", status: "received_successfully", items: [{ slug: "lanyard-dark", size: "One size", quantity: 1 }], channel: "maribank", reference: "181010", ocr: "match", hoursAgo: 168 },
  { name: "Kai Sy", region: "02", status: "canceled", items: [{ slug: "tote-dark", size: "One size", quantity: 1 }], channel: "gcash", reference: "0046567041011", ocr: "match", hoursAgo: 100, note: "Out of stock" },
  { name: "Lia Co", region: "05", status: "refund_in_process", items: [{ slug: "jacket", size: "S", quantity: 1 }], channel: "gotyme", reference: "CAR261026120058269012", ocr: "match", hoursAgo: 110, note: "Out of stock" },
  { name: "Mae Ng", region: "13", status: "order_received", items: [{ slug: "sticker-03", size: "One size", quantity: 4 }], hoursAgo: 3 },
  { name: "Nico Pe", region: "08", status: "payment_rejected", items: [{ slug: "tshirt-design-a", size: "XL", quantity: 1 }], channel: "landbank", reference: "LBP2026102701014", ocr: "mismatch", receiptAmountPesos: 400, hoursAgo: 40, note: "Incorrect amount" },
];

// The steps each status has passed through, so the history and the buyer's timeline are realistic.
export function historyFor(status: DemoStatus): DemoStatus[] {
  switch (status) {
    case "order_received":
      return ["order_received"];
    case "pending_payment":
      return ["order_received", "pending_payment"];
    case "payment_rejected":
      return ["order_received", "pending_payment", "payment_rejected"];
    case "payment_confirmation":
      return ["order_received", "pending_payment", "payment_confirmation"];
    case "in_production":
      return ["order_received", "pending_payment", "payment_confirmation", "in_production"];
    case "out_for_shipping":
      return ["order_received", "pending_payment", "payment_confirmation", "in_production", "out_for_shipping"];
    case "received_successfully":
      return ["order_received", "pending_payment", "payment_confirmation", "in_production", "out_for_shipping", "received_successfully"];
    case "canceled":
      return ["order_received", "pending_payment", "payment_confirmation", "canceled"];
    case "refund_in_process":
      return ["order_received", "pending_payment", "payment_confirmation", "canceled", "refund_in_process"];
  }
}

// Statuses after payment was confirmed carry a tracking token, so the buyer-side lookup works in the demo.
export const hasTrackingToken = (status: DemoStatus): boolean => !["order_received", "pending_payment", "payment_rejected"].includes(status);
