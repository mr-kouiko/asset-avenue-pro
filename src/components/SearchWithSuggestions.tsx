import { useState, useEffect, useRef, useCallback } from 'react';
import { Search, Clock, TrendingUp, X } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { generateSuggestions } from '@/utils/fuzzySearch';
import { useNavigate } from 'react-router-dom';
import { useLanguage } from '@/contexts/LanguageContext';
import { cn } from '@/lib/utils';

interface SearchableItem {
  id: string;
  title: string;
  tags?: string[];
  type?: string;
}

interface SearchWithSuggestionsProps {
  items: SearchableItem[];
  placeholder?: string;
  onSearch: (query: string) => void;
  className?: string;
  inputClassName?: string;
  variant?: 'default' | 'hero';
  initialValue?: string;
}

const RECENT_SEARCHES_KEY = 'visustock_recent_searches';
const MAX_RECENT_SEARCHES = 5;

export function SearchWithSuggestions({
  items,
  placeholder = 'Search...',
  onSearch,
  className,
  inputClassName,
  variant = 'default',
  initialValue = ''
}: SearchWithSuggestionsProps) {
  const [query, setQuery] = useState(initialValue);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const { language } = useLanguage();
  const navigate = useNavigate();

  // Load recent searches on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(RECENT_SEARCHES_KEY);
      if (stored) {
        setRecentSearches(JSON.parse(stored));
      }
    } catch (e) {
      console.error('Failed to load recent searches:', e);
    }
  }, []);

  // Update initial value when it changes
  useEffect(() => {
    setQuery(initialValue);
  }, [initialValue]);

  // Generate suggestions when query changes
  useEffect(() => {
    if (query.length >= 2) {
      const newSuggestions = generateSuggestions(query, items);
      setSuggestions(newSuggestions);
    } else {
      setSuggestions([]);
    }
    setSelectedIndex(-1);
  }, [query, items]);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const saveRecentSearch = useCallback((searchQuery: string) => {
    const trimmed = searchQuery.trim().toLowerCase();
    if (!trimmed) return;

    setRecentSearches(prev => {
      const filtered = prev.filter(s => s.toLowerCase() !== trimmed);
      const updated = [searchQuery.trim(), ...filtered].slice(0, MAX_RECENT_SEARCHES);
      localStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(updated));
      return updated;
    });
  }, []);

  const handleSubmit = useCallback((searchQuery: string) => {
    const trimmed = searchQuery.trim();
    if (!trimmed) return;

    saveRecentSearch(trimmed);
    setIsOpen(false);
    onSearch(trimmed);
    
    // Navigate to marketplace with search param
    navigate(`/${language}/marketplace?search=${encodeURIComponent(trimmed)}`);
  }, [saveRecentSearch, onSearch, navigate, language]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    const allOptions = [...(query.length < 2 ? recentSearches : []), ...suggestions];
    
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedIndex(prev => 
          prev < allOptions.length - 1 ? prev + 1 : prev
        );
        break;
      case 'ArrowUp':
        e.preventDefault();
        setSelectedIndex(prev => prev > -1 ? prev - 1 : -1);
        break;
      case 'Enter':
        e.preventDefault();
        if (selectedIndex >= 0 && allOptions[selectedIndex]) {
          handleSubmit(allOptions[selectedIndex]);
        } else {
          handleSubmit(query);
        }
        break;
      case 'Escape':
        setIsOpen(false);
        inputRef.current?.blur();
        break;
    }
  };

  const clearRecentSearches = () => {
    setRecentSearches([]);
    localStorage.removeItem(RECENT_SEARCHES_KEY);
  };

  const showDropdown = isOpen && (
    (query.length < 2 && recentSearches.length > 0) ||
    (query.length >= 2 && suggestions.length > 0)
  );

  return (
    <div ref={containerRef} className={cn('relative', className)}>
      <div className="relative flex gap-2">
        <div className="relative flex-1">
          <Search className={cn(
            'absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground',
            variant === 'hero' ? 'h-5 w-5' : 'h-4 w-4'
          )} />
          <Input
            ref={inputRef}
            type="text"
            placeholder={placeholder}
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setIsOpen(true);
            }}
            onFocus={() => setIsOpen(true)}
            onKeyDown={handleKeyDown}
            className={cn(
              'pl-10',
              variant === 'hero' && 'h-12 text-base bg-white/95',
              inputClassName
            )}
          />
          {query && (
            <button
              type="button"
              onClick={() => {
                setQuery('');
                inputRef.current?.focus();
              }}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
        {variant === 'hero' && (
          <Button 
            size="lg" 
            className="px-6 sm:px-8 h-12"
            onClick={() => handleSubmit(query)}
          >
            {language === 'fr' ? 'Rechercher' : 'Search'}
          </Button>
        )}
      </div>

      {/* Suggestions Dropdown */}
      {showDropdown && (
        <div className="absolute z-50 w-full mt-1 bg-background border rounded-lg shadow-lg overflow-hidden">
          {/* Recent Searches */}
          {query.length < 2 && recentSearches.length > 0 && (
            <div>
              <div className="flex items-center justify-between px-3 py-2 bg-muted/50">
                <span className="text-xs font-medium text-muted-foreground flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  {language === 'fr' ? 'Recherches récentes' : 'Recent searches'}
                </span>
                <button
                  onClick={clearRecentSearches}
                  className="text-xs text-muted-foreground hover:text-foreground"
                >
                  {language === 'fr' ? 'Effacer' : 'Clear'}
                </button>
              </div>
              {recentSearches.map((search, index) => (
                <button
                  key={search}
                  onClick={() => handleSubmit(search)}
                  className={cn(
                    'w-full px-3 py-2 text-left text-sm hover:bg-muted/50 flex items-center gap-2 transition-colors',
                    selectedIndex === index && 'bg-muted'
                  )}
                >
                  <Clock className="h-4 w-4 text-muted-foreground shrink-0" />
                  <span className="truncate">{search}</span>
                </button>
              ))}
            </div>
          )}

          {/* Suggestions */}
          {query.length >= 2 && suggestions.length > 0 && (
            <div>
              <div className="px-3 py-2 bg-muted/50">
                <span className="text-xs font-medium text-muted-foreground flex items-center gap-1">
                  <TrendingUp className="h-3 w-3" />
                  {language === 'fr' ? 'Suggestions' : 'Suggestions'}
                </span>
              </div>
              {suggestions.map((suggestion, index) => (
                <button
                  key={suggestion}
                  onClick={() => handleSubmit(suggestion)}
                  className={cn(
                    'w-full px-3 py-2 text-left text-sm hover:bg-muted/50 flex items-center gap-2 transition-colors',
                    selectedIndex === index && 'bg-muted'
                  )}
                >
                  <Search className="h-4 w-4 text-muted-foreground shrink-0" />
                  <span className="truncate">
                    {/* Highlight matching part */}
                    {suggestion.toLowerCase().includes(query.toLowerCase()) ? (
                      <>
                        {suggestion.substring(0, suggestion.toLowerCase().indexOf(query.toLowerCase()))}
                        <strong>
                          {suggestion.substring(
                            suggestion.toLowerCase().indexOf(query.toLowerCase()),
                            suggestion.toLowerCase().indexOf(query.toLowerCase()) + query.length
                          )}
                        </strong>
                        {suggestion.substring(suggestion.toLowerCase().indexOf(query.toLowerCase()) + query.length)}
                      </>
                    ) : (
                      suggestion
                    )}
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
