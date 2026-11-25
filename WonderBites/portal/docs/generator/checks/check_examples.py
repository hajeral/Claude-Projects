"""Validate every example in docs/openapi.yaml against its own schema (JSON Schema 2020-12) and flag
placeholder-looking values. Exit code 1 on any problem.  Usage: python3 docs/generator/checks/check_examples.py"""
import json, re, sys, os
import yaml
from jsonschema import Draft202012Validator
from referencing import Registry, Resource

DOCS = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "..")
spec = yaml.safe_load(open(os.path.join(DOCS, "openapi.yaml")))
def fix(s):  # rewrite local refs to the registry document
    if isinstance(s, dict): return {k: ("urn:wb" + v if k == "$ref" and v.startswith("#/") else fix(v)) for k, v in s.items()}
    if isinstance(s, list): return [fix(x) for x in s]
    return s
reg = Registry().with_resource("urn:wb", Resource.from_contents(fix({"$schema": "https://json-schema.org/draft/2020-12/schema", "components": spec["components"]})))
ODD = re.compile(r"^(string|Label|Value|_?\w{0,3}_123|id_123|Short description)$")
BAGS = {"Morning Pastry Box", "Deli Surprise Box", "Harvest Veg Box", "صندوق معجنات الصباح"}
BAG_KEYS = {"title", "bag", "bagTitle", "name", "listing", "titleI18n", "en", "ar", "drop", "subject"}
problems = []
def walk(v, path):
    if isinstance(v, dict):
        for k, x in v.items(): walk(x, path + [k])
    elif isinstance(v, list):
        for i, x in enumerate(v): walk(x, path + [str(i)])
    elif isinstance(v, str):
        if ODD.match(v): problems.append(("placeholder", "/".join(path), v))
        if v in BAGS and not (set(path[-3:]) & BAG_KEYS): problems.append(("bag name outside bag field", "/".join(path), v))
def check(where, schema, example):
    errs = list(Draft202012Validator(fix(schema), registry=reg).iter_errors(example))
    for e in errs[:3]: problems.append(("schema", where + " @ " + "/".join(map(str, e.absolute_path)), e.message[:160]))
    walk(example, [where])
n = 0
for p, ops in spec["paths"].items():
    for m, op in ops.items():
        rb = op.get("requestBody", {}).get("content", {}).get("application/json")
        if rb and "example" in rb: check(f"{m.upper()} {p} request", rb["schema"], rb["example"]); n += 1
        for code, r in op.get("responses", {}).items():
            c = r.get("content", {}).get("application/json") if isinstance(r, dict) else None
            if c and "example" in c and "schema" in c: check(f"{m.upper()} {p} {code}", c["schema"], c["example"]); n += 1
for name, wh in spec.get("webhooks", {}).items():
    c = wh["post"]["requestBody"]["content"]["application/json"]; check("event " + name, c["schema"], c["example"]); n += 1
for kind, where, msg in problems: print(f"[{kind}] {where}: {msg}")
print(f"checked {n} examples, {len(problems)} problems")
sys.exit(1 if problems else 0)
