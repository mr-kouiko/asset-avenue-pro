import { useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  Bold, Italic, Heading2, Heading3, List, ListOrdered,
  Link as LinkIcon, Image as ImageIcon, Pilcrow, Quote, Undo, Redo,
} from "lucide-react";

interface RichTextEditorProps {
  value: string;
  onChange: (html: string) => void;
  onRequestImage?: () => Promise<string | null>;
}

/**
 * Lightweight contentEditable rich text editor.
 * Produces plain semantic HTML (h2/h3/p/strong/em/ul/ol/a/img/blockquote).
 */
export const RichTextEditor = ({ value, onChange, onRequestImage }: RichTextEditorProps) => {
  const ref = useRef<HTMLDivElement>(null);

  // Sync external value only when it differs from the DOM (avoids caret jumps)
  useEffect(() => {
    if (ref.current && ref.current.innerHTML !== value) {
      ref.current.innerHTML = value || "";
    }
  }, [value]);

  const emit = () => onChange(ref.current?.innerHTML ?? "");

  const exec = (command: string, arg?: string) => {
    ref.current?.focus();
    document.execCommand(command, false, arg);
    emit();
  };

  const insertLink = () => {
    const url = window.prompt("Link URL (https://... or /internal-path)");
    if (!url) return;
    exec("createLink", url);
  };

  const insertImage = async () => {
    let url: string | null = null;
    if (onRequestImage) url = await onRequestImage();
    else url = window.prompt("Image URL");
    if (!url) return;
    exec("insertImage", url);
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const text = e.clipboardData.getData("text/plain");
    document.execCommand("insertText", false, text);
    emit();
  };

  const ToolbarButton = ({
    onClick, title, children,
  }: { onClick: () => void; title: string; children: React.ReactNode }) => (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      className="h-8 w-8"
      title={title}
      onMouseDown={(e) => e.preventDefault()}
      onClick={onClick}
    >
      {children}
    </Button>
  );

  return (
    <div className="rounded-md border bg-background">
      <div className="flex flex-wrap items-center gap-1 border-b p-1">
        <ToolbarButton title="Paragraph" onClick={() => exec("formatBlock", "<p>")}><Pilcrow className="h-4 w-4" /></ToolbarButton>
        <ToolbarButton title="Heading 2" onClick={() => exec("formatBlock", "<h2>")}><Heading2 className="h-4 w-4" /></ToolbarButton>
        <ToolbarButton title="Heading 3" onClick={() => exec("formatBlock", "<h3>")}><Heading3 className="h-4 w-4" /></ToolbarButton>
        <Separator orientation="vertical" className="mx-1 h-6" />
        <ToolbarButton title="Bold" onClick={() => exec("bold")}><Bold className="h-4 w-4" /></ToolbarButton>
        <ToolbarButton title="Italic" onClick={() => exec("italic")}><Italic className="h-4 w-4" /></ToolbarButton>
        <Separator orientation="vertical" className="mx-1 h-6" />
        <ToolbarButton title="Bullet list" onClick={() => exec("insertUnorderedList")}><List className="h-4 w-4" /></ToolbarButton>
        <ToolbarButton title="Numbered list" onClick={() => exec("insertOrderedList")}><ListOrdered className="h-4 w-4" /></ToolbarButton>
        <ToolbarButton title="Quote" onClick={() => exec("formatBlock", "<blockquote>")}><Quote className="h-4 w-4" /></ToolbarButton>
        <Separator orientation="vertical" className="mx-1 h-6" />
        <ToolbarButton title="Insert link" onClick={insertLink}><LinkIcon className="h-4 w-4" /></ToolbarButton>
        <ToolbarButton title="Insert image" onClick={insertImage}><ImageIcon className="h-4 w-4" /></ToolbarButton>
        <Separator orientation="vertical" className="mx-1 h-6" />
        <ToolbarButton title="Undo" onClick={() => exec("undo")}><Undo className="h-4 w-4" /></ToolbarButton>
        <ToolbarButton title="Redo" onClick={() => exec("redo")}><Redo className="h-4 w-4" /></ToolbarButton>
      </div>

      <div
        ref={ref}
        contentEditable
        role="textbox"
        aria-multiline="true"
        aria-label="Article content"
        onInput={emit}
        onBlur={emit}
        onPaste={handlePaste}
        className="prose prose-sm dark:prose-invert min-h-[360px] max-w-none overflow-y-auto p-4 focus:outline-none [&_a]:text-primary [&_a]:underline [&_blockquote]:border-l-4 [&_blockquote]:border-border [&_blockquote]:pl-4 [&_h2]:mb-3 [&_h2]:mt-6 [&_h2]:text-2xl [&_h2]:font-bold [&_h3]:mb-2 [&_h3]:mt-5 [&_h3]:text-xl [&_h3]:font-semibold [&_img]:my-4 [&_img]:rounded-lg [&_li]:ml-6 [&_ol]:list-decimal [&_p]:my-3 [&_ul]:list-disc"
      />
    </div>
  );
};

export default RichTextEditor;
