import { useEffect, useId } from "react";
import { publicUrl } from "@/utils/publicUrl";

/** Recursively rewrite any string that leaks a Supabase URL. */
function scrubBackendUrls<T>(value: T): T {
  if (value == null) return value;
  if (typeof value === "string") {
    if (/supabase\.co/i.test(value)) return publicUrl(value) as unknown as T;
    return value;
  }
  if (Array.isArray(value)) return value.map(scrubBackendUrls) as unknown as T;
  if (typeof value === "object") {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      out[k] = scrubBackendUrls(v);
    }
    return out as T;
  }
  return value;
}

interface JsonLdProps {
  /** Any Schema.org object or array of objects. Will be JSON-stringified into a <script type="application/ld+json"> tag in <head>. */
  data: Record<string, unknown> | Record<string, unknown>[];
  /** Optional stable id for the injected <script> — defaults to a generated one. Use to allow updates. */
  id?: string;
}

/**
 * Injects a Schema.org JSON-LD block into <head>. Idempotent: the same `id`
 * updates the existing script instead of duplicating. Cleans up on unmount.
 *
 * Safe to render inline in a component tree — it does not render any DOM.
 */
export const JsonLd = ({ data, id }: JsonLdProps) => {
  const generatedId = useId();
  const scriptId = id ?? `ld-${generatedId.replace(/:/g, "")}`;

  useEffect(() => {
    let script = document.getElementById(scriptId) as HTMLScriptElement | null;
    if (!script) {
      script = document.createElement("script");
      script.type = "application/ld+json";
      script.id = scriptId;
      script.setAttribute("data-jsonld", "true");
      document.head.appendChild(script);
    }
    try {
      script.text = JSON.stringify(scrubBackendUrls(data));
    } catch {
      // Circular / invalid input — leave previous content in place.
    }

    return () => {
      const el = document.getElementById(scriptId);
      if (el && el.parentNode) el.parentNode.removeChild(el);
    };
  }, [scriptId, data]);

  return null;
};

export default JsonLd;
