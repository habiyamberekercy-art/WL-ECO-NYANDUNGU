import { useState } from 'react';
import { Heart, Plus, Trash2, Bird, Fish, Bug, Leaf, Search, X } from 'lucide-react';
import { Card } from '@/components/Header';
import { useAuth } from '@/lib/auth-context';
import { supabase, type UserFavorite } from '@/lib/supabase';
import { useData } from '@/lib/data-context';
import { timeAgo } from '@/lib/types';
import { useEffect } from 'react';

const CATEGORY_ICONS: Record<string, typeof Bird> = {
  birds: Bird,
  fish: Fish,
  reptiles: Bug,
  mammals: Bird,
  insects: Bug,
  plants: Leaf,
  amphibians: Bug,
};

const CATEGORY_COLORS: Record<string, string> = {
  birds: 'bg-sky-50 text-sky-600 border-sky-200',
  fish: 'bg-blue-50 text-blue-600 border-blue-200',
  reptiles: 'bg-amber-50 text-amber-600 border-amber-200',
  mammals: 'bg-orange-50 text-orange-600 border-orange-200',
  insects: 'bg-purple-50 text-purple-600 border-purple-200',
  plants: 'bg-emerald-50 text-emerald-600 border-emerald-200',
  amphibians: 'bg-teal-50 text-teal-600 border-teal-200',
};

export default function UserFavorites() {
  const { profile } = useAuth();
  const { settings } = useData();
  const [favorites, setFavorites] = useState<UserFavorite[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [search, setSearch] = useState('');

  const allowedCategories = (settings.find((s) => s.name === 'submission_categories')?.value as string[]) || ['birds', 'fish', 'reptiles', 'mammals', 'insects', 'plants', 'amphibians'];
  const allowSubmissions = settings.find((s) => s.name === 'allow_submissions')?.value !== false;

  const loadFavorites = async () => {
    if (!profile) return;
    setLoading(true);
    const { data } = await supabase.from('user_favorites').select('*').eq('user_id', profile.id).order('created_at', { ascending: false });
    setFavorites((data as UserFavorite[]) || []);
    setLoading(false);
  };

  useEffect(() => {
    loadFavorites();
  }, [profile]);

  const handleDelete = async (id: string) => {
    await supabase.from('user_favorites').delete().eq('id', id);
    setFavorites((prev) => prev.filter((f) => f.id !== id));
  };

  const filtered = favorites.filter((f) => {
    const q = search.toLowerCase();
    return f.species_name.toLowerCase().includes(q) || f.species_category.toLowerCase().includes(q) || f.notes.toLowerCase().includes(q);
  });

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      <div className="flex items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">My Favorite Species</h1>
          <p className="text-slate-500 text-sm mt-1">Track creatures you've spotted or want to discover at Nyandungu</p>
        </div>
        {allowSubmissions && (
          <button
            onClick={() => setShowAdd(true)}
            className="flex items-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-medium text-sm transition-colors flex-shrink-0"
          >
            <Plus className="w-4 h-4" /> Add Species
          </button>
        )}
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
        <input
          type="text"
          placeholder="Search your favorites..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-10 pr-4 py-2.5 border border-stone-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/40 focus:border-emerald-400 bg-white"
        />
      </div>

      {/* Grid */}
      {loading ? (
        <div className="text-center py-16 text-slate-400">Loading your favorites...</div>
      ) : filtered.length === 0 ? (
        <Card className="p-12 text-center">
          <Heart className="w-12 h-12 text-stone-300 mx-auto mb-3" />
          <h3 className="text-lg font-semibold text-slate-700 mb-1">No favorites yet</h3>
          <p className="text-sm text-slate-400">Start tracking species you discover around the park!</p>
        </Card>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((fav) => {
            const Icon = CATEGORY_ICONS[fav.species_category] || Bird;
            const colorClass = CATEGORY_COLORS[fav.species_category] || 'bg-stone-50 text-stone-600 border-stone-200';
            return (
              <Card key={fav.id} className="p-5 group hover:shadow-md transition-shadow">
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div className="flex items-center gap-3">
                    <div className={`w-11 h-11 rounded-xl flex items-center justify-center border ${colorClass}`}>
                      <Icon className="w-5 h-5" />
                    </div>
                    <div className="min-w-0">
                      <h3 className="font-semibold text-slate-800 truncate">{fav.species_name}</h3>
                      <span className="text-xs text-slate-400 capitalize">{fav.species_category}</span>
                    </div>
                  </div>
                  <button
                    onClick={() => handleDelete(fav.id)}
                    className="p-1.5 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors opacity-0 group-hover:opacity-100"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
                {fav.notes && (
                  <p className="text-sm text-slate-500 line-clamp-3 bg-stone-50 rounded-lg p-2.5">{fav.notes}</p>
                )}
                <div className="text-xs text-slate-400 mt-3">Added {timeAgo(fav.created_at)}</div>
              </Card>
            );
          })}
        </div>
      )}

      {/* Add modal */}
      {showAdd && profile && (
        <AddFavoriteModal
          userId={profile.id}
          categories={allowedCategories}
          onClose={() => setShowAdd(false)}
          onAdded={(fav) => {
            setFavorites((prev) => [fav, ...prev]);
            setShowAdd(false);
          }}
        />
      )}
    </div>
  );
}

function AddFavoriteModal({ userId, categories, onClose, onAdded }: {
  userId: string;
  categories: string[];
  onClose: () => void;
  onAdded: (fav: UserFavorite) => void;
}) {
  const [category, setCategory] = useState(categories[0] || 'birds');
  const [name, setName] = useState('');
  const [notes, setNotes] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    setBusy(true);
    setError(null);
    const { data, error: insertError } = await supabase
      .from('user_favorites')
      .insert({
        user_id: userId,
        species_category: category,
        species_name: name.trim(),
        notes: notes.trim(),
      })
      .select('*')
      .single();

    if (insertError || !data) {
      setError('Could not save this favorite. Please try again.');
      setBusy(false);
      return;
    }

    await supabase.from('audit_logs').insert({
      actor_id: userId,
      event_type: 'favorite_add',
      message: `Added favorite: ${name.trim()} (${category})`,
    });

    onAdded(data as UserFavorite);
    setBusy(false);
  };

  return (
    <div className="fixed inset-0 z-[2000] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-md bg-white rounded-2xl shadow-2xl overflow-hidden">
        <div className="flex items-center justify-between p-5 border-b border-stone-100">
          <h2 className="font-bold text-slate-800">Add a Favorite Species</h2>
          <button onClick={onClose} className="w-8 h-8 rounded-lg hover:bg-stone-100 flex items-center justify-center">
            <X className="w-5 h-5 text-slate-400" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 font-medium">{error}</div>
          )}
          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Category</label>
            <div className="grid grid-cols-3 gap-2">
              {categories.map((cat) => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setCategory(cat)}
                  className={`px-3 py-2 rounded-lg text-sm font-medium border capitalize transition-all ${
                    category === cat
                      ? 'border-emerald-400 bg-emerald-50 text-emerald-700 ring-2 ring-emerald-500/20'
                      : 'border-stone-200 text-slate-600 hover:border-stone-300'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Species Name</label>
            <input
              type="text" required
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-4 py-2.5 border border-stone-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/40 focus:border-emerald-400"
              placeholder="e.g., African Fish Eagle"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Notes (optional)</label>
            <textarea
              rows={3}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full px-4 py-2.5 border border-stone-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/40 focus:border-emerald-400 resize-none"
              placeholder="Where and when you spotted it..."
            />
          </div>
          <button
            type="submit"
            disabled={busy}
            className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-60 text-white rounded-xl font-semibold text-sm transition-colors"
          >
            {busy ? 'Saving...' : <><Plus className="w-4 h-4" /> Add to Favorites</>}
          </button>
        </form>
      </div>
    </div>
  );
}
