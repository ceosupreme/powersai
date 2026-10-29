/** Public voice callers may supply audio and tool acknowledgements. Session
 * policy, model, tools and output limits remain server-owned. */
export function publicVoiceEvent(raw: unknown): string | null {
  if (typeof raw !== 'string' || raw.length > 131_072) return null;
  let event: Record<string, unknown>;
  try { event = JSON.parse(raw); } catch { return null; }
  if (!event || typeof event !== 'object') return null;
  switch (event.type) {
    case 'input_audio_buffer.append':
      if (typeof event.audio !== 'string' || !/^[A-Za-z0-9+/=]*$/.test(event.audio)) return null;
      return JSON.stringify({ type: event.type, audio: event.audio });
    case 'input_audio_buffer.commit':
    case 'input_audio_buffer.clear':
    case 'response.cancel':
      return JSON.stringify({ type: event.type });
    case 'response.create':
      return JSON.stringify({ type: event.type, response: { modalities: ['text', 'audio'], max_output_tokens: 600 } });
    case 'conversation.item.create': {
      const item = event.item as Record<string, unknown> | undefined;
      if (!item || item.type !== 'function_call_output' || typeof item.call_id !== 'string' || item.call_id.length > 200
        || typeof item.output !== 'string' || item.output.length > 4000) return null;
      return JSON.stringify({ type: event.type, item: { type: item.type, call_id: item.call_id, output: item.output } });
    }
    default: return null;
  }
}
