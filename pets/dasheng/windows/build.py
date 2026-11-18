"""Build the self-contained x64 installer with Python 3 and NSIS 3."""
import argparse
import hashlib
import json
from pathlib import Path
import shutil
import subprocess
import tempfile
import urllib.request
import zipfile

APP = Path(__file__).resolve().parents[1]
ELECTRON = "45.3.4"
SHA256 = "b177908b5c48dad990612d7861fc8f03f8c06be0ca3351383a83cc11dd8e9144"
FILES = json.loads((APP / "packaging-files.json").read_text(encoding="utf-8"))

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--electron-zip", type=Path)
    parser.add_argument("--makensis", default="makensis")
    parser.add_argument("--output", type=Path, required=True)
    args = parser.parse_args()
    target = args.output.resolve()
    target.parent.mkdir(parents=True, exist_ok=True)
    with tempfile.TemporaryDirectory() as temp:
        tmp = Path(temp)
        archive = args.electron_zip or tmp / "electron.zip"
        if not args.electron_zip:
            name = f"electron-v{ELECTRON}-win32-x64.zip"
            urllib.request.urlretrieve(f"https://github.com/electron/electron/releases/download/v{ELECTRON}/{name}", archive)
        with archive.open("rb") as stream:
            digest = hashlib.sha256()
            for block in iter(lambda: stream.read(1024*1024), b""):
                digest.update(block)
        if digest.hexdigest() != SHA256:
            raise ValueError("Electron archive checksum mismatch")
        payload = tmp / "payload"
        with zipfile.ZipFile(archive) as z:
            z.extractall(payload)
        (payload / "electron.exe").rename(payload / "DashengPet.exe")
        (payload / "resources/default_app.asar").unlink(missing_ok=True)
        for name in FILES:
            dest = payload / "resources/app" / name
            dest.parent.mkdir(parents=True, exist_ok=True)
            shutil.copy2(APP / name, dest)
        shutil.copy2(APP / "windows/pet.ico", payload / "pet.ico")
        # Remove only files shipped by this installer when uninstalling.
        deletes = []
        for item in sorted(payload.rglob("*"), key=lambda p: len(p.parts), reverse=True):
            op = "RMDir" if item.is_dir() else "Delete"
            rel = str(item.relative_to(payload)).replace("/", "\\")
            deletes.append(f'{op} "$INSTDIR\\{rel}"')
        (tmp / "remove.nsh").write_text("\n".join(deletes)+"\n",encoding="utf-8")
        shutil.copy2(APP / "windows/installer.nsi",tmp / "installer.nsi")
        subprocess.run([args.makensis,"installer.nsi"],cwd=tmp,check=True)
        shutil.copy2(tmp / "DashengPet-Setup.exe",target)

if __name__ == "__main__":
    main()
