import React, { useEffect, useMemo, useState } from 'react';
import {
  getAuditLogs,
  getBuilder,
  getEvents,
  getTemplates,
  updateEventSettings
} from './saasBuilderApi.js';

const card = {
  border: '1px solid rgba(148, 163, 184, 0.22)',
  background: 'rgba(15, 23, 42, 0.72)',
  borderRadius: 22,
  padding: 20,
  boxShadow: '0 22px 70px rgba(0,0,0,0.25)'
};

const input = {
  width: '100%',
  border: '1px solid rgba(148, 163, 184, 0.28)',
  borderRadius: 14,
  padding: '12px 14px',
  background: 'rgba(2, 6, 23, 0.66)',
  color: '#f8fafc',
  outline: 'none'
};

const label = {
  display: 'grid',
  gap: 8,
  color: '#cbd5e1',
  fontSize: 13,
  fontWeight: 700
};

function Stat({ label, value }) {
  return (
    <div style={{ ...card, padding: 16 }}>
      <div style={{ color: '#94a3b8', fontSize: 12, fontWeight: 800, textTransform: 'uppercase' }}>{label}</div>
      <div style={{ color: '#f8fafc', fontSize: 28, fontWeight: 900, marginTop: 6 }}>{value}</div>
    </div>
  );
}

function Section({ title, children }) {
  return (
    <section style={card}>
      <h2 style={{ margin: '0 0 16px', color: '#f8fafc', fontSize: 22 }}>{title}</h2>
      {children}
    </section>
  );
}

function MiniTable({ columns, rows }) {
  return (
    <div style={{ overflowX: 'auto' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', color: '#e2e8f0' }}>
        <thead>
          <tr>
            {columns.map((column) => (
              <th key={column.key} style={{ textAlign: 'left', padding: '10px 8px', color: '#94a3b8', fontSize: 12 }}>
                {column.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, index) => (
            <tr key={row.id || index} style={{ borderTop: '1px solid rgba(148, 163, 184, 0.16)' }}>
              {columns.map((column) => (
                <td key={column.key} style={{ padding: '12px 8px', fontSize: 14 }}>
                  {column.render ? column.render(row) : row[column.key]}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function SaasBuilderApp() {
  const [templates, setTemplates] = useState([]);
  const [events, setEvents] = useState([]);
  const [builder, setBuilder] = useState(null);
  const [auditLogs, setAuditLogs] = useState([]);
  const [eventId, setEventId] = useState('1');
  const [settings, setSettings] = useState({});
  const [status, setStatus] = useState('Loading builder...');
  const [saving, setSaving] = useState(false);

  async function refresh(selectedEventId = eventId) {
    setStatus('Loading builder...');

    const [templateData, eventData, builderData, auditData] = await Promise.all([
      getTemplates(),
      getEvents(),
      getBuilder(selectedEventId),
      getAuditLogs(selectedEventId)
    ]);

    setTemplates(templateData);
    setEvents(eventData);
    setBuilder(builderData);
    setAuditLogs(auditData);
    setSettings({
      title: builderData.event.title || '',
      organizationName: builderData.event.organization_name || '',
      logoUrl: builderData.event.logo_url || '',
      themeColor: builderData.event.theme_color || '',
      tvDisplayTitle: builderData.event.tv_display_title || '',
      pdfFooter: builderData.event.pdf_footer || '',
      preparedByText: builderData.event.prepared_by_text || '',
      developerCredits: builderData.event.developer_credits || '',
      advancingCount: builderData.event.advancing_count || 3,
      scoreCarryMode: builderData.event.score_carry_mode || 'qualifier_only'
    });

    setStatus('Builder loaded');
  }

  useEffect(() => {
    refresh('1').catch((err) => setStatus(err.message));
  }, []);

  const activeEvent = builder?.event;

  const templateSummary = useMemo(() => {
    return templates.map((template) => `${template.name}: ${template.rounds?.length || 0} round(s)`).join(' • ');
  }, [templates]);

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

  if (!builder) {
    return (
      <main style={{ minHeight: '100vh', background: '#020617', color: '#f8fafc', padding: 32 }}>
        <h1>SaaS Event Builder</h1>
        <p>{status}</p>
      </main>
    );
  }

  return (
    <main style={{ minHeight: '100vh', background: 'linear-gradient(135deg, #020617, #111827 45%, #3b0764)', color: '#f8fafc', padding: 28 }}>
      <div style={{ maxWidth: 1280, margin: '0 auto', display: 'grid', gap: 22 }}>
        <header style={{ ...card, display: 'grid', gap: 14 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>
            <div>
              <div style={{ color: '#f9a8d4', fontWeight: 900, textTransform: 'uppercase', letterSpacing: 1 }}>
                SaaS Event Builder
              </div>
              <h1 style={{ margin: '8px 0 0', fontSize: 34 }}>{activeEvent.title}</h1>
              <p style={{ color: '#cbd5e1', margin: '8px 0 0' }}>
                Event-builder dashboard powered by customizable SaaS tables. Legacy scoring is untouched.
              </p>
            </div>
            <button
              type="button"
              onClick={() => refresh(eventId)}
              style={{ border: 0, borderRadius: 999, padding: '12px 18px', fontWeight: 900, background: '#ec4899', color: 'white', height: 46 }}
            >
              Refresh
            </button>
          </div>
          <div style={{ color: '#94a3b8', fontSize: 13 }}>{status}</div>
          <div style={{ color: '#94a3b8', fontSize: 13 }}>{templateSummary}</div>
        </header>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', gap: 16 }}>
          <Stat label="Contestants" value={builder.contestants.length} />
          <Stat label="Judges" value={builder.judges.length} />
          <Stat label="Rounds" value={builder.rounds.length} />
          <Stat label="Templates" value={templates.length} />
        </div>

        <Section title="Event Settings">
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 14 }}>
            <label style={label}>Event title<input style={input} value={settings.title} onChange={(e) => setSettings({ ...settings, title: e.target.value })} /></label>
            <label style={label}>Organization name<input style={input} value={settings.organizationName} onChange={(e) => setSettings({ ...settings, organizationName: e.target.value })} /></label>
            <label style={label}>Logo URL<input style={input} value={settings.logoUrl} onChange={(e) => setSettings({ ...settings, logoUrl: e.target.value })} /></label>
            <label style={label}>Theme color<input style={input} value={settings.themeColor} onChange={(e) => setSettings({ ...settings, themeColor: e.target.value })} /></label>
            <label style={label}>TV display title<input style={input} value={settings.tvDisplayTitle} onChange={(e) => setSettings({ ...settings, tvDisplayTitle: e.target.value })} /></label>
            <label style={label}>Top / advancing count<input style={input} type="number" value={settings.advancingCount} onChange={(e) => setSettings({ ...settings, advancingCount: e.target.value })} /></label>
            <label style={label}>PDF footer<input style={input} value={settings.pdfFooter} onChange={(e) => setSettings({ ...settings, pdfFooter: e.target.value })} /></label>
            <label style={label}>Prepared by<input style={input} value={settings.preparedByText} onChange={(e) => setSettings({ ...settings, preparedByText: e.target.value })} /></label>
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

        <Section title="Contestants">
          <MiniTable
            columns={[
              { key: 'contestant_number', label: '#' },
              { key: 'name', label: 'Name' },
              { key: 'photo_url', label: 'Photo' },
              { key: 'is_active', label: 'Active', render: (row) => row.is_active ? 'Yes' : 'No' }
            ]}
            rows={builder.contestants}
          />
        </Section>

        <Section title="Judges">
          <MiniTable
            columns={[
              { key: 'display_order', label: 'Order' },
              { key: 'name', label: 'Name' },
              { key: 'is_enabled', label: 'Enabled', render: (row) => row.is_enabled ? 'Yes' : 'No' }
            ]}
            rows={builder.judges}
          />
        </Section>

        <Section title="Rounds & Criteria">
          <div style={{ display: 'grid', gap: 14 }}>
            {builder.rounds.map((round) => {
              const totalWeight = round.criteria.reduce((sum, criterion) => sum + Number(criterion.weight || 0), 0);
              return (
                <div key={round.id} style={{ border: '1px solid rgba(148, 163, 184, 0.18)', borderRadius: 18, padding: 16 }}>
                  <h3 style={{ margin: 0 }}>{round.name}</h3>
                  <p style={{ color: '#94a3b8', margin: '8px 0 12px' }}>
                    Pool: {round.candidate_pool_mode} • Advancing: {round.advancing_count || 'None'} • Weight total: {(totalWeight * 100).toFixed(2)}%
                  </p>
                  <MiniTable
                    columns={[
                      { key: 'sort_order', label: 'Order' },
                      { key: 'name', label: 'Criterion' },
                      { key: 'weight', label: 'Weight', render: (row) => `${(Number(row.weight) * 100).toFixed(2)}%` }
                    ]}
                    rows={round.criteria}
                  />
                </div>
              );
            })}
          </div>
        </Section>

        <Section title="Audit Logs">
          <MiniTable
            columns={[
              { key: 'created_at', label: 'Time', render: (row) => new Date(row.created_at).toLocaleString() },
              { key: 'action_type', label: 'Action' },
              { key: 'target_type', label: 'Target' },
              { key: 'reason', label: 'Reason' }
            ]}
            rows={auditLogs}
          />
        </Section>

        <footer style={{ color: '#94a3b8', textAlign: 'center', padding: 20 }}>
          Open legacy app normally. Open builder with <b>?builder=saas</b>.
        </footer>
      </div>
    </main>
  );
}
