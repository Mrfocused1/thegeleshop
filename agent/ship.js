#!/usr/bin/env node
// Shipping label automation for The Gele Shop using Shippo API.
// Multi-carrier (Royal Mail, DPD, ParcelForce, FedEx, DHL, USPS, Evri).
// Pay-per-label, no monthly fee. Test mode supported.
//
// Setup:
//   1. Sign up free at shippo.com (UK supported)
//   2. Get API key from dashboard → Settings → API
//   3. Add to agent/.env:  SHIPPO_API_KEY=shippo_test_xxx  (or shippo_live_xxx)
//   4. npm install --prefix agent shippo
//
// Usage:
//   node agent/ship.js order.json                  # generate label from order JSON
//   node agent/ship.js --test                      # smoke test with fake data
//
// order.json shape (example):
//   {
//     "order_id": "ORD-001",
//     "customer": { "name": "Adaeze Smith", "email": "buyer@example.com" },
//     "ship_to": {
//       "name": "Adaeze Smith",
//       "street1": "12 Camden High Street",
//       "city": "London",
//       "state": "",
//       "zip": "NW1 0JH",
//       "country": "GB"
//     },
//     "parcel": {
//       "length": 30, "width": 25, "height": 8, "distance_unit": "cm",
//       "weight": 0.4, "mass_unit": "kg"
//     },
//     "items": [{ "name": "Gold Bridal Auto-Gele", "qty": 1, "value_gbp": 155 }]
//   }

import "dotenv/config";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const LABELS_DIR = path.join(__dirname, "labels");

if (!fs.existsSync(LABELS_DIR)) fs.mkdirSync(LABELS_DIR, { recursive: true });

const SHIPPO_API_KEY = process.env.SHIPPO_API_KEY;
if (!SHIPPO_API_KEY) {
  console.error("✗ SHIPPO_API_KEY not set. Add it to agent/.env and re-run.");
  console.error("  Sign up free at https://goshippo.com/ — UK supported.");
  process.exit(1);
}
const IS_TEST_MODE = SHIPPO_API_KEY.startsWith("shippo_test_");

// ---------- 1. Sender (your UK return address) ----------
// CONFIGURE THIS once you've registered as sole trader / opened a bank account.
// For now this is a placeholder; Shippo test mode accepts it.
const ADDRESS_FROM = {
  name: "The Gele Shop",
  street1: process.env.SHIP_FROM_STREET || "1 Example Road",
  city:    process.env.SHIP_FROM_CITY   || "London",
  state:   "",
  zip:     process.env.SHIP_FROM_ZIP    || "SW1A 1AA",
  country: "GB",
  phone:   process.env.SHIP_FROM_PHONE  || "+447000000000",
  email:   process.env.SHIP_FROM_EMAIL  || "hello@thegele.shop",
};

// ---------- 2. Test fixture ----------
const testOrder = {
  order_id: "TEST-" + Date.now(),
  customer: { name: "Test Buyer", email: "test@example.com" },
  ship_to: {
    name: "Test Buyer",
    street1: "1600 Pennsylvania Avenue NW",
    city: "Washington",
    state: "DC",
    zip: "20500",
    country: "US",
    phone: "+12025550100",
    email: "test@example.com",
  },
  parcel: {
    length: "30", width: "25", height: "8", distance_unit: "cm",
    weight: "0.4", mass_unit: "kg",
  },
  items: [{ name: "Gold Bridal Auto-Gele", qty: 1, value_gbp: 155 }],
};

// ---------- 3. Shippo API client ----------
const SHIPPO_BASE = "https://api.goshippo.com";
async function shippo(path, body) {
  const res = await fetch(SHIPPO_BASE + path, {
    method: body ? "POST" : "GET",
    headers: {
      "Authorization": `ShippoToken ${SHIPPO_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json();
  if (!res.ok) {
    console.error(`✗ Shippo API error (${res.status}):`, data);
    throw new Error(`Shippo ${res.status}: ${JSON.stringify(data)}`);
  }
  return data;
}

// ---------- 4. Generate label flow ----------
async function generateLabel(order) {
  console.log(`\n→ Order ${order.order_id} for ${order.customer.name} (${order.ship_to.country})`);
  if (IS_TEST_MODE) console.log("  [TEST MODE — no real label, no charge]");

  // a. Create shipment (returns rate options across carriers)
  const shipment = await shippo("/shipments/", {
    address_from: ADDRESS_FROM,
    address_to: order.ship_to,
    parcels: [order.parcel],
    async: false,
  });
  console.log(`  ${shipment.rates.length} rates available`);

  // b. Pick cheapest rate that meets requirements
  if (!shipment.rates.length) throw new Error("No rates returned for this destination.");
  const rate = shipment.rates
    .filter(r => r.amount && parseFloat(r.amount) > 0)
    .sort((a, b) => parseFloat(a.amount) - parseFloat(b.amount))[0];
  console.log(`  ✓ Selected: ${rate.provider} ${rate.servicelevel.name} — ${rate.amount} ${rate.currency} (${rate.estimated_days || "?"} days)`);

  // c. Buy the label
  const transaction = await shippo("/transactions/", {
    rate: rate.object_id,
    label_file_type: "PDF",
    async: false,
  });
  if (transaction.status !== "SUCCESS") {
    console.error("  ✗ Label purchase failed:", transaction.messages);
    throw new Error("Label purchase failed");
  }

  // d. Save label PDF locally
  const labelPath = path.join(LABELS_DIR, `${order.order_id}.pdf`);
  const labelRes = await fetch(transaction.label_url);
  const labelBuf = Buffer.from(await labelRes.arrayBuffer());
  fs.writeFileSync(labelPath, labelBuf);

  // e. Summary
  console.log(`  ✓ Label saved: ${path.relative(ROOT, labelPath)}`);
  console.log(`  ✓ Tracking:    ${transaction.tracking_number}`);
  console.log(`  ✓ Track URL:   ${transaction.tracking_url_provider || "(see Shippo dashboard)"}`);

  return {
    order_id: order.order_id,
    carrier: rate.provider,
    service: rate.servicelevel.name,
    cost_gbp: rate.amount,
    tracking_number: transaction.tracking_number,
    tracking_url: transaction.tracking_url_provider,
    label_path: labelPath,
  };
}

// ---------- 5. CLI entrypoint ----------
const arg = process.argv[2];
if (!arg) {
  console.error("Usage: node agent/ship.js <order.json>");
  console.error("       node agent/ship.js --test");
  process.exit(1);
}

try {
  const order = arg === "--test"
    ? testOrder
    : JSON.parse(fs.readFileSync(arg, "utf8"));
  const result = await generateLabel(order);
  console.log("\n✓ Done.\n", JSON.stringify(result, null, 2));
} catch (err) {
  console.error("\n✗ Failed:", err.message);
  process.exit(1);
}
