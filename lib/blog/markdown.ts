// Tiny safe-ish markdown renderer. Handles a subset of CommonMark that is
// sufficient for the structured Sonnet output: headings, paragraphs,
// numbered + bulleted lists, bold, italic and inline links. Keeps the
// build dependency-free.

export function renderMarkdown(md: string): string {
  const lines = md.replace(/\r\n/g, "\n").split("\n");
  const out: string[] = [];
  let para: string[] = [];
  let listKind: "ul" | "ol" | null = null;
  let listItems: string[] = [];

  function flushPara() {
    if (para.length === 0) return;
    out.push(`<p>${inline(para.join(" ").trim())}</p>`);
    para = [];
  }
  function flushList() {
    if (listKind === null) return;
    const items = listItems.map((i) => `<li>${inline(i)}</li>`).join("");
    out.push(`<${listKind}>${items}</${listKind}>`);
    listKind = null;
    listItems = [];
  }

  for (const raw of lines) {
    const line = raw.trim();

    if (line.length === 0) {
      flushPara();
      flushList();
      continue;
    }

    const h = /^(#{1,3})\s+(.*)$/.exec(line);
    if (h) {
      flushPara();
      flushList();
      const level = h[1].length + 1; // h1 in body becomes h2 (page already has h1)
      out.push(`<h${level}>${inline(h[2])}</h${level}>`);
      continue;
    }

    const ol = /^(\d+)\.\s+(.*)$/.exec(line);
    if (ol) {
      flushPara();
      if (listKind !== "ol") {
        flushList();
        listKind = "ol";
      }
      listItems.push(ol[2]);
      continue;
    }

    const ul = /^[-*]\s+(.*)$/.exec(line);
    if (ul) {
      flushPara();
      if (listKind !== "ul") {
        flushList();
        listKind = "ul";
      }
      listItems.push(ul[1]);
      continue;
    }

    para.push(line);
  }
  flushPara();
  flushList();

  return out.join("\n");
}

function inline(s: string): string {
  let out = escape(s);
  // links
  out = out.replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, (_m, t, u) =>
    `<a href="${u}" rel="nofollow noopener">${t}</a>`
  );
  // bold + italic (** before *)
  out = out.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
  out = out.replace(/\*([^*]+)\*/g, "<em>$1</em>");
  return out;
}

function escape(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}
