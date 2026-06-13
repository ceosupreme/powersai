// Mention utilities for parsing and rendering @mentions in comments

export interface CommentMention {
  user_id: string;
  display_name: string;
}

/**
 * Extract mentions from comment content by matching against known team members
 */
export const extractMentions = (
  content: string,
  teamMembers: Array<{ id: string; full_name: string | null }>
): CommentMention[] => {
  const mentions: CommentMention[] = [];
  const mentionPattern = /@([A-Za-z]+(?: [A-Za-z]+)*)/g;
  let match;

  while ((match = mentionPattern.exec(content)) !== null) {
    const mentionedName = match[1];
    const member = teamMembers.find(
      (m) => m.full_name?.toLowerCase() === mentionedName.toLowerCase()
    );
    if (member && member.full_name) {
      // Avoid duplicates
      if (!mentions.some((m) => m.user_id === member.id)) {
        mentions.push({
          user_id: member.id,
          display_name: member.full_name,
        });
      }
    }
  }

  return mentions;
};

/**
 * Parse content and split into text segments and mention segments
 */
export interface ContentSegment {
  type: 'text' | 'mention';
  content: string;
  mention?: CommentMention;
}

export const parseContentWithMentions = (
  content: string,
  mentions: CommentMention[]
): ContentSegment[] => {
  if (!mentions || mentions.length === 0) {
    return [{ type: 'text', content }];
  }

  const segments: ContentSegment[] = [];
  let remainingContent = content;
  let lastIndex = 0;

  // Sort mentions by display name length (longest first) to avoid partial matches
  const sortedMentions = [...mentions].sort(
    (a, b) => b.display_name.length - a.display_name.length
  );

  // Create a pattern that matches all mention names
  const mentionNames = sortedMentions.map((m) =>
    m.display_name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  );
  const pattern = new RegExp(`@(${mentionNames.join('|')})`, 'gi');

  let match;
  while ((match = pattern.exec(content)) !== null) {
    // Add text before the mention
    if (match.index > lastIndex) {
      segments.push({
        type: 'text',
        content: content.slice(lastIndex, match.index),
      });
    }

    // Find the matching mention
    const mentionedName = match[1];
    const mention = sortedMentions.find(
      (m) => m.display_name.toLowerCase() === mentionedName.toLowerCase()
    );

    if (mention) {
      segments.push({
        type: 'mention',
        content: `@${mention.display_name}`,
        mention,
      });
    } else {
      // Fallback: treat as text
      segments.push({
        type: 'text',
        content: match[0],
      });
    }

    lastIndex = match.index + match[0].length;
  }

  // Add remaining text after last mention
  if (lastIndex < content.length) {
    segments.push({
      type: 'text',
      content: content.slice(lastIndex),
    });
  }

  return segments.length > 0 ? segments : [{ type: 'text', content }];
};

/**
 * Get the current mention query from cursor position
 * Returns null if not currently typing a mention
 */
export const getMentionQuery = (
  text: string,
  cursorPosition: number
): { query: string; startIndex: number } | null => {
  // Look backwards from cursor to find @
  let startIndex = cursorPosition - 1;
  
  while (startIndex >= 0) {
    const char = text[startIndex];
    
    // Found the @ symbol
    if (char === '@') {
      const query = text.slice(startIndex + 1, cursorPosition);
      // Only valid if query contains only letters and spaces
      if (/^[A-Za-z ]*$/.test(query)) {
        return { query, startIndex };
      }
      return null;
    }
    
    // Stop if we hit a non-letter/space character (except @)
    if (!/[A-Za-z ]/.test(char)) {
      return null;
    }
    
    startIndex--;
  }
  
  return null;
};

/**
 * Insert a mention into the text at the current position
 */
export const insertMention = (
  text: string,
  cursorPosition: number,
  mentionStartIndex: number,
  displayName: string
): { newText: string; newCursorPosition: number } => {
  const before = text.slice(0, mentionStartIndex);
  const after = text.slice(cursorPosition);
  const mentionText = `@${displayName} `;
  
  return {
    newText: before + mentionText + after,
    newCursorPosition: before.length + mentionText.length,
  };
};
