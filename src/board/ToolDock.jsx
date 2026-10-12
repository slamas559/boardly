// Places the tool rail and style panel: left rail on desktop, bottom dock on phones.
import { useState } from "react";
import { StylePanel, ToolRail } from "./Toolbar.jsx";

export default function ToolDock({ mode, tools, store, surfaceRef }) {
  const [sheetOpen, setSheetOpen] = useState(false); // phone bottom sheet
  const [collapsed, setCollapsed] = useState(false); // desktop side panel, dismissed by the presenter
  const { tool, setTool, lastShape, keepTool, setKeepTool, group, activeStyle, setStyle, selectedIds } = tools;
  const showPanel = Boolean(group && activeStyle && !["eraser", "laser", "select", "pan"].includes(tool)) || selectedIds.length > 0 || Boolean(tools.editingObj);

  return (
    <div className="pointer-events-none absolute bottom-2 left-2 right-2 z-20 safe-bottom md:bottom-auto md:right-auto md:left-3 md:top-3">
      <div className="pointer-events-auto relative">
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
