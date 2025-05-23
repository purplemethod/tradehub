import React from 'react';
import { useNotification } from '../context/NotificationContext';

export const NotificationPreferences: React.FC = () => {
  const { preferences, updatePreferences, showNotification } = useNotification();

  const handleSoundToggle = () => {
    updatePreferences({ soundEnabled: !preferences.soundEnabled });
  };

  const handleDurationChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const duration = parseInt(e.target.value);
    if (!isNaN(duration) && duration >= 1000 && duration <= 10000) {
      updatePreferences({ defaultDuration: duration });
    }
  };

  const handleMaxNotificationsChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const max = parseInt(e.target.value);
    if (!isNaN(max) && max >= 1 && max <= 10) {
      updatePreferences({ maxNotifications: max });
    }
  };

  const handlePreview = () => {
    showNotification('This is a preview notification', 'info');
  };

  return (
    <div className="bg-white rounded-lg shadow p-6 max-w-md mx-auto">
      <h2 className="text-lg font-medium text-gray-900 mb-4">Notification Settings</h2>
      
      <div className="space-y-6">
        {/* Sound Toggle */}
        <div className="flex items-center justify-between">
          <div>
            <label htmlFor="sound-toggle" className="text-sm font-medium text-gray-700">
              Sound Effects
            </label>
            <p className="text-sm text-gray-500">Play sounds when notifications appear</p>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={preferences.soundEnabled}
            onClick={handleSoundToggle}
            className={`${
              preferences.soundEnabled ? 'bg-blue-600' : 'bg-gray-200'
            } relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2`}
          >
            <span
              className={`${
                preferences.soundEnabled ? 'translate-x-6' : 'translate-x-1'
              } inline-block h-4 w-4 transform rounded-full bg-white transition-transform`}
            />
          </button>
        </div>

        {/* Duration Slider */}
        <div>
          <label htmlFor="duration-slider" className="text-sm font-medium text-gray-700">
            Notification Duration
          </label>
          <div className="mt-2 flex items-center space-x-4">
            <input
              type="range"
              id="duration-slider"
              min="1000"
              max="10000"
              step="500"
              value={preferences.defaultDuration}
              onChange={handleDurationChange}
              className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
            />
            <span className="text-sm text-gray-500 min-w-[60px]">
              {preferences.defaultDuration / 1000}s
            </span>
          </div>
          <p className="mt-1 text-sm text-gray-500">
            How long notifications stay visible
          </p>
        </div>

        {/* Max Notifications Slider */}
        <div>
          <label htmlFor="max-notifications-slider" className="text-sm font-medium text-gray-700">
            Maximum Notifications
          </label>
          <div className="mt-2 flex items-center space-x-4">
            <input
              type="range"
              id="max-notifications-slider"
              min="1"
              max="10"
              step="1"
              value={preferences.maxNotifications}
              onChange={handleMaxNotificationsChange}
              className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
            />
            <span className="text-sm text-gray-500 min-w-[30px]">
              {preferences.maxNotifications}
            </span>
          </div>
          <p className="mt-1 text-sm text-gray-500">
            Maximum number of notifications shown at once
          </p>
        </div>

        {/* Preview Button */}
        <div className="pt-4">
          <button
            type="button"
            onClick={handlePreview}
            className="w-full px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            Preview Notificação
          </button>
        </div>
      </div>
    </div>
  );
}; 