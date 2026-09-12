export type ItemType = 'lost' | 'found';

export type ItemStatus = 'active' | 'potential_match' | 'claimed' | 'returned' | 'closed';

export type ItemCategory =
  | 'Electronics'
  | 'Wallets & IDs'
  | 'Keys'
  | 'Books & Notebooks'
  | 'Bags & Backpacks'
  | 'Clothing & Accessories'
  | 'Jewelry & Watches'
  | 'Audio & Headphones'
  | 'Bottles & Containers'
  | 'Sports & Gym'
  | 'Other';

export interface ItemReport {
  id: string;
  ownerId: string;
  reporterName: string;
  reporterEmail?: string;
  type: ItemType;
  title: string;
  category: ItemCategory;
  description: string;
  location: string;
  date: string;
  approximateTime?: string;
  imageUrl?: string;
  turnInLocation?: string; // For found items (e.g. Security Desk)
  status: ItemStatus;
  privateDetails?: string; // Stored securely
  createdAt: string;
  updatedAt: string;
}

export interface PotentialMatch {
  id: string;
  lostItemId: string;
  foundItemId: string;
  lostItemTitle: string;
  foundItemTitle: string;
  lostItemOwnerId: string;
  foundItemOwnerId: string;
  confidenceScore: number; // 0-100
  matchTier?: 'High' | 'Moderate' | 'Low';
  matchReasons: string;
  keySimilarities?: string[];
  keyDifferences?: string[];
  status: 'suggested' | 'verified' | 'dismissed';
  createdAt: string;
}

export interface Claim {
  id: string;
  itemId: string;
  itemTitle: string;
  itemOwnerId: string;
  claimantId: string;
  claimantName: string;
  claimantEmail: string;
  claimantPhone?: string;
  identifyingAnswers: string;
  proofImageUrl?: string;
  status: 'pending' | 'approved' | 'rejected' | 'returned';
  rejectionReason?: string;
  createdAt: string;
  updatedAt: string;
}

export interface UserNotification {
  id: string;
  userId: string;
  title: string;
  message: string;
  type: 'match_found' | 'claim_received' | 'claim_updated' | 'status_changed';
  relatedItemId?: string;
  relatedMatchId?: string;
  relatedClaimId?: string;
  isRead: boolean;
  createdAt: string;
}

export interface UserProfile {
  uid: string;
  displayName: string;
  email: string;
  studentId?: string;
  campusRole: string; // 'Student' | 'Faculty' | 'Staff' | 'Campus Security'
  phone?: string;
  avatarUrl?: string;
  authProvider?: 'password' | 'google' | 'demo';
  createdAt: string;
}

export interface FlagReport {
  id: string;
  itemId: string;
  reporterId: string;
  reason: string;
  details?: string;
  createdAt: string;
}

export interface FilterOptions {
  type: 'all' | 'lost' | 'found';
  category: string;
  location: string;
  searchQuery: string;
  status: string;
  sortBy: 'newest' | 'oldest';
}
