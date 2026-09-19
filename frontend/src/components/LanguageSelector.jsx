import { useState, useEffect } from 'react';

const LanguageSelector = ({ variant = 'floating', positionClass = 'top-5 right-6' }) => {
  const [currentLang, setCurrentLang] = useState(localStorage.getItem('user_lang') || 'ar');

  // Apply document direction and language layout
  useEffect(() => {
    if (currentLang === 'ar') {
      document.documentElement.dir = 'rtl';
      document.documentElement.lang = 'ar';
    } else {
      document.documentElement.dir = 'ltr';
      document.documentElement.lang = 'en';
    }
  }, [currentLang]);

  // Set default language to Arabic on first load
  useEffect(() => {
    if (!localStorage.getItem('user_lang')) {
      localStorage.setItem('user_lang', 'ar');
      const setCookie = (name, value, days) => {
        let expires = "";
        if (days) {
          const date = new Date();
          date.setTime(date.getTime() + (days * 24 * 60 * 60 * 1000));
          expires = "; expires=" + date.toUTCString();
        }
        document.cookie = name + "=" + (value || "") + expires + "; path=/;";
        const hostParts = window.location.hostname.split('.');
        if (hostParts.length > 1) {
          const domain = hostParts.slice(-2).join('.');
          document.cookie = name + "=" + (value || "") + expires + "; path=/; domain=." + domain + ";";
        }
      };
      setCookie('googtrans', '/en/ar', 365);
    }
  }, []);

  // Keep checking if translation needs to be triggered on mount/load
  useEffect(() => {
    const applyTranslation = () => {
      const selectEl = document.querySelector('.goog-te-combo');
      if (selectEl) {
        const expectedVal = currentLang === 'ar' ? 'ar' : 'en';
        if (selectEl.value !== expectedVal) {
          selectEl.value = expectedVal;
          selectEl.dispatchEvent(new Event('change'));
        }
      }
    };

    // Apply translation once immediately and once after brief load window
    applyTranslation();
    const t1 = setTimeout(applyTranslation, 500);
    const t2 = setTimeout(applyTranslation, 1500);

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, [currentLang]);

  const toggleLanguage = () => {
    const nextLang = currentLang === 'en' ? 'ar' : 'en';
    
    // Set googtrans cookie just in case Google Translate uses it internally
    const clearCookie = (name) => {
      document.cookie = name + '=; Path=/; Expires=Thu, 01 Jan 1970 00:00:01 GMT;';
      document.cookie = name + '=; Path=/; Expires=Thu, 01 Jan 1970 00:00:01 GMT; Domain=' + window.location.hostname + ';';
      const hostParts = window.location.hostname.split('.');
      if (hostParts.length > 1) {
        const domain = hostParts.slice(-2).join('.');
        document.cookie = name + '=; Path=/; Expires=Thu, 01 Jan 1970 00:00:01 GMT; Domain=.' + domain + ';';
      }
    };

    const setCookie = (name, value, days) => {
      let expires = "";
      if (days) {
        const date = new Date();
        date.setTime(date.getTime() + (days * 24 * 60 * 60 * 1000));
        expires = "; expires=" + date.toUTCString();
      }
      document.cookie = name + "=" + (value || "") + expires + "; path=/;";
      const hostParts = window.location.hostname.split('.');
      if (hostParts.length > 1) {
        const domain = hostParts.slice(-2).join('.');
        document.cookie = name + "=" + (value || "") + expires + "; path=/; domain=." + domain + ";";
      }
    };

    clearCookie('googtrans');
    if (nextLang === 'ar') {
      setCookie('googtrans', '/en/ar', 365);
    } else {
      setCookie('googtrans', '/en/en', 365);
    }

    localStorage.setItem('user_lang', nextLang);
    setCurrentLang(nextLang);
  };

  if (variant === 'floating') {
    return (
      <button
        onClick={toggleLanguage}
        className={`fixed ${positionClass} z-[9999] flex items-center gap-2 px-4 py-2.5 bg-white text-gray-800 font-bold rounded-full shadow-lg border border-gray-200 hover:scale-105 transition-all duration-200 text-sm no-print`}
        style={{ direction: 'ltr' }}
      >
        <span>🌐</span>
        <span>{currentLang === 'en' ? 'العربية' : 'English'}</span>
      </button>
    );
  }

  return (
    <button
      onClick={toggleLanguage}
      className="flex items-center gap-2 px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold rounded-lg transition-colors text-xs no-print w-full justify-center"
      style={{ direction: 'ltr' }}
    >
      <span>🌐</span>
      <span>{currentLang === 'en' ? 'العربية' : 'English'}</span>
    </button>
  );
};

export default LanguageSelector;
