import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { X } from "lucide-react";

interface UploadedFileData {
  id: string;
  url: string;
  name: string;
  type: string;
  size: number;
  previewUrl?: string;
}

interface PreviewModalProps {
  file: UploadedFileData | null;
  isOpen: boolean;
  onClose: () => void;
}

export const PreviewModal = ({ file, isOpen, onClose }: PreviewModalProps) => {
  if (!file) return null;

  const renderPreview = () => {
    if (file.type.startsWith('video/')) {
      return (
        <video 
          controls 
          className="w-full max-h-[70vh] rounded-lg"
          src={file.previewUrl || file.url}
        >
          Votre navigateur ne supporte pas la lecture vidéo.
        </video>
      );
    }
    
    if (file.type.startsWith('audio/')) {
      return (
        <div className="flex flex-col items-center space-y-4 py-8">
          <div className="w-32 h-32 bg-primary/10 rounded-full flex items-center justify-center mb-4">
            <svg className="w-16 h-16 text-primary" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M9.383 3.076A1 1 0 0110 4v12a1 1 0 01-1.707.707L4.586 13H2a1 1 0 01-1-1V8a1 1 0 011-1h2.586l3.707-3.707a1 1 0 011.09-.217zM15.657 6.343a1 1 0 011.414 0A9.972 9.972 0 0119 12a9.972 9.972 0 01-1.929 5.657 1 1 0 11-1.414-1.414A7.971 7.971 0 0017 12a7.971 7.971 0 00-1.343-4.243 1 1 0 010-1.414z" clipRule="evenodd" />
            </svg>
          </div>
          <audio 
            controls 
            className="w-full max-w-md"
            src={file.previewUrl || file.url}
          >
            Votre navigateur ne supporte pas la lecture audio.
          </audio>
        </div>
      );
    }
    
    if (file.type.startsWith('image/')) {
      return (
        <img 
          src={file.previewUrl || file.url}
          alt={file.name}
          className="w-full max-h-[70vh] object-contain rounded-lg"
        />
      );
    }

    return (
      <div className="flex flex-col items-center space-y-4 py-8">
        <div className="w-32 h-32 bg-muted rounded-lg flex items-center justify-center">
          <svg className="w-16 h-16 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
        </div>
        <p className="text-muted-foreground">Aperçu non disponible pour ce type de fichier</p>
      </div>
    );
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden">
        <DialogHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
          <DialogTitle className="text-lg font-semibold truncate pr-4">
            {file.name}
          </DialogTitle>
          <Button variant="ghost" size="sm" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </DialogHeader>
        
        <div className="flex-1 overflow-auto">
          {renderPreview()}
        </div>
        
        <div className="flex items-center justify-between pt-4 border-t text-sm text-muted-foreground">
          <span>Type: {file.type}</span>
          <span>Taille: {(file.size / (1024 * 1024)).toFixed(2)} MB</span>
        </div>
      </DialogContent>
    </Dialog>
  );
};