package com.aiduparc.nutrition.photoanalysis.infrastructure.openai;

import com.aiduparc.nutrition.photoanalysis.application.dto.PhotoAnalysisRequest;
import com.aiduparc.nutrition.photoanalysis.config.PhotoAnalysisProperties;
import java.util.List;

public record OpenAiPhotoAnalysisPrompt(
        String imageUrl,
        String userNote,
        String locale,
        String model,
        List<String> instructions
) {
    public static OpenAiPhotoAnalysisPrompt from(PhotoAnalysisRequest request, PhotoAnalysisProperties properties) {
        return new OpenAiPhotoAnalysisPrompt(
                request.imageUrl(),
                request.userNote(),
                request.locale(),
                properties.openai().model(),
                List.of(
                        "Identify all visible foods and drinks from the image.",
                        "If locale is ru, write food names, notes, and portion wording in Russian.",

                        // Anti-underestimate framing. GPT vision has a documented
                        // ~15-30% downward bias on real-world portions; counter
                        // it explicitly so the model knows which way to lean.
                        "CRITICAL: Underestimation is the most common failure mode for visual nutrition analysis. When uncertain between two plausible estimates, pick the HIGHER one. A normal-looking dinner that comes out under 400 kcal is almost certainly wrong.",

                        // Forced per-item breakdown. Models follow enumerated
                        // procedures better than abstract instructions like
                        // "estimate carefully" — we make the math explicit.
                        "Method (follow for every dish, do not skip steps):",
                        "1. List every visible component as its own item, with explicit weight in grams (estimatedPortion = '60 г' etc).",
                        "2. For each item, recall the typical calorie density (kcal per 100 g) from the reference table below and multiply by weight.",
                        "3. Add separate items for invisible-but-implied components: cooking oil if fried / sauteed, melted cheese if the dish looks creamy yellow, dressing if salad looks glossy, sugar if glazed.",
                        "4. Sum all items into totals. Cross-check against the meal-type anchor below — if totals fall outside the band, re-examine portion sizes upward.",

                        // Density reference. ONE table that covers most failure
                        // modes — replaces a long list of per-dish rules.
                        "Calorie density reference (kcal per 100 g cooked weight unless noted):",
                        "  • Lean meat (chicken breast, turkey, white fish): 100-150",
                        "  • Fatty meat / oily fish (beef, pork, salmon, mackerel): 200-300",
                        "  • Processed meat (sausage, kielbasa, salami, bacon, chorizo, ham): 250-400",
                        "  • Cheese (most varieties): 300-400",
                        "  • Eggs: 145 (one large egg ≈ 70 kcal, 50 g)",
                        "  • Bread: 250-300",
                        "  • Cooked pasta / rice / grains: 130-180",
                        "  • Potato (boiled): 90, fried: 250-350",
                        "  • Cooked beans / lentils: 100-130",
                        "  • Vegetables (most): 20-50",
                        "  • Fruits: 40-80; bananas / grapes: 90",
                        "  • Nuts: 550-650",
                        "  • Avocado: 160",
                        "  • Oil / butter / ghee: 700-900",
                        "  • Sour cream / heavy cream: 200-340",
                        "  • Mayo / aioli: 600-700",
                        "  • Sugar-sweetened sauces (ketchup, BBQ, sweet chili): 100-250",
                        "  • Soda / sweetened drinks: 40-50 (per 100 ml)",

                        // Sanity anchors.
                        "Meal-type sanity anchors (use as cross-check after summing): home-cooked dinner plate 600-1000 kcal; restaurant entree 800-1500; bowl of pasta with sauce 500-900; sandwich 400-700; breakfast plate 400-800; full bowl of soup 250-500; piece of cake 350-600.",

                        // Portion calibration.
                        "Use surrounding objects (fork, hand, plate rim, glass) to calibrate portion size. If no reference is visible, assume a realistic everyday adult serving — not a tasting portion.",
                        "Bread, rice, pasta, potatoes, and other grains usually weigh more cooked than they look — a bowl that looks like 150 g is often 250-300 g cooked.",

                        // Invisible-but-implied additions.
                        "Whenever the dish appears fried, sauteed, or roasted with meat, add a separate 'cooking oil / rendered fat' item ~15-25 g (130-220 kcal). The dish absorbs fat whether or not free oil is visible.",
                        "Whenever the dish has a creamy / glossy / shiny finish on eggs, chicken, pasta, or vegetables, add an implied sauce item (butter, cream, sour cream, or melted cheese) ~20-40 g (80-200 kcal).",

                        // User note overrides visual.
                        "If userNote mentions portion size, preparation method, or extra ingredients — prioritize that information over the visual estimate.",

                        // Output format.
                        "Return JSON only, matching the schema with items, totals, confidence, notes, needsUserConfirmation.",
                        "Each item must contain name, estimatedPortion (grams), calories, protein, carbs, fat, fiber, confidence.",
                        "Mark whether user confirmation is still required."
                )
        );
    }
}
