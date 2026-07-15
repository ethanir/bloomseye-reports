#!/usr/bin/env python3
"""Pull the final JSON-array answer from the 2 recovery agents' JSONL transcripts,
without dumping transcripts to the caller's context. Prints only a summary and
writes recovery_candidates.json."""
import json, os, re

SUB = "/Users/eirim/.claude/projects/-Users-eirim-Downloads-bloomseye-studio/4ef3f3aa-c924-4340-9c2c-e6fc3b1fb24d/subagents"
OUT = "/Users/eirim/bloomseye-reports/naming-audit"
IDS = ["ad7cba8380d1508b7", "a5451a4464d68291a"]

def last_text(jsonl_path):
    """Return the last assistant text content in the transcript."""
    texts = []
    for line in open(jsonl_path):
        try:
            j = json.loads(line)
        except Exception:
            continue
        # look for assistant messages with text content
        msg = j.get("message") or j
        role = msg.get("role") or j.get("role")
        content = msg.get("content")
        if role == "assistant" and content:
            if isinstance(content, str):
                texts.append(content)
            elif isinstance(content, list):
                for c in content:
                    if isinstance(c, dict) and c.get("type") == "text" and c.get("text"):
                        texts.append(c["text"])
    return texts[-1] if texts else ""

def extract_json_array(text):
    if not text:
        return []
    # strip markdown fences
    t = text.strip()
    t = re.sub(r"^```(json)?", "", t).strip()
    t = re.sub(r"```$", "", t).strip()
    # find first [ ... last ]
    i = t.find("[")
    jlast = t.rfind("]")
    if i == -1 or jlast == -1:
        return []
    frag = t[i:jlast+1]
    try:
        return json.loads(frag)
    except Exception:
        # try progressively trimming trailing junk
        for end in range(jlast, i, -1):
            if t[end] == "]":
                try:
                    return json.loads(t[i:end+1])
                except Exception:
                    continue
        return []

allc = []
for id in IDS:
    p = os.path.join(SUB, f"agent-{id}.jsonl")
    if not os.path.exists(p):
        print(f"{id}: MISSING transcript"); continue
    txt = last_text(p)
    arr = extract_json_array(txt)
    good = [c for c in arr if isinstance(c, dict) and c.get("query") and "targets" in c]
    print(f"{id}: final-text {len(txt)} chars -> {len(arr)} parsed, {len(good)} well-formed")
    allc.extend(good)

json.dump(allc, open(os.path.join(OUT, "recovery_candidates.json"), "w"), indent=1)
print("total recovery candidates:", len(allc))
from collections import Counter
print("buckets:", dict(Counter(c.get("bucket","?") for c in allc)))
