import re

with open('frontend/src/pages/WorkflowCenter.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# The file structure has:
# return (
#   <div style={{ display: 'flex', height: '100%', width: '100%', background: '#0a0e1a', color: '#f1f5f9', overflow: 'hidden' }}>
#     {/* ── LEFT PANEL: Navigator ── */} ...
#     {/* ── CENTER PANEL: Live Timeline ── */} ...
#     {/* ── RIGHT PANEL: Intelligence Panel ── */} ...
#   </div>

# 1. Find the main return block
main_return_index = content.find("  return (\n    <div style={{ display: 'flex'")
if main_return_index == -1:
    print("Could not find main return block")
    exit(1)

left_panel_start = content.find("{/* ── LEFT PANEL: Navigator ── */}", main_return_index)
center_panel_start = content.find("{/* ── CENTER PANEL: Live Timeline ── */}", main_return_index)
right_panel_start = content.find("{/* ── RIGHT PANEL: Intelligence Panel ── */}", main_return_index)
style_start = content.find("<style>{`", main_return_index)

left_panel_code = content[left_panel_start:center_panel_start]
center_panel_code = content[center_panel_start:right_panel_start]
right_panel_code = content[right_panel_start:style_start]

# Modify Left Panel wrapper
left_panel_code = left_panel_code.replace(
    """<div style={{ width: '320px', minWidth: '320px', borderRight: '1px solid rgba(255,255,255,0.06)', background: 'linear-gradient(180deg, rgba(15,23,42,0.6) 0%, rgba(10,14,26,0.8) 100%)', display: 'flex', flexDirection: 'column' }}>""",
    """<div style={{ background: 'rgba(15,23,42,0.6)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '16px', display: 'flex', flexDirection: 'column', maxHeight: '500px', overflow: 'hidden' }}>"""
)

# Modify Center Panel wrapper
center_panel_code = center_panel_code.replace(
    """<div style={{ flex: 1, display: 'flex', flexDirection: 'column', background: '#0a0e1a', overflowX: 'hidden' }}>""",
    """<div style={{ flex: '1 1 auto', display: 'flex', flexDirection: 'column', background: '#0a0e1a', minHeight: '60vh', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>"""
)

# Modify Right Panel wrapper
right_panel_code = right_panel_code.replace(
    """<div style={{ width: '320px', minWidth: '320px', borderLeft: '1px solid rgba(255,255,255,0.06)', background: 'linear-gradient(180deg, rgba(15,23,42,0.6) 0%, rgba(10,14,26,0.8) 100%)', display: 'flex', flexDirection: 'column' }}>""",
    """<div style={{ background: 'rgba(15,23,42,0.6)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '16px', display: 'flex', flexDirection: 'column', maxHeight: '500px', overflow: 'hidden' }}>"""
)

new_return_block = """  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', width: '100%', background: '#0a0e1a', color: '#f1f5f9', overflowY: 'auto', overflowX: 'hidden' }}>
      
""" + center_panel_code + """
      {/* ── BOTTOM SECTION: Navigator & Intelligence ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))', gap: '24px', padding: '32px', background: 'linear-gradient(180deg, rgba(15,23,42,0.4) 0%, rgba(10,14,26,0.8) 100%)' }}>
""" + left_panel_code + right_panel_code + """
      </div>

"""

before_return = content[:main_return_index]
after_return = content[style_start:]

new_content = before_return + new_return_block + after_return

with open('frontend/src/pages/WorkflowCenter.tsx', 'w', encoding='utf-8') as f:
    f.write(new_content)

print("Layout rewritten successfully.")
