import { Button } from "@/components/ui/button";
import { Download, Loader2 } from "lucide-react";
import { useSecureDownload } from "@/hooks/useSecureDownload";
import { toast } from "sonner";

interface SecureDownloadButtonProps {
  contentFileId: string;
  fileName?: string;
  variant?: "default" | "outline" | "ghost" | "secondary";
  size?: "default" | "sm" | "lg";
  className?: string;
  children?: React.ReactNode;
}

export const SecureDownloadButton = ({
  contentFileId,
  fileName,
  variant = "default",
  size = "default",
  className,
  children
}: SecureDownloadButtonProps) => {
  const { secureDownload, isProcessing } = useSecureDownload();

  const handleDownload = async () => {
    if (!contentFileId) {
      toast.error("Content file ID is required");
      return;
    }

    await secureDownload(contentFileId, fileName);
  };

  return (
    <Button
      variant={variant}
      size={size}
      className={className}
      onClick={handleDownload}
      disabled={isProcessing}
    >
      {isProcessing ? (
        <>
          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          {children || "Processing..."}
        </>
      ) : (
        <>
          <Download className="h-4 w-4 mr-2" />
          {children || "Download"}
        </>
      )}
    </Button>
  );
};