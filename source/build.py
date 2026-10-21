"""Build the portable HTML using only the Python standard library."""
from pathlib import Path
import argparse
import json
import re
import hashlib
import shutil

ROOT = Path(__file__).resolve().parent
SOURCE = ROOT / 'src'


def read_source(relative):
    path = (SOURCE / relative).resolve()
    if not path.is_relative_to(SOURCE.resolve()):
        raise ValueError('Source paths must stay inside src/')
    return path.read_text(encoding='utf-8')


def inline_script(source):
    # A literal closing tag in a JS string must not terminate the HTML script.
    return re.sub(r'</script', r'<\/script', source, flags=re.I)


def build(output):
    order = json.loads((ROOT / 'source-order.json').read_text(encoding='utf-8'))
    if len(order) != len(set(order)):
        raise ValueError('Duplicate application modules')
    application = '\n\n'.join(read_source(name) for name in order)
    data = json.loads((ROOT / 'data/courses.json').read_text(encoding='utf-8'))
    values = {
        '__STYLES__': read_source('styles.css'),
        '__PLANNING_STYLES__': read_source('planning.css'),
        '__DATA__': json.dumps(data, ensure_ascii=False, separators=(',', ':')).replace('</', '<\\/'),
        '__ENGINE__': inline_script(read_source('domain/engine.js')),
        '__PERSISTENCE__': inline_script(read_source('core/persistence.js')),
        '__APP__': inline_script('(function () {\n' + application + '\n})();'),
    }
    content = read_source('shell.html')
    for marker, value in values.items():
        if content.count(marker) != 1:
            raise ValueError('Template marker must appear exactly once: ' + marker)
        content = content.replace(marker, value)
    output = Path(output).resolve()
    output.parent.mkdir(parents=True, exist_ok=True)
    output.write_text(content, encoding='utf-8')
    return output


def build_pwa(directory):
    """Keep application modules intact and add the installable app shell."""
    directory = Path(directory).resolve()
    output = build(directory / 'index.html')
    assets = SOURCE / 'pwa'
    version = (assets / 'version.txt').read_text(encoding='utf-8').strip()
    content = output.read_text(encoding='utf-8')
    content = content.replace('initial-scale=1', 'initial-scale=1, viewport-fit=cover', 1)
    head = '''
<meta name="description" content="時間割・履修履歴・卒業要件を確認できる履修登録シミュレーター。端末内保存とオフライン起動に対応。">
<meta name="theme-color" content="#173e49">
<meta name="mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-status-bar-style" content="default">
<meta name="apple-mobile-web-app-title" content="履修プラン">
<link rel="manifest" href="./manifest.webmanifest">
<link rel="icon" type="image/png" sizes="192x192" href="./icons/icon-192.png">
<link rel="apple-touch-icon" sizes="180x180" href="./icons/apple-touch-icon.png">
<link rel="stylesheet" href="./pwa.css">
'''
    content = content.replace('</head>', head + '</head>', 1)
    content = content.replace('<div class="top-actions">', '<div class="top-actions"><button class="link-btn pwa-menu" id="pwaMenu" type="button" aria-haspopup="dialog">アプリ</button>', 1)
    panel = (assets / 'panel.html').read_text(encoding='utf-8').replace('__PWA_VERSION__', version)
    content = content.replace('</body>', panel + '\n<script src="./pwa.js" defer></script>\n</body>', 1)
    output.write_text(content, encoding='utf-8')
    for name in ('manifest.webmanifest', 'pwa.js', 'pwa.css'):
        value = (assets / name).read_text(encoding='utf-8').replace('__PWA_VERSION__', version)
        (directory / name).write_text(value, encoding='utf-8')
    shutil.copytree(assets / 'icons', directory / 'icons', dirs_exist_ok=True)
    worker_template = (assets / 'sw.js').read_text(encoding='utf-8')
    digest = hashlib.sha256(worker_template.encode('utf-8'))
    files = [output, *(directory / name for name in ('manifest.webmanifest', 'pwa.js', 'pwa.css')), *sorted((directory / 'icons').glob('*'))]
    for asset in files:
        digest.update(asset.relative_to(directory).as_posix().encode('utf-8'))
        digest.update(asset.read_bytes())
    revision = version + '-' + digest.hexdigest()[:12]
    (directory / 'sw.js').write_text(worker_template.replace('__PWA_CACHE_REVISION__', revision), encoding='utf-8')
    return output


if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('--output', type=Path, help='元の単独HTMLを生成する場合の出力ファイル')
    parser.add_argument('--pwa-dir', type=Path, default=ROOT.parent)
    args = parser.parse_args()
    path = build(args.output) if args.output else build_pwa(args.pwa_dir)
    print(f'HTML saved: {path.name}, {path.stat().st_size:,} bytes')
