import { useCallback, useEffect, useState } from 'react';
import { Layout, type TabKey } from './components/Layout';
import { WordModal } from './components/WordModal';
import { AuthProvider, useAuth } from './context/AuthContext';
import { api } from './lib/api';
import { AuthPage } from './pages/AuthPage';
import { DashboardPage } from './pages/DashboardPage';
import { ReviewPage } from './pages/ReviewPage';
import { StatsPage } from './pages/StatsPage';
import { WordsPage, type WordFilterKey } from './pages/WordsPage';
import type { ReviewQuality, StatsOverview, Word } from './types';

function AuthenticatedApp() {
  const [activeTab, setActiveTab] = useState<TabKey>('dashboard');
  const [wordsFilter, setWordsFilter] = useState<WordFilterKey>('all');
  const [overview, setOverview] = useState<StatsOverview | null>(null);
  const [words, setWords] = useState<Word[]>([]);
  const [dueWords, setDueWords] = useState<Word[]>([]);
  const [loading, setLoading] = useState(true);

  const [modalOpen, setModalOpen] = useState(false);
  const [editingWord, setEditingWord] = useState<Word | null>(null);

  const loadAll = useCallback(async () => {
    setLoading(true);
    try {
      const [ov, allWords, due] = await Promise.all([
        api.getOverview(),
        api.getWords(),
        api.getDueWords(),
      ]);
      setOverview(ov);
      setWords(allWords);
      setDueWords(due);
    } catch {
      // Offline fallback already handled in api layer
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    api.syncPendingQueue().finally(() => {
      loadAll();
    });
  }, [loadAll]);

  const handleSaveWord = async (data: {
    term: string;
    translation: string;
    example: string;
    notes: string;
  }) => {
    if (editingWord) {
      await api.updateWord(editingWord.id, data);
    } else {
      await api.createWord(data);
    }
    await loadAll();
  };

  const handleQuickCapture = async (term: string, source: string) => {
    await api.createWord({
      term,
      translation: '',
      example: '',
      notes: source,
    });
    await loadAll();
  };

  const handleDeleteWord = async (word: Word) => {
    if (!window.confirm(`¿Eliminar "${word.term}" de tu vocabulario?`)) return;
    await api.deleteWord(word.id);
    await loadAll();
  };

  const handleRateWord = async (wordId: string, quality: ReviewQuality) => {
    await api.reviewWord(wordId, quality);
    const [ov, allWords] = await Promise.all([api.getOverview(), api.getWords()]);
    setOverview(ov);
    setWords(allWords);
  };

  return (
    <Layout
      activeTab={activeTab}
      onTabChange={setActiveTab}
      streakCount={overview?.streak.currentStreak ?? 0}
      dueCount={overview?.totals.dueCount ?? dueWords.length}
      onSynced={loadAll}
    >
      {activeTab === 'dashboard' && (
        <DashboardPage
          overview={overview}
          loading={loading}
          onOpenAddWord={() => {
            setEditingWord(null);
            setModalOpen(true);
          }}
          onStartReview={() => setActiveTab('review')}
          onQuickCapture={handleQuickCapture}
          onOpenInbox={() => {
            setWordsFilter('inbox');
            setActiveTab('words');
          }}
        />
      )}

      {activeTab === 'words' && (
        <WordsPage
          words={words}
          loading={loading}
          initialFilter={wordsFilter}
          onAdd={() => {
            setEditingWord(null);
            setModalOpen(true);
          }}
          onQuickCapture={handleQuickCapture}
          onEdit={(w) => {
            setEditingWord(w);
            setModalOpen(true);
          }}
          onDelete={handleDeleteWord}
        />
      )}

      {activeTab === 'review' && (
        <ReviewPage
          dueWords={dueWords}
          loading={loading}
          onRate={handleRateWord}
          onReload={loadAll}
          onGoAddWord={() => {
            setEditingWord(null);
            setModalOpen(true);
          }}
        />
      )}

      {activeTab === 'stats' && (
        <StatsPage overview={overview} onSettingsUpdated={loadAll} />
      )}

      {modalOpen && (
        <WordModal
          initialWord={editingWord}
          onClose={() => {
            setModalOpen(false);
            setEditingWord(null);
          }}
          onSave={handleSaveWord}
        />
      )}
    </Layout>
  );
}

function RootRouter() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="w-8 h-8 rounded-full border-2 border-amber-500 border-t-transparent animate-spin" />
      </div>
    );
  }

  return user ? <AuthenticatedApp /> : <AuthPage />;
}

export default function App() {
  return (
    <AuthProvider>
      <RootRouter />
    </AuthProvider>
  );
}
