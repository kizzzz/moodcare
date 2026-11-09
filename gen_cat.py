import json, os, sys, urllib.request

key = None
for line in open(os.path.expanduser("~/CiteWise/.env"), encoding="utf-8"):
    if line.strip().startswith("OPENAI_API_KEY="):
        key = line.split("=", 1)[1].strip()
        break
if not key:
    sys.exit("no key")

prompt = sys.argv[1]
size = sys.argv[2] if len(sys.argv) > 2 else "1024x1024"
req = urllib.request.Request(
    "https://open.bigmodel.cn/api/paas/v4/images/generations",
    data=json.dumps({"model": "cogview-4", "prompt": prompt, "size": size}).encode(),
    headers={"Authorization": f"Bearer {key}", "Content-Type": "application/json"},
)
try:
    resp = json.load(urllib.request.urlopen(req, timeout=120))
    print(resp["data"][0]["url"])
except urllib.error.HTTPError as e:
    print("HTTP", e.code, e.read().decode()[:500])
