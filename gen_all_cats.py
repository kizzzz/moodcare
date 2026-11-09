import json, os, io, time, urllib.request
from PIL import Image

key = None
for line in open(os.path.expanduser("~/CiteWise/.env"), encoding="utf-8"):
    if line.strip().startswith("OPENAI_API_KEY="):
        key = line.split("=", 1)[1].strip(); break

CHAR = "一只Q版治愈系小猫：奶白色短毛，头顶和双耳有蜜橘色斑块，橘白相间的蓬松长尾巴，圆润柔软的身体，大大的温柔琥珀色眼睛，粉色小鼻子，腮边微微泛红"
STYLE = "日系动漫水彩插画风格：柔和的水彩晕染与纸张纹理，边缘自然渗透，低饱和暖色调，奶油色简洁背景，构图居中，大量留白，无文字无边框"

STATES = {
    "mascot":  f"{CHAR}，端坐着，尾巴环绕在身前，温柔微笑直视观者，安静治愈 {STYLE}背景带淡淡的暖杏色晕染",
    "wind":    f"{CHAR}，毛发被风吹得微微炸起蓬松，双耳微微向后，圆眼睛里带着紧张不安，周围有柔和的水彩风线条和两三片飘落的叶子 {STYLE}背景带淡淡的珊瑚橘色晕染",
    "sunny":   f"{CHAR}，四肢舒展地趴卧着晒太阳，眼睛眯成满足的弯月，嘴角上扬微笑，周围有柔和的暖黄阳光光斑和一两朵小花 {STYLE}背景带淡淡的鹅黄色晕染",
    "rain":    f"{CHAR}，蜷缩成毛茸茸的一团抱着自己的尾巴，耳朵微微下垂，安静地望着身旁落下的蓝灰色雨丝，神情平静略带低落 {STYLE}背景带淡淡的灰蓝色晕染",
    "breeze":  f"{CHAR}，放松地侧躺在一朵蓬松的白云上，眼睛半闭打着盹，嘴角淡淡的微笑，身旁飘着几片草叶 {STYLE}背景带淡淡的灰绿色晕染",
    "comfort": f"{CHAR}，坐着向观者张开短短的双臂求抱抱，眼神温柔关切充满安慰 {STYLE}背景带淡淡的暖杏色晕染",
    "night":   f"{CHAR}，蜷成一个圆球安然睡着，呼吸轻柔，头顶上方悬着一弯温柔的月牙和两三颗小星星 {STYLE}背景是宁静的暖棕深蓝色夜晚晕染",
}

os.makedirs(os.path.expanduser("~/moodcare/assets"), exist_ok=True)
for name, prompt in STATES.items():
    out = os.path.expanduser(f"~/moodcare/assets/{name}.webp")
    if os.path.exists(out):
        print(name, "skip"); continue
    for attempt in range(3):
        try:
            req = urllib.request.Request(
                "https://open.bigmodel.cn/api/paas/v4/images/generations",
                data=json.dumps({"model": "cogview-4", "prompt": prompt, "size": "1024x1024"}).encode(),
                headers={"Authorization": f"Bearer {key}", "Content-Type": "application/json"})
            url = json.load(urllib.request.urlopen(req, timeout=180))["data"][0]["url"]
            raw = urllib.request.urlopen(url, timeout=120).read()
            img = Image.open(io.BytesIO(raw)).convert("RGB")
            w, h = img.size
            img = img.crop((0, 0, w, int(h * 0.91)))          # 裁掉底部水印
            img = img.resize((768, int(img.size[1] * 768 / w)), Image.LANCZOS)
            img.save(out, "WEBP", quality=85)
            print(name, "ok", img.size)
            break
        except Exception as e:
            print(name, "retry", attempt, str(e)[:120]); time.sleep(3)
    time.sleep(1)
print("done")
