import { useEffect, useState } from "preact/hooks";

export function Kroki({ source }: { source: string }) {
  const [svg, setSvg] = useState("");
  const [error, setError] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetch("https://kroki.io/plantuml/svg", {
      method: "POST",
      body: source,
      headers: { "Content-Type": "text/plain" },
    })
      .then((r) => {
        if (!r.ok) throw new Error(r.statusText);
        return r.text();
      })
      .then((text) => {
        if (!cancelled) setSvg(text);
      })
      .catch(() => {
        if (!cancelled) setError(true);
      });
    return () => {
      cancelled = true;
    };
  }, [source]);

  if (error) {
    return <div class="text-center py-2 text-secondary">Could not load metamodel diagram.</div>;
  }
  if (!svg) {
    return <div class="text-center py-2 text-secondary">Loading metamodel...</div>;
  }
  return <div dangerouslySetInnerHTML={{ __html: svg }} />;
}
