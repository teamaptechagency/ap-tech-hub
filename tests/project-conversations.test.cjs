const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const Module = require('node:module');
const path = require('node:path');
const ts = require('typescript');

function load(jobs) {
  let where; const writes = [];
  const filename = path.resolve('lib/project-conversations.ts');
  const compiled = new Module(filename, module);
  compiled.filename = filename;
  compiled.require = name => {
    if (name === '@/lib/prisma') return { prisma: {
      job: { findMany: async query => { where = query.where; return jobs; } },
      conversation: { upsert: async query => { writes.push(query); return {}; } },
    } };
    if (name === '@/lib/work-availability') return { availableJobWhere: query => ({ ...query, AND: [{ client: { is: { status: 'ACTIVE' } } }] }) };
    throw Error('Unexpected dependency');
  };
  compiled._compile(ts.transpileModule(fs.readFileSync(filename, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText, filename);
  return { ensure: compiled.exports.ensurePublishedProjectConversations, writes, where: () => where };
}
test('client reconciliation only creates conversations for its available, published, ongoing projects', async () => {
  const current = load([{ id: 'own-project' }]); await current.ensure('client-one');
  assert.equal(current.where().clientId, 'client-one');
  assert.equal(current.where().publish, 'PUBLISHED');
  assert.deepEqual(current.where().status.in, ['OPEN', 'PENDING', 'IN_PROGRESS', 'PAUSED']);
  assert.deepEqual(current.where().conversation, { is: null });
  assert.deepEqual(current.writes[0], { where: { jobId: 'own-project' }, create: { jobId: 'own-project' }, update: {} });
});
test('admin reconciliation excludes external jobs without client and does not mutate when nothing is missing', async () => {
  const current = load([]); await current.ensure();
  assert.deepEqual(current.where().clientId, { not: null }); assert.equal(current.writes.length, 0);
});
