import { useState, useEffect, useCallback } from 'react';
import { getThemeMode, setThemeMode, subscribeTheme, type ThemeMode } from '@/lib/theme';
import { supabase } from '@/lib/supabase';

export function useTheme() {
  const [mode, setMode] = useState<ThemeMode>(getThemeMode());

  useEffect(() => {
    const unsub = subscribeTheme(() => setMode(getThemeMode()));
    return unsub;
  }, []);

  const toggleTheme = useCallback(async (newMode: ThemeMode) => {
    setThemeMode(newMode);
    try {
      await supabase.from('user_preferences').upsert({
        dark_mode: newMode === 'dark',
        updated_at: new Date().toISOString(),
      });
    } catch {}
  }, []);

  return { mode, toggleTheme };
}
