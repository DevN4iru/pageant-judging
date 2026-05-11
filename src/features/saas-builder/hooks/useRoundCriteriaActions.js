import { useState } from 'react';
import {
  createCriterion,
  createRound,
  deleteCriterion,
  deleteRound,
  updateCriterion,
  updateRound
} from '../saasBuilderApi.js';

export default function useRoundCriteriaActions({
  eventId,
  roundForm,
  setRoundForm,
  builder,
  refresh,
  setSaving,
  setStatus
}) {
  const [criterionForms, setCriterionForms] = useState({});

  function getBalancedWeights(criteria) {
    const count = criteria.length;

    if (count === 0) {
      return [];
    }

    const base = Math.floor((1 / count) * 1000000) / 1000000;
    const weights = Array(count).fill(base);
    weights[count - 1] = Number((1 - base * (count - 1)).toFixed(6));

    return weights;
  }

  async function autoBalanceRound(round, criteria = round.criteria) {
    const weights = getBalancedWeights(criteria);

    await Promise.all(
      criteria.map((criterion, index) =>
        updateCriterion(eventId, round.id, criterion.id, {
          weight: weights[index]
        })
      )
    );
  }

  async function autoBalanceRoundFromButton(round) {
    setSaving(true);
    setStatus('Auto-calculating weights...');

    try {
      await autoBalanceRound(round);
      await refresh(eventId);
      setStatus('Round weights auto-calculated to 100%');
    } catch (err) {
      setStatus(err.message);
    } finally {
      setSaving(false);
    }
  }

  function updateCriterionForm(roundId, patch) {
    setCriterionForms((current) => ({
      ...current,
      [roundId]: {
        name: '',
        weightPercent: '',
        sortOrder: '',
        ...(current[roundId] || {}),
        ...patch
      }
    }));
  }

  async function addRound() {
    setSaving(true);
    setStatus('Adding round...');

    try {
      await createRound(eventId, {
        name: roundForm.name,
        sortOrder: Number(roundForm.sortOrder || builder.rounds.length + 1),
        candidatePoolMode: roundForm.candidatePoolMode,
        advancingCount: roundForm.advancingCount === '' ? null : Number(roundForm.advancingCount),
        scoreCarryMode: roundForm.scoreCarryMode
      });

      setRoundForm({
        name: '',
        sortOrder: '',
        candidatePoolMode: 'all_contestants',
        advancingCount: '',
        scoreCarryMode: 'qualifier_only'
      });

      await refresh(eventId);
      setStatus('Round added');
    } catch (err) {
      setStatus(err.message);
    } finally {
      setSaving(false);
    }
  }

  async function renameRound(round) {
    const nextName = window.prompt('New round name:', round.name);

    if (!nextName) {
      return;
    }

    setSaving(true);
    setStatus('Updating round...');

    try {
      await updateRound(eventId, round.id, { name: nextName });
      await refresh(eventId);
      setStatus('Round updated');
    } catch (err) {
      setStatus(err.message);
    } finally {
      setSaving(false);
    }
  }

  async function toggleRoundLock(round) {
    setSaving(true);
    setStatus(round.is_locked ? 'Unlocking round...' : 'Locking round...');

    try {
      await updateRound(eventId, round.id, { isLocked: !round.is_locked });
      await refresh(eventId);
      setStatus(round.is_locked ? 'Round unlocked' : 'Round locked');
    } catch (err) {
      setStatus(err.message);
    } finally {
      setSaving(false);
    }
  }

  async function removeRound(round) {
    if (!window.confirm(`Delete ${round.name}? Criteria inside this round will also be deleted.`)) {
      return;
    }

    setSaving(true);
    setStatus('Deleting round...');

    try {
      await deleteRound(eventId, round.id);
      await refresh(eventId);
      setStatus('Round deleted');
    } catch (err) {
      setStatus(err.message);
    } finally {
      setSaving(false);
    }
  }

  async function addCriterion(round) {
    const form = criterionForms[round.id] || {};
    const nextCount = round.criteria.length + 1;
    const initialWeight = form.weightPercent
      ? Number(form.weightPercent) / 100
      : 1 / nextCount;

    setSaving(true);
    setStatus('Adding criterion and auto-calculating weights...');

    try {
      const result = await createCriterion(eventId, round.id, {
        name: form.name,
        weight: initialWeight,
        sortOrder: Number(form.sortOrder || nextCount)
      });

      await autoBalanceRound(round, [...round.criteria, result.criterion]);

      updateCriterionForm(round.id, { name: '', weightPercent: '', sortOrder: '' });
      await refresh(eventId);
      setStatus('Criterion added and weights auto-calculated to 100%');
    } catch (err) {
      setStatus(err.message);
    } finally {
      setSaving(false);
    }
  }

  async function editCriterion(round, criterion) {
    const nextName = window.prompt('Criterion name:', criterion.name);

    if (!nextName) {
      return;
    }

    const nextWeight = window.prompt('Weight percent:', String(Number(criterion.weight) * 100));

    if (!nextWeight) {
      return;
    }

    setSaving(true);
    setStatus('Updating criterion...');

    try {
      await updateCriterion(eventId, round.id, criterion.id, {
        name: nextName,
        weight: Number(nextWeight) / 100
      });

      await refresh(eventId);
      setStatus('Criterion updated');
    } catch (err) {
      setStatus(err.message);
    } finally {
      setSaving(false);
    }
  }

  async function removeCriterion(round, criterion) {
    if (!window.confirm(`Delete ${criterion.name}?`)) {
      return;
    }

    setSaving(true);
    setStatus('Deleting criterion...');

    try {
      await deleteCriterion(eventId, round.id, criterion.id);
      await refresh(eventId);
      setStatus('Criterion deleted');
    } catch (err) {
      setStatus(err.message);
    } finally {
      setSaving(false);
    }
  }

  return {
    criterionForms,
    updateCriterionForm,
    addRound,
    renameRound,
    autoBalanceRoundFromButton,
    toggleRoundLock,
    removeRound,
    addCriterion,
    editCriterion,
    removeCriterion
  };
}
