import React, { useState } from 'react';
import { Globe } from 'lucide-react';
import { useTranslation, Language } from '../i18n';

interface LanguageSelectorProps {
  isBrandTheme?: boolean;
  compact?: boolean;
}

export const LanguageSelector: React.FC<LanguageSelectorProps> = ({ 
  isBrandTheme = false,
  compact = false
}) => {
  const { language, changeLanguage, availableLanguages } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);
  
  const languageNames = {
    'pt-BR': 'Português',
    'en-US': 'English',
    'es-ES': 'Español'
  };

  const languageFlags = {
    'pt-BR': '🇧🇷',
    'en-US': '🇺🇸',
    'es-ES': '🇪🇸'
  };
  
  const themeClasses = {
    button: isBrandTheme 
      ? 'bg-gray-700 text-white hover:bg-gray-600' 
      : 'bg-white text-gray-900 hover:bg-gray-100',
    dropdown: isBrandTheme
      ? 'bg-gray-800 border-gray-700'
      : 'bg-white border-gray-200',
    option: isBrandTheme
      ? 'hover:bg-gray-700 text-white'
      : 'hover:bg-gray-100 text-gray-900',
  };

  const handleLanguageChange = (lang: Language) => {
    changeLanguage(lang);
    setIsOpen(false);
  };

  if (compact) {
    return (
      <div className="relative">
        <button
          onClick={() => setIsOpen(!isOpen)}
          className={`flex items-center space-x-1 p-2 rounded-lg transition-colors ${themeClasses.button}`}
          aria-label="Select language"
          data-testid="language-selector-compact"
        >
          <Globe className="w-4 h-4" />
          <span>{languageFlags[language as keyof typeof languageFlags]}</span>
        </button>
        
        {isOpen && (
          <>
            <div 
              className="fixed inset-0 z-10" 
              onClick={() => setIsOpen(false)}
            />
            <div className={`absolute right-0 mt-1 w-40 rounded-lg shadow-lg ${themeClasses.dropdown} border z-20`}>
              {availableLanguages.map((lang) => (
                <button
                  key={lang}
                  onClick={() => handleLanguageChange(lang)}
                  className={`flex items-center w-full px-4 py-2 text-sm ${themeClasses.option} ${
                    language === lang ? 'font-bold bg-blue-50 dark:bg-blue-900/20' : ''
                  } first:rounded-t-lg last:rounded-b-lg`}
                  data-testid={`language-option-${lang}`}
                >
                  <span className="mr-2">{languageFlags[lang as keyof typeof languageFlags]}</span>
                  {languageNames[lang as keyof typeof languageNames]}
                </button>
              ))}
            </div>
          </>
        )}
      </div>
    );
  }

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition-colors ${themeClasses.button}`}
        data-testid="language-selector-full"
      >
        <Globe className="w-5 h-5" />
        <span>{languageNames[language as keyof typeof languageNames]}</span>
        <svg className="w-4 h-4 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      
      {isOpen && (
        <>
          <div 
            className="fixed inset-0 z-10" 
            onClick={() => setIsOpen(false)}
          />
          <div className={`absolute right-0 mt-1 w-48 rounded-lg shadow-lg ${themeClasses.dropdown} border z-20`}>
            {availableLanguages.map((lang) => (
              <button
                key={lang}
                onClick={() => handleLanguageChange(lang)}
                className={`flex items-center w-full px-4 py-3 text-sm ${themeClasses.option} ${
                  language === lang ? 'font-bold bg-blue-50 dark:bg-blue-900/20' : ''
                } first:rounded-t-lg last:rounded-b-lg`}
                data-testid={`language-option-${lang}`}
              >
                <span className="text-xl mr-3">{languageFlags[lang as keyof typeof languageFlags]}</span>
                {languageNames[lang as keyof typeof languageNames]}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
};