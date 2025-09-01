import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface GenerateMetadataRequest {
  fileName: string;
  fileType: string;
  sellerDescription?: string;
  language?: 'fr' | 'en' | 'es';
}

interface GeneratedMetadata {
  title: string;
  description: string;
  tags: string[];
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const deepseekApiKey = Deno.env.get('DEEPSEEK_API_KEY');
    if (!deepseekApiKey) {
      throw new Error('DeepSeek API key not configured');
    }

    const { fileName, fileType, sellerDescription, language = 'fr' }: GenerateMetadataRequest = await req.json();

    // Create context for AI prompt
    const fileContext = `File name: "${fileName}", File type: "${fileType}"`;
    const contextString = sellerDescription 
      ? `${fileContext}, Seller description: "${sellerDescription}"` 
      : fileContext;

    // Language-specific prompts
    const prompts = {
      fr: `Générez des métadonnées de produit attrayantes pour une marketplace numérique française. Contexte du produit: ${contextString}. 

Créez un titre accrocheur (max 60 caractères), une description persuasive de 2-3 phrases, et 5-10 tags pertinents en français. 

Format de réponse JSON uniquement:
{
  "title": "titre accrocheur du produit",
  "description": "description persuasive de 2-3 phrases qui donne envie d'acheter",
  "tags": ["tag1", "tag2", "tag3", "tag4", "tag5"]
}`,

      en: `Generate compelling product metadata for an English digital marketplace. Product context: ${contextString}.

Create a catchy title (max 60 characters), a compelling 2-3 sentence description, and 5-10 relevant tags in English.

JSON response format only:
{
  "title": "catchy product title",
  "description": "compelling 2-3 sentence description that drives purchases",
  "tags": ["tag1", "tag2", "tag3", "tag4", "tag5"]
}`,

      es: `Genera metadatos atractivos para un marketplace digital en español. Contexto del producto: ${contextString}.

Crea un título llamativo (máx 60 caracteres), una descripción persuasiva de 2-3 frases, y 5-10 tags relevantes en español.

Formato de respuesta JSON únicamente:
{
  "title": "título llamativo del producto",
  "description": "descripción persuasiva de 2-3 frases que incentive la compra",
  "tags": ["tag1", "tag2", "tag3", "tag4", "tag5"]
}`
    };

    console.log('Generating metadata with DeepSeek for:', contextString);

    // Call DeepSeek API
    const response = await fetch('https://api.deepseek.com/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${deepseekApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'deepseek-chat',
        messages: [
          {
            role: 'system',
            content: 'You are a professional copywriter specializing in digital marketplace product descriptions. Always respond with valid JSON only.'
          },
          {
            role: 'user',
            content: prompts[language]
          }
        ],
        max_tokens: 500,
        temperature: 0.7,
        response_format: { type: "json_object" }
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('DeepSeek API error:', response.status, errorText);
      
      let errorMessage = `DeepSeek API error: ${response.status}`;
      try {
        const errorData = JSON.parse(errorText);
        if (errorData.error?.message) {
          errorMessage = errorData.error.message;
        }
      } catch (e) {
        // Keep default error message if parsing fails
      }
      
      throw new Error(errorMessage);
    }

    const data = await response.json();
    const generatedText = data.choices[0].message.content;

    console.log('Raw DeepSeek response:', generatedText);

    // Parse the JSON response
    let metadata: GeneratedMetadata;
    try {
      metadata = JSON.parse(generatedText);
      
      // Validate the response structure
      if (!metadata.title || !metadata.description || !Array.isArray(metadata.tags)) {
        throw new Error('Invalid response structure from DeepSeek');
      }

      // Ensure title is within character limit
      if (metadata.title.length > 60) {
        metadata.title = metadata.title.substring(0, 57) + '...';
      }

      // Ensure we have at least 3 tags and max 10
      if (metadata.tags.length < 3) {
        // Add some generic tags based on file type
        const genericTags = {
          fr: fileType.startsWith('image/') ? ['image', 'digital', 'créatif'] : 
              fileType.startsWith('video/') ? ['vidéo', 'digital', 'contenu'] :
              fileType.startsWith('audio/') ? ['audio', 'digital', 'son'] :
              ['digital', 'fichier', 'contenu'],
          en: fileType.startsWith('image/') ? ['image', 'digital', 'creative'] : 
              fileType.startsWith('video/') ? ['video', 'digital', 'content'] :
              fileType.startsWith('audio/') ? ['audio', 'digital', 'sound'] :
              ['digital', 'file', 'content'],
          es: fileType.startsWith('image/') ? ['imagen', 'digital', 'creativo'] : 
              fileType.startsWith('video/') ? ['video', 'digital', 'contenido'] :
              fileType.startsWith('audio/') ? ['audio', 'digital', 'sonido'] :
              ['digital', 'archivo', 'contenido']
        };
        
        metadata.tags = [...metadata.tags, ...genericTags[language]].slice(0, 10);
      }

      if (metadata.tags.length > 10) {
        metadata.tags = metadata.tags.slice(0, 10);
      }

    } catch (parseError) {
      console.error('Failed to parse DeepSeek response:', parseError);
      console.error('Raw response:', generatedText);
      
      // Fallback metadata generation
      metadata = {
        title: fileName.replace(/\.[^/.]+$/, '').replace(/[-_]/g, ' '),
        description: language === 'fr' 
          ? `Découvrez ce contenu digital de qualité. Parfait pour vos projets créatifs et professionnels.`
          : language === 'es'
          ? `Descubre este contenido digital de calidad. Perfecto para tus proyectos creativos y profesionales.`
          : `Discover this high-quality digital content. Perfect for your creative and professional projects.`,
        tags: language === 'fr' 
          ? ['digital', 'créatif', 'design', 'professionnel', 'qualité']
          : language === 'es'
          ? ['digital', 'creativo', 'diseño', 'profesional', 'calidad']
          : ['digital', 'creative', 'design', 'professional', 'quality']
      };
    }

    console.log('Generated metadata:', metadata);

    return new Response(JSON.stringify({ 
      success: true, 
      metadata,
      source: 'deepseek-ai' 
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in generate-metadata function:', error);
    
    return new Response(JSON.stringify({ 
      success: false, 
      error: error.message,
      fallback: true
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});