"""
Kitty 图标切图脚本
========================================
输入: H:/my_work_space/kitty-ledger/iconskitty_raw/*.jpg (8 张大图)
输出:
  icons/kitty/{category}/{index}_{label}.png  @1x/@2x/@3x
  icons/kitty/_preview/all-icons.png         全 96 图标总览
  icons/kitty/_preview/grid_{N}.jpg          每张大图叠加网格的预览

用法:
  python cut_icons.py            # 用 default config 切
  python cut_icons.py --config X # 用指定 config

约束:
  - Pillow 10.x
  - 每张大图默认 3列 × 4行 = 12 个图标
  - 留白默认 30px（白边裁剪）— 用户切完可调
"""
import os, json, sys, argparse
from PIL import Image, ImageDraw, ImageFont, ImageOps
import numpy as np
try:
    import cv2
    HAS_CV2 = True
except ImportError:
    HAS_CV2 = False

# ============================================================
# 路径
# ============================================================
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))  # kitty-ledger/
RAW_DIR = os.path.join(ROOT, "iconskitty_raw")
OUT_DIR = os.path.join(ROOT, "icons", "kitty")
PREVIEW_DIR = os.path.join(OUT_DIR, "_preview")
CONFIG_PATH = os.path.join(ROOT, "scripts", "icon_grid_config.json")

# ============================================================
# 默认配置：8 张大图全部按 3列×4行
# 后续用户在 iconskitty_raw 同目录放 icon_grid_config.json 可覆盖
# label 是给图标的语义标签，会作为文件名一部分
# ============================================================
DEFAULT_CONFIG = {
    # 图序号（来自文件名 _XX_）→ (列数, 行数, 留白px, 分类目录, [(row,col,label)*12])
    "3": {
        "cols": 3, "rows": 4, "padding": 30,
        "category": "misc",
        "labels": [
            ("R1C1", "cupcake"),        ("R1C2", "vinyl-music"),     ("R1C3", "chinese-knot"),
            ("R2C1", "fork-kitty"),      ("R2C2", "hotpot"),           ("R2C3", "icecream"),
            ("R3C1", "bubble-tea"),      ("R3C2", "omurice"),          ("R3C3", "birthday-cake"),
            ("R4C1", "plush-bag"),       ("R4C2", "polaroid"),         ("R4C3", "mango"),
        ],
    },
    "4": {
        "cols": 3, "rows": 4, "padding": 30,
        "category": "drink-snack",
        "labels": [
            ("R1C1", "candy-skewer"),    ("R1C2", "strawberry-cake"),  ("R1C3", "ramen-bowl"),
            ("R2C1", "cola"),            ("R2C2", "bread-bag"),        ("R2C3", "icecream-sundae"),
            ("R3C1", "coconut-water"),   ("R3C2", "frying-pan"),       ("R3C3", "milk-box"),
            ("R4C1", "chips"),           ("R4C2", "toaster"),          ("R4C3", "drink-cup"),
        ],
    },
    "5": {
        "cols": 3, "rows": 4, "padding": 30,
        "category": "life-travel",
        "labels": [
            ("R1C1", "ramen-bowl"),      ("R1C2", "makeup-bag"),       ("R1C3", "telephone"),
            ("R2C1", "camera"),          ("R2C2", "house"),            ("R2C3", "perfume"),
            ("R3C1", "train"),           ("R3C2", "singing"),          ("R3C3", "notebook"),
            ("R4C1", "coconut-drink"),   ("R4C2", "car"),              ("R4C3", "pen-holder"),
        ],
    },
    "7": {
        "cols": 3, "rows": 4, "padding": 30,
        "category": "dessert",
        "labels": [
            ("R1C1", "flower-kitty"),     ("R1C2", "strawberry-cake"),    ("R1C3", "snow-mountain"),
            ("R2C1", "packaged-kitty"),   ("R2C2", "pudding"),            ("R2C3", "icecream-cone"),
            ("R3C1", "riceball"),         ("R3C2", "fries"),              ("R3C3", "apple-bag"),
            ("R4C1", "apple"),           ("R4C2", "chips-square"),       ("R4C3", "cherry-fruit"),
        ],
    },
    "8": {
        "cols": 3, "rows": 4, "padding": 30,
        "category": "life-travel",
        "labels": [
            ("R1C1", "notebook"),         ("R1C2", "plane"),              ("R1C3", "house-cat"),
            ("R2C1", "basket-kitty"),     ("R2C2", "suitcase"),           ("R2C3", "paper-bag"),
            ("R3C1", "bicycle"),          ("R3C2", "car-mini"),           ("R3C3", "umbrella"),
            ("R4C1", "shopping-bag"),     ("R4C2", "shopping-cart"),      ("R4C3", "crystal-ball"),
        ],
    },
    "9": {
        "cols": 3, "rows": 4, "padding": 30,
        "category": "sweet-home",
        "labels": [
            ("R1C1", "house"),           ("R1C2", "gashapon"),         ("R1C3", "hello-pack"),
            ("R2C1", "bubble-tea-pearl"),("R2C2", "sushi-box"),        ("R2C3", "icecream-bowl"),
            ("R3C1", "candy-jar"),       ("R3C2", "pancake"),          ("R3C3", "donut"),
            ("R4C1", "chips"),           ("R4C2", "coffee-cup"),       ("R4C3", "juice-box"),
        ],
    },
    "10": {
        "cols": 3, "rows": 4, "padding": 30,
        "category": "office-life",
        "labels": [
            ("R1C1", "milk-bottle"),     ("R1C2", "radio"),             ("R1C3", "chips-bag"),
            ("R2C1", "laptop"),          ("R2C2", "walkie-talkie"),     ("R2C3", "envelope"),
            ("R3C1", "guitar"),          ("R3C2", "handbag"),           ("R3C3", "straw-hat"),
            ("R4C1", "note-pad"),        ("R4C2", "soap-dispenser"),    ("R4C3", "popcorn"),
        ],
    },
    "11": {
        "cols": 3, "rows": 4, "padding": 30,
        "category": "fruit",
        "labels": [
            ("R1C1", "pineapple"),       ("R1C2", "cherry"),           ("R1C3", "coconut"),
            ("R2C1", "orange"),          ("R2C2", "pineapple-slice"),  ("R2C3", "watermelon"),
            ("R3C1", "strawberry"),      ("R3C2", "peach"),            ("R3C3", "mango"),
            ("R4C1", "dragonfruit"),     ("R4C2", "mangosteen"),       ("R4C3", "pear"),
        ],
    },
}

# 标准化图标输出尺寸（PWA icon @1x/@2x/@3x 都是同一图标不同分辨率）
ICON_SIZE_BASE = 200  # @1x 是 200x200

# ============================================================
# 工具
# ============================================================
def fig_num(filename: str) -> str:
    """从 '微信图片_20260901163827_3_80.jpg' 提取 '3'."""
    stem = os.path.splitext(filename)[0]
    parts = stem.split("_")
    # 尾段 '_80' 之前那一位
    for p in reversed(parts):
        if p.isdigit():
            return p
    return "0"

def load_config():
    if os.path.exists(CONFIG_PATH):
        with open(CONFIG_PATH, "r", encoding="utf-8") as f:
            print(f"[config] load from {CONFIG_PATH}")
            return json.load(f)
    return DEFAULT_CONFIG

def find_raw_for_fig(fig: str):
    for fn in os.listdir(RAW_DIR):
        if f"_{fig}_80" in fn or f"_{fig}_" in fn:
            if fn.lower().endswith((".jpg", ".jpeg", ".png")):
                return os.path.join(RAW_DIR, fn), fn
    return None, None

def trim_white(im: Image.Image, threshold=240):
    """把图片四周接近纯白的边裁掉（提升图标紧凑感）。"""
    gray = im.convert("L")
    # 找到非白 bbox
    inv = ImageOps.invert(gray)
    bbox = inv.getbbox()
    if not bbox:
        return im
    x0, y0, x1, y1 = bbox
    # 多留 5px 防止切到内容
    x0 = max(0, x0 - 5); y0 = max(0, y0 - 5)
    x1 = min(im.width, x1 + 5); y1 = min(im.height, y1 + 5)
    return im.crop((x0, y0, x1, y1))

def remove_xhs_watermark(im: Image.Image):
    """去掉小红书水印（右下角「小红书号：xxppxxpp」灰色文字）。
    思路：扫描右下角 ROI，找到浅灰色文字，dilate 一下 mask，
    然后 cv2.inpaint 把文字像素用周围背景填充。
    """
    if not HAS_CV2:
        return im
    w, h = im.size
    # 经验：水印位置在原图右下角，约 (0.55w, 0.93h) → (0.97w, 0.99h)
    # 留 5% 边界防止 inpaint 越过原图
    x0 = int(w * 0.50)
    y0 = int(h * 0.92)
    x1 = w - 5
    y1 = h - 5
    if x1 - x0 < 30 or y1 - y0 < 10:
        return im

    arr = np.array(im)
    bgr = arr[:, :, ::-1].copy()  # RGB → BGR

    roi = bgr[y0:y1, x0:x1]
    gray = cv2.cvtColor(roi, cv2.COLOR_BGR2GRAY)

    # 水印文字是浅灰色（180~230），背景接近白（>230）
    # 用 inRange + 边缘检测找文字
    _, text_mask = cv2.threshold(gray, 230, 255, cv2.THRESH_BINARY_INV)  # 白→黑，文字→白
    # 加一点 Canny 边缘保险
    edges = cv2.Canny(roi, 80, 180)
    text_mask = cv2.bitwise_or(text_mask, edges)

    # 把 ROI 内的掩码回到全图坐标
    full_mask = np.zeros(bgr.shape[:2], dtype=np.uint8)
    full_mask[y0:y1, x0:x1] = text_mask

    # 膨大，方便 inpaint 抓到边缘像素
    kernel = np.ones((3, 3), np.uint8)
    full_mask = cv2.dilate(full_mask, kernel, iterations=1)

    inpainted = cv2.inpaint(bgr, full_mask, inpaintRadius=3, flags=cv2.INPAINT_TELEA)
    rgb = inpainted[:, :, ::-1]  # BGR → RGB
    return Image.fromarray(rgb)


def make_square_white(im: Image.Image):
    """中心化到白色正方形，避免切出来的图标不是正方形。"""
    w, h = im.size
    s = max(w, h)
    canvas = Image.new("RGB", (s, s), (255, 255, 255))
    canvas.paste(im, ((s - w) // 2, (s - h) // 2))
    return canvas

# ============================================================
# 主切图
# ============================================================
def cut_one(fig: str, cfg: dict):
    raw_path, raw_fn = find_raw_for_fig(fig)
    if not raw_path:
        print(f"[skip] fig {fig}: no raw file")
        return []

    cols = cfg["cols"]; rows = cfg["rows"]
    padding = cfg["padding"]
    category = cfg["category"]
    labels = cfg["labels"]

    img = Image.open(raw_path).convert("RGB")
    img = remove_xhs_watermark(img)  # 去小红书水印
    W, H = img.size
    cell_w = (W - 2 * padding) / cols
    cell_h = (H - 2 * padding) / rows
    print(f"[fig {fig}] {raw_fn}  raw={W}x{H}  grid={cols}x{rows}  cell≈{cell_w:.0f}x{cell_h:.0f}")

    category_dir = os.path.join(OUT_DIR, category)
    os.makedirs(category_dir, exist_ok=True)

    icons = []  # 用于总预览

    for idx, label_info in enumerate(labels):
        if isinstance(label_info, (list, tuple)) and len(label_info) == 2:
            pos, label = label_info
            # 解析 R{row}C{col}
            row = int(pos[1]) - 1
            col = int(pos[3]) - 1
        else:
            # 退路：按索引顺序
            label = label_info
            row = idx // cols
            col = idx % cols

        # 计算像素 bbox
        x0 = int(round(padding + col * cell_w))
        y0 = int(round(padding + row * cell_h))
        x1 = int(round(padding + (col + 1) * cell_w))
        y1 = int(round(padding + (row + 1) * cell_h))

        cropped = img.crop((x0, y0, x1, y1))
        cropped = trim_white(cropped)
        cropped = make_square_white(cropped)

        # 输出 @1x/@2x/@3x
        for scale, suffix in [(1, ""), (2, "@2x"), (3, "@3x")]:
            size = ICON_SIZE_BASE * scale
            out = cropped.resize((size, size), Image.LANCZOS)
            fn = f"{fig}_{row+1}{col+1}_{label}{suffix}.png"
            out.save(os.path.join(category_dir, fn), "PNG", optimize=True)

        # 内存留一份标准 @1x 用于总预览
        std = cropped.resize((ICON_SIZE_BASE, ICON_SIZE_BASE), Image.LANCZOS)
        icons.append((fig, row + 1, col + 1, label, std))

    return icons

def make_grid_preview(fig: str, cfg: dict):
    """给每张大图叠加网格 + 序号，便于人工核对。"""
    raw_path, raw_fn = find_raw_for_fig(fig)
    if not raw_path:
        return None
    img = Image.open(raw_path).convert("RGB").copy()
    draw = ImageDraw.Draw(img)
    W, H = img.size
    cols, rows, padding = cfg["cols"], cfg["rows"], cfg["padding"]
    cell_w = (W - 2 * padding) / cols
    cell_h = (H - 2 * padding) / rows

    # 红线划网格 + 标序号
    for c in range(cols + 1):
        x = int(round(padding + c * cell_w))
        draw.line([(x, padding), (x, H - padding)], fill=(255, 0, 0, 200), width=4)
    for r in range(rows + 1):
        y = int(round(padding + r * cell_h))
        draw.line([(padding, y), (W - padding, y)], fill=(255, 0, 0, 200), width=4)

    # 序号
    try:
        font = ImageFont.truetype("arial.ttf", 60)
    except:
        font = ImageFont.load_default()

    for idx, label_info in enumerate(cfg["labels"]):
        if isinstance(label_info, (list, tuple)) and len(label_info) == 2:
            pos, label = label_info
            row = int(pos[1]) - 1
            col = int(pos[3]) - 1
        else:
            label = label_info
            row = idx // cols
            col = idx % cols

        cx = int(round(padding + (col + 0.5) * cell_w))
        cy = int(round(padding + (row + 0.5) * cell_h))
        txt = f"{row+1},{col+1}"
        bbox = draw.textbbox((0, 0), txt, font=font)
        tw, th = bbox[2] - bbox[0], bbox[3] - bbox[1]
        # 半透明圆角背景
        bg = Image.new("RGBA", (tw + 30, th + 20), (255, 255, 0, 200))
        img.paste(bg, (cx - tw // 2 - 15, cy - th // 2 - 10), bg)
        draw = ImageDraw.Draw(img)
        draw.text((cx - tw // 2, cy - th // 2), txt, fill=(255, 0, 0), font=font)

    preview_path = os.path.join(PREVIEW_DIR, f"grid_{fig}.jpg")
    img.save(preview_path, "JPEG", quality=85)
    return preview_path

def make_all_preview(all_icons):
    """把所有 @1x 图标拼成一张总览图。"""
    if not all_icons:
        return None
    cols_per_row = 12   # 一行 12 个
    cell = ICON_SIZE_BASE + 20  # 加白边
    rows_count = (len(all_icons) + cols_per_row - 1) // cols_per_row
    W = cols_per_row * cell + 20
    H = rows_count * cell + 40 * rows_count + 20  # 给每行加 label 高度

    canvas = Image.new("RGB", (W, H), (255, 245, 248))  # 奶油粉底
    draw = ImageDraw.Draw(canvas)
    try:
        font = ImageFont.truetype("arial.ttf", 16)
        big_font = ImageFont.truetype("arial.ttf", 22)
    except:
        font = ImageFont.load_default()
        big_font = font

    for i, (fig, r, c, label, im) in enumerate(all_icons):
        row_idx = i // cols_per_row
        col_idx = i % cols_per_row
        x = 10 + col_idx * cell
        y = 10 + row_idx * (cell + 40)

        # 边框
        draw.rectangle([x, y, x + ICON_SIZE_BASE, y + ICON_SIZE_BASE],
                       outline=(255, 143, 181), width=2)
        canvas.paste(im, (x, y))
        # 标签
        cap = f"图{fig}-R{r}C{c}\n{label}"
        draw.text((x, y + ICON_SIZE_BASE + 4), cap.split("\n")[0], fill=(92, 61, 92), font=font)
        draw.text((x, y + ICON_SIZE_BASE + 22), cap.split("\n")[1], fill=(158, 96, 158), font=font)

    preview_path = os.path.join(PREVIEW_DIR, "all-icons.jpg")
    canvas.save(preview_path, "JPEG", quality=85)
    return preview_path

# ============================================================
# main
# ============================================================
def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--config", help="optional config json path")
    args = ap.parse_args()

    os.makedirs(OUT_DIR, exist_ok=True)
    os.makedirs(PREVIEW_DIR, exist_ok=True)

    cfg = load_config()
    print(f"[run] cutting 8 big images → {OUT_DIR}\n")

    all_icons = []
    for fig in ["3", "4", "5", "7", "8", "9", "10", "11"]:
        if fig not in cfg:
            print(f"[skip] fig {fig}: no config")
            continue
        icons = cut_one(fig, cfg[fig])
        all_icons.extend(icons)
        make_grid_preview(fig, cfg[fig])

    print(f"\n[done] 切出 {len(all_icons)} 个图标")
    total = sum(1 for _ in os.listdir(os.path.join(OUT_DIR, "drink-snack")))
    print(f"[stats] sample dir count: {total} files in drink-snack/")

    p = make_all_preview(all_icons)
    if p:
        print(f"[preview] {p}")

if __name__ == "__main__":
    main()
