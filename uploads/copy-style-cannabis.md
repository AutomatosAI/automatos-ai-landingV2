# Copy Style — Cannabis Markets (PT / UK / DE)

> **Purpose.** Medical cannabis is regulated. Wrong copy gets a template rejected by the legal team — or worse, gets the tenant fined. Right copy positions the operator as a trustworthy, professional, patient-first business. This is the voice register, the required microcopy, the forbidden phrases, and the patterns that work across Portugal, the UK, and Germany.
>
> **Scope.** Applies to template-generated copy on home, about, contact, hero CTAs, footer disclaimers, and section microcopy. Does NOT apply to product descriptions (those come from the tenant catalogue) or operator-edited content (operators own that liability).

---

## 1. Voice Register Selector

Pick one register per template based on the brand brief; mixing registers in the same template feels untrustworthy.

| Register | Use when | Tone | Vocabulary | Example hero subtitle |
|---|---|---|---|---|
| **medical-professional** | Clinic-first brands, doctor-led services, pharmacy partnerships | Clinical, authoritative, calm | "consultation", "prescription", "treatment", "patient", "evidence-based" | "Doctor-led consultations and pharmacy-grade products, prescribed for your specific condition." |
| **lifestyle-premium** | Wellness lifestyle brands with medical credentials, premium consumer | Warm, refined, considered | "wellness", "balance", "carefully sourced", "your journey" | "Premium medical cannabis, carefully sourced, expertly prescribed — for the life you want." |
| **patient-empathetic** | Patient-advocacy brands, chronic-pain or oncology focus | Compassionate, plain-language, human | "understand", "support", "every day", "what works for you" | "We've helped 4,000 patients find what works. We'd be glad to help you too." |

**Default for cannabis templates:** `medical-professional`. It's the safest register across all three markets and the easiest for operators to extend in their own copy without breaking voice.

---

## 2. Required Compliance Microcopy

Every template MUST include these strings in the indicated locations, with copy adapted to the target market.

### Footer disclaimer (always present)

| Market | Recommended disclaimer |
|---|---|
| **Portugal (PT)** | "Cannabis is a controlled medicine. Use only as prescribed by a qualified medical professional. Authorised by INFARMED. Keep out of reach of children." |
| **UK** | "Cannabis-based medicinal products may only be prescribed by specialist doctors on the GMC Specialist Register. This site does not constitute medical advice. Keep out of reach of children." |
| **Germany (DE)** | "Cannabis als Medizin ist verschreibungspflichtig. Bitte konsultieren Sie einen Arzt. Außerhalb der Reichweite von Kindern aufbewahren. // Medical cannabis requires a prescription. Please consult a physician. Keep out of reach of children." |
| **Multi-market** | "Medical cannabis is a regulated medicine. Availability and prescribing rules vary by jurisdiction. Consult a qualified medical professional. Keep out of reach of children." |

Place in `footerConfig.disclaimer`.

### Age gate (if template has one)

Required minimum copy:

> "This site contains information about prescription-only medicines. By entering, you confirm that you are 18 or older and accessing this site in a jurisdiction where medical cannabis is legally available."

Buttons: `"I am 18 or older"` (primary) / `"I am under 18"` (secondary, redirects out).

### Pre-purchase / consultation gate

If a hero CTA links to product browsing, accompany with:

> "Products are prescription-only. Begin with a consultation."

Place near the CTA, not inside it.

### Newsletter / signup forms

Required adjacent text:

> "We'll only contact you about your account, prescriptions, and clinic updates. No marketing of specific products."

Place below the email input, above the submit button.

---

## 3. CTA Copy Library

Use these labels verbatim or as starting points; they're tested for clarity, regulatory safety, and conversion.

### Primary CTAs

| Label | Use case |
|---|---|
| `Book Consultation` | Default home hero CTA — never controversial |
| `Find a Specialist` | Clinic-network brands |
| `Start Your Assessment` | Brands with a triage form before consultation |
| `Speak to a Doctor` | Direct-to-doctor brands |
| `Check Eligibility` | Pre-qualification brands (UK common) |
| `Request a Callback` | Lower-friction alternative to booking |

### Secondary CTAs

| Label | Use case |
|---|---|
| `Patient Login` | Existing-patient portal |
| `Browse Products` | Post-consultation discovery (only after age + prescription gate) |
| `Read Patient Stories` | Trust-building, redirects to testimonials |
| `Download Patient Guide` | Lead-magnet pattern |
| `View FAQs` | Self-serve information |

### Navigation labels

| Label | Use case |
|---|---|
| `Shop` / `Products` | Product catalogue (only when accessible to logged-in patients or post-gate) |
| `About` | About the company |
| `Education` | Educational content (always safe to expose) |
| `For Patients` | Patient-facing content |
| `For Doctors` | Prescriber-facing content |
| `Contact` | Contact page |

**Avoid in nav:** `Strains`, `Buy Now`, `Order`, `Get Started Today` — these read recreational/aggressive.

---

## 4. Hero Title Patterns

Patterns that work, with examples and why:

### Pattern: Outcome-led
**Template:** `{Outcome}, {how}.`
**Examples:**
- "Better outcomes, prescribed by doctors who listen."
- "Less pain, more days. Medical cannabis for chronic conditions."

**Why it works:** patient benefit first, mechanism second. Avoids product-hype framing.

### Pattern: Trust-led
**Template:** `{Profession-based trust marker}. {Patient-first benefit}.`
**Examples:**
- "Doctor-led. Patient-focused. Medical cannabis prescribed with care."
- "Clinically supervised. Pharmacy-grade. Prescribed for you."

**Why it works:** establishes credibility before benefit. Strongest for medical-professional register.

### Pattern: Direct-personal
**Template:** `{Two-word verb-noun phrase}. {Reassuring qualifier}.`
**Examples:**
- "Find relief. Prescribed by specialists."
- "Get support. Treated like a patient, not a customer."

**Why it works:** active and short. Pairs well with patient-empathetic register.

### Patterns to avoid

- "Cure your..." — implies medical efficacy claims (illegal in PT/UK/DE without trial data)
- "The best cannabis in {country}" — comparative claims trigger ASA review (UK)
- "Try it today" / "Buy now" / "Get yours" — recreational framing
- "Discover the magic of..." — recreational/lifestyle in a medical context
- "Powered by THC" / "High in CBD" — leads with active ingredient hype

---

## 5. Subtitle Patterns

Two-line subtitle, max ~120 chars total. Lead with patient context, end with mechanism.

```
{Patient context, 50–70 chars}.
{Mechanism / credentials, 40–60 chars}.
```

Examples:

> Living with chronic pain shouldn't mean compromising on quality of life.
> Doctor-led consultations and pharmacy-grade products.

> Sleep, mood, pain — every patient is different.
> Personalised treatment plans, prescribed by specialists.

> A clinic that takes your symptoms seriously and your dignity for granted.
> 4,000+ patients treated. Insurance-accepted in {country}.

---

## 6. Section Microcopy Library

Reusable phrases for value-prop blocks, feature cards, FAQ snippets, etc.

### Trust markers (factual, no claim required)

- "GMC Specialist Register prescribers" (UK)
- "INFARMED-authorised dispensary" (PT)
- "AMG-zertifizierter Versand" (DE — Arzneimittelgesetz)
- "Pharmacy-grade products"
- "Lab-tested batches with full COA"
- "Doctor-led consultations"
- "Encrypted patient records"
- "Insurance-accepted prescriptions"

### Process descriptors (factual)

- "30-minute consultation with a specialist"
- "Prescription delivered to your registered pharmacy"
- "Discreet, tracked delivery to your door" (where legal)
- "Pre-consultation assessment in 5 minutes"
- "Repeat prescriptions managed in-app"

### Patient-care descriptors

- "Treatment plans personalised to your condition and lifestyle"
- "Specialist follow-ups every 3 months"
- "Patient support team available {hours}"
- "Multilingual care team" (when applicable)

### Forbidden microcopy

| Forbidden | Why | Use instead |
|---|---|---|
| "Cures anxiety" | Efficacy claim | "Some patients find relief from anxiety symptoms" (then link to evidence section) |
| "Better than antidepressants" | Comparative medical claim | "An option to discuss with your specialist" |
| "Get high relief" | Recreational | "Get effective relief" |
| "Best strain for {condition}" | Specific medical efficacy | "Strains your specialist may consider" |
| "All-natural medicine" | Implied superiority over pharma | "Plant-based medicine" |
| "100% safe" | Unsupported safety claim | "Prescribed by specialists, monitored throughout treatment" |
| "Risk-free" | Unsupported safety claim | "Side-effects are monitored at every consultation" |

---

## 7. Market-Specific Notes

### Portugal

- Use Portuguese OR English depending on target audience; if Portuguese, follow EU formal address (`você` / second person formal, never `tu`).
- INFARMED authorisation is the single most important credibility marker — surface it early.
- Prescription dispensing is via pharmacy partners — never imply direct-to-patient delivery from the operator.
- Tax invoice (`fatura com NIF`) is expected — mention if true: "Faturas com NIF disponíveis."

### United Kingdom

- ASA (Advertising Standards Authority) regulates online claims — assume every line of copy is being read by a regulator.
- "Prescription-only medicine" (POM) is the formal term — use it.
- The Misuse of Drugs Regulations 2018 changed legal status — mention "since November 2018" when establishing market context.
- Specialist-only prescribing is a critical detail; never imply GPs can prescribe (they can't, in practice).

### Germany

- Bilingual templates (DE/EN) are common for international patients; if generating bilingual, mark language clearly: `<html lang="de">` etc.
- The Cannabisgesetz (April 2024) changed prescribing — current copy should reflect the post-CanG environment for medical cannabis (the market is medical AND adult-use; templates should distinguish).
- Prescriptions are dispensed via pharmacy (Apotheke) — same pattern as PT.
- Formal address (`Sie`, never `du`) for medical contexts.

---

## 8. About-Page Copy Patterns

### Mission paragraph structure (3 paragraphs)

**Paragraph 1: Origin / why this exists**
> "We started {brand} in {year} because {personal/clinical observation that drove the founders}. {Sentence about what was wrong with the status quo}."

**Paragraph 2: How we work / what we do differently**
> "{What patients experience working with us}. {What's distinct — process, sourcing, team, follow-up}."

**Paragraph 3: Who we are / where we're headed**
> "{Team composition or values}. {Where the brand is going / what we're building toward}."

Three paragraphs; under 80 words each. The editor splits on blank lines into `string[]`.

---

## 9. Contact-Page Copy Patterns

### Title options (pick one)
- "Get in Touch" (default, register-neutral)
- "Speak to Our Team" (medical-professional)
- "We're Here to Help" (patient-empathetic)
- "Contact Us" (functional)

### Description patterns
- "Have questions about consultations, prescriptions, or your account? Our patient support team is here to help."
- "For new patient enquiries, prescription questions, or general support, we're available {hours}."

### What to include
- Email — always
- Phone — preferred (regulators view phone as a sign of legitimacy)
- Address — preferred for licensed brands; legitimises the operation
- Hours — if patient support is staffed (not 24/7), say so

### What NOT to include
- A live-chat widget that promises medical advice (regulators flag this)
- A "buy now" button on the contact page
- Anonymous email addresses (`info@`, `hello@`, `contact@`) without a named alternative for clinical questions (`patientsupport@`, `prescriptions@`)

---

## 10. Audit Checklist

Before shipping generated copy:

- [ ] Voice register is consistent across home / about / contact / footer
- [ ] Footer disclaimer matches target market (PT / UK / DE / multi)
- [ ] No forbidden claims ("cure", "100% safe", "best", comparative claims)
- [ ] No recreational framing ("get high", "buy now", "the magic of")
- [ ] Product browsing is gated by age + prescription where required
- [ ] Specialist-prescribing language is correct for market (UK: GMC Specialist Register; PT: INFARMED-authorised; DE: post-CanG appropriate)
- [ ] About mission paragraphs are 3, each under 80 words
- [ ] Contact page includes email AND phone AND address
- [ ] Newsletter/signup forms have the marketing-restraint microcopy
- [ ] No hyperbolic or hype language anywhere ("revolutionary", "game-changing", "next-generation")
