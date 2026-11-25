#!/usr/bin/env python3
"""claude-harness: contract-gated, worktree-isolated, receipt-signed task runner.

One file, standard library only. Every command records to the decision ledger.
Run `python3 harness/harness.py help` for the command list.
"""
from __future__ import annotations

import fnmatch
import hashlib
import hmac
import json
import os
import re
import secrets
import shlex
import subprocess
import sys
import time
from pathlib import Path

# ---------------------------------------------------------------- paths


def repo_root() -> Path:
    """Main repo root, even when called from inside a worktree."""
    try:
        common = subprocess.run(
            ["git", "rev-parse", "--path-format=absolute", "--git-common-dir"],
            capture_output=True, text=True, check=True,
        ).stdout.strip()
        return Path(common).parent
    except Exception:
        env = os.environ.get("CLAUDE_PROJECT_DIR")
        return Path(env) if env else Path.cwd()


ROOT = repo_root()
CLAUDE_DIR = ROOT / ".claude"
CONTRACTS = CLAUDE_DIR / "contracts"
STATE = CLAUDE_DIR / "state"
RECEIPTS = CLAUDE_DIR / "receipts"
LEDGER = STATE / "decision_ledger.jsonl"
ACTIVE = STATE / "active_task"
FROZEN = STATE / "FROZEN"
WORKTREES = ROOT / ".agent_worktrees"
KEY_PATH = Path(os.environ.get(
    "HARNESS_KEY_PATH", Path.home() / ".config" / "claude-harness" / "receipt.key"))

SECRETS_AND_LOCKS = [
    ".env", ".env.*", "*.pem", "*.key", "id_rsa*", "secrets/**", "**/secrets/**",
    "package-lock.json", "yarn.lock", "pnpm-lock.yaml", "poetry.lock", "uv.lock",
    "Cargo.lock", "Gemfile.lock", "go.sum", "composer.lock",
]
# harness internals may never change inside a task worktree
DEFAULT_FORBIDDEN = SECRETS_AND_LOCKS + [
    ".claude/**", "harness/**", "bin/**", ".githooks/**", "CLAUDE.md", "evals/**",
]
TAIL_LINES = 40  # never stream megabytes of output into chat


# ---------------------------------------------------------------- utils


def die(msg: str, code: int = 1) -> None:
    print(f"harness: {msg}", file=sys.stderr)
    sys.exit(code)


def now() -> str:
    return time.strftime("%Y-%m-%dT%H:%M:%S%z")


def ledger(event: str, **data) -> None:
    STATE.mkdir(parents=True, exist_ok=True)
    rec = {"ts": now(), "task": active_task(), "event": event, **data}
    with LEDGER.open("a") as f:
        f.write(json.dumps(rec, sort_keys=True) + "\n")


def active_task() -> str | None:
    return ACTIVE.read_text().strip() if ACTIVE.exists() else None


def need_active() -> str:
    t = active_task()
    if not t:
        die("no active task. Run: harness new-task <ID> \"<title>\"")
    return t


def task_dir(tid: str) -> Path:
    d = STATE / f"task-{tid}"
    d.mkdir(parents=True, exist_ok=True)
    return d


def contract_path(tid: str) -> Path:
    return CONTRACTS / f"task-{tid}.json"


def load_contract(tid: str) -> dict:
    p = contract_path(tid)
    if not p.exists():
        die(f"contract missing: {p.relative_to(ROOT)}")
    return json.loads(p.read_text())


def worktree(tid: str) -> Path:
    return WORKTREES / f"task-{tid}"


def git(*args, cwd: Path | None = None, check=True) -> str:
    r = subprocess.run(["git", *args], cwd=cwd or ROOT, capture_output=True, text=True)
    if check and r.returncode != 0:
        die(f"git {' '.join(args)} failed:\n{r.stderr.strip()}")
    return r.stdout


def tail(text: str, n: int = TAIL_LINES) -> str:
    lines = text.splitlines()
    if len(lines) <= n:
        return text
    return f"... ({len(lines) - n} lines omitted, full log on disk)\n" + "\n".join(lines[-n:])


def match_any(rel: str, patterns: list[str]) -> bool:
    rel = rel.lstrip("./")
    base = rel.rsplit("/", 1)[-1]
    for p in patterns:
        if fnmatch.fnmatch(rel, p) or fnmatch.fnmatch(base, p):
            return True
        if p.endswith("/**") and (rel == p[:-3] or rel.startswith(p[:-2])):
            return True
    return False


def forbidden_list(c: dict) -> list[str]:
    return DEFAULT_FORBIDDEN + list(c.get("forbidden", []))


# ---------------------------------------------------------------- diff + receipts


def stage_all(wt: Path) -> None:
    git("add", "-A", cwd=wt)


def diff_info(tid: str) -> tuple[str, list[str], str]:
    """(sha256 of staged binary diff vs base, changed files, diff text)."""
    wt = worktree(tid)
    base = (task_dir(tid) / "base").read_text().strip()
    stage_all(wt)
    d = git("diff", "--cached", "--binary", base, cwd=wt)
    files = [f for f in git("diff", "--cached", "--name-only", base, cwd=wt).splitlines() if f]
    return hashlib.sha256(d.encode()).hexdigest(), files, d


def check_paths(c: dict, files: list[str]) -> list[str]:
    bad = []
    for f in files:
        if match_any(f, forbidden_list(c)):
            bad.append(f"{f} (forbidden)")
        elif not match_any(f, c["allowed_paths"]):
            bad.append(f"{f} (outside allowed_paths)")
    return bad


def key() -> bytes:
    if not KEY_PATH.exists():
        die(f"no signing key at {KEY_PATH}. Run: harness init")
    return KEY_PATH.read_bytes().strip()


def sign_payload(payload: dict) -> str:
    body = json.dumps(payload, sort_keys=True, separators=(",", ":")).encode()
    return hmac.new(key(), body, hashlib.sha256).hexdigest()


# ---------------------------------------------------------------- breaker


def signature(output: str) -> str:
    keep = [l for l in output.splitlines()
            if re.search(r"error|fail|assert|traceback|exception|panic", l, re.I)][-20:]
    norm = "\n".join(keep) or output[-2000:]
    norm = re.sub(r"0x[0-9a-f]+|\b[0-9a-f]{7,40}\b|\d+(\.\d+)?", "N", norm, flags=re.I)
    norm = re.sub(r"/[^\s:'\"]+", "PATH", norm)
    return hashlib.sha256(norm.encode()).hexdigest()[:16]


def trip(tid: str, reason: str) -> None:
    td = task_dir(tid)
    cp = (td / "checkpoint").read_text().strip() if (td / "checkpoint").exists() else None
    base = (td / "base").read_text().strip()
    target = cp or base
    wt = worktree(tid)
    stage_all(wt)
    git("read-tree", "-u", "--reset", target, cwd=wt)
    git("reset", "-q", cwd=wt)
    FROZEN.write_text(json.dumps({"task": tid, "reason": reason, "rolled_back_to": target,
                                  "ts": now()}, indent=2))
    ledger("breaker_tripped", reason=reason, rolled_back_to=target)
    print(f"\n!!! CIRCUIT BREAKER TRIPPED: {reason}\n"
          f"!!! worktree rolled back to {target[:12]} ({'checkpoint' if cp else 'base'}).\n"
          f"!!! Execution frozen. A human must run: harness unfreeze", file=sys.stderr)
    sys.exit(3)


# ---------------------------------------------------------------- commands


def cmd_init(_):
    KEY_PATH.parent.mkdir(parents=True, exist_ok=True)
    if not KEY_PATH.exists():
        KEY_PATH.write_text(secrets.token_hex(32))
        os.chmod(KEY_PATH, 0o600)
        print(f"created signing key {KEY_PATH} (outside the repo, never committed)")
    git("config", "core.hooksPath", ".githooks")
    for d in (CONTRACTS, STATE, RECEIPTS, WORKTREES):
        d.mkdir(parents=True, exist_ok=True)
    print("git hooks path -> .githooks ; harness ready")


def cmd_new_task(a):
    if len(a) < 2:
        die('usage: harness new-task <ID> "<title>"')
    tid, title = a[0], " ".join(a[1:])
    if not re.fullmatch(r"[A-Za-z0-9_-]{1,40}", tid):
        die("task ID must be letters, digits, - or _")
    p = contract_path(tid)
    if p.exists():
        die(f"contract already exists: {p.relative_to(ROOT)}")
    c = json.loads((CONTRACTS / "task_contract.template.json").read_text())
    c.update(task_id=tid, title=title)
    CONTRACTS.mkdir(parents=True, exist_ok=True)
    p.write_text(json.dumps(c, indent=2) + "\n")
    STATE.mkdir(parents=True, exist_ok=True)
    ACTIVE.write_text(tid)
    ledger("contract_drafted", title=title)
    print(f"drafted {p.relative_to(ROOT)} — fill scope, allowed_paths, acceptance_criteria, "
          f"then get the human's OK and run: harness start")


def validate(c: dict) -> list[str]:
    errs = []
    for k in ("task_id", "scope", "allowed_paths", "acceptance_criteria", "budget"):
        if not c.get(k):
            errs.append(f"missing {k}")
    for p in c.get("allowed_paths", []):
        if p.strip("/*") == "" or p.split("/")[0] in (".claude", "harness", "bin", ".githooks", "evals"):
            errs.append(f"allowed_paths too broad or covers harness internals: {p}")
    return errs


def cmd_start(a):
    tid = a[0] if a else need_active()
    c = load_contract(tid)
    errs = validate(c)
    if errs:
        die("contract invalid:\n  " + "\n  ".join(errs))
    wt = worktree(tid)
    if wt.exists():
        die(f"worktree already exists: {wt.relative_to(ROOT)}")
    git("worktree", "add", "-q", str(wt), "-b", f"feat/task-{tid}")
    base = git("rev-parse", "HEAD", cwd=wt).strip()
    td = task_dir(tid)
    (td / "base").write_text(base)
    (td / "turns").write_text("0")
    (td / "contract.lock").write_text(hashlib.sha256(contract_path(tid).read_bytes()).hexdigest())
    ACTIVE.write_text(tid)
    ledger("worktree_created", base=base, path=str(wt.relative_to(ROOT)))
    print(f"contract locked. worktree {wt.relative_to(ROOT)} on feat/task-{tid} from {base[:12]}")


def contract_unchanged(tid: str) -> None:
    lock = task_dir(tid) / "contract.lock"
    if lock.exists() and lock.read_text() != hashlib.sha256(contract_path(tid).read_bytes()).hexdigest():
        die("contract changed after lock — tampering refused. Ask the human.")


def cmd_test(_):
    tid = need_active()
    if FROZEN.exists():
        die("frozen by circuit breaker. A human must run: harness unfreeze", 3)
    contract_unchanged(tid)
    c = load_contract(tid)
    td, wt = task_dir(tid), worktree(tid)
    turns = int((td / "turns").read_text()) + 1
    (td / "turns").write_text(str(turns))
    max_turns = int(c["budget"].get("max_turns", 12))

    digest, files, _ = diff_info(tid)
    bad = check_paths(c, files)
    radius = c.get("blast_radius", {})
    over = len(files) > int(radius.get("max_files", 5)) and not radius.get("approved_by_human")

    log = td / f"test-{turns:02d}.log"
    results, out_all = [], []
    for cmd in c["acceptance_criteria"]:
        r = subprocess.run(cmd, shell=True, cwd=wt, capture_output=True, text=True, timeout=900)
        out = f"$ {cmd}\n{r.stdout}{r.stderr}[exit {r.returncode}]\n"
        out_all.append(out)
        results.append({"cmd": cmd, "exit": r.returncode})
    raw = "".join(out_all)
    log.write_text(raw)
    green = all(x["exit"] == 0 for x in results) and not bad and not over
    print(tail(raw))
    print(f"--- turn {turns}/{max_turns} | files changed {len(files)} | diff {digest[:12]} | log {log.relative_to(ROOT)}")
    if bad:
        print("PATH VIOLATIONS:\n  " + "\n  ".join(bad))
    if over:
        print(f"BLAST RADIUS {len(files)} files > {radius.get('max_files', 5)}: needs the human's OK "
              f"(they run: harness approve-blast)")
    last = {"diff": digest, "green": green, "results": results,
            "log_sha256": hashlib.sha256(raw.encode()).hexdigest(), "log": str(log.relative_to(ROOT))}
    (td / "last_test.json").write_text(json.dumps(last, indent=2))
    ledger("test_run", turn=turns, green=green, diff=digest, results=results, files=len(files))

    if green:
        tree = git("write-tree", cwd=wt).strip()
        base = (td / "base").read_text().strip()
        commit = git("commit-tree", tree, "-p", base, "-m", f"checkpoint task-{tid} turn {turns}",
                     cwd=wt).strip()
        git("update-ref", f"refs/harness/task-{tid}/checkpoint", commit, cwd=wt)
        (td / "checkpoint").write_text(commit)
        ledger("checkpoint", commit=commit)
        print(f"GREEN. checkpoint {commit[:12]}. Next: harness review-pack (then hand to skeptic)")
        return
    sig = signature(raw if not bad else "\n".join(bad))
    sigs_p = td / "signatures.json"
    sigs = json.loads(sigs_p.read_text()) if sigs_p.exists() else {}
    sigs[sig] = sigs.get(sig, 0) + 1
    sigs_p.write_text(json.dumps(sigs))
    limit = int(c.get("breaker", {}).get("same_error_limit", 3))
    print(f"RED. error signature {sig} seen {sigs[sig]}/{limit}")
    if sigs[sig] >= limit:
        trip(tid, f"same error signature {sig} hit {sigs[sig]} times")
    if turns >= max_turns:
        trip(tid, f"turn budget exhausted ({turns}/{max_turns})")
    sys.exit(1)


def cmd_review_pack(_):
    tid = need_active()
    c = load_contract(tid)
    digest, files, d = diff_info(tid)
    rp = task_dir(tid) / "review"
    rp.mkdir(exist_ok=True)
    (rp / "diff.patch").write_text(d)
    (rp / "contract.json").write_text(json.dumps(c, indent=2))
    (rp / "DIFF_SHA256").write_text(digest)
    ledger("review_pack", diff=digest, files=files)
    print(f"review pack: {rp.relative_to(ROOT)}  (diff {digest[:12]}, {len(files)} files)\n"
          f"Give the skeptic ONLY this folder path — no author notes.")


def cmd_verdict(_):
    tid = need_active()
    text = sys.stdin.read()
    digest, _, _ = diff_info(tid)
    packed = (task_dir(tid) / "review" / "DIFF_SHA256")
    if not packed.exists() or packed.read_text() != digest:
        die("diff changed since review pack — re-run harness review-pack and re-review")
    approved = bool(re.search(r"^STATUS: APPROVED\s*$", text, re.M))
    (task_dir(tid) / "verdict.json").write_text(json.dumps(
        {"diff": digest, "approved": approved, "text": text, "ts": now()}, indent=2))
    ledger("verdict", approved=approved, diff=digest)
    print("STATUS: APPROVED recorded" if approved else "REJECTED recorded — builder must regenerate")
    sys.exit(0 if approved else 1)


def cmd_sign(_):
    tid = need_active()
    contract_unchanged(tid)
    td = task_dir(tid)
    digest, files, _ = diff_info(tid)
    lt = json.loads((td / "last_test.json").read_text()) if (td / "last_test.json").exists() else {}
    vd = json.loads((td / "verdict.json").read_text()) if (td / "verdict.json").exists() else {}
    problems = []
    if not lt.get("green") or lt.get("diff") != digest:
        problems.append("no green test run for the current diff (run: harness test)")
    if not vd.get("approved") or vd.get("diff") != digest:
        problems.append("no skeptic STATUS: APPROVED for the current diff")
    if problems:
        die("refusing to sign:\n  " + "\n  ".join(problems))
    payload = {
        "task_id": tid, "base": (td / "base").read_text().strip(), "diff_sha256": digest,
        "files": files, "tests": lt["results"], "test_log_sha256": lt["log_sha256"],
        "verdict_sha256": hashlib.sha256(vd["text"].encode()).hexdigest(),
        "contract_sha256": hashlib.sha256(contract_path(tid).read_bytes()).hexdigest(),
        "signed_at": now(),
    }
    receipt = {**payload, "hmac_sha256": sign_payload(payload)}
    RECEIPTS.mkdir(parents=True, exist_ok=True)
    p = RECEIPTS / f"receipt-{tid}.json"
    p.write_text(json.dumps(receipt, indent=2) + "\n")
    ledger("receipt_signed", diff=digest)
    print(f"signed {p.relative_to(ROOT)}")


def verify(tid: str, digest: str) -> str | None:
    p = RECEIPTS / f"receipt-{tid}.json"
    if not p.exists():
        return f"no receipt {p.relative_to(ROOT)}"
    r = json.loads(p.read_text())
    sig = r.pop("hmac_sha256", "")
    if not hmac.compare_digest(sig, sign_payload(r)):
        return "receipt signature invalid (edited or forged)"
    if r["diff_sha256"] != digest:
        return "staged diff differs from the signed diff"
    return None


def cmd_pre_commit(_):
    branch = git("rev-parse", "--abbrev-ref", "HEAD", cwd=Path.cwd()).strip()
    m = re.fullmatch(r"feat/task-(.+)", branch)
    if not m:
        return  # main and other branches: not task commits
    tid = m.group(1)
    base = (task_dir(tid) / "base").read_text().strip()
    d = git("diff", "--cached", "--binary", base, cwd=Path.cwd())
    err = verify(tid, hashlib.sha256(d.encode()).hexdigest())
    if err:
        die(f"COMMIT BLOCKED — {err}. No receipt, no commit.")
    print(f"receipt OK for task-{tid}")


def cmd_finish(_):
    tid = need_active()
    c = load_contract(tid)
    digest, _, _ = diff_info(tid)
    err = verify(tid, digest)
    if err:
        die(err)
    wt = worktree(tid)
    msg = f"feat(task-{tid}): {c.get('title', '')}\n\nReceipt: .claude/receipts/receipt-{tid}.json\nDiff-SHA256: {digest}"
    r = subprocess.run(["git", "commit", "-q", "-m", msg], cwd=wt, capture_output=True, text=True)
    if r.returncode != 0:
        die(r.stdout + r.stderr)
    h = git("rev-parse", "HEAD", cwd=wt).strip()
    ledger("committed", commit=h)
    print(f"committed {h[:12]} on feat/task-{tid}. Architect next: harness merge")


def cmd_merge(_):
    tid = need_active()
    c = load_contract(tid)
    if git("status", "--porcelain", "--untracked-files=no").strip():
        die("main worktree has uncommitted tracked changes; commit or stash first")
    git("merge", "--squash", f"feat/task-{tid}")
    out = []
    for cmd in c["acceptance_criteria"]:
        r = subprocess.run(cmd, shell=True, cwd=ROOT, capture_output=True, text=True, timeout=900)
        out.append(f"$ {cmd}\n{r.stdout}{r.stderr}[exit {r.returncode}]")
        if r.returncode != 0:
            git("reset", "-q", "--hard", "HEAD")
            print(tail("\n".join(out)))
            ledger("merge_aborted", cmd=cmd)
            die("acceptance failed on main after squash — merge aborted, main untouched")
    print(tail("\n".join(out)))
    git("add", "-f", str(RECEIPTS / f"receipt-{tid}.json"), str(contract_path(tid)))
    git("commit", "-q", "-m", f"feat(task-{tid}): {c.get('title', '')} (squashed, receipt-verified)")
    git("worktree", "remove", "--force", str(worktree(tid)))
    ACTIVE.unlink(missing_ok=True)
    ledger("merged", commit=git("rev-parse", "HEAD").strip())
    print(f"squash-merged task-{tid} into {git('rev-parse', '--abbrev-ref', 'HEAD').strip()}; worktree removed")


def cmd_abort(_):
    tid = need_active()
    wt = worktree(tid)
    if wt.exists():
        git("worktree", "remove", "--force", str(wt))
    git("branch", "-D", f"feat/task-{tid}", check=False)
    ACTIVE.unlink(missing_ok=True)
    ledger("aborted")
    print(f"task-{tid} worktree wiped; main untouched")


def cmd_unfreeze(_):
    FROZEN.unlink(missing_ok=True)
    tid = active_task()
    if tid:
        sp = task_dir(tid) / "signatures.json"
        sp.unlink(missing_ok=True)
        (task_dir(tid) / "turns").write_text("0")
    ledger("unfrozen_by_human")
    print("unfrozen; turn and error counters reset")


def cmd_approve_blast(_):
    tid = need_active()
    p = contract_path(tid)
    c = json.loads(p.read_text())
    c.setdefault("blast_radius", {})["approved_by_human"] = True
    p.write_text(json.dumps(c, indent=2) + "\n")
    (task_dir(tid) / "contract.lock").write_text(hashlib.sha256(p.read_bytes()).hexdigest())
    ledger("blast_radius_approved_by_human")
    print("blast radius approved")


def cmd_status(_):
    tid = active_task()
    print(f"active task: {tid or '-'}")
    if FROZEN.exists():
        print("FROZEN:", FROZEN.read_text())
    if tid:
        td = task_dir(tid)
        c = load_contract(tid)
        turns = (td / "turns").read_text() if (td / "turns").exists() else "0"
        print(f"turns {turns}/{c['budget'].get('max_turns')} | budget cap ${c['budget'].get('max_usd')} "
              f"(check /cost — dollars are not metered by the harness)")
        for f in ("base", "checkpoint"):
            if (td / f).exists():
                print(f"{f}: {(td / f).read_text().strip()[:12]}")


LESSONS_HEADER = "## Learned rules (flywheel — appended by `harness lesson`)"


def cmd_lesson(a):
    if not a:
        die('usage: harness lesson "<rule>" [--eval <script.sh>]')
    rule, ev = a[0], None
    if "--eval" in a:
        ev = Path(a[a.index("--eval") + 1])
    md = ROOT / "CLAUDE.md"
    text = md.read_text()
    if LESSONS_HEADER not in text:
        text += f"\n{LESSONS_HEADER}\n"
    text = text.rstrip("\n") + f"\n- {rule}\n"
    if len(text.splitlines()) > 150:
        die("CLAUDE.md would exceed 150 lines — merge or prune rules first")
    md.write_text(text)
    if ev:
        dest = ROOT / "evals" / "regressions" / ev.name
        dest.write_bytes(ev.read_bytes())
        os.chmod(dest, 0o755)
    ledger("lesson", rule=rule, eval=ev.name if ev else None)
    print("rule added to CLAUDE.md" + (f"; regression eval evals/regressions/{ev.name}" if ev else ""))


def cmd_evals(_):
    d = ROOT / "evals" / "regressions"
    scripts = sorted(d.glob("*.sh")) if d.exists() else []
    failed = 0
    for s in scripts:
        r = subprocess.run(["bash", str(s)], cwd=Path.cwd(), capture_output=True, text=True)
        print(f"{'PASS' if r.returncode == 0 else 'FAIL'}  {s.name}")
        if r.returncode:
            failed += 1
            print(tail(r.stdout + r.stderr, 15))
    print(f"{len(scripts) - failed}/{len(scripts)} regression evals passed")
    sys.exit(1 if failed else 0)


# ---------------------------------------------------------------- hooks

INSTALL_RE = re.compile(
    r"\b(?:npm\s+(?:i|install|add)|yarn\s+add|pnpm\s+(?:add|install|i)|bun\s+add|"
    r"pip3?\s+install|uv\s+(?:add|pip\s+install)|poetry\s+add|cargo\s+add|go\s+get|gem\s+install)"
    r"((?:\s+[^\s;&|]+)*)")
SECRET_RE = re.compile(r"(^|[\s/'\"=])\.env(\.[\w.-]+)?\b|receipt\.key|\.config/claude-harness|id_rsa|\.pem\b")
HUMAN_ONLY = re.compile(r"harness(\.py)?\s+(unfreeze|approve-blast|init)\b")


def bash_block_reason(cmd: str, agent: str | None, c: dict | None) -> str | None:
    if re.search(r"\brm\s+(-[a-zA-Z]*r[a-zA-Z]*f|-[a-zA-Z]*f[a-zA-Z]*r|--recursive\s+--force|--force\s+--recursive|-r\s+-f|-f\s+-r)\b", cmd):
        return "rm -rf is blocked. Use `harness abort` to wipe a worktree."
    if re.search(r"\bgit\s+push\b.*(\s--force\b|\s-f\b|--force-with-lease|\s\+\S)", cmd):
        return "force push is blocked."
    if re.search(r"--no-verify\b|\bgit\s+commit\b.*\s-n\b", cmd):
        return "skipping git hooks is blocked (receipt gate)."
    if re.search(r"\bgit\s+(reset\s+--hard|clean\s+-[a-z]*f|update-ref|config\s+core\.hooksPath)", cmd):
        return "destructive/hook-altering git command blocked — use harness commands."
    if SECRET_RE.search(cmd):
        return "command touches secrets (.env/keys). Secrets stay out of context."
    if HUMAN_ONLY.search(cmd):
        return "that harness command is human-only. Ask the user to run it in their terminal."
    if re.search(r"harness(\.py)?\s+verdict\b", cmd) and agent != "skeptic":
        return "only the skeptic subagent may record a verdict (self-approval is forbidden)."
    if agent == "builder" and re.search(r"harness(\.py)?\s+(sign|finish|merge|review-pack|lesson|new-task|start)\b", cmd):
        return "builder may only run `harness test` and project commands."
    m = INSTALL_RE.search(cmd)
    if m:
        pkgs = [p for p in m.group(1).split() if not p.startswith("-")]
        approved = set((c or {}).get("approved_dependencies", []))
        unapproved = [p for p in pkgs if re.split(r"[=<>@\[]", p)[0] not in approved
                      and not p.startswith(("requirements", "."))]
        if unapproved or (not pkgs and not approved):
            return f"unapproved dependency install {unapproved or '(bare install)'}; add to approved_dependencies with the human's OK."
    for tgt in re.findall(r"(?:>>?|\btee\s+(?:-a\s+)?)\s*([^\s;&|]+)", cmd) + \
            re.findall(r"\bsed\s+-i\S*\s+(?:'[^']*'|\"[^\"]*\"|\S+)\s+([^\s;&|]+)", cmd):
        if tgt.startswith(("/dev/", "/tmp/", "&")) or tgt in ("/dev/null",):
            continue
        if agent == "builder":
            continue  # builder writes are checked against allowed_paths by `harness test`
        return f"shell write to {tgt} blocked; edit files with Edit/Write inside the task worktree."
    return None


def edit_block_reason(path: str, cwd: str, agent: str | None, tool: str, ti: dict) -> str | None:
    p = Path(path)
    if not p.is_absolute():
        p = Path(cwd) / p
    p = p.resolve()
    try:
        rel = p.relative_to(ROOT.resolve()).as_posix()
    except ValueError:
        return f"{p} is outside the repo."
    if match_any(rel, SECRETS_AND_LOCKS):
        return f"{rel} is a forbidden file (secrets/lockfiles)."
    if os.environ.get("HARNESS_MAINTENANCE") == "1":
        return None
    wt_prefix = ".agent_worktrees/"
    if rel.startswith(wt_prefix):
        parts = rel[len(wt_prefix):].split("/", 1)
        tid = active_task()
        if not tid or parts[0] != f"task-{tid}":
            return "edit targets a worktree that is not the active task."
        if agent != "builder":
            return "only the builder subagent writes code (architect never writes app code)."
        if FROZEN.exists():
            return "frozen by circuit breaker."
        inner = parts[1] if len(parts) > 1 else ""
        c = load_contract(tid)
        if match_any(inner, forbidden_list(c)):
            return f"{inner} is forbidden by the contract."
        if not match_any(inner, c["allowed_paths"]):
            return f"{inner} is outside allowed_paths {c['allowed_paths']}."
        return None
    if agent in ("builder", "skeptic"):
        return f"{agent} may not edit outside the task worktree."
    if rel.startswith(".claude/contracts/"):
        content = json.dumps(ti)
        if re.search(r'approved_by_human\\?"\s*:\s*true', content):
            return "only the human can approve blast radius (harness approve-blast)."
        tid = rel.rsplit("task-", 1)[-1].removesuffix(".json")
        if (STATE / f"task-{tid}" / "contract.lock").exists():
            return "contract is locked after start."
        return None
    if rel == "CLAUDE.md" or rel.startswith("evals/"):
        return None
    return (f"{rel}: unmanaged edit. Code changes happen only in the active task worktree "
            f"(harness new-task → start).")


def cmd_hook_pre(_):
    t0 = time.perf_counter()
    try:
        ev = json.load(sys.stdin)
    except Exception:
        return
    tool, ti = ev.get("tool_name", ""), ev.get("tool_input", {}) or {}
    agent, cwd = ev.get("agent_type"), ev.get("cwd") or str(ROOT)
    tid = active_task()
    c = None
    if tid and contract_path(tid).exists():
        try:
            c = json.loads(contract_path(tid).read_text())
        except Exception:
            c = None
    reason = None
    if tool == "Bash":
        cmd = ti.get("command", "")
        if FROZEN.exists() and not re.search(r"harness(\.py)?\s+status\b", cmd):
            reason = "execution frozen by circuit breaker; only `harness status` allowed until the human unfreezes."
        else:
            reason = bash_block_reason(cmd, agent, c)
    elif tool in ("Edit", "Write", "MultiEdit", "NotebookEdit"):
        path = ti.get("file_path") or ti.get("notebook_path") or ""
        reason = edit_block_reason(path, cwd, agent, tool, ti)
    elif tool in ("Read", "Grep", "Glob"):
        target = ti.get("file_path") or ti.get("path") or ti.get("pattern") or ""
        if SECRET_RE.search(" " + target) or match_any(target, [".env", ".env.*", "*.pem", "*.key"]):
            reason = "reading secrets is blocked."
    ms = (time.perf_counter() - t0) * 1000
    if reason:
        ledger("blocked", tool=tool, agent=agent, reason=reason, ms=round(ms, 1))
        print(f"BLOCKED by harness: {reason}", file=sys.stderr)
        sys.exit(2)


def cmd_hook_post_edit(_):
    try:
        ev = json.load(sys.stdin)
    except Exception:
        return
    tid = active_task()
    path = (ev.get("tool_input") or {}).get("file_path", "")
    if not tid or f".agent_worktrees/task-{tid}/" not in path:
        return
    c = load_contract(tid)
    for cmd in c.get("lint_commands", []):
        r = subprocess.run(cmd, shell=True, cwd=worktree(tid), capture_output=True, text=True, timeout=120)
        if r.returncode != 0:
            print(f"lint/typecheck failed: {cmd}\n{tail(r.stdout + r.stderr, 25)}", file=sys.stderr)
            sys.exit(2)


COMMANDS = {
    "init": cmd_init, "new-task": cmd_new_task, "start": cmd_start, "test": cmd_test,
    "review-pack": cmd_review_pack, "verdict": cmd_verdict, "sign": cmd_sign,
    "finish": cmd_finish, "merge": cmd_merge, "abort": cmd_abort, "status": cmd_status,
    "unfreeze": cmd_unfreeze, "approve-blast": cmd_approve_blast, "lesson": cmd_lesson,
    "evals": cmd_evals, "pre-commit": cmd_pre_commit,
    "hook-pre": cmd_hook_pre, "hook-post-edit": cmd_hook_post_edit,
}


def main():
    if len(sys.argv) < 2 or sys.argv[1] not in COMMANDS:
        print("commands: " + ", ".join(COMMANDS))
        sys.exit(0 if len(sys.argv) > 1 and sys.argv[1] == "help" else 2)
    COMMANDS[sys.argv[1]](sys.argv[2:])


if __name__ == "__main__":
    main()
