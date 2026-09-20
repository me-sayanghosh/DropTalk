import React from 'react';
import Protected from '../../../shared/components/Protected';
import SettingsPage from '../../../features/profile/pages/SettingsPage';

export default function SettingsSectionPage() {
  return (
    <Protected>
      <SettingsPage />
    </Protected>
  );
}
