#!/usr/bin/env python3
# -*- coding: utf-8 -*-

import os
import time
import random
import shutil
from pathlib import Path

# =========================
# CONFIG HARDCODED
# =========================

# Arquivo original (fonte)
SRC_PATH = Path(r"./789101112/260114_0.log").resolve()  # <-- troque aqui (hardcoded)

# Nome do arquivo que vai crescer (destino) na MESMA pasta do original
DST_NAME = "tail_sim.log"

# Range aleatório do tamanho do chunk (bytes)
CHUNK_MIN_BYTES = 1
CHUNK_MAX_BYTES = 5000

# Range aleatório de delay entre escritas (segundos)
DELAY_MIN_S = 0.5
DELAY_MAX_S = 3.0

# Se True, limpa o destino ao iniciar (começa do zero)
RESET_DST_ON_START = True

# Se True, quando chegar no fim do SRC, reinicia do começo (loop infinito)
LOOP_FOREVER = False

# Intervalo aleatório extra (jitter) opcional (0 desliga)
EXTRA_JITTER_MAX_S = 0.0

# =========================
# OPCIONAIS (desligados por padrão)
# =========================

# Simula truncate/reset do arquivo destino de tempos em tempos
ENABLE_TRUNCATE_SIM = False
TRUNCATE_EVERY_MIN_S = 30
TRUNCATE_EVERY_MAX_S = 90

# Simula rotate (renomeia destino atual e cria um novo)
ENABLE_ROTATE_SIM = False
ROTATE_EVERY_MIN_S = 60
ROTATE_EVERY_MAX_S = 180
ROTATE_SUFFIX = ".1"  # tail_sim.log -> tail_sim.log.1

# =========================
# IMPLEMENTAÇÃO
# =========================

def _rand_sleep():
    delay = random.uniform(DELAY_MIN_S, DELAY_MAX_S)
    if EXTRA_JITTER_MAX_S > 0:
        delay += random.uniform(0, EXTRA_JITTER_MAX_S)
    time.sleep(delay)

def _safe_fsync(f):
    """Força flush e fsync (melhora a visibilidade do crescimento p/ leitores)."""
    f.flush()
    try:
        os.fsync(f.fileno())
    except OSError:
        # Em alguns FS/ambientes, fsync pode falhar; não é crítico p/ simulação.
        pass

def _maybe_truncate(dst_path: Path, next_truncate_at: float) -> float:
    if not ENABLE_TRUNCATE_SIM:
        return next_truncate_at
    now = time.time()
    if now >= next_truncate_at:
        print(f"[SIM] TRUNCATE: zerando {dst_path.name}")
        with open(dst_path, "wb") as f:
            _safe_fsync(f)
        # agenda o próximo truncate
        return now + random.uniform(TRUNCATE_EVERY_MIN_S, TRUNCATE_EVERY_MAX_S)
    return next_truncate_at

def _maybe_rotate(dst_path: Path, next_rotate_at: float) -> float:
    if not ENABLE_ROTATE_SIM:
        return next_rotate_at
    now = time.time()
    if now >= next_rotate_at:
        rotated = dst_path.with_name(dst_path.name + ROTATE_SUFFIX)
        print(f"[SIM] ROTATE: {dst_path.name} -> {rotated.name}")
        try:
            if rotated.exists():
                rotated.unlink()
            dst_path.rename(rotated)
        except Exception as e:
            print(f"[SIM] ROTATE falhou: {e}")
        # cria arquivo novo vazio
        with open(dst_path, "wb") as f:
            _safe_fsync(f)
        # agenda o próximo rotate
        return now + random.uniform(ROTATE_EVERY_MIN_S, ROTATE_EVERY_MAX_S)
    return next_rotate_at

def main():
    if not SRC_PATH.exists() or not SRC_PATH.is_file():
        raise SystemExit(f"Arquivo fonte não existe: {SRC_PATH}")

    dst_path = SRC_PATH.parent / DST_NAME

    print("=== Tail simulator ===")
    print(f"SRC: {SRC_PATH}")
    print(f"DST: {dst_path}")
    print(f"Chunk bytes: {CHUNK_MIN_BYTES}..{CHUNK_MAX_BYTES}")
    print(f"Delay s: {DELAY_MIN_S}..{DELAY_MAX_S}")
    print(f"Loop: {LOOP_FOREVER}")
    print(f"Reset destino no start: {RESET_DST_ON_START}")
    print(f"Truncate sim: {ENABLE_TRUNCATE_SIM}")
    print(f"Rotate sim: {ENABLE_ROTATE_SIM}")
    print("======================")

    if RESET_DST_ON_START:
        with open(dst_path, "wb") as f:
            _safe_fsync(f)

    # Agenda inicial dos eventos opcionais
    now = time.time()
    next_truncate_at = now + random.uniform(TRUNCATE_EVERY_MIN_S, TRUNCATE_EVERY_MAX_S) if ENABLE_TRUNCATE_SIM else float("inf")
    next_rotate_at = now + random.uniform(ROTATE_EVERY_MIN_S, ROTATE_EVERY_MAX_S) if ENABLE_ROTATE_SIM else float("inf")

    src_size = SRC_PATH.stat().st_size
    src_pos = 0

    while True:
        # Recarrega tamanho do SRC (caso ele mude)
        try:
            src_size = SRC_PATH.stat().st_size
        except FileNotFoundError:
            print("[WARN] SRC sumiu. Aguardando voltar...")
            time.sleep(1)
            continue

        # Eventos opcionais
        next_truncate_at = _maybe_truncate(dst_path, next_truncate_at)
        next_rotate_at = _maybe_rotate(dst_path, next_rotate_at)

        if src_pos >= src_size:
            if LOOP_FOREVER:
                print("[SIM] Fim do SRC -> reiniciando do começo")
                src_pos = 0
                # opcional: se você quiser “reiniciar” também o destino a cada loop,
                # ative reset aqui (comente/descomente):
                # with open(dst_path, "wb") as f:
                #     _safe_fsync(f)
                _rand_sleep()
                continue
            else:
                print("[SIM] Fim do SRC -> encerrando")
                break

        chunk_len = random.randint(CHUNK_MIN_BYTES, CHUNK_MAX_BYTES)
        to_read = min(chunk_len, src_size - src_pos)

        # Lê um pedaço do SRC
        with open(SRC_PATH, "rb") as sf:
            sf.seek(src_pos)
            data = sf.read(to_read)

        if not data:
            # Pode acontecer se o arquivo foi truncado no meio.
            _rand_sleep()
            continue

        # Escreve no DST em append
        with open(dst_path, "ab") as df:
            df.write(data)
            _safe_fsync(df)

        src_pos += len(data)

        # Log simples
        try:
            dst_size = dst_path.stat().st_size
        except FileNotFoundError:
            dst_size = -1
        print(f"[+] wrote {len(data):4d} bytes | src_pos={src_pos}/{src_size} | dst_size={dst_size}")

        _rand_sleep()


if __name__ == "__main__":
    main()