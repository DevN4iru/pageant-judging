import Section from '../components/Section.jsx';
import { input, label } from '../saasBuilderStyles.js';

export default function EventSettingsPanel({
  settings,
  setSettings,
  saving,
  saveSettings
}) {
  return (
    <Section title="Event Settings">
      <div className="saas-builder-settings-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 14 }}>
        <label style={label}>
          Event title
          <input style={input} value={settings.title} onChange={(e) => setSettings({ ...settings, title: e.target.value })} />
        </label>

        <label style={label}>
          Organization name
          <input style={input} value={settings.organizationName} onChange={(e) => setSettings({ ...settings, organizationName: e.target.value })} />
        </label>

        <label style={label}>
          Logo URL
          <input style={input} value={settings.logoUrl} onChange={(e) => setSettings({ ...settings, logoUrl: e.target.value })} />
        </label>

        <label style={label}>
          Theme color
          <input style={input} value={settings.themeColor} onChange={(e) => setSettings({ ...settings, themeColor: e.target.value })} />
        </label>

        <label style={label}>
          TV display title
          <input style={input} value={settings.tvDisplayTitle} onChange={(e) => setSettings({ ...settings, tvDisplayTitle: e.target.value })} />
        </label>

        <label style={label}>
          Top / advancing count
          <input style={input} type="number" value={settings.advancingCount} onChange={(e) => setSettings({ ...settings, advancingCount: e.target.value })} />
        </label>

        <label style={label}>
          PDF footer
          <input style={input} value={settings.pdfFooter} onChange={(e) => setSettings({ ...settings, pdfFooter: e.target.value })} />
        </label>

        <label style={label}>
          Prepared by
          <input style={input} value={settings.preparedByText} onChange={(e) => setSettings({ ...settings, preparedByText: e.target.value })} />
        </label>
      </div>

      <button
        type="button"
        disabled={saving}
        onClick={saveSettings}
        style={{ marginTop: 16, border: 0, borderRadius: 14, padding: '12px 18px', fontWeight: 900, background: saving ? '#64748b' : '#22c55e', color: 'white' }}
      >
        {saving ? 'Saving...' : 'Save Event Settings'}
      </button>
    </Section>
  );
}
