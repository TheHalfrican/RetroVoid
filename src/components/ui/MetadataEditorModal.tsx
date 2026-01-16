import { useState, useEffect, KeyboardEvent } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTheme } from '../../hooks/useTheme';
import type { Game } from '../../types';

interface MetadataEditorModalProps {
  game: Game;
  isOpen: boolean;
  onClose: () => void;
  onSave: (updates: Partial<Game>) => Promise<void>;
}

export function MetadataEditorModal({ game, isOpen, onClose, onSave }: MetadataEditorModalProps) {
  const theme = useTheme();
  const [title, setTitle] = useState(game.title);
  const [description, setDescription] = useState(game.description || '');
  const [releaseDate, setReleaseDate] = useState(game.releaseDate || '');
  const [developer, setDeveloper] = useState(game.developer || '');
  const [publisher, setPublisher] = useState(game.publisher || '');
  const [genres, setGenres] = useState<string[]>(game.genre || []);
  const [genreInput, setGenreInput] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  // Reset form when game changes or modal opens
  useEffect(() => {
    if (isOpen) {
      setTitle(game.title);
      setDescription(game.description || '');
      setReleaseDate(game.releaseDate || '');
      setDeveloper(game.developer || '');
      setPublisher(game.publisher || '');
      setGenres(game.genre || []);
      setGenreInput('');
    }
  }, [game, isOpen]);

  const handleAddGenre = () => {
    const trimmed = genreInput.trim();
    if (trimmed && !genres.includes(trimmed)) {
      setGenres([...genres, trimmed]);
      setGenreInput('');
    }
  };

  const handleGenreKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAddGenre();
    } else if (e.key === 'Backspace' && genreInput === '' && genres.length > 0) {
      // Remove last genre when backspace on empty input
      setGenres(genres.slice(0, -1));
    }
  };

  const handleRemoveGenre = (genreToRemove: string) => {
    setGenres(genres.filter(g => g !== genreToRemove));
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await onSave({
        title: title.trim(),
        description: description.trim() || undefined,
        releaseDate: releaseDate.trim() || undefined,
        developer: developer.trim() || undefined,
        publisher: publisher.trim() || undefined,
        genre: genres.length > 0 ? genres : undefined,
      });
      onClose();
    } catch (error) {
      console.error('Failed to save metadata:', error);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 backdrop-blur-sm z-[60]"
            style={{ backgroundColor: 'rgba(0, 0, 0, 0.8)' }}
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="fixed inset-0 z-[70] flex items-center justify-center p-4"
          >
            <div
              className="w-full max-w-lg rounded-xl overflow-hidden"
              style={{
                backgroundColor: 'var(--theme-bg-secondary)',
                border: '1px solid var(--theme-border)',
              }}
            >
              {/* Header */}
              <div
                className="p-4 flex items-center justify-between"
                style={{ borderBottom: '1px solid var(--theme-border)' }}
              >
                <div>
                  <h3 className="font-display text-lg" style={{ color: 'var(--theme-text)' }}>Edit Metadata</h3>
                  <p className="text-xs" style={{ color: 'var(--theme-text-muted)' }}>Customize game information</p>
                </div>
                <motion.button
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                  onClick={onClose}
                  className="p-2 rounded-lg transition-colors"
                  style={{
                    backgroundColor: 'var(--theme-surface)',
                    color: 'var(--theme-text-muted)',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = 'var(--theme-surface-hover)';
                    e.currentTarget.style.color = 'var(--theme-text)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = 'var(--theme-surface)';
                    e.currentTarget.style.color = 'var(--theme-text-muted)';
                  }}
                >
                  <CloseIcon />
                </motion.button>
              </div>

              {/* Form */}
              <div className="p-4 space-y-4 max-h-[60vh] overflow-y-auto">
                {/* Title */}
                <div>
                  <label className="block text-xs uppercase tracking-wider mb-1" style={{ color: 'var(--theme-text-muted)' }}>
                    Title
                  </label>
                  <input
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg font-body text-sm focus:outline-none transition-colors"
                    style={{
                      backgroundColor: 'var(--theme-surface)',
                      border: '1px solid var(--theme-border)',
                      color: 'var(--theme-text)',
                    }}
                    onFocus={(e) => { e.currentTarget.style.borderColor = theme.accent; }}
                    onBlur={(e) => { e.currentTarget.style.borderColor = 'var(--theme-border)'; }}
                    placeholder="Game title"
                  />
                </div>

                {/* Description */}
                <div>
                  <label className="block text-xs uppercase tracking-wider mb-1" style={{ color: 'var(--theme-text-muted)' }}>
                    Description
                  </label>
                  <textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    rows={3}
                    className="w-full px-3 py-2 rounded-lg font-body text-sm focus:outline-none transition-colors resize-none"
                    style={{
                      backgroundColor: 'var(--theme-surface)',
                      border: '1px solid var(--theme-border)',
                      color: 'var(--theme-text)',
                    }}
                    onFocus={(e) => { e.currentTarget.style.borderColor = theme.accent; }}
                    onBlur={(e) => { e.currentTarget.style.borderColor = 'var(--theme-border)'; }}
                    placeholder="Game description"
                  />
                </div>

                {/* Release Date */}
                <div>
                  <label className="block text-xs uppercase tracking-wider mb-1" style={{ color: 'var(--theme-text-muted)' }}>
                    Release Date
                  </label>
                  <input
                    type="text"
                    value={releaseDate}
                    onChange={(e) => setReleaseDate(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg font-body text-sm focus:outline-none transition-colors"
                    style={{
                      backgroundColor: 'var(--theme-surface)',
                      border: '1px solid var(--theme-border)',
                      color: 'var(--theme-text)',
                    }}
                    onFocus={(e) => { e.currentTarget.style.borderColor = theme.accent; }}
                    onBlur={(e) => { e.currentTarget.style.borderColor = 'var(--theme-border)'; }}
                    placeholder="YYYY-MM-DD or any format"
                  />
                </div>

                {/* Developer & Publisher */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs uppercase tracking-wider mb-1" style={{ color: 'var(--theme-text-muted)' }}>
                      Developer
                    </label>
                    <input
                      type="text"
                      value={developer}
                      onChange={(e) => setDeveloper(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg font-body text-sm focus:outline-none transition-colors"
                      style={{
                        backgroundColor: 'var(--theme-surface)',
                        border: '1px solid var(--theme-border)',
                        color: 'var(--theme-text)',
                      }}
                      onFocus={(e) => { e.currentTarget.style.borderColor = theme.accent; }}
                      onBlur={(e) => { e.currentTarget.style.borderColor = 'var(--theme-border)'; }}
                      placeholder="Developer name"
                    />
                  </div>
                  <div>
                    <label className="block text-xs uppercase tracking-wider mb-1" style={{ color: 'var(--theme-text-muted)' }}>
                      Publisher
                    </label>
                    <input
                      type="text"
                      value={publisher}
                      onChange={(e) => setPublisher(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg font-body text-sm focus:outline-none transition-colors"
                      style={{
                        backgroundColor: 'var(--theme-surface)',
                        border: '1px solid var(--theme-border)',
                        color: 'var(--theme-text)',
                      }}
                      onFocus={(e) => { e.currentTarget.style.borderColor = theme.accent; }}
                      onBlur={(e) => { e.currentTarget.style.borderColor = 'var(--theme-border)'; }}
                      placeholder="Publisher name"
                    />
                  </div>
                </div>

                {/* Genres */}
                <div>
                  <label className="block text-xs uppercase tracking-wider mb-1" style={{ color: 'var(--theme-text-muted)' }}>
                    Genres
                  </label>
                  <div
                    className="flex flex-wrap gap-2 p-2 rounded-lg min-h-[42px]"
                    style={{
                      backgroundColor: 'var(--theme-surface)',
                      border: '1px solid var(--theme-border)',
                    }}
                  >
                    {genres.map((genre) => (
                      <motion.span
                        key={genre}
                        initial={{ scale: 0.8, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        exit={{ scale: 0.8, opacity: 0 }}
                        className="inline-flex items-center gap-1 px-2 py-1 text-xs rounded-full"
                        style={{
                          backgroundColor: theme.accentMuted,
                          border: `1px solid ${theme.accent}60`,
                          color: theme.accent,
                        }}
                      >
                        {genre}
                        <button
                          onClick={() => handleRemoveGenre(genre)}
                          className="transition-colors"
                          style={{ color: theme.accent }}
                          onMouseEnter={(e) => { e.currentTarget.style.color = 'var(--theme-text)'; }}
                          onMouseLeave={(e) => { e.currentTarget.style.color = theme.accent; }}
                        >
                          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      </motion.span>
                    ))}
                    <input
                      type="text"
                      value={genreInput}
                      onChange={(e) => setGenreInput(e.target.value)}
                      onKeyDown={handleGenreKeyDown}
                      onBlur={handleAddGenre}
                      className="flex-1 min-w-[100px] bg-transparent font-body text-sm focus:outline-none"
                      style={{ color: 'var(--theme-text)' }}
                      placeholder={genres.length === 0 ? "Add genres..." : ""}
                    />
                  </div>
                  <p className="text-xs mt-1" style={{ color: 'var(--theme-text-muted)' }}>Press Enter to add a genre</p>
                </div>
              </div>

              {/* Footer */}
              <div
                className="p-4 flex justify-end gap-3"
                style={{ borderTop: '1px solid var(--theme-border)' }}
              >
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={onClose}
                  className="px-4 py-2 rounded-lg font-body text-sm transition-colors"
                  style={{
                    backgroundColor: 'var(--theme-surface)',
                    border: '1px solid var(--theme-border)',
                    color: 'var(--theme-text-secondary)',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.color = 'var(--theme-text)';
                    e.currentTarget.style.borderColor = 'var(--theme-border-hover)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.color = 'var(--theme-text-secondary)';
                    e.currentTarget.style.borderColor = 'var(--theme-border)';
                  }}
                >
                  Cancel
                </motion.button>
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={handleSave}
                  disabled={isSaving || !title.trim()}
                  className="px-4 py-2 rounded-lg font-display font-bold text-sm transition-colors disabled:opacity-50"
                  style={{
                    backgroundColor: theme.accent,
                    color: 'var(--theme-bg)',
                  }}
                >
                  {isSaving ? 'Saving...' : 'Save Changes'}
                </motion.button>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

function CloseIcon() {
  return (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
    </svg>
  );
}
