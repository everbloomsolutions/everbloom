import en from './en.json';
import es from './es.json';

const translations = {
  en,
  es,
};

export const getCurrentLanguage = () => {
  return localStorage.getItem('language') || 'en';
};

export const setLanguage = (lang) => {
  localStorage.setItem('language', lang);
};

export const t = (key) => {
  const lang = getCurrentLanguage();
  const keys = key.split('.');
  let value = translations[lang];

  for (const k of keys) {
    value = value?.[k];
  }

  return value || key;
};

export default translations;
