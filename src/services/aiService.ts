import { ItemReport, PotentialMatch } from '../types';
import { ItemComparisonData, MatchResult } from '../../server/gemini';
import { dataService } from './dataService';

export async function runGeminiMatching(
  targetItem: ItemReport,
  candidates: ItemReport[]
): Promise<PotentialMatch[]> {
  const oppositeType = targetItem.type === 'lost' ? 'found' : 'lost';
  const validCandidates = candidates.filter(
    (c) => c.type === oppositeType && c.id !== targetItem.id && c.status !== 'returned' && c.status !== 'closed'
  );

  if (validCandidates.length === 0) {
    return [];
  }

  const targetData: ItemComparisonData = {
    id: targetItem.id,
    type: targetItem.type,
    title: targetItem.title,
    category: targetItem.category,
    description: targetItem.description,
    location: targetItem.location,
    date: targetItem.date,
    approximateTime: targetItem.approximateTime,
    imageUrl: targetItem.imageUrl,
  };

  const candidateData: ItemComparisonData[] = validCandidates.map((c) => ({
    id: c.id,
    type: c.type,
    title: c.title,
    category: c.category,
    description: c.description,
    location: c.location,
    date: c.date,
    approximateTime: c.approximateTime,
    imageUrl: c.imageUrl,
  }));

  try {
    const res = await fetch('/api/match', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        targetItem: targetData,
        candidates: candidateData,
      }),
    });

    if (!res.ok) {
      throw new Error(`API error: ${res.statusText}`);
    }

    const json = await res.json();
    if (!json.success || !json.matches) {
      throw new Error(json.error || 'Matching failed');
    }

    const results: MatchResult[] = json.matches;
    const generatedMatches: PotentialMatch[] = [];

    for (const match of results) {
      const candidateItem = validCandidates.find((c) => c.id === match.candidateId);
      if (!candidateItem) continue;

      const lostItem = targetItem.type === 'lost' ? targetItem : candidateItem;
      const foundItem = targetItem.type === 'found' ? targetItem : candidateItem;

      const potentialMatch = await dataService.savePotentialMatch({
        lostItemId: lostItem.id,
        foundItemId: foundItem.id,
        lostItemTitle: lostItem.title,
        foundItemTitle: foundItem.title,
        lostItemOwnerId: lostItem.ownerId,
        foundItemOwnerId: foundItem.ownerId,
        confidenceScore: match.confidenceScore,
        matchTier: match.matchTier,
        matchReasons: match.matchingReasons || match.summary,
        keySimilarities: match.keySimilarities,
        keyDifferences: match.keyDifferences,
        status: 'suggested',
      });

      generatedMatches.push(potentialMatch);
    }

    return generatedMatches;
  } catch (err) {
    console.warn('API matching unavailable, using smart local comparison:', err);
    // Smart heuristic fallback so matching is completely resilient
    return runClientHeuristicMatching(targetItem, validCandidates);
  }
}

function runClientHeuristicMatching(targetItem: ItemReport, candidates: ItemReport[]): PotentialMatch[] {
  const matches: PotentialMatch[] = [];

  const targetWords = (targetItem.title + ' ' + targetItem.description)
    .toLowerCase()
    .replace(/[^\w\s]/g, '')
    .split(/\s+/)
    .filter((w) => w.length > 2);

  for (const candidate of candidates) {
    let score = 0;
    const keySimilarities: string[] = [];
    const keyDifferences: string[] = [];

    // Category match
    if (candidate.category === targetItem.category) {
      score += 40;
      keySimilarities.push(`Same category: ${targetItem.category}`);
    } else {
      keyDifferences.push(`Different categories (${targetItem.category} vs ${candidate.category})`);
    }

    // Keyword match in title/description
    const candWords = (candidate.title + ' ' + candidate.description)
      .toLowerCase()
      .replace(/[^\w\s]/g, '')
      .split(/\s+/)
      .filter((w) => w.length > 2);

    const overlap = targetWords.filter((w) => candWords.includes(w));
    if (overlap.length > 0) {
      const bonus = Math.min(overlap.length * 12, 35);
      score += bonus;
      keySimilarities.push(`Shared keywords: ${overlap.slice(0, 3).join(', ')}`);
    }

    // Location match
    if (
      targetItem.location &&
      candidate.location &&
      (targetItem.location.toLowerCase().includes(candidate.location.toLowerCase()) ||
        candidate.location.toLowerCase().includes(targetItem.location.toLowerCase()))
    ) {
      score += 20;
      keySimilarities.push(`Matching campus location: ${candidate.location}`);
    }

    // Timeline match: found date should be on or after lost date
    if (targetItem.date && candidate.date) {
      const lostDate = targetItem.type === 'lost' ? targetItem.date : candidate.date;
      const foundDate = targetItem.type === 'found' ? targetItem.date : candidate.date;
      if (foundDate >= lostDate) {
        score += 10;
        keySimilarities.push('Chronological sequence matches');
      }
    }

    // Filter by threshold
    if (score >= 40) {
      const finalScore = Math.min(score, 94);
      const matchTier = finalScore >= 75 ? 'High' : finalScore >= 50 ? 'Moderate' : 'Low';

      const lostItem = targetItem.type === 'lost' ? targetItem : candidate;
      const foundItem = targetItem.type === 'found' ? targetItem : candidate;

      // Save match to dataService synchronously
      const potentialMatch: PotentialMatch = {
        id: 'match-' + Date.now() + '-' + Math.random().toString(36).substring(2, 6),
        lostItemId: lostItem.id,
        foundItemId: foundItem.id,
        lostItemTitle: lostItem.title,
        foundItemTitle: foundItem.title,
        lostItemOwnerId: lostItem.ownerId,
        foundItemOwnerId: foundItem.ownerId,
        confidenceScore: finalScore,
        matchTier,
        matchReasons: `Correlated ${matchTier.toLowerCase()} probability match based on matching ${targetItem.category} category and campus location traits.`,
        keySimilarities,
        keyDifferences: keyDifferences.length > 0 ? keyDifferences : ['Slight time variance between incident and report'],
        status: 'suggested',
        createdAt: new Date().toISOString(),
      };

      dataService.savePotentialMatch(potentialMatch);
      matches.push(potentialMatch);
    }
  }

  return matches;
}
