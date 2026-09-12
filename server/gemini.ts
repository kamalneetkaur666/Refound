import { GoogleGenAI, Type } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

let aiClient: GoogleGenAI | null = null;

function getAiClient(): GoogleGenAI {
  if (!aiClient) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      console.warn("GEMINI_API_KEY environment variable is not set. AI matching will use heuristic fallback.");
    }
    aiClient = new GoogleGenAI({
      apiKey: apiKey || "",
      httpOptions: {
        headers: {
          "User-Agent": "aistudio-build",
        },
      },
    });
  }
  return aiClient;
}

export interface ItemComparisonData {
  id: string;
  type: "lost" | "found";
  title: string;
  category: string;
  description: string;
  location: string;
  date: string;
  approximateTime?: string;
  imageUrl?: string;
}

export interface MatchResult {
  candidateId: string;
  confidenceScore: number;
  matchTier: "High" | "Moderate" | "Low";
  summary: string;
  matchingReasons: string;
  keySimilarities: string[];
  keyDifferences: string[];
}

export async function matchItemWithCandidates(
  targetItem: ItemComparisonData,
  candidates: ItemComparisonData[]
): Promise<MatchResult[]> {
  if (!candidates || candidates.length === 0) {
    return [];
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    // Return heuristic matching if no API key is set
    return fallbackHeuristicMatch(targetItem, candidates);
  }

  try {
    const ai = getAiClient();

    const prompt = `You are the ReFound AI Campus Lost & Found Matching Specialist.
Analyze the target report against potential candidate reports of opposite status (${targetItem.type === 'lost' ? 'Found' : 'Lost'} items).

Target Report:
- ID: ${targetItem.id}
- Type: ${targetItem.type.toUpperCase()}
- Title: ${targetItem.title}
- Category: ${targetItem.category}
- Description: ${targetItem.description}
- Location: ${targetItem.location}
- Date: ${targetItem.date}
- Time: ${targetItem.approximateTime || "Not specified"}

Candidate Reports to Evaluate:
${candidates.map((c, i) => `
[Candidate ${i + 1}]
ID: ${c.id}
Type: ${c.type.toUpperCase()}
Title: ${c.title}
Category: ${c.category}
Description: ${c.description}
Location: ${c.location}
Date: ${c.date}
Time: ${c.approximateTime || "Not specified"}
`).join("\n")}

Guidelines:
1. Compare category, visual/item characteristics (color, brand, make, distinctive signs), campus location plausibility, and timeline sequence (found date is usually on or after lost date).
2. Rate confidence 0-100.
3. Be prudent: AI matches are tentative suggestions only, not declarations of certainty.
4. Only return candidates with confidence score >= 35.`;

    const response = await ai.models.generateContent({
      model: "gemini-3.8-flash",
      contents: prompt,
      config: {
        systemInstruction: "You are an intelligent campus lost & found matching engine. Evaluate potential matches objectively, highlighting both similarities and key differences.",
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            matches: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  candidateId: { type: Type.STRING },
                  confidenceScore: { type: Type.NUMBER },
                  matchTier: { type: Type.STRING },
                  summary: { type: Type.STRING },
                  matchingReasons: { type: Type.STRING },
                  keySimilarities: {
                    type: Type.ARRAY,
                    items: { type: Type.STRING },
                  },
                  keyDifferences: {
                    type: Type.ARRAY,
                    items: { type: Type.STRING },
                  },
                },
                required: ["candidateId", "confidenceScore", "matchTier", "summary", "matchingReasons"],
              },
            },
          },
          required: ["matches"],
        },
      },
    });

    const text = response.text;
    if (!text) {
      return fallbackHeuristicMatch(targetItem, candidates);
    }

    const parsed = JSON.parse(text);
    if (parsed && Array.isArray(parsed.matches)) {
      return parsed.matches;
    }
    return fallbackHeuristicMatch(targetItem, candidates);
  } catch (error) {
    console.error("Gemini matching error:", error);
    return fallbackHeuristicMatch(targetItem, candidates);
  }
}

function fallbackHeuristicMatch(target: ItemComparisonData, candidates: ItemComparisonData[]): MatchResult[] {
  const results: MatchResult[] = [];
  const targetWords = (target.title + " " + target.description).toLowerCase().split(/\W+/).filter(w => w.length > 2);

  for (const c of candidates) {
    let score = 0;
    const reasons: string[] = [];
    const similarities: string[] = [];
    const differences: string[] = [];

    // Category match
    if (target.category.toLowerCase() === c.category.toLowerCase()) {
      score += 40;
      similarities.push(`Same category: ${target.category}`);
    } else {
      differences.push(`Different category (${target.category} vs ${c.category})`);
    }

    // Word overlap
    const candWords = (c.title + " " + c.description).toLowerCase().split(/\W+/).filter(w => w.length > 2);
    const common = targetWords.filter(w => candWords.includes(w));
    if (common.length > 0) {
      const boost = Math.min(common.length * 10, 35);
      score += boost;
      similarities.push(`Matching keywords: ${Array.from(new Set(common)).slice(0, 4).join(", ")}`);
    }

    // Location match
    if (target.location.toLowerCase() === c.location.toLowerCase() ||
        target.location.toLowerCase().includes(c.location.toLowerCase()) ||
        c.location.toLowerCase().includes(target.location.toLowerCase())) {
      score += 20;
      similarities.push(`Similar campus location (${target.location})`);
    }

    // Date proximity
    if (target.date === c.date) {
      score += 10;
      similarities.push("Reported on the exact same date");
    }

    score = Math.min(Math.max(score, 20), 95);

    if (score >= 40) {
      const tier: "High" | "Moderate" | "Low" = score >= 75 ? "High" : score >= 55 ? "Moderate" : "Low";
      results.push({
        candidateId: c.id,
        confidenceScore: score,
        matchTier: tier,
        summary: `Possible ${target.category} match reported nearby.`,
        matchingReasons: similarities.join(". ") + ".",
        keySimilarities: similarities,
        keyDifferences: differences,
      });
    }
  }

  return results.sort((a, b) => b.confidenceScore - a.confidenceScore);
}
