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
    console.error('Failed to run AI matching:', err);
    throw err;
  }
}
