import type { ReactNode } from "react";
import { Link } from "react-router-dom";

/**
 * The small piece of Markdown the blog posts use, rendered to React (no raw
 * HTML, so nothing in a post can inject markup or scripts):
 *   ## Heading, ### Subheading, paragraphs, - or * lists, 1. lists,
 *   > quote (shown as a callout box), --- (divider),
 *   | simple | tables | with a |---| line under the header,
 *   **bold** and [links](/path or https://...).
 * Anything else is shown as plain text.
 */
type Block =
  | { kind: "h2" | "h3" | "p" | "quote"; text: string }
  | { kind: "ul" | "ol"; items: string[] }
  | { kind: "table"; head: string[]; rows: string[][] }
  | { kind: "hr" };

const cells = (line: string) => line.trim().replace(/^\|/, "").replace(/\|$/, "").split("|").map((c) => c.trim());

export function parseBlocks(markdown: string): Block[] {
  const lines = markdown.replace(/\r\n?/g, "\n").split("\n");
  const blocks: Block[] = [];
  let para: string[] = [];
  const flush = () => {
    if (para.length) blocks.push({ kind: "p", text: para.join(" ") });
    para = [];
  };
  for (let i = 0; i < lines.length; i += 1) {
    const line = lines[i];
    const t = line.trim();
    if (!t) { flush(); continue; }
    if (/^###\s+/.test(t)) { flush(); blocks.push({ kind: "h3", text: t.replace(/^###\s+/, "") }); continue; }
    if (/^##\s+/.test(t)) { flush(); blocks.push({ kind: "h2", text: t.replace(/^##\s+/, "") }); continue; }
    if (/^(-{3,}|\*{3,})$/.test(t)) { flush(); blocks.push({ kind: "hr" }); continue; }
    if (/^>\s?/.test(t)) {
      flush();
      const text: string[] = [];
      while (i < lines.length && /^>\s?/.test(lines[i].trim())) { text.push(lines[i].trim().replace(/^>\s?/, "")); i += 1; }
      i -= 1;
      blocks.push({ kind: "quote", text: text.join(" ") });
      continue;
    }
    if (/^[-*]\s+/.test(t)) {
      flush();
      const items: string[] = [];
      while (i < lines.length && /^[-*]\s+/.test(lines[i].trim())) { items.push(lines[i].trim().replace(/^[-*]\s+/, "")); i += 1; }
      i -= 1;
      blocks.push({ kind: "ul", items });
      continue;
    }
    if (/^\d+[.)]\s+/.test(t)) {
      flush();
      const items: string[] = [];
      while (i < lines.length && /^\d+[.)]\s+/.test(lines[i].trim())) { items.push(lines[i].trim().replace(/^\d+[.)]\s+/, "")); i += 1; }
      i -= 1;
      blocks.push({ kind: "ol", items });
      continue;
    }
    if (t.startsWith("|") && i + 1 < lines.length && /^\|?\s*:?-{2,}/.test(lines[i + 1].trim())) {
      flush();
      const head = cells(t);
      const rows: string[][] = [];
      i += 2;
      while (i < lines.length && lines[i].trim().startsWith("|")) { rows.push(cells(lines[i])); i += 1; }
      i -= 1;
      blocks.push({ kind: "table", head, rows });
      continue;
    }
    para.push(t);
  }
  flush();
  return blocks;
}

const SAFE_URL = /^(\/(?!\/)|https?:\/\/|mailto:|#)/i;
/** The site doesn't reset scroll between pages; a link to another page opens it at its top. */
const toTop = () => requestAnimationFrame(() => window.scrollTo({ top: 0, left: 0, behavior: "instant" as ScrollBehavior }));

function inline(text: string, key: string): ReactNode[] {
  const parts = text.split(/(\*\*[^*]+\*\*|\[[^\]]+\]\([^)\s]+\))/g).filter(Boolean);
  return parts.map((part, i) => {
    const k = `${key}-${i}`;
    const bold = part.match(/^\*\*([^*]+)\*\*$/);
    if (bold) return <strong key={k}>{bold[1]}</strong>;
    const link = part.match(/^\[([^\]]+)\]\(([^)\s]+)\)$/);
    if (link) {
      const [, label, href] = link;
      if (!SAFE_URL.test(href)) return <span key={k}>{label}</span>;
      if (href.startsWith("/")) return <Link key={k} to={href} onClick={href.includes("#") ? undefined : toTop}>{label}</Link>;
      return <a key={k} href={href} target="_blank" rel="noopener noreferrer">{label}</a>;
    }
    return <span key={k}>{part}</span>;
  });
}

const anchor = (text: string) => text.toLowerCase().replace(/\*\*/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 60);

export function BlogBody({ markdown }: { markdown: string }) {
  const blocks = parseBlocks(markdown);
  return (
    <>
      {blocks.map((b, i) => {
        const k = `b${i}`;
        switch (b.kind) {
          case "h2": return <h2 key={k} id={anchor(b.text)}>{inline(b.text, k)}</h2>;
          case "h3": return <h3 key={k} id={anchor(b.text)}>{inline(b.text, k)}</h3>;
          case "quote": return <aside key={k} className="stm-post-callout"><p>{inline(b.text, k)}</p></aside>;
          case "ul": return <ul key={k}>{b.items.map((item, j) => <li key={j}>{inline(item, `${k}-${j}`)}</li>)}</ul>;
          case "ol": return <ol key={k}>{b.items.map((item, j) => <li key={j}>{inline(item, `${k}-${j}`)}</li>)}</ol>;
          case "table": return (
            <div key={k} className="stm-post-table" role="region" aria-label="Table" tabIndex={0}>
              <table>
                <thead><tr>{b.head.map((h, j) => <th key={j} scope="col">{inline(h, `${k}-h${j}`)}</th>)}</tr></thead>
                {/* data-label lets phones show each row as a small card with its column names. */}
                <tbody>{b.rows.map((row, r) => <tr key={r}>{row.map((c, j) => j === 0 ? <th key={j} scope="row">{inline(c, `${k}-${r}-${j}`)}</th> : <td key={j} data-label={b.head[j]?.replace(/\*\*/g, "") ?? ""}>{inline(c, `${k}-${r}-${j}`)}</td>)}</tr>)}</tbody>
              </table>
            </div>
          );
          case "hr": return <hr key={k} />;
          default: return <p key={k}>{inline(b.text, k)}</p>;
        }
      })}
    </>
  );
}

/** About 220 words a minute, never less than one. */
export function readingMinutes(markdown: string | null | undefined): number {
  const words = (markdown ?? "").replace(/[#>*|[\]()-]/g, " ").split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.round(words / 220));
}
