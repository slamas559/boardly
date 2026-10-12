// Places the tool rail and style panel: left rail on desktop, bottom dock on phones.
import { useState } from "react";
import { StylePanel, ToolRail } from "./Toolbar.jsx";

export default function ToolDock({ mode, tools, store, surfaceRef }) {
  const [sheetOpen, setSheetOpen] = useState(false); // phone bottom sheet
  const [collapsed, setCollapsed] = useState(false); // desktop side panel, dismissed by the presenter
  const { tool, setTool, lastShape, keepTool, setKeepTool, group, activeStyle, setStyle, selectedIds } = tools;
  const showPanel = Boolean(group && activeStyle && !["eraser", "laser", "select", "pan"].includes(tool)) || selectedIds.length > 0 || Boolean(tools.editingObj);

  return (
    <div className="absolute inset-x-2 bottom-2 z-20 md:inset-x-auto md:bottom-auto md:left-3 md:top-3 safe-bottom">
      <div className="relative">
        {showPanel && (
          <StylePanel
            mode={mode}
            group={group}
            style={activeStyle}
            onChange={setStyle}
            selectionCount={selectedIds.length}
            onDelete={() => surfaceRef.current?.deleteSelected()}
            onDuplicate={() => surfaceRef.current?.duplicate()}
            open={sheetOpen}
            collapsed={collapsed}
            onClose={() => { setSheetOpen(false); setCollapsed(true); }}
          />
        )}
        <ToolRail
          mode={mode}
          tool={tool}
          onTool={(t) => { setTool(t); setSheetOpen(false); }}
          lastShape={lastShape}
          canUndo={store.canUndo}
          canRedo={store.canRedo}
          onUndo={() => store.undo()}
          onRedo={() => store.redo()}
          keepTool={keepTool}
          onKeepTool={() => setKeepTool((v) => !v)}
          hasStyle={showPanel}
          styleSwatch={activeStyle?.color}
          styleOpen={sheetOpen || !collapsed}
          onStyleToggle={() => {
            const desktop = typeof window !== "undefined" && window.matchMedia("(min-width: 768px)").matches;
            if (desktop) setCollapsed((v) => !v);
            else setSheetOpen((v) => !v);
          }}
        />
      </div>
    </div>
  );
}
