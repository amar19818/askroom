
const GEMINI_API_KEY = 'AIzaSyCo9ZkVRcsTOIVWvqw4BgY3a4zRgG5HI7s';

export const moderateContent = async (text: string): Promise<{ isAppropriate: boolean; reason?: string }> => {
  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_API_KEY}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                {
                  text: `Please analyze this text for inappropriate content. Return only "APPROVED" if the content is appropriate for a classroom Q&A session, or "REJECTED: [reason]" if it contains inappropriate content like profanity, harassment, spam, or off-topic content. Text to analyze: "${text}"`
                }
              ]
            }
          ]
        })
      }
    );

    const data = await response.json();
    const result = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || '';
    
    if (result.startsWith('APPROVED')) {
      return { isAppropriate: true };
    } else if (result.startsWith('REJECTED:')) {
      return { isAppropriate: false, reason: result.replace('REJECTED:', '').trim() };
    } else {
      return { isAppropriate: false, reason: 'Content moderation failed' };
    }
  } catch (error) {
    console.error('Moderation failed:', error);
    return { isAppropriate: false, reason: 'Moderation service unavailable' };
  }
};
