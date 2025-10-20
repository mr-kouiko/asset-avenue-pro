import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface TranslateRequest {
  title: string;
  description: string;
  tags: string[];
  targetLanguage: 'fr' | 'en';
}

interface TranslationResponse {
  original_language: string;
  translated_title: string;
  translated_description: string;
  translated_tags: string[];
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY is not configured');
    }

    const { title, description, tags, targetLanguage }: TranslateRequest = await req.json();

    const languageNames = {
      fr: 'French',
      en: 'English'
    };

    const prompt = `You are a professional translator specializing in e-commerce and digital marketplace content.

Analyze and translate the following product information to ${languageNames[targetLanguage]}:

Title: "${title}"
Description: "${description}"
Tags: ${JSON.stringify(tags)}

Instructions:
1. First, detect the original language of the content
2. If content is already in ${languageNames[targetLanguage]}, return it as-is
3. Otherwise, translate naturally and fluently, keeping marketing appeal
4. Preserve all product details and technical information
5. Make tags concise and SEO-friendly in the target language
6. Keep the same tone and style

Return ONLY valid JSON (no markdown, no explanation):
{
  "original_language": "detected language code (fr/en/es/etc)",
  "translated_title": "translated title (max 60 chars, marketing-friendly)",
  "translated_description": "translated description (natural, persuasive, 2-3 sentences)",
  "translated_tags": ["tag1", "tag2", "tag3", "tag4", "tag5"]
}`;

    console.log('Translating content to:', targetLanguage);

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          {
            role: 'system',
            content: 'You are a professional translator. Always respond with valid JSON only, no markdown formatting.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        response_format: { type: "json_object" }
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Lovable AI error:', response.status, errorText);
      
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limit exceeded. Please try again later." }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "Payment required. Please add credits to your Lovable AI workspace." }),
          { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      throw new Error(`AI Gateway error: ${response.status}`);
    }

    const data = await response.json();
    const translatedText = data.choices[0].message.content;

    console.log('Raw AI response:', translatedText);

    let translation: TranslationResponse;
    try {
      // Remove markdown code blocks if present
      const cleanedText = translatedText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      translation = JSON.parse(cleanedText);
      
      // Validate response structure
      if (!translation.translated_title || !translation.translated_description || !Array.isArray(translation.translated_tags)) {
        throw new Error('Invalid translation response structure');
      }

      // Ensure title length
      if (translation.translated_title.length > 60) {
        translation.translated_title = translation.translated_title.substring(0, 57) + '...';
      }

      // Ensure tags are reasonable
      if (translation.translated_tags.length < 3) {
        translation.translated_tags = [...translation.translated_tags, ...tags].slice(0, 10);
      } else if (translation.translated_tags.length > 10) {
        translation.translated_tags = translation.translated_tags.slice(0, 10);
      }

    } catch (parseError) {
      console.error('Failed to parse translation:', parseError);
      console.error('Raw response:', translatedText);
      
      // Fallback: return original content
      translation = {
        original_language: 'unknown',
        translated_title: title,
        translated_description: description,
        translated_tags: tags
      };
    }

    console.log('Final translation:', translation);

    return new Response(JSON.stringify({ 
      success: true, 
      translation 
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in translate-content function:', error);
    
    return new Response(JSON.stringify({ 
      success: false, 
      error: error.message 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
