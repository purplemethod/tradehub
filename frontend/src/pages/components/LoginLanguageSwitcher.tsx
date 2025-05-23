import React from 'react';
import { useTranslation } from 'react-i18next';

const LoginLanguageSwitcher: React.FC = () => {
  const { i18n } = useTranslation();

  const languages = [
    { code: 'en', name: 'English', flag: '🇺🇸' },
    { code: 'pt', name: 'Português', flag: '🇵🇹' },
  ];

  return (
    <div className="flex items-center space-x-2 bg-white rounded-lg shadow-sm p-1">
      {languages.map((lang) => (
        <button
          key={lang.code}
          onClick={() => i18n.changeLanguage(lang.code)}
          className={`flex items-center space-x-2 px-3 py-2 rounded-md transition-all duration-200 ${
            i18n.language === lang.code
              ? 'bg-indigo-50 text-indigo-600'
              : 'text-gray-600 hover:bg-gray-50'
          }`}
        >
          <span className="text-lg">{lang.flag}</span>
          <span className="text-sm font-medium">{lang.name}</span>
        </button>
      ))}
    </div>
  );
};

export default LoginLanguageSwitcher; 