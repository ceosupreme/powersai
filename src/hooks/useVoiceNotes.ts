import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';

interface SaveVoiceNoteParams {
  barId: string;
  transcript: string;
}

export function useSaveVoiceNote() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ barId, transcript }: SaveVoiceNoteParams) => {
      if (!user) throw new Error('Not authenticated');

      const { data, error } = await supabase
        .from('voice_notes')
        .insert({
          bar_id: barId,
          created_by: user.id,
          transcript,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['voice-notes'] });
    },
  });
}

// Hook for transcribing audio via edge function
export function useTranscribeAudio() {
  return useMutation({
    mutationFn: async (audioBlob: Blob): Promise<string> => {
      const formData = new FormData();
      formData.append('audio', audioBlob, 'recording.webm');

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/transcribe-audio`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
          },
          body: formData,
        }
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Transcription failed');
      }

      const data = await response.json();
      return data.transcript;
    },
  });
}
