import { useWindowDimensions } from 'react-native';
import { useMemo } from 'react';

/**
 * Detecção de layout baseada em largura da tela
 * mobile: < 500px
 * tablet: 500px - 1024px
 * desktop: > 1024px
 */
export function useResponsiveLayout() {
  const { width } = useWindowDimensions();

  return useMemo(() => ({
    isMobile: width < 500,
    isTablet: width >= 500 && width < 1024,
    isDesktop: width >= 1024,
    width,
    isWide: width >= 1024,
    maxWidth: width >= 1024 ? 1200 : width,
  }), [width]);
}

/**
 * Layout grid responsivo para dashboard
 * Mobile: 1 coluna
 * Tablet: 2 colunas
 * Desktop: 3 colunas
 */
export function useGridLayout() {
  const { isMobile, isTablet, isDesktop } = useResponsiveLayout();

  return useMemo(() => {
    if (isMobile) return { columns: 1, gap: 12, paddingHorizontal: 16 };
    if (isTablet) return { columns: 2, gap: 16, paddingHorizontal: 20 };
    return { columns: 3, gap: 20, paddingHorizontal: 40 };
  }, [isMobile, isTablet, isDesktop]);
}

/**
 * Layout para lista de cartões
 */
export function useCardListLayout() {
  const { isMobile, isTablet, isDesktop } = useResponsiveLayout();

  return useMemo(() => {
    if (isMobile) return { cardWidth: '100%', marginHorizontal: 0 };
    if (isTablet) return { cardWidth: '48%', marginHorizontal: 12 };
    return { cardWidth: '32%', marginHorizontal: 12 };
  }, [isMobile, isTablet, isDesktop]);
}

/**
 * Padding e margin responsivos
 */
export function useResponsivePadding() {
  const { isMobile, isTablet, isDesktop } = useResponsiveLayout();

  return useMemo(() => {
    if (isMobile) return { paddingHorizontal: 16, paddingVertical: 12 };
    if (isTablet) return { paddingHorizontal: 24, paddingVertical: 16 };
    return { paddingHorizontal: 40, paddingVertical: 20 };
  }, [isMobile, isTablet, isDesktop]);
}

/**
 * Tamanho de fonte responsivo
 */
export function useResponsiveFontSize(baseMobile) {
  const { isMobile, isTablet } = useResponsiveLayout();

  return useMemo(() => {
    if (isMobile) return baseMobile;
    if (isTablet) return baseMobile * 1.1;
    return baseMobile * 1.2;
  }, [isMobile, isTablet, baseMobile]);
}

/**
 * Layout para seções principais (header, conteúdo, etc)
 */
export function useMainLayoutDimensions() {
  const { width, isDesktop, isMobile } = useResponsiveLayout();

  return useMemo(() => {
    if (isDesktop) {
      return {
        containerWidth: Math.min(width, 1400),
        contentWidth: Math.min(width - 80, 1320),
        headerHeight: 64,
        sidebarWidth: 280,
      };
    }
    if (isMobile) {
      return {
        containerWidth: width,
        contentWidth: width - 32,
        headerHeight: 56,
        sidebarWidth: 0,
      };
    }
    return {
      containerWidth: width,
      contentWidth: width - 48,
      headerHeight: 60,
      sidebarWidth: 240,
    };
  }, [width, isDesktop, isMobile]);
}

/**
 * Layout para seção de transações
 */
export function useTransactionListLayout() {
  const { isMobile, isTablet, isDesktop } = useResponsiveLayout();

  return useMemo(() => {
    if (isMobile) {
      return {
        containerPadding: 16,
        rowHeight: 'auto',
        columns: 1,
      };
    }
    if (isTablet) {
      return {
        containerPadding: 24,
        rowHeight: 70,
        columns: 2,
      };
    }
    return {
      containerPadding: 40,
      rowHeight: 70,
      columns: 3,
    };
  }, [isMobile, isTablet, isDesktop]);
}
