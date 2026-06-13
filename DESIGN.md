# Visual Identity & Design System: The Kinetic Archive

## 1. Overview & Creative North Star: "The Neon Curator"
This design system rejects the static, boxy nature of traditional quiz applications. Instead, it adopts the **"Neon Curator"** North Star—a blend of Dutch Modernism’s structural rigor and the immersive, luminous depth of high-end Glassmorphism.

We break the "template" look through **Kinetic Asymmetry**. Elements are not just placed; they are staged. By overlapping frosted glass cards over shifting mesh gradients and utilizing a dramatic typography scale, we create an environment that feels like a premium digital gallery. This is not just a quiz; it is a high-energy intellectual event.

---

## 2. Colors: Tonal Depth & Luminous Accents
Our palette is anchored in a deep, atmospheric Navy Slate, allowing our "Vibrant Orange" and "Teal Blue" to act as light sources rather than just decorative colors.

### Color Tokens (Material Design Mapping)
* **Background:** `#0e0e0e` (Deep Slate) – The canvas for our mesh gradients.
* **Primary:** `#ff9f4a` (Vibrant Orange) – Used for headers and primary actions.
* **Secondary:** `#0cb6fd` (Teal Blue) – Used for accents, badges, and secondary paths.
* **Tertiary:** `#c3ffcd` (Soft Mint) – Reserved exclusively for success states and positive reinforcement.
* **Surface Tiers:**
* `surface-container-low`: `#131313`
* `surface-container-high`: `#1f2020`

### The "No-Line" Rule
Traditional 1px solid borders for sectioning are strictly prohibited. Boundaries must be defined by:
1. **Tonal Transitions:** A `surface-container-low` section sitting on a `surface` background.
2. **Luminous Separation:** Using the faint orange mesh gradient to "lift" certain areas of the screen.

### The "Glass & Gradient" Rule
Floating containers must utilize Glassmorphism. Use `rgba(255, 255, 255, 0.05)` with a `20px` backdrop-blur. This ensures the background mesh gradient bleeds through, giving the UI "soul" and preventing it from feeling like a flat dark-mode skin.

---

## 3. Typography: Editorial Impact
We use **Plus Jakarta Sans** for its geometric clarity and modern "Dutch" feel. Our hierarchy is intentionally aggressive to drive user energy.

* **Display (Large/Medium):** `primary` (#ff9f4a). These are your "Heros." Use wide tracking (-0.02em) to feel premium and authoritative.
* **Headlines:** `primary`. Used for quiz questions. They should feel like a statement, not just a label.
* **Accents/Badges:** `secondary` (#0cb6fd). Used for tags, progress percentages, and metadata. The teal-on-dark contrast ensures high readability without the aggression of orange.
* **Body:** `on-surface` (#ffffff). High legibility for long-form explanations or options.

---

## 4. Elevation & Depth: The Layering Principle
Hierarchy is achieved through **Tonal Layering** and physical stacking, mimicking a series of frosted glass sheets.

* **Surface Stacking:** Place a `surface-container-highest` card on top of a `surface-container-low` section to create natural lift.
* **Ambient Shadows:** For floating glass cards, use extra-diffused shadows.
* *Shadow Token:* `0px 20px 40px rgba(0, 0, 0, 0.4)`.
* **The "Ghost Border" Fallback:** While we avoid structural lines, cards utilize a "Ghost Border"—a 1px stroke at 20% opacity of the `primary` (orange) color to simulate light catching the edge of the glass.
* **Success Glow:** Success states move away from flat fills. Apply a `tertiary` (`#2ECC71`) outer glow with a 15px blur to the container to signify a correct answer.

---

## 5. Components: Precision & Energy

### 3D Kinetic Buttons
Buttons are the engine of the app. They do not use flat colors.
* **Primary:** A 45-degree gradient from `#FF8C00` (Orange) to `#B92902` (Burnt Orange).
* **Shape:** `roundedness` is set to 3 for maximum roundness, achieving a pill-shaped button.
* **Interaction:** On hover, the button should "lift" (y-axis shift -2px) with an increased outer glow of its own color.

### Frosted Quiz Cards
* **Background:** `rgba(255, 255, 255, 0.08)` with a `20px` backdrop-blur.
* **Border:** 1px `primary` (#FF8C00) at 30% opacity.
* **Corner Radius:** `roundedness` is set to 3, achieving a modern, friendly feel.
* **Rule:** No dividers. Use `spacing` at level 2 for normal vertical spacing to separate the question from the options.

### Progression Chips
* **Style:** `secondary` (#05B5FC) text on a `surface-container-highest` background.
* **Usage:** Indicates category (e.g., "History", "Science") or current question number.

### Input Fields (Text/Search)
* **Style:** Ghost inputs. No background fill, only a bottom stroke using `outline-variant`. On focus, the stroke transforms into a `primary` (orange) gradient line.

---

## 6. Do’s and Don’ts

### Do:
* **Do** use asymmetrical layouts (e.g., left-aligned headers with right-aligned floating badges).
* **Do** allow the background mesh gradient to be the primary source of "visual heat."
* **Do** use the Typography Scale to create "Hero" moments for high scores or level-ups.
* **Do** use `tertiary` (Mint) only for moments of victory.

### Don't:
* **Don't** use 100% opaque white borders; it breaks the "Dutch Modern" sophistication.
* **Don't** use standard "drop shadows" (black, high-opacity). Use ambient, tinted blurs.
* **Don't** use dividers or lines to separate list items. Use white space (`spacing` token at level 2 or higher).
* **Don't** clutter the screen. If an element isn't driving the "energy," it should be moved to a lower surface tier.
