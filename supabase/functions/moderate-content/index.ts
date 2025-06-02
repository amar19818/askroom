
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
    const { text } = await req.json();
    const geminiApiKey = "AIzaSyCo9ZkVRcsTOIVWvqw4BgY3a4zRgG5HI7s";

    const moderationPrompt = `Please analyze the following text and determine if it's appropriate for a public Q&A session. 
    
Consider the following criteria:
- Is it respectful and professional?
- Does it contain hate speech, harassment, or discriminatory language?
- Is it relevant for a Q&A context?
- Does it contain spam, promotional content, or irrelevant material?
- Is it free from inappropriate sexual content or violence?

Text to analyze: "${text}"

Respond with only "APPROVED" if the content is appropriate, or "REJECTED" if it should be blocked. Do not include any explanation.`;

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
    const moderationResult = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
    
    const isApproved = moderationResult === "APPROVED";
    
    return new Response(JSON.stringify({ 
      isApproved,
      moderationResult,
      originalText: text 
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error in moderate-content function:', error);
    return new Response(JSON.stringify({ 
      error: error.message,
      isApproved: false 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
