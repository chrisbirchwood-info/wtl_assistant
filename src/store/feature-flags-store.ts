import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export type FeatureFlags = {
  breadcrumbsEnabled: boolean
}

type FeatureFlagsState = {
  flags: FeatureFlags
  setFlag: <K extends keyof FeatureFlags>(key: K, value: FeatureFlags[K]) => void
  toggleFlag: (key: keyof FeatureFlags) => void
  resetDefaults: () => void
}

const DEFAULT_FLAGS: FeatureFlags = {
  breadcrumbsEnabled: true,
}

export const useFeatureFlagsStore = create<FeatureFlagsState>()(
  persist(
    (set, get) => ({
      flags: DEFAULT_FLAGS,
      setFlag: (key, value) => set((state) => ({ flags: { ...state.flags, [key]: value } })),
      toggleFlag: (key) => set((state) => ({ flags: { ...state.flags, [key]: !state.flags[key] } })),
      resetDefaults: () => set({ flags: DEFAULT_FLAGS }),
    }),
    {
      name: 'wtl-feature-flags',
      partialize: (state) => ({ flags: state.flags }),
    }
  )
)

