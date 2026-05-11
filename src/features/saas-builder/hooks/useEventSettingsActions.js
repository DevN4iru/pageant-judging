import { updateEventSettings } from '../saasBuilderApi.js';

export default function useEventSettingsActions({
  eventId,
  settings,
  refresh,
  setSaving,
  setStatus
}) {
  async function saveSettings() {
    setSaving(true);
    setStatus('Saving settings...');

    try {
      await updateEventSettings(eventId, {
        ...settings,
        advancingCount: Number(settings.advancingCount)
      });
      await refresh(eventId);
      setStatus('Event settings saved');
    } catch (err) {
      setStatus(err.message);
    } finally {
      setSaving(false);
    }
  }

  return {
    saveSettings
  };
}
