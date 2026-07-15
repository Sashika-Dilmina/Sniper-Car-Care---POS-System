import { useState, useEffect } from 'react';

const LanguageSelector = ({ variant = 'floating' }) => {
  const [currentLang, setCurrentLang] = useState('en');

  useEffect(() => {
    const getCookie = (name) => {
      const value = `; ${document.cookie}`;
      const parts = value.split(`; ${name}=`);
      if (parts.length === 2) return parts.pop().split(';').shift();
      return null;
    };
    
    const transCookie = getCookie('googtrans');
    if (transCookie === '/en/ar') {
      setCurrentLang('ar');
      document.documentElement.dir = 'rtl';
      document.documentElement.lang = 'ar';
    } else {
      setCurrentLang('en');
      document.documentElement.dir = 'ltr';
      document.documentElement.lang = 'en';
    }

    // Inject Google Translate elements and styles
    const styleId = 'google-translate-custom-styles';
    if (!document.getElementById(styleId)) {
      const style = document.createElement('style');
      style.id = styleId;
      style.innerHTML = `
        body {
          top: 0px !important;
        }
        .goog-te-banner-frame.skiptranslate, 
        .goog-te-gadget-simple, 
        .goog-te-balloon-frame,
        .goog-te-banner,
        iframe.goog-te-banner-frame,
        iframe.goog-te-menu-frame,
        .goog-te-menu-value {
          display: none !important;
          visibility: hidden !important;
        }
        .goog-text-highlight {
          background: none !important;
          box-shadow: none !important;
        }
        #goog-gt-tt, .goog-te-spinner-pos {
          display: none !important;
          visibility: hidden !important;
        }
        #google_translate_element {
          display: none !important;
        }
      `;
      document.head.appendChild(style);
    }

    const divId = 'google_translate_element';
    if (!document.getElementById(divId)) {
      const div = document.createElement('div');
      div.id = divId;
      div.style.display = 'none';
      document.body.appendChild(div);
    }

    window.googleTranslateElementInit = () => {
      new window.google.translate.TranslateElement({
        pageLanguage: 'en',
        includedLanguages: 'en,ar',
        autoDisplay: false
      }, 'google_translate_element');
    };

    const scriptId = 'google-translate-script';
    if (!document.getElementById(scriptId)) {
      const script = document.createElement('script');
      script.id = scriptId;
      script.type = 'text/javascript';
      script.src = '//translate.google.com/translate_a/element.js?cb=googleTranslateElementInit';
      document.body.appendChild(script);
    }
  }, []);

  const toggleLanguage = () => {
    const nextLang = currentLang === 'en' ? 'ar' : 'en';
    const cookieValue = nextLang === 'ar' ? '/en/ar' : '/en/en';
    
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

    setCookie('googtrans', cookieValue, 365);
    window.location.reload();
  };

  if (variant === 'floating') {
    return (
      <button
        onClick={toggleLanguage}
        className="fixed bottom-6 right-6 z-[9999] flex items-center gap-2 px-4 py-2.5 bg-white text-gray-800 font-bold rounded-full shadow-lg border border-gray-200 hover:scale-105 transition-all duration-200 text-sm no-print"
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
