import { useState, useEffect } from 'react';

/**
 * Custom Hook to manage RoadSense AI Appearance:
 * Options: 'light' | 'dark' | 'system'
 */
export function useAppearance() {
  const [appearance, setAppearance] = useState(() => {
    return localStorage.getItem('roadsense_appearance') || 'system';
  });

  const applyTheme = (themeOption) => {
    let effectiveTheme = themeOption;
    if (themeOption === 'system') {
      effectiveTheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    }
    document.documentElement.setAttribute('data-theme', effectiveTheme);
  };

  useEffect(() => {
    applyTheme(appearance);
    localStorage.setItem('roadsense_appearance', appearance);

    if (appearance === 'system') {
      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
      const handleChange = () => applyTheme('system');
      mediaQuery.addEventListener('change', handleChange);
      return () => mediaQuery.removeEventListener('change', handleChange);
    }
  }, [appearance]);

  return [appearance, setAppearance];
}
