import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { behaviorKey, type BehaviorVisibility } from '../config/behaviorCategories';
interface State {
  visibility: BehaviorVisibility;
  setVisible: (category: string, visible: boolean) => void;
}
/** Presentation preference only; acquisition, zone alarms and learning stay active. */
export const useBehaviorVisibilityStore = create<State>()(persist(set => ({
  visibility: {},
  setVisible: (category, visible) => set(state => ({ visibility: { ...state.visibility, [behaviorKey(category)]: visible } })),
}), { name: 'radar-behavior-visibility', version: 1 }));
