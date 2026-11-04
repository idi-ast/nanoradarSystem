import { create } from 'zustand';

export type RadarConnectionStatus = 'connecting' | 'connected' | 'disconnected' | 'reconnecting';
interface ConnectionState {
  connections: Map<symbol, RadarConnectionStatus>;
  setStatus: (owner: symbol, status: RadarConnectionStatus) => void;
  remove: (owner: symbol) => void;
}
/** Runtime status only. Each existing radar socket owns and cleans its entry. */
export const useRadarConnectionStore = create<ConnectionState>(set => ({
  connections: new Map(),
  setStatus: (owner,status) => set(state => state.connections.get(owner) === status ? state : {connections:new Map(state.connections).set(owner,status)}),
  remove: owner => set(state => {
    if (!state.connections.has(owner)) return state;
    const connections = new Map(state.connections); connections.delete(owner); return {connections};
  }),
}));
