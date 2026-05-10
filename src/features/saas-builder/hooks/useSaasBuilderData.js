import { useEffect, useMemo, useState } from 'react';
import {
  getAuditLogs,
  getBuilder,
  getEvents,
  getTemplates
} from '../saasBuilderApi.js';

export default function useSaasBuilderData(initialEventId = '1') {
  const [templates, setTemplates] = useState([]);
  const [events, setEvents] = useState([]);
  const [builder, setBuilder] = useState(null);
  const [auditLogs, setAuditLogs] = useState([]);
  const [eventId, setEventId] = useState(initialEventId);
  const [settings, setSettings] = useState({});
  const [status, setStatus] = useState('Loading builder...');

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
    refresh(initialEventId).catch((err) => setStatus(err.message));
  }, []);

  const activeEvent = builder?.event;

  const templateSummary = useMemo(() => {
    return templates.map((template) => `${template.name}: ${template.rounds?.length || 0} round(s)`).join(' • ');
  }, [templates]);

  return {
    templates,
    events,
    builder,
    auditLogs,
    eventId,
    setEventId,
    settings,
    setSettings,
    status,
    setStatus,
    refresh,
    activeEvent,
    templateSummary
  };
}
