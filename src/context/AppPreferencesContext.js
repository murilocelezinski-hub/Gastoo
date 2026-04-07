import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { DEFAULT_CATEGORIES } from '../theme';
import { lightPalette, darkPalette } from '../theme/palettes';

const PREFS_KEY = '@gastoo_prefs_v1';

const PROTECTED_CATEGORY_NAMES = new Set(['Transferência', 'Outros']);

function cloneCategories(list) {
  return list.map((c) => ({ ...c }));
}

function migratePrefs(parsed) {
  const profile = {
    name: typeof parsed?.profile?.name === 'string' ? parsed.profile.name : '',
    email: typeof parsed?.profile?.email === 'string' ? parsed.profile.email : '',
  };
  const themeMode = parsed?.themeMode === 'dark' ? 'dark' : 'light';
  let categories = Array.isArray(parsed?.categories) && parsed.categories.length ? cloneCategories(parsed.categories) : cloneCategories(DEFAULT_CATEGORIES);
  // garante categorias protegidas existam
  for (const req of DEFAULT_CATEGORIES.filter((c) => PROTECTED_CATEGORY_NAMES.has(c.name))) {
    if (!categories.some((c) => c.name === req.name)) categories.push({ ...req });
  }
  return { profile, themeMode, categories };
}

const AppPreferencesContext = createContext(null);

export function AppPreferencesProvider({ children }) {
  const [ready, setReady] = useState(false);
  const [profile, setProfileState] = useState({ name: '', email: '' });
  const [themeMode, setThemeModeState] = useState('light');
  const [categories, setCategoriesState] = useState(() => cloneCategories(DEFAULT_CATEGORIES));

  useEffect(() => {
    (async () => {
      try {
        const raw = await AsyncStorage.getItem(PREFS_KEY);
        if (raw) {
          const m = migratePrefs(JSON.parse(raw));
          setProfileState(m.profile);
          setThemeModeState(m.themeMode);
          setCategoriesState(m.categories);
        }
      } catch (e) {
        console.warn(e);
      }
      setReady(true);
    })();
  }, []);

  useEffect(() => {
    if (!ready) return;
    AsyncStorage.setItem(
      PREFS_KEY,
      JSON.stringify({ profile, themeMode, categories })
    ).catch(() => {});
  }, [profile, themeMode, categories, ready]);

  const colors = useMemo(() => (themeMode === 'dark' ? darkPalette : lightPalette), [themeMode]);

  const setProfile = useCallback((next) => {
    setProfileState((p) => ({ ...p, ...next }));
  }, []);

  const setThemeMode = useCallback((mode) => {
    setThemeModeState(mode === 'dark' ? 'dark' : 'light');
  }, []);

  const addCategory = useCallback(({ name, color, icon }) => {
    const n = String(name || '').trim();
    if (!n) return { ok: false, error: 'Informe o nome.' };
    let error = null;
    setCategoriesState((prev) => {
      if (prev.some((c) => c.name.toLowerCase() === n.toLowerCase())) {
        error = 'Já existe uma categoria com esse nome.';
        return prev;
      }
      return [...prev, { name: n, color: color || '#BCBCB8', icon: icon || '📁' }];
    });
    return error ? { ok: false, error } : { ok: true };
  }, []);

  const removeCategory = useCallback((name) => {
    if (PROTECTED_CATEGORY_NAMES.has(name)) {
      return { ok: false, error: 'Esta categoria não pode ser removida.' };
    }
    setCategoriesState((prev) => prev.filter((c) => c.name !== name));
    return { ok: true };
  }, []);

  const value = useMemo(
    () => ({
      ready,
      profile,
      setProfile,
      themeMode,
      setThemeMode,
      colors,
      categories,
      addCategory,
      removeCategory,
    }),
    [ready, profile, setProfile, themeMode, setThemeMode, colors, categories, addCategory, removeCategory]
  );

  return <AppPreferencesContext.Provider value={value}>{children}</AppPreferencesContext.Provider>;
}

export function useAppPreferences() {
  const ctx = useContext(AppPreferencesContext);
  if (!ctx) throw new Error('useAppPreferences must be used within AppPreferencesProvider');
  return ctx;
}

/** Atalho para estilos: `const T = useThemeColors()` */
export function useThemeColors() {
  const { colors } = useAppPreferences();
  return colors;
}
