import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { DEFAULT_CATEGORIES } from '../theme';
import { lightPalette, darkPalette } from '../theme/palettes';

const PREFS_KEY = '@gastoo_prefs_v2';
const PREFS_KEY_LEGACY = '@gastoo_prefs_v1';

const PROTECTED_CATEGORY_NAMES = new Set(['Transferência', 'Outros']);

function cloneCategories(list) {
  return list.map((c) => ({ ...c }));
}

function migratePrefs(parsed) {
  const profile = {
    name: typeof parsed?.profile?.name === 'string' ? parsed.profile.name : '',
    email: typeof parsed?.profile?.email === 'string' ? parsed.profile.email : '',
    avatarUri: typeof parsed?.profile?.avatarUri === 'string' ? parsed.profile.avatarUri : '',
  };
  const themeMode = parsed?.themeMode === 'dark' ? 'dark' : 'light';
  const transactionListOrder = parsed?.transactionListOrder === 'asc' ? 'asc' : 'desc';
  let categories = Array.isArray(parsed?.categories) && parsed.categories.length ? cloneCategories(parsed.categories) : cloneCategories(DEFAULT_CATEGORIES);
  // garante categorias protegidas existam
  for (const req of DEFAULT_CATEGORIES.filter((c) => PROTECTED_CATEGORY_NAMES.has(c.name))) {
    if (!categories.some((c) => c.name === req.name)) categories.push({ ...req });
  }
  const spendingGoals =
    parsed?.spendingGoals && typeof parsed.spendingGoals === 'object' ? parsed.spendingGoals : {};
  return { profile, themeMode, transactionListOrder, categories, spendingGoals };
}

const AppPreferencesContext = createContext(null);

export function AppPreferencesProvider({ children }) {
  const [ready, setReady] = useState(false);
  const [profile, setProfileState] = useState({ name: '', email: '', avatarUri: '' });
  const [themeMode, setThemeModeState] = useState('light');
  const [transactionListOrder, setTransactionListOrderState] = useState('desc');
  const [categories, setCategoriesState] = useState(() => cloneCategories(DEFAULT_CATEGORIES));
  const [spendingGoals, setSpendingGoalsState] = useState({});

  useEffect(() => {
    (async () => {
      try {
        let raw = await AsyncStorage.getItem(PREFS_KEY);
        if (!raw) raw = await AsyncStorage.getItem(PREFS_KEY_LEGACY);
        if (raw) {
          const m = migratePrefs(JSON.parse(raw));
          setProfileState(m.profile);
          setThemeModeState(m.themeMode);
          setTransactionListOrderState(m.transactionListOrder);
          setCategoriesState(m.categories);
          setSpendingGoalsState(m.spendingGoals || {});
        }
      } catch (e) {
        console.warn('[AppPreferencesContext] Erro ao carregar preferências:', e);
      }
      setReady(true);
    })();
  }, []);

  useEffect(() => {
    if (!ready) return;
    AsyncStorage.setItem(
      PREFS_KEY,
      JSON.stringify({ profile, themeMode, transactionListOrder, categories, spendingGoals })
    ).catch(() => {});
  }, [profile, themeMode, transactionListOrder, categories, spendingGoals, ready]);

  const colors = useMemo(() => (themeMode === 'dark' ? darkPalette : lightPalette), [themeMode]);

  const setProfile = useCallback((next) => {
    setProfileState((p) => ({ ...p, ...next }));
  }, []);

  const setThemeMode = useCallback((mode) => {
    setThemeModeState(mode === 'dark' ? 'dark' : 'light');
  }, []);

  const setTransactionListOrder = useCallback((order) => {
    setTransactionListOrderState(order === 'asc' ? 'asc' : 'desc');
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

  const updateCategory = useCallback((oldName, { name, color, icon }) => {
    const n = String(name || '').trim();
    if (!n) return { ok: false, error: 'Informe o nome.' };
    if (PROTECTED_CATEGORY_NAMES.has(oldName) && n !== oldName) {
      return { ok: false, error: 'O nome desta categoria não pode ser alterado.' };
    }
    if (PROTECTED_CATEGORY_NAMES.has(n) && n !== oldName) {
      return { ok: false, error: 'Este nome é reservado ao sistema.' };
    }
    let out = { ok: true };
    setCategoriesState((prev) => {
      const idx = prev.findIndex((c) => c.name === oldName);
      if (idx < 0) {
        out = { ok: false, error: 'Categoria não encontrada.' };
        return prev;
      }
      if (prev.some((c, i) => i !== idx && c.name.toLowerCase() === n.toLowerCase())) {
        out = { ok: false, error: 'Já existe uma categoria com esse nome.' };
        return prev;
      }
      const next = [...prev];
      next[idx] = {
        name: n,
        color: color ?? next[idx].color,
        icon: icon ?? next[idx].icon,
      };
      return next;
    });
    return out;
  }, []);

  const setCategorySpendingGoal = useCallback((monthKey, categoryName, next) => {
    if (!monthKey || !categoryName) return;
    setSpendingGoalsState((prev) => {
      const byMonth = prev && typeof prev === 'object' && !Array.isArray(prev) ? prev : {};
      const rawBucket = byMonth[monthKey];
      const bucket =
        rawBucket && typeof rawBucket === 'object' && !Array.isArray(rawBucket) ? rawBucket : {};
      const rawCats = bucket.categories;
      const categoriesMap =
        rawCats && typeof rawCats === 'object' && !Array.isArray(rawCats) ? rawCats : {};
      const limit = next?.limit === '' || next?.limit == null ? null : Number(next.limit);
      const kind = next?.kind === 'fixed' ? 'fixed' : 'variable';
      const prevCat =
        categoriesMap[categoryName] && typeof categoriesMap[categoryName] === 'object'
          ? categoriesMap[categoryName]
          : {};
      const nextLimit =
        limit !== null && !Number.isFinite(limit)
          ? prevCat.limit
          : limit === null
            ? 0
            : Math.max(0, limit);
      const updatedCat = {
        ...prevCat,
        limit: nextLimit,
        kind,
      };
      return {
        ...byMonth,
        [monthKey]: {
          ...bucket,
          categories: {
            ...categoriesMap,
            [categoryName]: updatedCat,
          },
        },
      };
    });
  }, []);

  const copySpendingGoals = useCallback((fromMonthKey, toMonthKey) => {
    if (!fromMonthKey || !toMonthKey || fromMonthKey === toMonthKey) return;
    setSpendingGoalsState((prev) => {
      const byMonth = prev && typeof prev === 'object' ? prev : {};
      const src = byMonth[fromMonthKey];
      if (!src || typeof src !== 'object') return byMonth;
      return { ...byMonth, [toMonthKey]: JSON.parse(JSON.stringify(src)) };
    });
  }, []);

  const value = useMemo(
    () => ({
      ready,
      profile,
      setProfile,
      themeMode,
      setThemeMode,
      transactionListOrder,
      setTransactionListOrder,
      colors,
      categories,
      addCategory,
      updateCategory,
      removeCategory,
      spendingGoals,
      setCategorySpendingGoal,
      copySpendingGoals,
    }),
    [
      ready,
      profile,
      setProfile,
      themeMode,
      setThemeMode,
      transactionListOrder,
      setTransactionListOrder,
      colors,
      categories,
      addCategory,
      updateCategory,
      removeCategory,
      spendingGoals,
      setCategorySpendingGoal,
      copySpendingGoals,
    ]
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
  return colors ?? lightPalette;
}
