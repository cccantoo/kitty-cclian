"""Pillow 直接画 kitty icon PNG，输出 @512×512。"""
import os, math
from PIL import Image, ImageDraw

OUT = r"H:\my_work_space\kitty-ledger\icons\app\icon-512.png"
os.makedirs(os.path.dirname(OUT), exist_ok=True)

size = 512
img = Image.new("RGB", (size, size), (255, 245, 248))
draw = ImageDraw.Draw(img)

# 圆角矩形背景（粉色渐变 → 简化为纯色）
r = 96
# Pillow 10 rounded_rectangle 支持单色填充
draw.rounded_rectangle((0, 0, size, size), radius=r, fill=(255, 143, 181))

# 给背景加点纹理圆点（小爱心）
for cx, cy in [(80, 80), (432, 100), (90, 432), (440, 430)]:
    draw.ellipse((cx - 10, cy - 10, cx + 10, cy + 10), fill=(255, 209, 220))
    draw.ellipse((cx - 4, cy - 4, cx + 4, cy + 4), fill=(255, 240, 245))

cx, cy = 256, 290

# 耳朵
def ear_left():
    pts = [(120, 200), (100, 90), (230, 170)]
    draw.polygon(pts, fill="#FFFFFF", outline="#5C3D5C")
    # 描边模拟
    for i in range(8):
        offset = i / 8
        # 简化：用粗 outline 替代
        pass
def stroke_polygon(d, pts, fill, stroke, width=8):
    d.polygon(pts, fill=fill)
    # Pillow polygon 不支持 width 参数 outline，手动画描边在外部偏移点上
    # 简化：填充后再画一圈黑边（粗一点）
    # 因 polygon 限制，直接忽略宽度细节，依靠位置精准
    return

# 耳朵简版
draw.polygon([(120, 200), (100, 90), (230, 170)], fill="#FFFFFF")
draw.line([(120, 200), (100, 90), (230, 170), (120, 200)], fill="#5C3D5C", width=8)
draw.polygon([(392, 200), (412, 90), (282, 170)], fill="#FFFFFF")
draw.line([(392, 200), (412, 90), (282, 170), (392, 200)], fill="#5C3D5C", width=8)

# 脸部
draw.ellipse((cx - 150, cy - 135, cx + 150, cy + 135), fill="#FFFFFF")
# 用 ellipse 内画 ellipse + outline 模拟描边
# 简单方案：先画大黑色椭圆，再画小白色椭圆
draw.ellipse((cx - 154, cy - 139, cx + 154, cy + 139), outline="#5C3D5C", width=8)

# 蝴蝶结
def bow(cx0, cy0):
    draw.ellipse((cx0 - 32, cy0 - 22, cx0 + 32, cy0 + 22), fill="#FF4F87")
    draw.ellipse((cx0 - 32, cy0 - 22, cx0 + 32, cy0 + 22), outline="#5C3D5C", width=5)
    draw.ellipse((cx0 - 10, cy0 - 14, cx0 + 10, cy0 + 14), fill="#FFD700", outline="#5C3D5C", width=4)
bow(125, 115)

# 眼
draw.ellipse((cx - 60 - 8, cy - 18, cx - 60 + 8, cy + 18), fill="#5C3D5C")
draw.ellipse((cx + 60 - 8, cy - 18, cx + 60 + 8, cy + 18), fill="#5C3D5C")

# 鼻子
draw.ellipse((cx - 10, cy + 35, cx + 10, cy + 50), fill="#FFD700", outline="#5C3D5C", width=3)

# 嘴（W 形）
draw.line([(cx - 30, cy + 60), (cx - 8, cy + 75), (cx + 8, cy + 60), (cx + 30, cy + 80)], fill="#5C3D5C", width=6)

# 胡须
for dy_off in (-10, 10, 25):
    y0 = cy + 45 + dy_off
    draw.line([(cx - 80, y0), (cx - 180, y0 - 5)], fill="#5C3D5C", width=4)
    draw.line([(cx + 80, y0), (cx + 180, y0 - 5)], fill="#5C3D5C", width=4)

# 底部 'K' 文字（用大号 arial.ttf）
try:
    from PIL import ImageFont
    font = ImageFont.truetype("arial.ttf", 48)
    bbox = draw.textbbox((0, 0), "Kitty", font=font)
    tw = bbox[2] - bbox[0]
    tx = (size - tw) // 2
    draw.text((tx, 425), "Kitty", font=font, fill="#FFFFFF")
except Exception as e:
    print(f"[font skip] {e}")

img.save(OUT, "PNG", optimize=True)
print(f"[done] saved → {OUT}")
