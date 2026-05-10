import {
  createContestant,
  deleteContestant,
  updateContestant
} from '../saasBuilderApi.js';

export default function useContestantActions({
  eventId,
  contestantForm,
  setContestantForm,
  refresh,
  setSaving,
  setStatus
}) {
  async function addContestant() {
    setSaving(true);
    setStatus('Adding contestant...');

    try {
      await createContestant(eventId, {
        contestantNumber: Number(contestantForm.contestantNumber),
        name: contestantForm.name,
        photoUrl: contestantForm.photoUrl || null,
        details: {}
      });
      setContestantForm({ contestantNumber: '', name: '', photoUrl: '' });
      await refresh(eventId);
      setStatus('Contestant added');
    } catch (err) {
      setStatus(err.message);
    } finally {
      setSaving(false);
    }
  }

  async function renameContestant(contestant) {
    const nextName = window.prompt('New contestant name:', contestant.name);

    if (!nextName) {
      return;
    }

    setSaving(true);
    setStatus('Updating contestant...');

    try {
      await updateContestant(eventId, contestant.id, { name: nextName });
      await refresh(eventId);
      setStatus('Contestant updated');
    } catch (err) {
      setStatus(err.message);
    } finally {
      setSaving(false);
    }
  }

  async function removeContestant(contestant) {
    if (!window.confirm(`Delete ${contestant.name}?`)) {
      return;
    }

    setSaving(true);
    setStatus('Deleting contestant...');

    try {
      await deleteContestant(eventId, contestant.id);
      await refresh(eventId);
      setStatus('Contestant deleted');
    } catch (err) {
      setStatus(err.message);
    } finally {
      setSaving(false);
    }
  }

  return {
    addContestant,
    renameContestant,
    removeContestant
  };
}
