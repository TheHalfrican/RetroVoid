import { useState, useEffect, KeyboardEvent } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { Game } from '../../types';

interface MetadataEditorModalProps {
  game: Game;
  isOpen: boolean;
  onClose: () => void;
  onSave: (updates: Partial<Game>) => Promise<void>;
}

export function MetadataEditorModal({ game, isOpen, onClose, onSave }: MetadataEditorModalProps) {
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
            className="fixed inset-0 bg-void-black/80 backdrop-blur-sm z-[60]"
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="fixed inset-0 z-[70] flex items-center justify-center p-4"
          >
            <div className="w-full max-w-lg bg-deep-purple rounded-xl border border-glass-border overflow-hidden">
              {/* Header */}
              <div className="p-4 border-b border-glass-border flex items-center justify-between">
                <div>
                  <h3 className="font-display text-lg text-white">Edit Metadata</h3>
                  <p className="text-xs text-gray-500">Customize game information</p>
                </div>
                <motion.button
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                  onClick={onClose}
                  className="p-2 rounded-lg bg-glass-white hover:bg-glass-border text-gray-400 hover:text-white transition-colors"
                >
                  <CloseIcon />
                </motion.button>
              </div>

              {/* Form */}
              <div className="p-4 space-y-4 max-h-[60vh] overflow-y-auto">
                {/* Title */}
                <div>
                  <label className="block text-xs text-gray-400 uppercase tracking-wider mb-1">
                    Title
                  </label>
                  <input
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    className="w-full px-3 py-2 bg-glass-white border border-glass-border rounded-lg
                             text-white font-body text-sm focus:outline-none focus:border-neon-cyan
                             transition-colors"
                    placeholder="Game title"
                  />
                </div>

                {/* Description */}
                <div>
                  <label className="block text-xs text-gray-400 uppercase tracking-wider mb-1">
                    Description
                  </label>
                  <textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    rows={3}
                    className="w-full px-3 py-2 bg-glass-white border border-glass-border rounded-lg
                             text-white font-body text-sm focus:outline-none focus:border-neon-cyan
                             transition-colors resize-none"
                    placeholder="Game description"
                  />
                </div>

                {/* Release Date */}
                <div>
                  <label className="block text-xs text-gray-400 uppercase tracking-wider mb-1">
                    Release Date
                  </label>
                  <input
                    type="text"
                    value={releaseDate}
                    onChange={(e) => setReleaseDate(e.target.value)}
                    className="w-full px-3 py-2 bg-glass-white border border-glass-border rounded-lg
                             text-white font-body text-sm focus:outline-none focus:border-neon-cyan
                             transition-colors"
                    placeholder="YYYY-MM-DD or any format"
                  />
                </div>

                {/* Developer & Publisher */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs text-gray-400 uppercase tracking-wider mb-1">
                      Developer
                    </label>
                    <input
                      type="text"
                      value={developer}
                      onChange={(e) => setDeveloper(e.target.value)}
                      className="w-full px-3 py-2 bg-glass-white border border-glass-border rounded-lg
                               text-white font-body text-sm focus:outline-none focus:border-neon-cyan
                               transition-colors"
                      placeholder="Developer name"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-400 uppercase tracking-wider mb-1">
                      Publisher
                    </label>
                    <input
                      type="text"
                      value={publisher}
                      onChange={(e) => setPublisher(e.target.value)}
                      className="w-full px-3 py-2 bg-glass-white border border-glass-border rounded-lg
                               text-white font-body text-sm focus:outline-none focus:border-neon-cyan
                               transition-colors"
                      placeholder="Publisher name"
                    />
                  </div>
                </div>

                {/* Genres */}
                <div>
                  <label className="block text-xs text-gray-400 uppercase tracking-wider mb-1">
                    Genres
                  </label>
                  <div className="flex flex-wrap gap-2 p-2 bg-glass-white border border-glass-border rounded-lg min-h-[42px]">
                    {genres.map((genre) => (
                      <motion.span
                        key={genre}
                        initial={{ scale: 0.8, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        exit={{ scale: 0.8, opacity: 0 }}
                        className="inline-flex items-center gap-1 px-2 py-1 bg-neon-cyan/20 border border-neon-cyan/40
                                 text-neon-cyan text-xs rounded-full"
                      >
                        {genre}
                        <button
                          onClick={() => handleRemoveGenre(genre)}
                          className="hover:text-white transition-colors"
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
                      className="flex-1 min-w-[100px] bg-transparent text-white font-body text-sm
                               focus:outline-none placeholder-gray-500"
                      placeholder={genres.length === 0 ? "Add genres..." : ""}
                    />
                  </div>
                  <p className="text-xs text-gray-600 mt-1">Press Enter to add a genre</p>
                </div>
              </div>

              {/* Footer */}
              <div className="p-4 border-t border-glass-border flex justify-end gap-3">
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={onClose}
                  className="px-4 py-2 rounded-lg bg-glass-white border border-glass-border
                           text-gray-300 font-body text-sm hover:text-white hover:border-gray-500 transition-colors"
                >
                  Cancel
                </motion.button>
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={handleSave}
                  disabled={isSaving || !title.trim()}
                  className="px-4 py-2 rounded-lg bg-neon-cyan text-void-black font-display font-bold text-sm
                           hover:bg-neon-cyan/90 transition-colors disabled:opacity-50"
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
