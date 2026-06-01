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
                        // systematic bias toward under-estimating real-world portions
                        // by 15-30%; we counter-frame explicitly.
                        "CRITICAL: Underestimation is the most common failure mode for visual nutrition analysis. When uncertain between two plausible estimates, pick the HIGHER one. A normal-looking dinner that comes out under 400 kcal is almost certainly wrong.",
                        "Anchor against typical serving ranges as sanity checks: home-cooked dinner plate 600-1000 kcal; restaurant entree 800-1500 kcal; bowl of pasta with sauce 500-900 kcal; sandwich 400-700 kcal; breakfast plate 400-800 kcal; full bowl of soup 250-500 kcal; piece of cake 350-600 kcal.",

                        // Calibration.
                        "Use surrounding objects (fork, hand, plate rim, glass) to calibrate portion size. If no reference is visible, assume a realistic everyday adult serving.",
                        "Write estimated portion explicitly in estimatedPortion, for example '180 г', '1 тарелка', '2 куска'.",
                        "For mixed or composite dishes (soups, stews, pasta, rice dishes, salads), estimate all visible ingredients separately then sum into totals.",
                        "Estimate calories, protein, carbs, fat, and fiber for the visible portion, not for a tiny tasting portion.",
                        "Bread, rice, pasta, potatoes, and other grains usually weigh more cooked than they look — a bowl of rice that looks like 150 g is often 250-300 g cooked.",

                        // Hidden-calorie checklist.
                        "Include hidden calories that are visually subtle even when not the focal point: cooking oil absorbed during frying or sauteing (10-30 g per dish, 90-270 kcal), butter on bread (5-10 g, 35-70 kcal), salad dressing (15-30 g, 100-200 kcal), mayonnaise in sandwiches (10-20 g, 70-140 kcal), cheese melted on top, cream in soups and pasta sauces, sugar in glazes and marinades, syrup on pancakes or waffles (30-60 g, 100-200 kcal).",
                        "Sauces, cream, oil, and dressing on a finished dish are easy to miss but typically add 100-300 kcal per dish.",
                        "Do not default to very low calories when the image suggests oil, sauce, frying, cheese, nuts, or dense carbs.",

                        // High-density components that are commonly under-counted.
                        // Each rule names a specific failure mode the model has made on real photos.
                        "Processed meats are calorie-dense (kielbasa, salami, bacon, sausage, chorizo: 250-400 kcal per 100 g). When sliced into a dish, even a small visible amount often weighs 50-80 g and contributes 200-300 kcal — count it explicitly, not as 'a few pieces'.",
                        "When meat was fried or sauteed in the dish, add a separate 'rendered fat / cooking oil' item with 100-150 kcal — the dish absorbs the fat whether or not free oil is still visible.",
                        "Cheese melted INTO a dish (omelet, casserole, scramble, pasta) disappears visually but stays in the calories. If the dish looks creamy or glossy yellow, or if a yellow stringy texture is visible inside the eggs/pasta, assume 20-40 g of melted cheese (80-160 kcal).",
                        "Glossy / creamy / shiny finish on eggs, chicken, or pasta usually means added butter, cream, or sour cream — add 30-80 kcal for the implicit sauce.",
                        "Scrambled-egg or omelet servings on a plate are almost always 2-3 eggs (150-220 kcal base) plus whatever was cooked in. A single-egg portion is uncommon and looks much smaller than people picture.",

                        // User note overrides visual.
                        "If userNote mentions portion size, preparation method, or extra ingredients - prioritize that information over the visual estimate.",

                        // Output format.
                        "Return JSON only, matching the schema with items, totals, confidence, notes, needsUserConfirmation.",
                        "Each item must contain name, estimatedPortion, calories, protein, carbs, fat, fiber, confidence.",
                        "Mark whether user confirmation is still required."
                )
        );
    }
}
