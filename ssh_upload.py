import os
import stat
import posixpath
from pathlib import Path

import paramiko
from dotenv import load_dotenv

import re
from datetime import datetime
import shutil

# lista de arquivos e diretórios locais pra subir
items_to_upload = [
    "./home.php",
    "./app",
]

# diretório destino no servidor
remote_base_dir = "/var/www/html/msclogs/"


def env_required(name: str) -> str:
    v = os.getenv(name)
    if not v:
        raise RuntimeError(f"Variável obrigatória ausente no .env: {name}")
    return v


def should_upload_file(
    sftp: paramiko.SFTPClient,
    local_file: Path,
    remote_file: str,
    *,
    compare_mtime: bool = True,
    compare_size: bool = False,
    mtime_grace_seconds: int = 2,  # tolerância p/ diferenças de FS/clock
) -> bool:
    try:
        rst = sftp.stat(remote_file)  # remoto existe
    except FileNotFoundError:
        return True  # não existe → sobe

    lst = local_file.stat()

    if compare_size and lst.st_size != rst.st_size:
        return True

    if compare_mtime:
        # Paramiko retorna st_mtime como epoch seconds (UTC)
        # Local também é epoch seconds
        if (lst.st_mtime - rst.st_mtime) > mtime_grace_seconds:
            return True

    return False


def sftp_mkdir_p(sftp: paramiko.SFTPClient, remote_dir: str) -> None:
    # cria recursivamente (POSIX path)
    remote_dir = remote_dir.rstrip("/")
    if remote_dir == "":
        return

    parts = remote_dir.split("/")
    cur = ""
    for p in parts:
        if not p:
            continue
        cur = f"{cur}/{p}" if cur else f"/{p}" if remote_dir.startswith("/") else p
        try:
            sftp.stat(cur)
        except FileNotFoundError:
            sftp.mkdir(cur)


def is_remote_dir(sftp: paramiko.SFTPClient, remote_path: str) -> bool:
    try:
        st = sftp.stat(remote_path)
        return stat.S_ISDIR(st.st_mode)
    except FileNotFoundError:
        return False


def upload_file(sftp: paramiko.SFTPClient, local_file: Path, remote_file: str) -> None:
    # build gera arquivos "novos", mas ainda vale pular upload se não mudou no servidor
    # (deixa ligado por padrão, usando mtime do arquivo buildado)
    #if not should_upload_file(sftp, local_file, remote_file):
        # print(f"[SKIP] {local_file} (sem mudanças)")
    #    return

    print(f"[UPLOAD] arquivo: {local_file} -> {remote_file}")

    remote_parent = posixpath.dirname(remote_file)
    if remote_parent:
        sftp_mkdir_p(sftp, remote_parent)

    sftp.put(str(local_file), remote_file)


def upload_dir(
    sftp: paramiko.SFTPClient,
    local_dir: Path,
    remote_dir: str,
) -> None:
    # print(f"[UPLOAD] diretório: {local_dir} -> {remote_dir}/")

    sftp_mkdir_p(sftp, remote_dir)

    for root, dirs, files in os.walk(local_dir):
        root_path = Path(root)
        rel = root_path.relative_to(local_dir)  # subpasta dentro do local_dir
        remote_root = remote_dir if str(rel) == "." else posixpath.join(remote_dir, rel.as_posix())

        # cria subpastas no remoto
        for d in dirs:
            sftp_mkdir_p(sftp, posixpath.join(remote_root, d))

        # envia arquivos
        for f in files:
            lf = root_path / f
            rf = posixpath.join(remote_root, f)
            upload_file(sftp, lf, rf)


def normalize_remote_base(remote_base: str) -> str:
    # aceita "/var/www/app" ou "var/www/app" -> mantém como POSIX
    remote_base = remote_base.strip()
    if remote_base.endswith("/"):
        remote_base = remote_base[:-1]
    return remote_base


def upload_items(
    sftp: paramiko.SFTPClient,
    items: list[str],
    remote_base: str,
) -> None:
    remote_base = normalize_remote_base(remote_base)
    sftp_mkdir_p(sftp, remote_base)

    for item in items:
        p = Path(item).expanduser().resolve()
        if not p.exists():
            raise FileNotFoundError(f"Item não existe: {p}")

        # destino no remoto: remote_base/<nome_do_item>
        remote_target = posixpath.join(remote_base, p.name)

        if p.is_file():
            upload_file(sftp, p, remote_target)
        elif p.is_dir():
            upload_dir(sftp, p, remote_target)
        else:
            raise RuntimeError(f"Tipo não suportado (nem arquivo nem pasta): {p}")


# ---------------- BUILD (placeholder) ----------------

PLACEHOLDER_BUILD_VERSION = "__PLACEHOLDER_BUILD_VERSION__"


def _try_read_text(path: Path) -> tuple[str | None, str | None]:
    # tenta ler como texto (sem inventar muito). se falhar, não altera.
    try:
        return path.read_text(encoding="utf-8"), "utf-8"
    except UnicodeDecodeError:
        try:
            return path.read_text(encoding="latin-1"), "latin-1"
        except UnicodeDecodeError:
            return None, None


def replace_placeholder_in_file(file_path: Path, build_version: str) -> None:
    text, enc = _try_read_text(file_path)
    if text is None:
        return

    if PLACEHOLDER_BUILD_VERSION not in text:
        return

    file_path.write_text(text.replace(PLACEHOLDER_BUILD_VERSION, build_version), encoding=enc)


def prepare_build(items: list[str], build_dir: Path, build_version: str) -> list[str]:
    """
    Copia todos os itens para build/<nome_do_item> e substitui
    __PLACEHOLDER_BUILD_VERSION__ -> build_version em todos os arquivos de texto.
    Retorna a nova lista de items para upload (apontando para build).
    """
    if build_dir.exists():
        shutil.rmtree(build_dir)
    build_dir.mkdir(parents=True, exist_ok=True)

    build_items: list[str] = []

    for item in items:
        src = Path(item).expanduser().resolve()
        if not src.exists():
            raise FileNotFoundError(f"Item não existe: {src}")

        dst = build_dir / src.name
        build_items.append(str(dst))

        if src.is_file():
            dst.parent.mkdir(parents=True, exist_ok=True)
            shutil.copy2(src, dst)  # preserva mtime/metadata
        elif src.is_dir():
            shutil.copytree(src, dst, dirs_exist_ok=True)
        else:
            raise RuntimeError(f"Tipo não suportado (nem arquivo nem pasta): {src}")

    # substitui placeholder em tudo dentro do build/
    for f in build_dir.rglob("*"):
        if f.is_file():
            replace_placeholder_in_file(f, build_version)

    return build_items


def main() -> None:
    load_dotenv()

    # timestamp único do build (mesma versão pra tudo)
    build_version = datetime.now().strftime("%Y%m%d-%H%M%S")
    build_dir = Path("./build").resolve()

    # monta build/ com placeholder substituído
    build_items_to_upload = prepare_build(items_to_upload, build_dir, build_version)

    host = env_required("SSH_HOST")
    port = int(os.getenv("SSH_PORT", "22"))
    user = env_required("SSH_USER")
    passwd = env_required("SSH_PASS")

    client = paramiko.SSHClient()
    client.set_missing_host_key_policy(paramiko.AutoAddPolicy())

    print(f"[BUILD] pasta: {build_dir}")
    print(f"[BUILD] versão: {build_version}")
    print(f"[SSH] conectando em {user}@{host}:{port} ...")
    client.connect(
        hostname=host,
        port=port,
        username=user,
        password=passwd,
        timeout=20,
        auth_timeout=20,
        banner_timeout=20,
    )

    try:
        sftp = client.open_sftp()
        try:
            upload_items(sftp, build_items_to_upload, remote_base_dir)
            print("[OK] upload finalizado.")
        finally:
            sftp.close()
    finally:
        client.close()


if __name__ == "__main__":
    main()