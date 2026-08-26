// Parser mínimo para el contenido legal: líneas "## " son subtítulos, "- " son viñetas,
// el resto son párrafos separados por línea en blanco. Evita traer una librería de markdown
// completa para tres páginas de texto estático.
export function LegalContent({ text }: { text: string }) {
  const blocks = text.trim().split('\n\n');
  return (
    <div className="flex flex-col gap-4 text-[13px] text-text2 leading-relaxed">
      {blocks.map((block, i) => {
        if (block.startsWith('## ')) {
          return (
            <h2 key={i} className="text-sm font-bold text-text mt-2">
              {block.slice(3)}
            </h2>
          );
        }
        if (block.startsWith('- ')) {
          const items = block.split('\n').map((l) => l.replace(/^- /, ''));
          return (
            <ul key={i} className="flex flex-col gap-1.5 list-disc pl-5">
              {items.map((item, j) => (
                <li key={j}>{item}</li>
              ))}
            </ul>
          );
        }
        return <p key={i}>{block}</p>;
      })}
    </div>
  );
}
