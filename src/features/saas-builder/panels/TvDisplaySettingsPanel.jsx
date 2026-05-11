import Section from '../components/Section.jsx';
import { input, label } from '../saasBuilderStyles.js';

export default function TvDisplaySettingsPanel({
  displaySettings,
  setDisplaySettings,
  saveDisplaySettings,
  saving
}) {
  return (
    <Section title="TV Display Settings">
      <div className="saas-builder-settings-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 14 }}>
        <label style={label}>
          TV title
          <input style={input} value={displaySettings.tvTitle || ''} onChange={(event) => setDisplaySettings({ ...displaySettings, tvTitle: event.target.value })} />
        </label>

        <label style={label}>
          Theme color
          <input style={input} value={displaySettings.themeColor || ''} onChange={(event) => setDisplaySettings({ ...displaySettings, themeColor: event.target.value })} />
        </label>

        <label style={label}>
          Show logos
          <select style={input} value={displaySettings.showLogos ? 'yes' : 'no'} onChange={(event) => setDisplaySettings({ ...displaySettings, showLogos: event.target.value === 'yes' })}>
            <option value="yes">Yes</option>
            <option value="no">No</option>
          </select>
        </label>

        <label style={label}>
          Show developer credits
          <select style={input} value={displaySettings.showDeveloperCredits ? 'yes' : 'no'} onChange={(event) => setDisplaySettings({ ...displaySettings, showDeveloperCredits: event.target.value === 'yes' })}>
            <option value="yes">Yes</option>
            <option value="no">No</option>
          </select>
        </label>
      </div>

      <button type="button" disabled={saving} onClick={saveDisplaySettings} style={{ marginTop: 16, border: 0, borderRadius: 14, padding: '12px 18px', fontWeight: 900, background: saving ? '#64748b' : '#22c55e', color: 'white' }}>
        Save TV Display Settings
      </button>
    </Section>
  );
}
