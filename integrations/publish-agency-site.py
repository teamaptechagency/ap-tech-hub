"""Privileged fixed-target publisher. Only trusted generator code is executed."""
import json, os, pathlib, re, shutil, subprocess, tarfile, tempfile, time
DATA = pathlib.Path('/var/lib/aptech-agency/site-editor')
BUILDER = pathlib.Path('/opt/aptech-site-builder')
PUBLIC = pathlib.Path('/srv/astral/sites/aptechagency.com/public')

def atomic_result(value):
    temporary = DATA / 'result.json.tmp'
    temporary.write_text(json.dumps(value))
    shutil.chown(temporary, user='aptech-agency', group='aptech-agency')
    temporary.chmod(0o600)
    temporary.replace(DATA / 'result.json')

def main():
    request = DATA / 'request.json'
    if not request.exists(): return
    if request.stat().st_size > 1000000: raise RuntimeError('Oversized publication request')
    job = json.loads(request.read_text())
    def validate(value, depth=0):
        if depth > 18: raise ValueError('Invalid content depth')
        if isinstance(value, dict):
            for key, item in value.items():
                if key == 'slug' and (not isinstance(item, str) or not re.fullmatch(r'[a-z0-9]+(?:-[a-z0-9]+)*', item)): raise ValueError('Invalid slug')
                validate(item, depth+1)
        elif isinstance(value, list):
            for item in value: validate(item, depth+1)
    validate(job['draft'])
    result = json.loads((DATA / 'result.json').read_text()) if (DATA / 'result.json').exists() else {}
    if result.get('id') == job['id']: return
    try:
        # The generator is root-owned. JSON is content only; never run commands from it.
        with tempfile.TemporaryDirectory(prefix='aptech-publish-', dir='/tmp') as work:
            stage = pathlib.Path(work)
            (stage/'scripts').mkdir(); (stage/'src').mkdir(); (stage/'dist').mkdir()
            shutil.copy2(BUILDER/'scripts/build-site.mjs', stage/'scripts/build-site.mjs')
            shutil.copy2(BUILDER/'scripts/service-packages.mjs', stage/'scripts/service-packages.mjs')
            for asset in ['service-packages.css','service-packages.js']:
                shutil.copy2(BUILDER/'dist'/asset,stage/'dist'/asset)
            for name in ['content.json','case-studies.json','portfolio-designs.json','reviews.json','routes.json']:
                shutil.copy2(BUILDER/'src'/name, stage/'src'/name)
            for key,name in {'content':'content.json','projects':'case-studies.json','designs':'portfolio-designs.json','reviews':'reviews.json'}.items():
                (stage/'src'/name).write_text(json.dumps(job['draft'][key], ensure_ascii=False))
            # Build against existing assets without copying or changing them.
            (stage/'dist/assets').symlink_to(PUBLIC/'assets', target_is_directory=True)
            result = subprocess.run(['node', str(stage/'scripts/build-site.mjs')], capture_output=True, text=True, timeout=90)
            if result.returncode: raise RuntimeError('Build failed. Check required fields and project image details.')
            backup = pathlib.Path('/root')/('aptech-before-native-publish-'+str(time.time_ns())+'.tar.gz')
            outputs=[p for p in (stage/'dist').rglob('*') if p.is_file() and not p.is_symlink() and 'assets' not in p.relative_to(stage/'dist').parts]
            with tarfile.open(backup,'w:gz') as archive:
                for p in outputs:
                    relative=p.relative_to(stage/'dist');old=PUBLIC/relative
                    if old.is_file():archive.add(old,arcname=str(relative))
            for p in outputs:
                relative=p.relative_to(stage/'dist');target=PUBLIC/relative
                if '..' in relative.parts:raise RuntimeError('Invalid generated path')
                target.parent.mkdir(parents=True,exist_ok=True)
                temporary=target.with_name(target.name+'.publishing')
                shutil.copyfile(p,temporary);temporary.chmod(0o644);os.replace(temporary,target)
            snapshot = DATA / 'published.json.tmp'
            snapshot.write_text(json.dumps({'version':job['version'],'draft':job['draft']}))
            shutil.chown(snapshot, user='aptech-agency', group='aptech-agency')
            snapshot.chmod(0o600)
            snapshot.replace(DATA / 'published.json')
            atomic_result({'id':job['id'],'version':job['version'],'state':'published','completedAt':time.strftime('%Y-%m-%dT%H:%M:%SZ',time.gmtime())})
    except Exception:
        atomic_result({'id':job['id'],'version':job['version'],'state':'failed','error':'Publication failed. The saved draft remains available; check required fields and project image details.'})

if __name__=='__main__':main()
