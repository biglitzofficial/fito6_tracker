# FITO6 ERP (Claude) — Design reference

Standalone HTML/JS prototype the user likes. Full source was provided in chat as FITO6-ERP-source-code.

## Visual tokens
- bg: #f4f6fa
- card: #ffffff
- ink: #1a2233
- muted: #6b7688
- brand: #ff6a00 / #ff8c33
- sidebar dark: #141b2d / #1d2740
- ok: #18a558 · bad: #e0393e · warn: #e8a10c · line: #e6eaf2

## UX patterns to port (keep Next.js + existing APIs)
1. Dark navy sidebar + light content area
2. Orange primary CTAs
3. Stat cards + clean tables
4. Client registration wizard (personal → plan → payment)
5. Client profile with subscriptions + invoices on one view
6. Billing / cashbook style lists

## Note
Do not replace the Firestore backend with localStorage from the prototype.
