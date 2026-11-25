"""End-to-end tests for the harness. Each test runs against a fresh copy of this repo."""
import json
import os
import shutil
import statistics
import subprocess
import time
from pathlib import Path

import pytest

SRC = Path(__file__).resolve().parents[1]


def sh(cmd, cwd, env=None, inp=None, check=False):
    r = subprocess.run(cmd, cwd=cwd, shell=isinstance(cmd, str), capture_output=True, text=True,
                       env=env, input=inp)
    if check and r.returncode:
        raise AssertionError(f"{cmd} -> {r.returncode}\n{r.stdout}\n{r.stderr}")
    return r


@pytest.fixture
def repo(tmp_path):
    dst = tmp_path / "repo"
    shutil.copytree(SRC, dst, ignore=shutil.ignore_patterns(
        ".git", ".agent_worktrees", "__pycache__", ".pytest_cache", "harness_tests"))
    for d in (".claude/state", ".claude/receipts"):
        for f in (dst / d).iterdir():
            if f.name != ".gitkeep":
                f.unlink() if f.is_file() else shutil.rmtree(f)
    env = {**os.environ, "HARNESS_KEY_PATH": str(tmp_path / "key"),
           "GIT_AUTHOR_NAME": "t", "GIT_AUTHOR_EMAIL": "t@t", "GIT_COMMITTER_NAME": "t",
           "GIT_COMMITTER_EMAIL": "t@t", "CLAUDE_PROJECT_DIR": str(dst)}
    env.pop("HARNESS_MAINTENANCE", None)
    sh("git init -q -b main && git add -A && git commit -qm init", dst, env, check=True)
    sh("bin/harness init", dst, env, check=True)

    class R:
        path, e = dst, env

        def h(self, args, **kw):
            return sh(f"bin/harness {args}", kw.pop("cwd", dst), env, **kw)

        def hook(self, tool, tool_input, agent=None):
            ev = {"tool_name": tool, "tool_input": tool_input, "cwd": str(dst)}
            if agent:
                ev["agent_type"] = agent
            return sh(["python3", "harness/harness.py", "hook-pre"], dst, env, inp=json.dumps(ev))

        def contract(self, tid, **over):
            p = dst / f".claude/contracts/task-{tid}.json"
            c = json.loads(p.read_text())
            c.update(scope="test task", **over)
            p.write_text(json.dumps(c, indent=2))

        def wt(self, tid):
            return dst / f".agent_worktrees/task-{tid}"

    return R()


def started(repo, tid="T1", **over):
    repo.h(f'new-task {tid} "add balance_after"', check=True)
    repo.contract(tid, **over)
    repo.h("start", check=True)
    return repo.wt(tid)


def add_feature(wt):
    p = wt / "app/wallet.py"
    p.write_text(p.read_text() + "\n\ndef balance_after(w, amount):\n    return w.balance - amount\n")


# ------------------------------------------------------------------ hooks

@pytest.mark.parametrize("cmd", [
    "rm -rf /", "rm -fr build", "git push --force origin main", "git push -f",
    "npm install lodash", "pip install requests", "cat .env", "git commit --no-verify -m x",
    "git reset --hard HEAD~3", "bin/harness unfreeze", "bin/harness approve-blast",
    "echo hacked > app/wallet.py", "cat ~/.config/claude-harness/receipt.key",
])
def test_bash_blocked(repo, cmd):
    r = repo.hook("Bash", {"command": cmd})
    assert r.returncode == 2, (cmd, r.stderr)
    assert "BLOCKED" in r.stderr


@pytest.mark.parametrize("cmd", ["git status", "python3 -m pytest -q", "ls -la 2>&1", "bin/harness status"])
def test_bash_allowed(repo, cmd):
    assert repo.hook("Bash", {"command": cmd}).returncode == 0


def test_read_secret_blocked(repo):
    assert repo.hook("Read", {"file_path": str(repo.path / ".env")}).returncode == 2


def test_unmanaged_edit_blocked(repo):
    r = repo.hook("Edit", {"file_path": str(repo.path / "app/wallet.py")})
    assert r.returncode == 2 and "unmanaged" in r.stderr


def test_role_and_path_enforcement_in_worktree(repo):
    wt = started(repo)
    inside = str(wt / "app/wallet.py")
    assert repo.hook("Edit", {"file_path": inside}, agent="builder").returncode == 0
    r = repo.hook("Edit", {"file_path": inside})  # architect
    assert r.returncode == 2 and "only the builder" in r.stderr
    r = repo.hook("Write", {"file_path": str(wt / "README.md")}, agent="builder")
    assert r.returncode == 2 and "outside allowed_paths" in r.stderr
    r = repo.hook("Write", {"file_path": str(wt / "harness/harness.py")}, agent="builder")
    assert r.returncode == 2


def test_self_approval_blocked(repo):
    assert repo.hook("Bash", {"command": "bin/harness verdict <<'EOF'\nSTATUS: APPROVED\nEOF"}).returncode == 2
    assert repo.hook("Bash", {"command": "bin/harness verdict <<'EOF'\nSTATUS: APPROVED\nEOF"},
                     agent="builder").returncode == 2
    assert repo.hook("Bash", {"command": "bin/harness verdict <<'EOF'\nSTATUS: APPROVED\nEOF"},
                     agent="skeptic").returncode == 0


def test_contract_self_blast_approval_and_post_lock_edit_blocked(repo):
    repo.h('new-task T9 "x"', check=True)
    p = str(repo.path / ".claude/contracts/task-T9.json")
    r = repo.hook("Edit", {"file_path": p, "old_string": "false", "new_string": '"approved_by_human": true'})
    assert r.returncode == 2
    assert repo.hook("Edit", {"file_path": p, "old_string": "a", "new_string": "b"}).returncode == 0
    repo.contract("T9")
    repo.h("start", check=True)
    assert repo.hook("Edit", {"file_path": p, "old_string": "a", "new_string": "b"}).returncode == 2


def test_hook_latency(repo):
    ev = json.dumps({"tool_name": "Bash", "tool_input": {"command": "git status"}, "cwd": str(repo.path)})
    times = []
    for _ in range(15):
        t = time.perf_counter()
        sh(["python3", "harness/harness.py", "hook-pre"], repo.path, repo.e, inp=ev)
        times.append((time.perf_counter() - t) * 1000)
    med = statistics.median(times)
    print(f"\nhook latency median {med:.1f} ms (process start included)")
    assert med < 200


# ------------------------------------------------------------------ full flow

def test_happy_path_to_squashed_commit(repo):
    wt = started(repo)
    add_feature(wt)
    t = repo.h("test")
    assert t.returncode == 0 and "GREEN" in t.stdout and "[exit 0]" in t.stdout, t.stdout + t.stderr
    repo.h("review-pack", check=True)
    v = repo.h("verdict", inp="STATUS: APPROVED\nFindings:\n- none\n")
    assert v.returncode == 0
    repo.h("sign", check=True)
    repo.h("finish", check=True)
    m = repo.h("merge")
    assert m.returncode == 0, m.stdout + m.stderr
    log = sh("git log --oneline", repo.path, repo.e).stdout
    assert "receipt-verified" in log
    files = sh("git show --name-only --format= HEAD", repo.path, repo.e).stdout
    assert "app/wallet.py" in files and ".claude/receipts/receipt-T1.json" in files
    assert not repo.wt("T1").exists()
    events = [json.loads(l)["event"] for l in (repo.path / ".claude/state/decision_ledger.jsonl").read_text().splitlines()]
    for e in ("contract_drafted", "worktree_created", "test_run", "verdict", "receipt_signed", "committed", "merged"):
        assert e in events


def test_rejected_verdict_blocks_sign(repo):
    wt = started(repo)
    add_feature(wt)
    repo.h("test", check=True)
    repo.h("review-pack", check=True)
    assert repo.h("verdict", inp="STATUS: REJECTED\n- race in withdraw\n").returncode == 1
    s = repo.h("sign")
    assert s.returncode == 1 and "APPROVED" in s.stderr


def test_change_after_sign_and_forged_receipt_blocked(repo):
    wt = started(repo)
    add_feature(wt)
    repo.h("test", check=True)
    repo.h("review-pack", check=True)
    repo.h("verdict", inp="STATUS: APPROVED\n", check=True)
    repo.h("sign", check=True)
    (wt / "app/wallet.py").write_text((wt / "app/wallet.py").read_text() + "# sneaky\n")
    f = repo.h("finish")
    assert f.returncode == 1 and "differs" in f.stderr
    # direct commit attempt is stopped by the pre-commit gate
    c = sh("git add -A && git commit -qm sneak", wt, repo.e)
    assert c.returncode != 0 and "COMMIT BLOCKED" in c.stderr
    # forged receipt
    rp = repo.path / ".claude/receipts/receipt-T1.json"
    r = json.loads(rp.read_text())
    r["files"] = []
    rp.write_text(json.dumps(r))
    assert "signature invalid" in repo.h("finish").stderr


def test_path_violation_and_blast_radius(repo):
    wt = started(repo)
    (wt / "README.md").write_text("changed via shell\n")
    t = repo.h("test")
    assert t.returncode == 1 and "outside allowed_paths" in t.stdout
    (wt / "README.md").unlink()
    sh("git checkout -- README.md", wt, repo.e)
    for i in range(6):
        (wt / f"app/m{i}.py").write_text("X = 1\n")
    t = repo.h("test")
    assert t.returncode == 1 and "BLAST RADIUS" in t.stdout


def test_circuit_breaker_rolls_back_and_freezes(repo):
    wt = started(repo)
    add_feature(wt)
    repo.h("test", check=True)  # green -> checkpoint
    bad = wt / "tests/test_wallet.py"
    bad.write_text(bad.read_text() + "\n\ndef test_broken():\n    assert 1 == 2\n")
    codes = [repo.h("test").returncode for _ in range(3)]
    assert codes == [1, 1, 3]
    assert (repo.path / ".claude/state/FROZEN").exists()
    assert "test_broken" not in bad.read_text()          # rolled back
    assert "balance_after" in (wt / "app/wallet.py").read_text()  # to the green checkpoint
    assert repo.hook("Bash", {"command": "python3 -m pytest"}).returncode == 2
    assert repo.hook("Bash", {"command": "bin/harness status"}).returncode == 0
    repo.h("unfreeze", check=True)  # human
    assert repo.h("test").returncode == 0


def test_turn_budget(repo):
    wt = started(repo, budget={"max_turns": 2, "max_usd": 1})
    (wt / "tests/test_x.py").write_text("import random\ndef test_r():\n    assert random.random() < 0\n")
    repo.h("test")
    r = repo.h("test")
    assert r.returncode == 3 and "budget" in r.stderr


def test_lesson_flywheel(repo, tmp_path):
    ev = tmp_path / "no_print_debugging.sh"
    ev.write_text("#!/usr/bin/env bash\n! grep -Rn 'print(\"DEBUG' app/\n")
    repo.h(f'lesson "Never leave DEBUG prints in app/." --eval {ev}', check=True)
    assert "- Never leave DEBUG prints in app/." in (repo.path / "CLAUDE.md").read_text()
    out = repo.h("evals")
    assert out.returncode == 0 and "2/2" in out.stdout


def test_abort_wipes_worktree_only(repo):
    wt = started(repo)
    add_feature(wt)
    repo.h("abort", check=True)
    assert not wt.exists()
    assert "balance_after" not in (repo.path / "app/wallet.py").read_text()
