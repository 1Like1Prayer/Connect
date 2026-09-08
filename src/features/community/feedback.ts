import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'

export type AttendanceFeedback = 'all' | 'no-show'

interface CommunityFeedback {
  attendance: Record<string, AttendanceFeedback>
  saveAttendance: (profileId: string, connectId: string, value: AttendanceFeedback) => void
}

export const useCommunityFeedback = create<CommunityFeedback>()(persist(set => ({
  attendance: {},
  saveAttendance: (profileId, connectId, value) => set(state => ({
    attendance: { ...state.attendance, [`${profileId}:${connectId}`]: value },
  })),
}), {
  name: 'connect-community-feedback-v2',
  storage: createJSONStorage(() => sessionStorage),
}))
