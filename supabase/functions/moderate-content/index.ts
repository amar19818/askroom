
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { text, userIdentifier } = await req.json();
    const geminiApiKey = "AIzaSyCo9ZkVRcsTOIVWvqw4BgY3a4zRgG5HI7s";

    // Enhanced moderation prompt with spell correction
    const moderationPrompt = `Please analyze the following text for a Q&A session and provide a comprehensive response:

1. MODERATION: Determine if it's appropriate considering:
   - Respectful and professional language
   - No hate speech, harassment, or discriminatory content
   - Relevant for Q&A context (not spam/promotional)
   - No inappropriate sexual content or violence
   - Makes logical sense as a question

2. SPELL CORRECTION: If there are spelling mistakes, provide a corrected version

3. CONTENT QUALITY: Check if it forms a coherent, meaningful question

Text to analyze: "${text}"

Respond in this EXACT JSON format:
{
  "status": "APPROVED" or "REJECTED",
  "correctedText": "corrected version if needed, or original if no corrections",
  "reason": "brief reason if rejected",
  "severity": "LOW", "MEDIUM", or "HIGH" (for rejected content)
}

Only respond with the JSON, no other text.`;

    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${geminiApiKey}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              {
                text: moderationPrompt
              }
            ]
          }
        ]
      }),
    });

    const data = await response.json();
    const aiResponse = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
    
    let moderationResult;
    try {
      moderationResult = JSON.parse(aiResponse);
    } catch (parseError) {
      // Fallback if JSON parsing fails
      const isApproved = aiResponse?.includes("APPROVED");
      moderationResult = {
        status: isApproved ? "APPROVED" : "REJECTED",
        correctedText: text,
        reason: "Content analysis failed",
        severity: "MEDIUM"
      };
    }

    return new Response(JSON.stringify({ 
      isApproved: moderationResult.status === "APPROVED",
      correctedText: moderationResult.correctedText || text,
      reason: moderationResult.reason || "",
      severity: moderationResult.severity || "LOW",
      userIdentifier
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error in moderate-content function:', error);
    return new Response(JSON.stringify({ 
      error: error.message,
      isApproved: false,
      correctedText: "",
      reason: "Moderation system error",
      severity: "HIGH"
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
