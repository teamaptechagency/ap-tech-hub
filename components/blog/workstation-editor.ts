import { blogHtmlToMarkdown, blogMarkdownToHtml, sanitizePastedHtml } from "@/lib/blog-html";

declare global { interface Window { workstationBlogEditor: { mount: (textarea: HTMLTextAreaElement) => void } } }
window.workstationBlogEditor = { mount(textarea) {
  if (textarea.dataset.visualEditor) return;
  textarea.dataset.visualEditor = "1";
  const shell = document.createElement("div"); shell.className = "ws-visual-editor";
  const toolbar = document.createElement("div"); toolbar.className = "ws-inline ws-editor-toolbar";
  const body = document.createElement("div"); body.className = "ws-editor-surface"; body.contentEditable = "true";
  body.setAttribute("role", "textbox"); body.setAttribute("aria-label", "Post content"); body.setAttribute("aria-multiline", "true");
  body.innerHTML = blogMarkdownToHtml(textarea.value);
  const emit = () => { textarea.value = blogHtmlToMarkdown(body.innerHTML); };
  const commands = [["Text", "formatBlock", "p"], ["H2", "formatBlock", "h2"], ["H3", "formatBlock", "h3"], ["H4", "formatBlock", "h4"], ["B", "bold", ""], ["I", "italic", ""], ["List", "insertUnorderedList", ""], ["1.", "insertOrderedList", ""], ["Quote", "formatBlock", "blockquote"], ["Link", "createLink", ""], ["Clear", "removeFormat", ""]];
  for (const [label, command, value] of commands) {
    const button = document.createElement("button"); button.type = "button"; button.className = "ws-btn ws-btn-quiet"; button.textContent = label;
    button.onmousedown = event => event.preventDefault(); button.onclick = () => {
      body.focus(); const argument = command === "createLink" ? prompt("Link to (a page path like /services, or a full URL)") : value;
      if (command === "createLink" && !argument?.trim()) return;
      document.execCommand(command, false, argument || ""); if (command === "removeFormat") document.execCommand("formatBlock", false, "p"); emit();
    }; toolbar.append(button);
  }
  body.oninput = emit; body.onblur = emit;
  body.onpaste = event => {
    const html = event.clipboardData?.getData("text/html"); if (!html) return;
    event.preventDefault(); document.execCommand("insertHTML", false, sanitizePastedHtml(html)); emit();
  };
  textarea.addEventListener("change", () => { body.innerHTML = blogMarkdownToHtml(textarea.value); });
  shell.append(toolbar, body); textarea.after(shell); textarea.hidden = true; textarea.required = false;
} };
