import React, { useState, useMemo } from 'react';
import {
  Search,
  Filter,
  X,
  PlusCircle,
  Sparkles,
  MapPin,
  Calendar,
  Layers,
  ArrowUpDown,
  RotateCcw,
} from 'lucide-react';
import { ItemReport, PotentialMatch, ItemCategory } from '../types';
import { ItemCard } from './ItemCard';
import { SAMPLE_CAMPUS_LOCATIONS } from '../services/sampleData';

const ALL_CATEGORIES: ItemCategory[] = [
  'Electronics',
  'Wallets & IDs',
  'Keys',
  'Books & Notebooks',
  'Bags & Backpacks',
  'Clothing & Accessories',
  'Jewelry & Watches',
  'Audio & Headphones',
  'Bottles & Containers',
  'Sports & Gym',
  'Other',
];

interface BrowseViewProps {
  items: ItemReport[];
  potentialMatches: PotentialMatch[];
  onSelectItem: (item: ItemReport) => void;
  onClaimItem: (item: ItemReport) => void;
  onOpenMatchModal: (match: PotentialMatch) => void;
  onOpenReportModal: (type?: 'lost' | 'found') => void;
  initialTypeFilter?: 'all' | 'lost' | 'found';
}

export const BrowseView: React.FC<BrowseViewProps> = ({
  items,
  potentialMatches,
  onSelectItem,
  onClaimItem,
  onOpenMatchModal,
  onOpenReportModal,
  initialTypeFilter = 'all',
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<'all' | 'lost' | 'found'>(initialTypeFilter);
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [locationFilter, setLocationFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [dateFilter, setDateFilter] = useState<string>('');
  const [sortBy, setSortBy] = useState<'newest' | 'oldest'>('newest');

  // Count items by type
  const lostCount = items.filter((i) => i.type === 'lost').length;
  const foundCount = items.filter((i) => i.type === 'found').length;

  const filteredItems = useMemo(() => {
    return items
      .filter((item) => {
        // Type filter
        if (typeFilter !== 'all' && item.type !== typeFilter) return false;

        // Category filter
        if (categoryFilter !== 'all' && item.category !== categoryFilter) return false;

        // Location filter
        if (locationFilter !== 'all' && !item.location.toLowerCase().includes(locationFilter.toLowerCase())) {
          return false;
        }

        // Status filter
        if (statusFilter !== 'all' && item.status !== statusFilter) return false;

        // Date filter
        if (dateFilter && item.date !== dateFilter) return false;

        // Search keyword
        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase();
          const matchTitle = item.title.toLowerCase().includes(q);
          const matchDesc = item.description.toLowerCase().includes(q);
          const matchLoc = item.location.toLowerCase().includes(q);
          const matchCat = item.category.toLowerCase().includes(q);
          if (!matchTitle && !matchDesc && !matchLoc && !matchCat) return false;
        }

        return true;
      })
      .sort((a, b) => {
        const timeA = new Date(a.date).getTime();
        const timeB = new Date(b.date).getTime();
        return sortBy === 'newest' ? timeB - timeA : timeA - timeB;
      });
  }, [items, typeFilter, categoryFilter, locationFilter, statusFilter, dateFilter, searchQuery, sortBy]);

  const hasActiveFilters =
    searchQuery !== '' ||
    typeFilter !== 'all' ||
    categoryFilter !== 'all' ||
    locationFilter !== 'all' ||
    statusFilter !== 'all' ||
    dateFilter !== '';

  const resetFilters = () => {
    setSearchQuery('');
    setTypeFilter('all');
    setCategoryFilter('all');
    setLocationFilter('all');
    setStatusFilter('all');
    setDateFilter('');
    setSortBy('newest');
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* Header section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-slate-900">
            Browse Campus Items
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Search active lost belongings and recovered campus findings
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            id="browse-report-lost-btn"
            onClick={() => onOpenReportModal('lost')}
            className="px-4 py-2 text-xs sm:text-sm font-semibold text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-xl transition-colors flex items-center gap-1.5"
          >
            <PlusCircle className="w-4 h-4 text-rose-600" />
            Report Lost
          </button>
          <button
            id="browse-report-found-btn"
            onClick={() => onOpenReportModal('found')}
            className="px-4 py-2 text-xs sm:text-sm font-semibold text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-xl transition-colors flex items-center gap-1.5"
          >
            <PlusCircle className="w-4 h-4 text-emerald-600" />
            Report Found
          </button>
        </div>
      </div>

      {/* Primary Search & Filter Bar */}
      <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4">
        {/* Top row: search + type pills */}
        <div className="flex flex-col lg:flex-row items-stretch lg:items-center gap-3">
          {/* Keyword Search Input */}
          <div className="relative flex-1">
            <Search className="w-5 h-5 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              id="browse-search-input"
              type="text"
              placeholder="Search by keywords (e.g. Hydro Flask, Sony, keys, green...)"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-9 py-2.5 bg-slate-50 border border-slate-200 focus:border-indigo-500 focus:bg-white rounded-xl text-sm text-slate-900 placeholder:text-slate-400 transition-colors focus:outline-hidden"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Type Filter Buttons */}
          <div className="flex items-center bg-slate-100 p-1 rounded-xl shrink-0">
            <button
              id="browse-type-all-btn"
              onClick={() => setTypeFilter('all')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                typeFilter === 'all'
                  ? 'bg-white text-slate-900 shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              All Items ({items.length})
            </button>
            <button
              id="browse-type-lost-btn"
              onClick={() => setTypeFilter('lost')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1 ${
                typeFilter === 'lost'
                  ? 'bg-rose-600 text-white shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Lost ({lostCount})
            </button>
            <button
              id="browse-type-found-btn"
              onClick={() => setTypeFilter('found')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1 ${
                typeFilter === 'found'
                  ? 'bg-emerald-600 text-white shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Found ({foundCount})
            </button>
          </div>
        </div>

        {/* Second row: Dropdown Filters */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2 border-t border-slate-100">
          {/* Category Dropdown */}
          <div>
            <label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1">
              Category
            </label>
            <select
              id="browse-category-filter"
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-800 focus:outline-hidden focus:border-indigo-500"
            >
              <option value="all">All Categories</option>
              {ALL_CATEGORIES.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
          </div>

          {/* Campus Location Dropdown */}
          <div>
            <label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1">
              Campus Location
            </label>
            <select
              id="browse-location-filter"
              value={locationFilter}
              onChange={(e) => setLocationFilter(e.target.value)}
              className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-800 focus:outline-hidden focus:border-indigo-500 truncate"
            >
              <option value="all">All Locations</option>
              {SAMPLE_CAMPUS_LOCATIONS.map((loc) => (
                <option key={loc} value={loc}>
                  {loc}
                </option>
              ))}
            </select>
          </div>

          {/* Status Dropdown */}
          <div>
            <label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1">
              Status
            </label>
            <select
              id="browse-status-filter"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-800 focus:outline-hidden focus:border-indigo-500"
            >
              <option value="all">All Statuses</option>
              <option value="active">Active</option>
              <option value="potential_match">Possible Match</option>
              <option value="claimed">Claim Pending</option>
              <option value="returned">Returned</option>
              <option value="closed">Closed</option>
            </select>
          </div>

          {/* Sort By Dropdown */}
          <div>
            <label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1">
              Sort Date
            </label>
            <select
              id="browse-sort-select"
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as 'newest' | 'oldest')}
              className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-800 focus:outline-hidden focus:border-indigo-500"
            >
              <option value="newest">Newest First</option>
              <option value="oldest">Oldest First</option>
            </select>
          </div>
        </div>

        {/* Active filter badges / reset */}
        {hasActiveFilters && (
          <div className="flex items-center justify-between pt-2 text-xs text-slate-600">
            <span className="font-medium">
              Showing <span className="font-bold text-slate-900">{filteredItems.length}</span> of{' '}
              {items.length} items
            </span>
            <button
              id="browse-reset-filters-btn"
              onClick={resetFilters}
              className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 flex items-center gap-1"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              Reset All Filters
            </button>
          </div>
        )}
      </div>

      {/* Items Grid or Empty State */}
      {filteredItems.length > 0 ? (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredItems.map((item) => {
            const itemMatch = potentialMatches.find(
              (m) => m.lostItemId === item.id || m.foundItemId === item.id
            );
            return (
              <ItemCard
                key={item.id}
                item={item}
                onSelect={onSelectItem}
                onClaim={onClaimItem}
                potentialMatch={itemMatch}
                onOpenMatchModal={onOpenMatchModal}
              />
            );
          })}
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center max-w-lg mx-auto shadow-xs">
          <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center mx-auto text-slate-400 mb-4">
            <Search className="w-8 h-8" />
          </div>
          <h3 className="text-lg font-bold text-slate-900">No items match your criteria</h3>
          <p className="text-sm text-slate-500 mt-1 mb-6 leading-relaxed">
            Try adjusting your search terms, changing the campus location filter, or resetting all
            filters.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <button
              id="empty-reset-filters-btn"
              onClick={resetFilters}
              className="w-full sm:w-auto px-4 py-2 text-sm font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors"
            >
              Clear Filters
            </button>
            <button
              id="empty-report-new-btn"
              onClick={() => onOpenReportModal('lost')}
              className="w-full sm:w-auto px-4 py-2 text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl transition-colors"
            >
              Report a New Item
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
