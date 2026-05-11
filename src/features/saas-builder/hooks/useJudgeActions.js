import {
  createJudge,
  deleteJudge,
  setJudgePin,
  updateJudge
} from '../saasBuilderApi.js';

export default function useJudgeActions({
  eventId,
  judgeForm,
  setJudgeForm,
  builder,
  refresh,
  setSaving,
  setStatus
}) {
  async function addJudge() {
    setSaving(true);
    setStatus('Adding judge...');

    try {
      const result = await createJudge(eventId, {
        name: judgeForm.name,
        displayOrder: Number(judgeForm.displayOrder || builder.judges.length + 1),
        isEnabled: true
      });

      if (judgeForm.pin) {
        await setJudgePin(eventId, result.judge.id, judgeForm.pin);
      }

      setJudgeForm({ name: '', displayOrder: '', pin: '' });
      await refresh(eventId);
      setStatus('Judge added');
    } catch (err) {
      setStatus(err.message);
    } finally {
      setSaving(false);
    }
  }

  async function toggleJudge(judge) {
    setSaving(true);
    setStatus('Updating judge...');

    try {
      await updateJudge(eventId, judge.id, { isEnabled: !judge.is_enabled });
      await refresh(eventId);
      setStatus('Judge updated');
    } catch (err) {
      setStatus(err.message);
    } finally {
      setSaving(false);
    }
  }

  async function resetJudgePin(judge) {
    const pin = window.prompt(`New PIN for ${judge.name}:`);

    if (!pin) {
      return;
    }

    setSaving(true);
    setStatus('Resetting judge PIN...');

    try {
      await setJudgePin(eventId, judge.id, pin);
      await refresh(eventId);
      setStatus('Judge PIN reset');
    } catch (err) {
      setStatus(err.message);
    } finally {
      setSaving(false);
    }
  }

  async function removeJudge(judge) {
    if (!window.confirm(`Delete ${judge.name}?`)) {
      return;
    }

    setSaving(true);
    setStatus('Deleting judge...');

    try {
      await deleteJudge(eventId, judge.id);
      await refresh(eventId);
      setStatus('Judge deleted');
    } catch (err) {
      setStatus(err.message);
    } finally {
      setSaving(false);
    }
  }

  return {
    addJudge,
    toggleJudge,
    resetJudgePin,
    removeJudge
  };
}
