from pathlib import Path
import argparse
parser=argparse.ArgumentParser();parser.add_argument('--wp-release',required=True);args=parser.parse_args()
p=Path(args.wp_release)/'components/public-preview.jsx'
s=p.read_text();old='className="public-dock-admin btn btn-dark" href="/admin"';new='className="public-dock-admin btn btn-dark" href="https://manage.aptechagency.com/login"'
if old not in s and new not in s:raise RuntimeError('WP Portal button changed')
p.write_text(s.replace(old,new))
p=Path('/opt/aptech-agency/agency-render.cjs');s=p.read_text().replace('https://portal.aptechagency.com/login','https://manage.aptechagency.com/login');p.write_text(s)
