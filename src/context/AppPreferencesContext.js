import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { DEFAULT_CATEGORIES } from '../theme';
import { lightPalette, darkPalette } from '../theme/palettes';
import { supabase } from '../services/supabaseClient';
import { upsertPreferences, fetchPreferences } from '../services/supabaseSync';

const PREFS_KEY = '@gastoo_prefs_v3';
const PREFS_KEY_LEGACY_V2 = '@gastoo_prefs_v2';
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

  // migração v2→v3: adiciona campo `tipo` se não existir
  categories = categories.map((c) => {
    if (c.tipo) return c;
    if (PROTECTED_CATEGORY_NAMES.has(c.name)) return { ...c, tipo: 'ambos' };
    return { ...c, tipo: 'despesa' };
  });

  // garante categorias protegidas existam
  for (const req of DEFAULT_CATEGORIES.filter((c) => PROTECTED_CATEGORY_NAMES.has(c.name))) {
    if (!categories.some((c) => c.name === req.name)) categories.push({ ...req });
  }

  // adiciona categorias de receita padrão se não existirem
  const defaultIncomeNames = new Set(['Salário', 'Freelance', 'Rendimentos', 'Presente', 'Reembolso', 'Aluguel Recebido', 'Benefícios']);
  for (const req of DEFAULT_CATEGORIES.filter((c) => defaultIncomeNames.has(c.name))) {
    if (!categories.some((c) => c.name === req.name)) categories.push({ ...req });
  }

  // preenche ícone e tipo ausentes para categorias antigas (migração silenciosa)
  const defaultByName = Object.fromEntries(DEFAULT_CATEGORIES.map((c) => [c.name, c]));
  categories = categories.map((c) => {
    const defaults = defaultByName[c.name];
    return {
      name: c.name,
      color: c.color || defaults?.color || '#BCBCB8',
      icon: c.icon || defaults?.icon || 'Folder',
      tipo: c.tipo || defaults?.tipo || 'despesa',
    };
  });

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
  const userIdRef = useRef(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      userIdRef.current = data.session?.user?.id ?? null;
    });
    const { data: listener } = supabase.auth.onAuthStateChange((_e, session) => {
      userIdRef.current = session?.user?.id ?? null;
    });
    return () => listener.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    (async () => {
      try {
        let raw = await AsyncStorage.getItem(PREFS_KEY);
        if (!raw) raw = await AsyncStorage.getItem(PREFS_KEY_LEGACY_V2);
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

      // Sync remoto em background
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user) {
          const remote = await fetchPreferences(session.user.id);
          if (remote) {
            const m = migratePrefs(remote);
            setProfileState(m.profile);
            setThemeModeState(m.themeMode);
            setTransactionListOrderState(m.transactionListOrder);
            setCategoriesState(m.categories);
            setSpendingGoalsState(m.spendingGoals || {});
          }
        }
      } catch (e) {
        console.warn('[AppPreferencesContext] Sync Supabase falhou:', e?.message);
      }

      setReady(true);
    })();
  }, []);

  useEffect(() => {
    if (!ready) return;
    const prefs = { profile, themeMode, transactionListOrder, categories, spendingGoals };
    AsyncStorage.setItem(PREFS_KEY, JSON.stringify(prefs)).catch(() => {});
    if (userIdRef.current) upsertPreferences(prefs, userIdRef.current);
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

  const addCategory = useCallback(({ name, color, icon, tipo = 'despesa' }) => {
    const n = String(name || '').trim();
    if (!n) return { ok: false, error: 'Informe o nome.' };
    let error = null;
    setCategoriesState((prev) => {
      if (prev.some((c) => c.name.toLowerCase() === n.toLowerCase())) {
        error = 'Já existe uma categoria com esse nome.';
        return prev;
      }
      return [...prev, { name: n, color: color || '#BCBCB8', icon: icon || 'Folder', tipo }];
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

  const updateCategory = useCallback((oldName, { name, color, icon, tipo }) => {
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
        tipo: tipo ?? next[idx].tipo,
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
