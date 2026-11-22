"""Keep the public assistant launcher outside section stacking/clip contexts."""
from pathlib import Path
import sys

root = Path(sys.argv[1])
p = root / 'components/voice-assistant.jsx'
s = p.read_text()
if "from 'react-dom'" not in s:
    s = s.replace("import { useEffect, useRef, useState } from 'react';", "import { useEffect, useRef, useState } from 'react';\nimport { createPortal } from 'react-dom';")
    s = s.replace('  const dialog = useRef(null)', '  const [mounted, setMounted] = useState(false);\n  useEffect(() => { setMounted(true); }, []);\n  const dialog = useRef(null)', 1)
    start = s.index('    <button type="button" className="assistant-launch"')
    end = s.index('</button>', start) + len('</button>')
    s = s[:start] + '    {mounted && createPortal(' + s[start:end].strip() + ', document.body)}' + s[end:]
    s = s.replace('dialog.current?.showModal();', 'if (dialog.current && !dialog.current.open) dialog.current.showModal();')
    p.write_text(s)
p = root / 'public/visual-adapter.css'
s = p.read_text()
if '/* assistant viewport layer */' not in s:
    s += '\n/* assistant viewport layer */\nbody > .assistant-launch{position:fixed;z-index:1000;right:max(20px,env(safe-area-inset-right));bottom:calc(24px + env(safe-area-inset-bottom));pointer-events:auto;isolation:isolate}\n.preview-assistant[open]{display:flex}\n.preview-assistant:not([open]){display:none}\n'
    p.write_text(s)
print('Assistant launcher is mounted directly in body')
