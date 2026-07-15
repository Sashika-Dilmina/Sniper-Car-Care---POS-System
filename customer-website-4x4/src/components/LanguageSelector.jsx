import { useState, useEffect } from 'react';

const LanguageSelector = ({ variant = 'floating', positionClass = 'bottom-6 right-6' }) => {
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
          position: static !important;
        }
        .goog-te-banner-frame,
        .goog-te-banner-frame.skiptranslate,
        iframe.goog-te-banner-frame,
        iframe.goog-te-banner-frame.skiptranslate,
        .goog-te-gadget-simple, 
        .goog-te-balloon-frame,
        .goog-te-banner,
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

    // Enforce body top layout correction to defeat Google's top: 40px injection
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
    const interval = setInterval(fixGoogleLayout, 300);
    return () => clearInterval(interval);
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
