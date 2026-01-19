import os
import stat
import posixpath
from pathlib import Path

import paramiko
from dotenv import load_dotenv

# lista de arquivos e diretórios locais pra subir
items_to_upload = [
    "./index.php",
    "./app",
]

# diretório destino no servidor
remote_base_dir = "/var/www/html/msclogs/"   


def env_required(name: str) -> str:
    v = os.getenv(name)
    if not v:
        raise RuntimeError(f"Variável obrigatória ausente no .env: {name}")
    return v


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
    # garante que a pasta remota existe
    remote_parent = posixpath.dirname(remote_file)
    if remote_parent:
        sftp_mkdir_p(sftp, remote_parent)

    sftp.put(str(local_file), remote_file)


def upload_dir(
    sftp: paramiko.SFTPClient,
    local_dir: Path,
    remote_dir: str,
) -> None:
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
            print(f"[UPLOAD] arquivo: {p} -> {remote_target}")
            upload_file(sftp, p, remote_target)
        elif p.is_dir():
            print(f"[UPLOAD] diretório: {p} -> {remote_target}/")
            upload_dir(sftp, p, remote_target)
        else:
            raise RuntimeError(f"Tipo não suportado (nem arquivo nem pasta): {p}")


def main() -> None:
    load_dotenv()

    host = env_required("SSH_HOST")
    port = int(os.getenv("SSH_PORT", "22"))
    user = env_required("SSH_USER")
    passwd = env_required("SSH_PASS")

    client = paramiko.SSHClient()
    client.set_missing_host_key_policy(paramiko.AutoAddPolicy())

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
            upload_items(sftp, items_to_upload, remote_base_dir)
            print("[OK] upload finalizado.")
        finally:
            sftp.close()
    finally:
        client.close()


if __name__ == "__main__":
    main()
