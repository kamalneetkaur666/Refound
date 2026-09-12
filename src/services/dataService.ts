import {
  collection,
  doc,
  getDocs,
  getDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  deleteField,
  query,
  where,
  orderBy,
  onSnapshot,
} from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../firebase/config';
import { ItemReport, PotentialMatch, Claim, UserNotification, FlagReport } from '../types';
import { SAMPLE_ITEMS, SAMPLE_MATCHES, SAMPLE_CLAIMS, SAMPLE_NOTIFICATIONS } from './sampleData';

const LOCAL_STORAGE_KEY_ITEMS = 'refound_items_store_v1';
const LOCAL_STORAGE_KEY_MATCHES = 'refound_matches_store_v1';
const LOCAL_STORAGE_KEY_CLAIMS = 'refound_claims_store_v1';
const LOCAL_STORAGE_KEY_NOTIFS = 'refound_notifs_store_v1';
const LOCAL_STORAGE_KEY_FLAGS = 'refound_flags_store_v1';

// Initial local cache setup
function getLocal<T>(key: string, fallback: T[]): T[] {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) {
      localStorage.setItem(key, JSON.stringify(fallback));
      return fallback;
    }
    return JSON.parse(raw);
  } catch {
    return fallback;
  }
}

function setLocal<T>(key: string, data: T[]) {
  try {
    localStorage.setItem(key, JSON.stringify(data));
  } catch (e) {
    console.warn('LocalStorage save error:', e);
  }
}

class DataService {
  private items: ItemReport[] = getLocal<ItemReport>(LOCAL_STORAGE_KEY_ITEMS, SAMPLE_ITEMS);
  private matches: PotentialMatch[] = getLocal<PotentialMatch>(LOCAL_STORAGE_KEY_MATCHES, SAMPLE_MATCHES);
  private claims: Claim[] = getLocal<Claim>(LOCAL_STORAGE_KEY_CLAIMS, SAMPLE_CLAIMS);
  private notifications: UserNotification[] = getLocal<UserNotification>(LOCAL_STORAGE_KEY_NOTIFS, SAMPLE_NOTIFICATIONS);
  private flags: FlagReport[] = getLocal<FlagReport>(LOCAL_STORAGE_KEY_FLAGS, []);
  private listeners: Set<() => void> = new Set();
  private firestoreSynced: boolean = false;

  constructor() {
    this.initFirestoreSync();
  }

  private notify() {
    this.listeners.forEach((cb) => cb());
  }

  public subscribe(cb: () => void) {
    this.listeners.add(cb);
    return () => {
      this.listeners.delete(cb);
    };
  }

  private async initFirestoreSync() {
    try {
      const itemsCol = collection(db, 'items');

      // Real-time listener for items
      onSnapshot(
        itemsCol,
        async (snap) => {
          if (!snap.empty) {
            const remoteItems: ItemReport[] = [];
            snap.forEach((d) => {
              const data = d.data() as ItemReport;
              if (data && data.id) {
                remoteItems.push(data);
              }
            });
            if (remoteItems.length > 0) {
              // Merge remote items with any local items
              this.items = remoteItems.sort(
                (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
              );
              setLocal(LOCAL_STORAGE_KEY_ITEMS, this.items);
              this.notify();
            }
          } else {
            // New empty Firebase project: seed initial sample items so the database is ready
            try {
              for (const sampleItem of SAMPLE_ITEMS) {
                const docPayload = { ...sampleItem, privateDetails: null };
                await setDoc(doc(db, 'items', sampleItem.id), docPayload);
              }
            } catch (seedErr) {
              console.warn('Initial sample items seed note:', seedErr);
            }
          }
          this.firestoreSynced = true;
        },
        (error) => {
          console.warn('Firestore items real-time subscription note:', error.message);
          this.firestoreSynced = false;
        }
      );

      // Real-time listener for matches
      onSnapshot(
        collection(db, 'matches'),
        (snap) => {
          if (!snap.empty) {
            const remoteMatches: PotentialMatch[] = [];
            snap.forEach((d) => {
              const data = d.data() as PotentialMatch;
              if (data && data.id) {
                remoteMatches.push(data);
              }
            });
            if (remoteMatches.length > 0) {
              this.matches = remoteMatches;
              setLocal(LOCAL_STORAGE_KEY_MATCHES, this.matches);
              this.notify();
            }
          }
        },
        (err) => console.warn('Firestore matches subscription note:', err.message)
      );

      // Real-time listener for claims
      onSnapshot(
        collection(db, 'claims'),
        (snap) => {
          if (!snap.empty) {
            const remoteClaims: Claim[] = [];
            snap.forEach((d) => {
              const data = d.data() as Claim;
              if (data && data.id) {
                remoteClaims.push(data);
              }
            });
            if (remoteClaims.length > 0) {
              this.claims = remoteClaims;
              setLocal(LOCAL_STORAGE_KEY_CLAIMS, this.claims);
              this.notify();
            }
          }
        },
        (err) => console.warn('Firestore claims subscription note:', err.message)
      );

      // Real-time listener for notifications
      onSnapshot(
        collection(db, 'notifications'),
        (snap) => {
          if (!snap.empty) {
            const remoteNotifs: UserNotification[] = [];
            snap.forEach((d) => {
              const data = d.data() as UserNotification;
              if (data && data.id) {
                remoteNotifs.push(data);
              }
            });
            if (remoteNotifs.length > 0) {
              this.notifications = remoteNotifs;
              setLocal(LOCAL_STORAGE_KEY_NOTIFS, this.notifications);
              this.notify();
            }
          }
        },
        (err) => console.warn('Firestore notifications subscription note:', err.message)
      );
    } catch (e) {
      console.warn('Firestore initialization note:', e);
      this.firestoreSynced = false;
    }
  }

  // ===== ITEMS =====
  public getItems(): ItemReport[] {
    return [...this.items];
  }

  public getItemById(id: string): ItemReport | undefined {
    return this.items.find((i) => i.id === id);
  }

  public async createItem(itemData: Omit<ItemReport, 'id' | 'createdAt' | 'updatedAt'>, privateDetails?: string): Promise<ItemReport> {
    const id = 'item-' + Date.now() + '-' + Math.random().toString(36).substring(2, 7);
    const now = new Date().toISOString();
    const newItem: ItemReport = {
      ...itemData,
      id,
      createdAt: now,
      updatedAt: now,
      privateDetails,
    };

    this.items = [newItem, ...this.items];
    setLocal(LOCAL_STORAGE_KEY_ITEMS, this.items);
    this.notify();

    // Persist to Firestore
    try {
      const docPayload: any = {
        ...newItem,
        privateDetails: null, // do not store in public doc
      };
      if (!docPayload.imageUrl) {
        delete docPayload.imageUrl;
      }
      await setDoc(doc(db, 'items', id), docPayload);

      if (privateDetails) {
        await setDoc(doc(db, 'items', id, 'private', 'details'), {
          itemId: id,
          ownerId: newItem.ownerId,
          privateDetails,
          updatedAt: now,
        });
      }
    } catch (error) {
      console.warn('Firestore item write error:', error);
    }

    return newItem;
  }

  public async updateItem(id: string, updates: Partial<ItemReport>): Promise<void> {
    const now = new Date().toISOString();
    this.items = this.items.map((it) => {
      if (it.id !== id) return it;
      const merged = { ...it, ...updates, updatedAt: now };
      if (updates.imageUrl === '' || updates.imageUrl === null) {
        delete (merged as any).imageUrl;
      }
      return merged;
    });
    setLocal(LOCAL_STORAGE_KEY_ITEMS, this.items);
    this.notify();

    try {
      const firestoreUpdates: any = {
        ...updates,
        updatedAt: now,
      };
      if (updates.imageUrl === '' || updates.imageUrl === null) {
        firestoreUpdates.imageUrl = deleteField();
      } else if (updates.imageUrl === undefined) {
        delete firestoreUpdates.imageUrl;
      }
      await updateDoc(doc(db, 'items', id), firestoreUpdates);
    } catch (error) {
      console.warn('Firestore item update error:', error);
    }
  }

  public async deleteItem(id: string): Promise<void> {
    this.items = this.items.filter((it) => it.id !== id);
    // Also clean up matches & claims related
    this.matches = this.matches.filter((m) => m.lostItemId !== id && m.foundItemId !== id);
    this.claims = this.claims.filter((c) => c.itemId !== id);
    setLocal(LOCAL_STORAGE_KEY_ITEMS, this.items);
    setLocal(LOCAL_STORAGE_KEY_MATCHES, this.matches);
    setLocal(LOCAL_STORAGE_KEY_CLAIMS, this.claims);
    this.notify();

    try {
      await deleteDoc(doc(db, 'items', id));
    } catch (error) {
      console.warn('Firestore delete error:', error);
    }
  }

  public async getItemPrivateDetails(itemId: string, ownerId: string): Promise<string | null> {
    const localItem = this.getItemById(itemId);
    if (localItem && localItem.ownerId === ownerId && localItem.privateDetails) {
      return localItem.privateDetails;
    }

    try {
      const snap = await getDoc(doc(db, 'items', itemId, 'private', 'details'));
      if (snap.exists()) {
        const data = snap.data();
        if (data.ownerId === ownerId) {
          return data.privateDetails as string;
        }
      }
    } catch (error) {
      console.warn('Error fetching private details:', error);
    }
    return localItem?.privateDetails || null;
  }

  // ===== MATCHES =====
  public getMatches(): PotentialMatch[] {
    return [...this.matches];
  }

  public getMatchesForUser(userId: string): PotentialMatch[] {
    return this.matches.filter((m) => m.lostItemOwnerId === userId || m.foundItemOwnerId === userId);
  }

  public getMatchesForItem(itemId: string): PotentialMatch[] {
    return this.matches.filter((m) => m.lostItemId === itemId || m.foundItemId === itemId);
  }

  public async savePotentialMatch(match: Omit<PotentialMatch, 'id' | 'createdAt'>): Promise<PotentialMatch> {
    // Check if duplicate exists
    const existing = this.matches.find(
      (m) =>
        (m.lostItemId === match.lostItemId && m.foundItemId === match.foundItemId) ||
        (m.lostItemId === match.foundItemId && m.foundItemId === match.lostItemId)
    );

    if (existing) {
      // Update confidence and reasons
      existing.confidenceScore = match.confidenceScore;
      existing.matchReasons = match.matchReasons;
      existing.matchTier = match.matchTier;
      existing.keySimilarities = match.keySimilarities;
      existing.keyDifferences = match.keyDifferences;
      setLocal(LOCAL_STORAGE_KEY_MATCHES, this.matches);
      this.notify();
      return existing;
    }

    const id = 'match-' + Date.now() + '-' + Math.random().toString(36).substring(2, 6);
    const newMatch: PotentialMatch = {
      ...match,
      id,
      createdAt: new Date().toISOString(),
    };

    this.matches = [newMatch, ...this.matches];
    setLocal(LOCAL_STORAGE_KEY_MATCHES, this.matches);

    // Update item statuses to potential_match if currently active
    const lostItem = this.getItemById(match.lostItemId);
    const foundItem = this.getItemById(match.foundItemId);

    if (lostItem && lostItem.status === 'active') {
      await this.updateItem(lostItem.id, { status: 'potential_match' });
    }
    if (foundItem && foundItem.status === 'active') {
      await this.updateItem(foundItem.id, { status: 'potential_match' });
    }

    // Trigger notifications for both owners
    await this.createNotification({
      userId: match.lostItemOwnerId,
      title: 'Potential Match Found!',
      message: `Gemini detected a ${match.confidenceScore}% match for your "${match.lostItemTitle}".`,
      type: 'match_found',
      relatedItemId: match.lostItemId,
      relatedMatchId: id,
    });

    if (match.foundItemOwnerId !== match.lostItemOwnerId) {
      await this.createNotification({
        userId: match.foundItemOwnerId,
        title: 'Potential Match Found!',
        message: `Gemini spotted a potential match for the "${match.foundItemTitle}" you reported.`,
        type: 'match_found',
        relatedItemId: match.foundItemId,
        relatedMatchId: id,
      });
    }

    try {
      await setDoc(doc(db, 'matches', id), newMatch);
    } catch (err) {
      console.warn('Firestore match save note:', err);
    }

    this.notify();
    return newMatch;
  }

  public async dismissMatch(matchId: string): Promise<void> {
    this.matches = this.matches.map((m) => (m.id === matchId ? { ...m, status: 'dismissed' as const } : m));
    setLocal(LOCAL_STORAGE_KEY_MATCHES, this.matches);
    this.notify();

    try {
      await updateDoc(doc(db, 'matches', matchId), { status: 'dismissed' });
    } catch (err) {
      console.warn('Firestore dismiss match note:', err);
    }
  }

  // ===== CLAIMS =====
  public getClaims(): Claim[] {
    return [...this.claims];
  }

  public getClaimsForUser(userId: string): { sent: Claim[]; received: Claim[] } {
    return {
      sent: this.claims.filter((c) => c.claimantId === userId),
      received: this.claims.filter((c) => c.itemOwnerId === userId),
    };
  }

  public async submitClaim(claimData: Omit<Claim, 'id' | 'status' | 'createdAt' | 'updatedAt'>): Promise<Claim> {
    const id = 'claim-' + Date.now() + '-' + Math.random().toString(36).substring(2, 6);
    const now = new Date().toISOString();
    const newClaim: Claim = {
      ...claimData,
      id,
      status: 'pending',
      createdAt: now,
      updatedAt: now,
    };

    this.claims = [newClaim, ...this.claims];
    setLocal(LOCAL_STORAGE_KEY_CLAIMS, this.claims);

    // Notify item owner
    await this.createNotification({
      userId: claimData.itemOwnerId,
      title: 'New Verification Claim Submitted',
      message: `${claimData.claimantName} filed a verification claim for "${claimData.itemTitle}".`,
      type: 'claim_received',
      relatedItemId: claimData.itemId,
      relatedClaimId: id,
    });

    try {
      await setDoc(doc(db, 'claims', id), newClaim);
    } catch (err) {
      console.warn('Firestore claim write note:', err);
    }

    this.notify();
    return newClaim;
  }

  public async updateClaimStatus(
    claimId: string,
    status: 'approved' | 'rejected' | 'returned',
    rejectionReason?: string
  ): Promise<void> {
    const claim = this.claims.find((c) => c.id === claimId);
    if (!claim) return;

    const now = new Date().toISOString();
    claim.status = status;
    claim.updatedAt = now;
    if (rejectionReason) claim.rejectionReason = rejectionReason;

    setLocal(LOCAL_STORAGE_KEY_CLAIMS, this.claims);

    // Update item status if returned or approved
    if (status === 'returned') {
      await this.updateItem(claim.itemId, { status: 'returned' });
    } else if (status === 'approved') {
      await this.updateItem(claim.itemId, { status: 'claimed' });
    }

    // Notify claimant
    const statusText = status === 'returned' ? 'Approved & Returned' : status === 'approved' ? 'Approved' : 'Declined';
    await this.createNotification({
      userId: claim.claimantId,
      title: `Claim ${statusText}: ${claim.itemTitle}`,
      message:
        status === 'returned'
          ? `Great news! The reporter verified your claim and confirmed the item has been returned.`
          : status === 'approved'
          ? `Your claim was approved! You can coordinate safe handover at campus locations.`
          : `Your claim was reviewed and could not be verified.${rejectionReason ? ` Reason: ${rejectionReason}` : ''}`,
      type: 'claim_updated',
      relatedItemId: claim.itemId,
      relatedClaimId: claimId,
    });

    try {
      await updateDoc(doc(db, 'claims', claimId), {
        status,
        updatedAt: now,
        rejectionReason: rejectionReason || null,
      });
    } catch (err) {
      console.warn('Firestore claim update note:', err);
    }

    this.notify();
  }

  // ===== NOTIFICATIONS =====
  public getNotificationsForUser(userId: string): UserNotification[] {
    return this.notifications.filter((n) => n.userId === userId).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  public getUnreadCount(userId: string): number {
    return this.notifications.filter((n) => n.userId === userId && !n.isRead).length;
  }

  public async createNotification(notifData: Omit<UserNotification, 'id' | 'isRead' | 'createdAt'>): Promise<UserNotification> {
    const id = 'notif-' + Date.now() + '-' + Math.random().toString(36).substring(2, 6);
    const newNotif: UserNotification = {
      ...notifData,
      id,
      isRead: false,
      createdAt: new Date().toISOString(),
    };

    this.notifications = [newNotif, ...this.notifications];
    setLocal(LOCAL_STORAGE_KEY_NOTIFS, this.notifications);

    try {
      await setDoc(doc(db, 'notifications', id), newNotif);
    } catch (err) {
      console.warn('Firestore notification note:', err);
    }

    this.notify();
    return newNotif;
  }

  public async markNotificationAsRead(id: string): Promise<void> {
    this.notifications = this.notifications.map((n) => (n.id === id ? { ...n, isRead: true } : n));
    setLocal(LOCAL_STORAGE_KEY_NOTIFS, this.notifications);
    this.notify();

    try {
      await updateDoc(doc(db, 'notifications', id), { isRead: true });
    } catch (err) {
      console.warn('Firestore mark read note:', err);
    }
  }

  public async markAllNotificationsAsRead(userId: string): Promise<void> {
    this.notifications = this.notifications.map((n) => (n.userId === userId ? { ...n, isRead: true } : n));
    setLocal(LOCAL_STORAGE_KEY_NOTIFS, this.notifications);
    this.notify();
  }

  // ===== FLAGS =====
  public async submitFlag(itemId: string, reporterId: string, reason: string, details?: string): Promise<void> {
    const id = 'flag-' + Date.now();
    const newFlag: FlagReport = {
      id,
      itemId,
      reporterId,
      reason,
      details,
      createdAt: new Date().toISOString(),
    };

    this.flags.push(newFlag);
    setLocal(LOCAL_STORAGE_KEY_FLAGS, this.flags);

    try {
      await setDoc(doc(db, 'flags', id), newFlag);
    } catch (err) {
      console.warn('Firestore flag note:', err);
    }
  }
}

export const dataService = new DataService();
