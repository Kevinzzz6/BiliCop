#!/usr/bin/env python3
"""
图标生成脚本
将SVG文件转换为不同尺寸的PNG图标
"""

from PIL import Image, ImageDraw, ImageFont
import os

def create_bilibili_icon(size):
    """创建B站风格的图标"""
    # 创建透明背景
    img = Image.new('RGBA', (size, size), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)
    
    # 计算缩放比例
    scale = size / 128
    
    # 绘制背景圆角矩形
    corner_radius = int(16 * scale)
    draw.rounded_rectangle(
        [(0, 0), (size, size)],
        radius=corner_radius,
        fill=(0, 161, 214, 255)  # B站蓝色
    )
    
    # 绘制播放按钮圆形背景
    center = size // 2
    play_radius = int(32 * scale)
    draw.ellipse(
        [(center - play_radius, center - play_radius), 
         (center + play_radius, center + play_radius)],
        fill=(255, 255, 255, 230)  # 半透明白色
    )
    
    # 绘制播放三角形
    triangle_size = int(24 * scale)
    triangle_points = [
        (center - triangle_size//2, center - triangle_size//2),
        (center - triangle_size//2, center + triangle_size//2),
        (center + triangle_size//2, center)
    ]
    draw.polygon(triangle_points, fill=(0, 161, 214, 255))
    
    # 绘制举报标识（粉色圆点）
    report_radius = int(8 * scale)
    report_x = int(96 * scale)
    report_y = int(32 * scale)
    draw.ellipse(
        [(report_x - report_radius, report_y - report_radius),
         (report_x + report_radius, report_y + report_radius)],
        fill=(251, 114, 153, 255)  # B站粉色
    )
    
    # 绘制底部证据条
    bar_width = int(80 * scale)
    bar_height = int(4 * scale)
    bar_x = (size - bar_width) // 2
    bar_y = int(96 * scale)
    draw.rectangle(
        [(bar_x, bar_y), (bar_x + bar_width, bar_y + bar_height)],
        fill=(255, 255, 255, 200)
    )
    
    # 绘制装饰性小圆点
    dot_radius = int(3 * scale)
    # 左上角
    draw.ellipse(
        [(int(32 * scale) - dot_radius, int(32 * scale) - dot_radius),
         (int(32 * scale) + dot_radius, int(32 * scale) + dot_radius)],
        fill=(255, 255, 255, 150)
    )
    # 右下角
    draw.ellipse(
        [(int(96 * scale) - dot_radius, int(96 * scale) - dot_radius),
         (int(96 * scale) + dot_radius, int(96 * scale) + dot_radius)],
        fill=(255, 255, 255, 150)
    )
    
    return img

def generate_icons():
    """生成所有需要的图标尺寸"""
    sizes = [16, 48, 128]
    icons_dir = 'icons'
    
    # 确保icons目录存在
    if not os.path.exists(icons_dir):
        os.makedirs(icons_dir)
    
    print("正在生成图标文件...")
    
    for size in sizes:
        print(f"生成 {size}x{size} 图标...")
        icon = create_bilibili_icon(size)
        filename = os.path.join(icons_dir, f'icon{size}.png')
        icon.save(filename, 'PNG')
        print(f"已保存: {filename}")
    
    print("所有图标生成完成！")
    
    # 恢复完整的manifest.json
    restore_manifest()

def restore_manifest():
    """恢复完整的manifest.json文件"""
    manifest_content = '''{
  "manifest_version": 3,
  "name": "B站侵权举报助手",
  "version": "1.0.0",
  "description": "一键举报B站侵权内容，自动抓取证据并提交举报",
  "permissions": [
    "storage",
    "tabs",
    "scripting",
    "activeTab"
  ],
  "host_permissions": [
    "https://www.bilibili.com/*",
    "https://bilibili.com/*",
    "https://message.bilibili.com/*"
  ],
  "background": {
    "service_worker": "background/service-worker.js"
  },
  "content_scripts": [
    {
      "matches": [
        "https://www.bilibili.com/video/*",
        "https://www.bilibili.com/*",
        "https://bilibili.com/video/*",
        "https://bilibili.com/*"
      ],
      "js": [
        "content_scripts/injector.js",
        "content_scripts/bilibili_scraper.js"
      ],
      "css": [
        "content_scripts/injector.css"
      ],
      "run_at": "document_end"
    }
  ],
  "action": {
    "default_popup": "popup/popup.html",
    "default_title": "B站侵权举报助手",
    "default_icon": {
      "16": "icons/icon16.png",
      "48": "icons/icon48.png",
      "128": "icons/icon128.png"
    }
  },
  "icons": {
    "16": "icons/icon16.png",
    "48": "icons/icon48.png",
    "128": "icons/icon128.png"
  },
  "web_accessible_resources": [
    {
      "resources": ["pages/*"],
      "matches": ["https://www.bilibili.com/*"]
    }
  ]
}'''
    
    with open('manifest.json', 'w', encoding='utf-8') as f:
        f.write(manifest_content)
    
    print("已恢复完整的manifest.json文件")

if __name__ == "__main__":
    try:
        generate_icons()
        print("\\n✅ 图标生成成功！现在可以安装插件了。")
    except ImportError:
        print("❌ 错误：请先安装PIL库")
        print("运行命令：pip install Pillow")
    except Exception as e:
        print(f"❌ 生成图标时出错：{e}")
        print("\\n📋 替代方案：")
        print("1. 使用 icon-generator.html 工具")
        print("2. 或者手动创建简单的图标文件")