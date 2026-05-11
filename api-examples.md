# API Examples — Automatos Social Templates

End-to-end examples for using these templates in an Automatos playbook.

---

## 1. Direct render via `html-to-png` platform tool

Conceptual signature:
```
html_to_png(url: string, viewport: {w, h}, waitFor: string) → bytes
```

### Example: Render a "Definition" post for Instagram 4:5

```python
from automatos.tools import html_to_png
from urllib.parse import urlencode

REPO_URL = "https://workspace.automatos.app/repos/social-templates"

params = {
    "template": "definition",
    "size":     "ig_post",
    "page":     "02",
    "total":    "10",
    "handle":   "@automatos.app",
    "showChip": "true",
    "eyebrow":  "FIRST — THE CONCEPT",
    "headline": "WHAT IS|AN AGENT?@brick",
    "card_1":   "Not just a chatbot|A chatbot replies. An agent acts — it plans, uses tools, loops on results, and drives toward a goal autonomously.",
    "card_2":   "The core loop|Perceive input → Reason about it → Pick an action → Execute → Observe result → Repeat until done.",
    "card_3":   "3 must-haves|An LLM brain. A set of tools to call. A loop that keeps running until the goal is met.",
    "cta":      "Swipe to Know More",
}

png_bytes = html_to_png(
    url      = f"{REPO_URL}/render/index.html?{urlencode(params)}",
    viewport = {"w": 1080, "h": 1350},
    waitFor  = "[data-render-ready='true']",
)
```

---

## 2. Full daily-post playbook

```yaml
name: daily-social-post
schedule: "0 9 * * *"   # 09:00 every day

steps:

  - id: pick_feature
    skill: pick-weekly-feature
    inputs:
      facts_file: "/workspace/playbooks/social/weekly-facts.md"
    outputs: { feature }

  - id: generate_copy
    skill: write-social-copy
    inputs:
      feature: "{{ pick_feature.feature }}"
      template: "definition"   # or stats / quote / announcement
    outputs:
      headline: string
      eyebrow: string
      card_1: string
      card_2: string
      card_3: string
      caption: string

  - id: render
    tool: html_to_png
    inputs:
      url: |
        /repos/social-templates/render/index.html
        ?template=definition
        &size=ig_post
        &page=01&total=01
        &eyebrow={{ generate_copy.eyebrow | urlencode }}
        &headline={{ generate_copy.headline | urlencode }}
        &card_1={{ generate_copy.card_1 | urlencode }}
        &card_2={{ generate_copy.card_2 | urlencode }}
        &card_3={{ generate_copy.card_3 | urlencode }}
      viewport: { w: 1080, h: 1350 }
      waitFor: "[data-render-ready='true']"
    outputs: { png }

  - id: post_instagram
    tool: composio.instagram_post
    inputs:
      image: "{{ render.png }}"
      caption: "{{ generate_copy.caption }}"
```

---

## 3. Multi-platform fan-out

Same content → 4 sizes → 4 platform posts:

```yaml
  - id: render_ig
    tool: html_to_png
    inputs: { url: "...?template=stats&size=ig_post&...", viewport: {w:1080,h:1350} }

  - id: render_story
    tool: html_to_png
    inputs: { url: "...?template=stats&size=ig_story&...", viewport: {w:1080,h:1920} }

  - id: render_linkedin
    tool: html_to_png
    inputs: { url: "...?template=stats&size=linkedin&...", viewport: {w:1200,h:628} }

  - id: render_twitter
    tool: html_to_png
    inputs: { url: "...?template=stats&size=twitter&...", viewport: {w:1600,h:900} }

  - parallel:
      - { tool: composio.instagram_post,  inputs: { image: "{{ render_ig.png }}",       caption: "..." } }
      - { tool: composio.instagram_story, inputs: { image: "{{ render_story.png }}" } }
      - { tool: composio.linkedin_post,   inputs: { image: "{{ render_linkedin.png }}", caption: "..." } }
      - { tool: composio.twitter_post,    inputs: { image: "{{ render_twitter.png }}",  text: "..." } }
```

---

## 4. Curl — quick sanity check

```bash
# Local preview (open in browser, with debug field outlines)
open "render/index.html?template=quote&size=ig_post&preview=1&quote=The%20harness%20is%20the%20moat&accent=moat&attribution=LangChain,%202026"

# Headless render via puppeteer (one-liner)
npx puppeteer screenshot \
  "file://$(pwd)/render/index.html?template=quote&size=ig_post&quote=The%20harness%20is%20the%20moat&accent=moat" \
  out.png \
  --viewport=1080x1350
```

---

## 5. Per-template payloads

### `title` — IG 4:5
```
?template=title&size=ig_post
&page=01&total=10
&eyebrow=AI ARCHITECTURE 2026
&headline=AGENT|HARNESS.@brick|THE OS|FOR AI.
&subline=The model is the brain. The harness is everything else.
&cta=Swipe to Start
```

### `definition` — IG 4:5
```
?template=definition&size=ig_post
&page=02&total=10&showChip=true
&eyebrow=FIRST — THE CONCEPT
&headline=WHAT IS|AN AGENT?@brick
&card_1=Not just a chatbot|A chatbot replies. An agent acts.
&card_2=The core loop|Perceive → Reason → Act → Observe → Repeat.
&card_3=3 must-haves|LLM brain. Tools. A loop.
&cta=Swipe to Know More
```

### `stats` — IG 4:5
```
?template=stats&size=ig_post
&page=03&total=10&showChip=true
&eyebrow=WHY IT MATTERS
&headline=THE|HARNESS@brick|IS THE|PRODUCT.
&stat_1=5×|Manus rewrote their harness in 6 months.
&stat_2=$2B|Meta acquired Manus — for the harness.
&stat_3=80%|Vercel removed 80% of tools. Better results.
&card_1=The model is now a commodity|Same LLM, different harness, different outcomes.
&card_2=Harness quality determines success|Move from outside top 30 to top 5 by harness alone.
```

### `quote` — IG 4:5
```
?template=quote&size=ig_post
&eyebrow=FIELD NOTES
&quote=The model is now a commodity. The harness is the moat.
&accent=harness is the moat
&attribution=LangChain · canonical definition, 2026
&cta=Save this post →
```

### `announcement` — IG 4:5
```
?template=announcement&size=ig_post
&eyebrow=PRODUCT LAUNCH
&status=SHIPPED · v2.4
&headline=NEW:@brick|PARALLEL|MISSIONS.
&subline=Run up to 9 agents in parallel on a single Mission.
&feature_1=9× concurrency|Up to nine specialist agents per Mission.
&feature_2=Shared field memory|Agents read/write a common memory band.
&feature_3=Drop-in for existing playbooks|Wrap any step in a Mission block.
&cta=Read the changelog →
```

---

## 6. Skill — agent training prompt (excerpt)

```markdown
# Skill: write-social-copy

You write copy for a single Automatos social post, given:
- A feature/fact (1–2 paragraphs of source material)
- A template name (one of: title, definition, stats, quote, announcement)

## Output contract
Return JSON matching the schema for the chosen template (see schema.json).

## Style rules
- Headlines: ALL CAPS, 2–4 short lines, last line ends in "." or "?"
- Mark the strongest 1–2 words with @brick suffix to color them orange
- Body cards (heading + body): heading is 3–5 words, body is 1–2 short sentences
- Mono-tone, declarative voice — no hype, no emojis, no exclamation marks
- Stats: round numbers, prefix with $ × % as appropriate

## Reference
schema.json defines every field. weekly-facts.md is the input source.
```
