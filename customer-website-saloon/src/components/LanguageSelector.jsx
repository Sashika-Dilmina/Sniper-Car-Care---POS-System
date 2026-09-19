import { useState, useEffect } from 'react';

const LanguageSelector = ({ variant = 'floating', positionClass = 'bottom-6 right-6' }) => {
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

    // Try applying translation immediately and periodically
    applyTranslation();
    const interval = setInterval(applyTranslation, 500);

    // Periodically enforce body top layout correction to defeat Google's top: 40px injection
    const fixGoogleLayout = () => {
      if (document.body && document.body.style.top !== '0px') {
        document.body.style.top = '0px';
      }
      if (document.body && document.body.style.position !== 'static') {
        document.body.style.position = 'static';
      }
      const frames = document.getElementsByClassName('goog-te-banner-frame');
      for (let i = 0; i < frames.length; i++) {
        frames[i].style.display = 'none';
        frames[i].style.visibility = 'hidden';
      }
      const iframes = document.getElementsByTagName('iframe');
      for (let i = 0; i < iframes.length; i++) {
        if (iframes[i].className.includes('goog-te-banner-frame') || iframes[i].id.includes('goog-te-banner-frame')) {
          iframes[i].style.display = 'none';
          iframes[i].style.visibility = 'hidden';
        }
      }
    };
    const layoutInterval = setInterval(fixGoogleLayout, 300);

    return () => {
      clearInterval(interval);
      clearInterval(layoutInterval);
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
