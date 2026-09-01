"""看一眼每张图的尺寸 + 像素总数。"""
import os
from PIL import Image

RAW_DIR = r"H:\my_work_space\kitty-ledger\iconskitty_raw"

files = sorted(os.listdir(RAW_DIR))
print(f"{'filename':<42} {'size_px':<14} {'aspect':<10}")
print("-" * 70)
for fn in files:
    if not fn.lower().endswith((".jpg", ".jpeg", ".png")):
        continue
    p = os.path.join(RAW_DIR, fn)
    img = Image.open(p)
    w, h = img.size
    print(f"{fn:<42} {w}x{h:<10} {w/h:<10.3f}")
