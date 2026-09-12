import { createRoot } from 'react-dom/client';
import { act } from 'react';
import TopToolbar from '../TopToolbar';
import CanvasArea from '../CanvasArea';
import RightPropertiesPanel from '../RightPropertiesPanel';

// Enable act environment for React 18+
global.IS_REACT_ACT_ENVIRONMENT = true;

describe('LOW Post v0.1.0 Audit & QA', () => {
  let container = null;
  let root = null;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(() => {
    act(() => {
      root.unmount();
    });
    container.remove();
    container = null;
  });

  test('TopToolbar Safe Area toggle uses monochrome styling when active', () => {
    const frame = {
      id: 'f1',
      name: 'Screen 1',
      width: 390,
      height: 844,
      safeArea: { visible: true, top: 47, bottom: 34 },
    };

    act(() => {
      root.render(
        <TopToolbar
          activeFrame={frame}
          onChangeFramePreset={() => {}}
          onToggleSafeArea={() => {}}
        />
      );
    });

    const toggleBtn = container.querySelector('[data-testid="toolbar-safe-area-toggle"]');
    expect(toggleBtn).not.toBeNull();
    // Verify it uses monochrome zinc-900 bg and text-white instead of blue
    expect(toggleBtn.className).toContain('border-zinc-900');
    expect(toggleBtn.className).toContain('bg-zinc-900');
    expect(toggleBtn.className).toContain('text-white');
    expect(toggleBtn.className).not.toContain('#2563eb');
  });

  test('CanvasArea renders Safe Area guides with monochrome zinc styling', () => {
    const frame = {
      id: 'f1',
      name: 'Screen 1',
      x: 0,
      y: 0,
      width: 390,
      height: 844,
      nodes: [],
      safeArea: { visible: true, top: 47, bottom: 34 },
    };

    act(() => {
      root.render(
        <CanvasArea
          frames={[frame]}
          activeFrameId="f1"
          selectedNodeId={null}
          selectedNodeIds={[]}
          onSelectNode={() => {}}
          onUpdateNode={() => {}}
          zoom={1}
        />
      );
    });

    const safeTop = container.querySelector('[data-testid="safe-area-top-f1"]');
    expect(safeTop).not.toBeNull();
    expect(safeTop.className).toContain('border-zinc-400/40');
    expect(safeTop.className).toContain('bg-zinc-900/5');
    expect(safeTop.className).not.toContain('#2563eb');

    const safeBottom = container.querySelector('[data-testid="safe-area-bottom-f1"]');
    expect(safeBottom).not.toBeNull();
    expect(safeBottom.className).toContain('border-zinc-400/40');
    expect(safeBottom.className).toContain('bg-zinc-900/5');
    expect(safeBottom.className).not.toContain('#2563eb');
  });

  test('Developer Inspect mode in RightPropertiesPanel uses monochrome accents', () => {
    const node = {
      id: 'node_1',
      parentId: 'parent_auto',
      name: 'Card Header',
      type: 'text',
      x: 10,
      y: 20,
      width: 200,
      height: 30,
      style: { color: '#18181b', fontSize: 16 },
    };

    act(() => {
      root.render(
        <RightPropertiesPanel
          mode="inspect"
          activeNode={node}
          selectedNodes={[node]}
          frames={[{ id: 'f1', name: 'Screen', nodes: [node] }]}
          designTokens={{ colors: {}, radius: {}, spacing: {} }}
        />
      );
    });

    const inspectPanel = container.querySelector('[data-testid="inspect-panel"]');
    expect(inspectPanel).not.toBeNull();
    // Check that inspect icon and parent ID do not contain blue #2563eb
    expect(inspectPanel.innerHTML).not.toContain('text-[#2563eb]');
    expect(inspectPanel.innerHTML).toContain('text-zinc-900');
  });

  test('TopToolbar preset select passes single presetKey string argument to onChangeFramePreset', () => {
    let capturedArg = null;
    let totalArgs = 0;
    const frame = {
      id: 'f1',
      name: 'Screen 1',
      width: 390,
      height: 844,
      preset: 'iPhone 15',
      safeArea: { visible: true, top: 44, bottom: 34, left: 0, right: 0 },
    };

    act(() => {
      root.render(
        <TopToolbar
          activeFrame={frame}
          onChangeFramePreset={(...args) => {
            totalArgs = args.length;
            capturedArg = args[0];
          }}
        />
      );
    });

    const select = container.querySelector('[data-testid="toolbar-frame-preset-select"]');
    expect(select).not.toBeNull();
    act(() => {
      select.value = 'Android Large';
      select.dispatchEvent(new Event('change', { bubbles: true }));
    });

    expect(totalArgs).toBe(1);
    expect(capturedArg).toBe('Android Large');
  });

  test('CanvasArea renders left and right safe area guides when inset > 0', () => {
    const frame = {
      id: 'f_landscape',
      name: 'Landscape Screen',
      width: 844,
      height: 390,
      nodes: [],
      safeArea: { visible: true, top: 0, bottom: 21, left: 44, right: 44 },
    };

    act(() => {
      root.render(
        <CanvasArea
          frames={[frame]}
          activeFrameId="f_landscape"
          selectedIds={[]}
          zoom={1}
          mode="design"
        />
      );
    });

    const leftGuide = container.querySelector('[data-testid="safe-area-left-f_landscape"]');
    const rightGuide = container.querySelector('[data-testid="safe-area-right-f_landscape"]');
    expect(leftGuide).not.toBeNull();
    expect(rightGuide).not.toBeNull();
    expect(leftGuide.style.width).toBe('44px');
    expect(rightGuide.style.width).toBe('44px');

    const frameEl = container.querySelector('[data-testid="mobile-frame-f_landscape"]');
    expect(frameEl.className).toContain('border-2 border-[#18181b]');
    expect(frameEl.className).not.toContain('#2563eb');
  });
});
