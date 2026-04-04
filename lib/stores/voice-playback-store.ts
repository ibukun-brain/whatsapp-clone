import { create } from "zustand";

interface VoicePlaybackState {
    activeAudioId: string | null;
    setActiveAudioId: (id: string | null) => void;
}

export const useVoicePlaybackStore = create<VoicePlaybackState>((set) => ({
    activeAudioId: null,
    setActiveAudioId: (id) => set({ activeAudioId: id }),
}));
