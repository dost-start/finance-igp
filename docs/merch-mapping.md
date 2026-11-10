# START: COLLECTIONS merch mapping (proposed)

Source folder: `/Users/ethan/Downloads/START MERCH DESIGNS 2`
Prices are placeholders; finance edits them in the admin after loading. 33 active products.

## Active products

| # | Source file | Slug | Product name | Type | Price | Sizes | Action |
|---|---|---|---|---|---|---|---|
| 1 | `[SHIRT] DESIGN 1.png` | `tshirt-design-a` | START T-Shirt, Design A | tshirt | ₱450 | S, M, L, XL, 2XL | Replace image; crop front and back |
| 2 | `[SHIRT] DESIGN 2.png` | `tshirt-design-b` | START T-Shirt, Design B | tshirt | ₱450 | S, M, L, XL, 2XL | Replace image; crop front and back |
| 3 | `[JACKET] DESIGN 1.png` | `jacket` | START Jacket, Design 1 | jacket | ₱1,200 | S, M, L, XL, 2XL | Replace image, rename; crop front and back |
| 4 | `[JACKET] DESIGN 2.png` | `jacket-design-2` | START Jacket, Design 2 | jacket | ₱1,200 | S, M, L, XL, 2XL | New |
| 5 | `ID Lace_1.png` | `lanyard-light` | START Lanyard 01 | lanyard | ₱120 | One size | Replace image, rename |
| 6 | `ID Lace_2.png` | `lanyard-02` | START Lanyard 02 | lanyard | ₱120 | One size | New |
| 7 | `ID Lace_3.png` | `lanyard-03` | START Lanyard 03 | lanyard | ₱120 | One size | New |
| 8 | `ID Lace_4.png` | `lanyard-04` | START Lanyard 04 | lanyard | ₱120 | One size | New |
| 9 | `ID Lace_5.png` | `lanyard-05` | START Lanyard 05 | lanyard | ₱120 | One size | New |
| 10 | `Totebag.png` | `tote-light` | START Tote Bag | tote | ₱250 | One size | Replace image, rename |
| 11 | `PINS/9.png` | `pin-01` | START Star Pin | pin (new type) | ₱80 | One size | New |
| 12 | `PINS/10.png` | `pin-02` | Techno Scholar Unite Pin | pin | ₱80 | One size | New |
| 13 | `PINS/11.png` | `pin-03` | START Logo Pin | pin | ₱80 | One size | New |
| 14 | `PINS/12.png` | `pin-04` | Techno Scholar Para Sa Bayan Pin | pin | ₱80 | One size | New |
| 15 | `PINS/13.png` | `pin-05` | I ♥ My CEO Pin | pin | ₱80 | One size | New (person's face: confirm consent) |
| 16 | `STICKERS/1.png` | `sticker-01` | START Stars Sticker | sticker | ₱30 | One size | Replace image, rename |
| 17 | `STICKERS/2.png` | `sticker-02` | Just Start Sticker (A) | sticker | ₱30 | One size | Replace image, rename |
| 18 | `STICKERS/3.png` | `sticker-03` | Just Start Sticker (B) | sticker | ₱30 | One size | Replace image, rename |
| 19 | `STICKERS/4.png` | `sticker-04` | START-DOST Star Sticker (A) | sticker | ₱30 | One size | Replace image, rename |
| 20 | `STICKERS/5.png` | `sticker-05` | START-DOST Star Sticker (B) | sticker | ₱30 | One size | Replace image, rename |
| 21 | `STICKERS/6.png` | `sticker-06` | United, We Innovate Sticker (A) | sticker | ₱30 | One size | Replace image, rename |
| 22 | `STICKERS/7.png` | `sticker-07` | United, We Innovate Sticker (B) | sticker | ₱30 | One size | Replace image, rename |
| 23 | `STICKERS/8.png` | `sticker-08` | Techno Scholars Unite Sticker | sticker | ₱30 | One size | Replace image, rename |
| 24 | `STICKER_1.png` | `sticker-09` | Waving Star Sticker | sticker | ₱30 | One size | Replace image, rename |
| 25 | `STICKER_2.png` | `sticker-10` | Start Now Monitor Sticker | sticker | ₱30 | One size | Replace image, rename |
| 26 | `STICKER_4.png` | `sticker-11` | 90% Vibes 10% Code Sticker | sticker | ₱30 | One size | New |
| 27 | `STICKER_5.png` | `sticker-12` | Live Laugh Love Claude Sticker | sticker | ₱30 | One size | New (third-party brand: confirm) |
| 28 | `sticker_A1.png` | `sticker-13` | Startup Rocket Sticker | sticker | ₱30 | One size | New |
| 29 | `sticker_A2.png` | `sticker-14` | In the Middle of a Rebrand Sticker | sticker | ₱30 | One size | New |
| 30 | `sticker_A3.png` | `sticker-15` | Folder Computer Sticker | sticker | ₱30 | One size | New |
| 31 | `sticker_A4.png` | `sticker-16` | tech_4_people Sticker | sticker | ₱30 | One size | New |
| 32 | `sticker_A5.png` | `sticker-17` | div>a Sticker | sticker | ₱30 | One size | New |
| 33 | `sticker_A6.png` | `sticker-18` | Do You Accept Cookies Sticker | sticker | ₱30 | One size | New (third-party brand: confirm) |

## Switched off (hidden, not deleted, so old orders keep working)

| Slug | Why |
|---|---|
| `tote-dark` | No dark tote design supplied |
| `lanyard-dark` | Lanyards are now numbered 01 to 05; no "dark" lanyard |

## Not used

- `ID LACE.psd` (source file, not a web image)

## Flags to settle before launch

1. **Brand rights.** #27 ("Live Laugh Love Claude") and #33 (Cookie Monster dialog) use third-party brands. Cleared by Ethan.
2. **Consent.** #15 shows a real person's face. Cleared by Ethan.
3. **Likely duplicates.** `STICKERS/2` and `/3`, `/4` and `/5`, `/6` and `/7` look like the same design with and without a shadow. Selling both is selling duplicates.
4. **Image weight.** Jacket PNGs are 29 MB and shirt PNGs 9.5 MB. All files get exported as WebP (1600 px long side) into `public/products/`; originals stay put.
5. **Live database.** `seed.ts` never overwrites rows, so a one-off script updates live products, adds the new ones and switches off `tote-dark` and `lanyard-dark`.
