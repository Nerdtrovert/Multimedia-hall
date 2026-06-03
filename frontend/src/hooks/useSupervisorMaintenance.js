import { useCallback, useEffect, useState } from 'react';
import { toast } from 'react-toastify';
import {
  clearActionLogs,
  downloadActionLogs,
  getSupervisorResetTargets,
  supervisorResetOperationalData,
  supervisorResetUserEmail,
} from '../utils/api';
import { triggerBlobDownload } from '../utils/downloadHelpers';
import {
  getActionLogFilename,
  normalizeResetTargets,
} from '../utils/supervisorMaintenance';

const ACTION_LOG_CONTENT_TYPE = 'text/plain;charset=utf-8';

const updateSelectedTargetEmail = (targets, username, email) =>
  targets.map((target) =>
    target.username === username ? { ...target, email: email.trim() } : target,
  );

export const useSupervisorMaintenance = ({
  enabled = true,
  prioritizeAdmins = false,
  onOperationalReset,
} = {}) => {
  const [downloadingLogs, setDownloadingLogs] = useState(false);
  const [clearingLogs, setClearingLogs] = useState(false);
  const [resettingDb, setResettingDb] = useState(false);
  const [emailResetForm, setEmailResetForm] = useState({ username: '', email: '' });
  const [resetTargets, setResetTargets] = useState([]);
  const [totalUsers, setTotalUsers] = useState(null);
  const [updatingEmail, setUpdatingEmail] = useState(false);

  const loadResetTargets = useCallback(async () => {
    const response = await getSupervisorResetTargets();
    const payload = response?.data;

    setResetTargets(
      normalizeResetTargets(payload, { prioritizeAdmins }),
    );
    setTotalUsers(typeof payload?.totalUsers === 'number' ? payload.totalUsers : null);
  }, [prioritizeAdmins]);

  useEffect(() => {
    if (!enabled) return;

    loadResetTargets().catch((err) => {
      toast.error(err.response?.data?.message || 'Unable to load usernames for reset.');
    });
  }, [enabled, loadResetTargets]);

  const handleDownloadActionLogs = useCallback(async () => {
    setDownloadingLogs(true);
    try {
      const response = await downloadActionLogs();
      triggerBlobDownload(response.data, getActionLogFilename(), ACTION_LOG_CONTENT_TYPE);
      toast.success('Action log downloaded.');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Unable to download action log.');
    } finally {
      setDownloadingLogs(false);
    }
  }, []);

  const handleClearActionLogs = useCallback(async () => {
    const confirmed = window.confirm('This will permanently clear the action log file. Continue?');
    if (!confirmed) return;

    setClearingLogs(true);
    try {
      const response = await clearActionLogs();
      toast.success(response.data?.message || 'Action logs cleared.');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Unable to clear action logs.');
    } finally {
      setClearingLogs(false);
    }
  }, []);

  const handleSupervisorDbReset = useCallback(async () => {
    const confirmed = window.confirm(
      'This will permanently clear bookings, reports, logs, and other runtime data. Users will be preserved. Continue?'
    );
    if (!confirmed) return;

    setResettingDb(true);
    try {
      const response = await supervisorResetOperationalData();
      toast.success(response.data?.message || 'Operational data reset complete.');
      await onOperationalReset?.();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Unable to reset operational data.');
    } finally {
      setResettingDb(false);
    }
  }, [onOperationalReset]);

  const handleSupervisorEmailReset = useCallback(async (event) => {
    event.preventDefault();
    setUpdatingEmail(true);
    try {
      const response = await supervisorResetUserEmail(
        emailResetForm.username,
        emailResetForm.email,
      );
      toast.success(response.data?.message || 'Temporary password issued successfully.');
      setResetTargets((prev) =>
        updateSelectedTargetEmail(prev, emailResetForm.username, emailResetForm.email),
      );
      setEmailResetForm({ username: '', email: '' });
    } catch (err) {
      toast.error(err.response?.data?.message || 'Unable to update user email.');
    } finally {
      setUpdatingEmail(false);
    }
  }, [emailResetForm.email, emailResetForm.username]);

  return {
    downloadingLogs,
    clearingLogs,
    resettingDb,
    emailResetForm,
    setEmailResetForm,
    resetTargets,
    totalUsers,
    updatingEmail,
    handleDownloadActionLogs,
    handleClearActionLogs,
    handleSupervisorDbReset,
    handleSupervisorEmailReset,
  };
};
