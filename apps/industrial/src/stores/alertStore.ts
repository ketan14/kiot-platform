import { create } from 'zustand';
import { Incident } from '@kiot/shared-types';

interface AlertState {
  activeAlarm: Incident | null;
  isDismissed: boolean;
  setActiveAlarm: (incident: Incident) => void;
  dismissAlarm: () => void;
  clearAlarm: () => void;
}

export const useAlertStore = create<AlertState>((set) => ({
  activeAlarm: null,
  isDismissed: false,
  setActiveAlarm: (incident) => set({ activeAlarm: incident, isDismissed: false }),
  dismissAlarm: () => set({ isDismissed: true }),
  clearAlarm: () => set({ activeAlarm: null, isDismissed: false }),
}));

