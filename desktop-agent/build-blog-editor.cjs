/* eslint-disable @typescript-eslint/no-require-imports -- Node build helper. */
/* Regenerate the checked-in desktop editor bridge using the shared website Markdown renderer. */
const path = require('node:path');
require('esbuild').buildSync({ entryPoints: [path.join(__dirname, '../components/blog/workstation-editor.ts')], outfile: path.join(__dirname, '../public/workstation/blog-editor.js'), bundle: true, minify: true, format: 'iife', platform: 'browser', target: ['chrome110'], tsconfig: path.join(__dirname, '../tsconfig.json') });

