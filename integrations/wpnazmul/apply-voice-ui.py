from pathlib import Path
import sys
root=Path(sys.argv[1]);css=Path(sys.argv[2]).read_text()
p=root/'components/voice-assistant.jsx';s=p.read_text()
s=s.replace('<span>Voice call · {formatTime(clock.active)} left</span>','<span className="voice-call-clock">Voice call · {formatTime(clock.active)}</span>')
s=s.replace('className="btn btn-sm" disabled={busy} onClick={() => {\n            const id = activeCall();','className="btn btn-sm voice-end-call" disabled={busy} onClick={() => {\n            const id = activeCall();')
s=s.replace('<label>Dictation language <select','<label className="voice-language">Language <select')
s=s.replace('className="btn btn-sm" onClick={listen}','className="btn btn-sm voice-microphone" onClick={listen}')
s=s.replace('<label><input type="checkbox" checked={readReplies}','<label className="voice-read-replies"><input type="checkbox" checked={readReplies}')
s=s.replace('className="btn btn-sm" disabled={busy || clock.wait > 0}','className="btn btn-sm voice-start-call" disabled={busy || clock.wait > 0}')
s=s.replace('>Start voice call</button>','>Start voice chat</button>')
p.write_text(s)
p=root/'public/visual-adapter.css';s=p.read_text();marker='/* Public assistant: compact, readable controls on desktop and mobile. */'
if marker in s:s=s[:s.index(marker)]
p.write_text(s+'\n'+css)
print('Updated voice chat layout and controls')
