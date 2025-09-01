import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

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

export const useAIMetadata = () => {
  const [loading, setLoading] = useState(false);

  const generateMetadata = async (request: GenerateMetadataRequest): Promise<GeneratedMetadata | null> => {
    setLoading(true);
    
    try {
      console.log('Generating AI metadata for:', request);
      
      const { data, error } = await supabase.functions.invoke('generate-metadata', {
        body: request
      });

      if (error) {
        console.error('AI metadata generation error:', error);
        throw new Error(error.message);
      }

      if (!data.success) {
        console.error('AI metadata generation failed:', data.error);
        
        if (data.fallback) {
          toast.warning('IA indisponible, métadonnées de base générées');
          return null; // Let the component handle fallback
        }
        
        throw new Error(data.error);
      }

      console.log('Generated metadata:', data.metadata);
      toast.success('Métadonnées générées par IA avec succès!');
      
      return data.metadata;

    } catch (error) {
      console.error('Error generating AI metadata:', error);
      
      // Show user-friendly error messages based on the error type
      const errorMessage = error instanceof Error ? error.message : 'Erreur inconnue';
      
      if (errorMessage.includes('Insufficient Balance')) {
        toast.error('Le compte DeepSeek n\'a pas assez de crédits. Contactez l\'administrateur.');
      } else if (errorMessage.includes('API key not configured')) {
        toast.error('Clé API DeepSeek non configurée. Contactez l\'administrateur.');
      } else if (errorMessage.includes('DeepSeek API error')) {
        toast.error(`Erreur de l'API DeepSeek: ${errorMessage.replace('DeepSeek API error: ', '')}`);
      } else {
        toast.error(`Erreur IA: ${errorMessage}`);
      }
      
      return null;
    } finally {
      setLoading(false);
    }
  };

  const generateBatchMetadata = async (
    requests: GenerateMetadataRequest[]
  ): Promise<(GeneratedMetadata | null)[]> => {
    setLoading(true);
    const results: (GeneratedMetadata | null)[] = [];
    
    try {
      // Process in parallel with rate limiting (max 3 concurrent requests)
      const chunks = [];
      for (let i = 0; i < requests.length; i += 3) {
        chunks.push(requests.slice(i, i + 3));
      }

      for (const chunk of chunks) {
        const chunkPromises = chunk.map(request => generateMetadata(request));
        const chunkResults = await Promise.all(chunkPromises);
        results.push(...chunkResults);
        
        // Small delay between chunks to avoid rate limiting
        if (chunks.indexOf(chunk) < chunks.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      }

      const successCount = results.filter(r => r !== null).length;
      if (successCount > 0) {
        toast.success(`${successCount} métadonnées générées par lot!`);
      }

    } catch (error) {
      console.error('Batch metadata generation error:', error);
      toast.error('Erreur lors de la génération en lot');
    } finally {
      setLoading(false);
    }

    return results;
  };

  return {
    generateMetadata,
    generateBatchMetadata,
    loading
  };
};