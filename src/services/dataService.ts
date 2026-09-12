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
const LOCAL_STORAGE_KEY_DEVICE_ITEMS = 'refound_device_created_items_v1';

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

// Clean any undefined or invalid fields so Firestore never rejects payloads
export function cleanFirestorePayload<T extends Record<string, any>>(obj: T): Partial<T> {
  const cleaned: Record<string, any> = {};
  for (const [key, val] of Object.entries(obj)) {
    if (val !== undefined && val !== null) {
      cleaned[key] = val;
    }
  }
  return cleaned as Partial<T>;
}

// Resilient non-blocking write helper so slow/offline networks or unconfigured Firebase never hang the UI
function safeFirestoreWrite<T>(promise: Promise<T>, timeoutMs = 3500): Promise<void> {
  const timeoutPromise = new Promise<void>((resolve) => setTimeout(resolve, timeoutMs));
  return Promise.race([promise.then(() => {}), timeoutPromise]).catch((err) => {
    console.warn('Firestore background write warning (local state preserved):', err?.message || err);
  });
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
              // Non-destructive merge: preserve any items created locally on this device
              const remoteMap = new Map<string, ItemReport>();
              for (const item of remoteItems) {
                remoteMap.set(item.id, item);
              }
              // For any locally saved item, if not yet in remote, keep it and push it to Firestore
              for (const localItem of this.items) {
                if (!remoteMap.has(localItem.id)) {
                  remoteMap.set(localItem.id, localItem);
                  // Push missing item to Firestore
                  const docPayload = cleanFirestorePayload({
                    ...localItem,
                    privateDetails: null,
                  });
                  safeFirestoreWrite(setDoc(doc(db, 'items', localItem.id), docPayload), 4000);
                }
              }
              this.items = Array.from(remoteMap.values()).sort(
                (a, b) => new Date(b.createdAt || b.date).getTime() - new Date(a.createdAt || a.date).getTime()
              );
              setLocal(LOCAL_STORAGE_KEY_ITEMS, this.items);
              this.notify();
            }
          } else {
            // New empty Firebase project: seed initial sample items so the database is ready
            try {
              for (const sampleItem of SAMPLE_ITEMS) {
                const docPayload = cleanFirestorePayload({ ...sampleItem, privateDetails: null });
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

  // Device-level report tracking so users can always find their submitted reports even after switching accounts
  public isDeviceCreatedItem(itemId: string): boolean {
    const ids = this.getDeviceCreatedItemIds();
    return ids.includes(itemId);
  }

  public getDeviceCreatedItemIds(): string[] {
    try {
      const raw = localStorage.getItem(LOCAL_STORAGE_KEY_DEVICE_ITEMS);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  }

  public markDeviceCreatedItem(itemId: string): void {
    try {
      const ids = this.getDeviceCreatedItemIds();
      if (!ids.includes(itemId)) {
        ids.push(itemId);
        localStorage.setItem(LOCAL_STORAGE_KEY_DEVICE_ITEMS, JSON.stringify(ids));
      }
    } catch (err) {
      console.warn('Failed to mark device item:', err);
    }
  }

  public async transferItemOwnership(
    itemId: string,
    newOwnerId: string,
    reporterName?: string,
    reporterEmail?: string
  ): Promise<void> {
    const item = this.getItemById(itemId);
    if (!item) return;

    const oldOwnerId = item.ownerId;
    const updates: Partial<ItemReport> = {
      ownerId: newOwnerId,
    };
    if (reporterName) updates.reporterName = reporterName;
    if (reporterEmail) updates.reporterEmail = reporterEmail;

    await this.updateItem(itemId, updates);

    // Save into new user's items subcollection and remove from old if needed
    try {
      const updatedItem = this.getItemById(itemId);
      if (updatedItem) {
        const payload = cleanFirestorePayload({ ...updatedItem, privateDetails: null });
        safeFirestoreWrite(setDoc(doc(db, 'users', newOwnerId, 'items', itemId), payload), 2500);
        if (oldOwnerId && oldOwnerId !== newOwnerId) {
          safeFirestoreWrite(deleteDoc(doc(db, 'users', oldOwnerId, 'items', itemId)), 2000);
        }
      }
    } catch (e) {
      console.warn('User subcollection transfer note:', e);
    }

    // Also transfer ownerId in private details doc if present
    try {
      const privateRef = doc(db, 'items', itemId, 'private', 'details');
      const snap = await getDoc(privateRef);
      if (snap.exists()) {
        await updateDoc(privateRef, { ownerId: newOwnerId });
      }
    } catch (e) {
      console.warn('Private details transfer note:', e);
    }
  }

  // Automatically ensure that any item matching the user's email or created on this device is cleanly owned by their account
  public async syncUserItemsOwnership(currentUser: { uid: string; displayName?: string; email?: string }): Promise<number> {
    if (!currentUser || !currentUser.uid) return 0;
    let updatedCount = 0;
    const userEmail = currentUser.email?.trim().toLowerCase();

    for (const item of this.items) {
      const itemEmail = item.reporterEmail?.trim().toLowerCase();
      const isMatchingEmail = userEmail && itemEmail && itemEmail === userEmail;

      if (isMatchingEmail && item.ownerId !== currentUser.uid) {
        item.ownerId = currentUser.uid;
        if (currentUser.displayName) item.reporterName = currentUser.displayName;
        if (currentUser.email) item.reporterEmail = currentUser.email;
        updatedCount++;

        const payload = cleanFirestorePayload({ ...item, privateDetails: null });
        safeFirestoreWrite(setDoc(doc(db, 'items', item.id), payload), 3000);
        safeFirestoreWrite(setDoc(doc(db, 'users', currentUser.uid, 'items', item.id), payload), 3000);
      }
    }

    if (updatedCount > 0) {
      setLocal(LOCAL_STORAGE_KEY_ITEMS, this.items);
      this.notify();
    }
    return updatedCount;
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

    // Prepend to local items list and immediately record device ownership
    this.items = [newItem, ...this.items.filter((i) => i.id !== id)];
    this.markDeviceCreatedItem(id);
    setLocal(LOCAL_STORAGE_KEY_ITEMS, this.items);
    this.notify();

    // Prepare clean payload for public item document
    const docPayload = cleanFirestorePayload({
      ...newItem,
      privateDetails: null, // do not store in public doc
    });

    try {
      // 1. Write to public /items collection for search, browse, and AI matching
      await safeFirestoreWrite(setDoc(doc(db, 'items', id), docPayload), 3500);

      // 2. Also write to specific account collection /users/{ownerId}/items/{id}
      if (newItem.ownerId) {
        await safeFirestoreWrite(setDoc(doc(db, 'users', newItem.ownerId, 'items', id), docPayload), 3000);
      }

      if (privateDetails) {
        const privPayload = cleanFirestorePayload({
          itemId: id,
          ownerId: newItem.ownerId,
          privateDetails,
          updatedAt: now,
        });
        await safeFirestoreWrite(setDoc(doc(db, 'items', id, 'private', 'details'), privPayload), 3000);
      }
    } catch (error) {
      console.warn('Firestore item write note:', error);
    }

    return newItem;
  }

  public async updateItem(id: string, updates: Partial<ItemReport>): Promise<void> {
    const now = new Date().toISOString();
    let currentOwnerId = '';
    this.items = this.items.map((it) => {
      if (it.id !== id) return it;
      currentOwnerId = it.ownerId;
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
      safeFirestoreWrite(updateDoc(doc(db, 'items', id), firestoreUpdates));
      if (currentOwnerId) {
        safeFirestoreWrite(updateDoc(doc(db, 'users', currentOwnerId, 'items', id), firestoreUpdates));
      }
    } catch (error) {
      console.warn('Firestore item update error:', error);
    }
  }

  public async deleteItem(id: string): Promise<void> {
    const existing = this.getItemById(id);
    const ownerId = existing?.ownerId;
    this.items = this.items.filter((it) => it.id !== id);
    // Also clean up matches & claims related
    this.matches = this.matches.filter((m) => m.lostItemId !== id && m.foundItemId !== id);
    this.claims = this.claims.filter((c) => c.itemId !== id);
    setLocal(LOCAL_STORAGE_KEY_ITEMS, this.items);
    setLocal(LOCAL_STORAGE_KEY_MATCHES, this.matches);
    setLocal(LOCAL_STORAGE_KEY_CLAIMS, this.claims);
    this.notify();

    try {
      safeFirestoreWrite(deleteDoc(doc(db, 'items', id)));
      if (ownerId) {
        safeFirestoreWrite(deleteDoc(doc(db, 'users', ownerId, 'items', id)));
      }
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
      safeFirestoreWrite(setDoc(doc(db, 'matches', id), newMatch));
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
      safeFirestoreWrite(updateDoc(doc(db, 'matches', matchId), { status: 'dismissed' }));
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
      safeFirestoreWrite(setDoc(doc(db, 'claims', id), newClaim));
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
      safeFirestoreWrite(
        updateDoc(doc(db, 'claims', claimId), {
          status,
          updatedAt: now,
          rejectionReason: rejectionReason || null,
        })
      );
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
      safeFirestoreWrite(setDoc(doc(db, 'notifications', id), newNotif));
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
      safeFirestoreWrite(updateDoc(doc(db, 'notifications', id), { isRead: true }));
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
      safeFirestoreWrite(setDoc(doc(db, 'flags', id), newFlag));
    } catch (err) {
      console.warn('Firestore flag note:', err);
    }
  }
}

export const dataService = new DataService();
