import { createRoot } from 'react-dom/client';
import { act } from 'react';
import NodeView from '../NodeView';
import CanvasArea from '../CanvasArea';
import RightPropertiesPanel from '../RightPropertiesPanel';
import TopToolbar from '../TopToolbar';
import { FRAME_PRESETS, exportProjectJSON, parseImportJSON } from '@/data/storage';

// Enable act environment for React 18+
global.IS_REACT_ACT_ENVIRONMENT = true;

function setReactInputValue(input, value) {
  const isSelect = input instanceof window.HTMLSelectElement;
  const isTextArea = input instanceof window.HTMLTextAreaElement;
  const proto = isSelect
    ? window.HTMLSelectElement.prototype
    : isTextArea
    ? window.HTMLTextAreaElement.prototype
    : window.HTMLInputElement.prototype;
  const setter = Object.getOwnPropertyDescriptor(proto, 'value').set;
  setter.call(input, value);
  input.dispatchEvent(new Event('input', { bubbles: true }));
  input.dispatchEvent(new Event('change', { bubbles: true }));
}

describe('LOW Phase 9: Responsive Layout & Auto Layout', () => {
  test('NodeView renders autoLayout with flexbox rules and child layout sizing', async () => {
    const div = document.createElement('div');
    const root = createRoot(div);

    const childNode1 = {
      id: 'c1',
      type: 'text',
      parentId: 'auto_1',
      x: 0,
      y: 0,
      width: 100,
      height: 24,
      text: 'Auto Item 1',
      layoutSizing: { width: 'fill', height: 'fixed' },
      style: { color: '#18181b', fontSize: 14 },
    };

    const childNode2 = {
      id: 'c2',
      type: 'button',
      parentId: 'auto_1',
      x: 0,
      y: 0,
      width: 80,
      height: 36,
      text: 'Action',
      layoutSizing: { width: 'hug', height: 'hug' },
      style: { fill: '#18181b', color: '#ffffff' },
    };

    const autoNode = {
      id: 'auto_1',
      type: 'autoLayout',
      name: 'Auto Layout',
      x: 20,
      y: 50,
      width: 320,
      height: 180,
      layout: {
        direction: 'vertical',
        gap: 16,
        padding: { top: 12, right: 14, bottom: 12, left: 14 },
        align: 'stretch',
        justify: 'space-between',
        wrap: false,
      },
      children: ['c1', 'c2'],
      style: { fill: '#ffffff', stroke: '#e4e4e7', strokeWidth: 1 },
    };

    const allNodes = [autoNode, childNode1, childNode2];

    await act(async () => {
      root.render(
        <NodeView
          node={autoNode}
          allNodes={allNodes}
          components={[]}
        />
      );
    });

    const container = div.querySelector('[data-testid="autolayout-container-auto_1"]');
    expect(container).not.toBeNull();
    expect(container.style.display).toBe('flex');
    expect(container.style.flexDirection).toBe('column');
    expect(container.style.gap).toBe('16px');
    expect(container.style.padding).toBe('12px 14px 12px 14px');
    expect(container.style.alignItems).toBe('stretch');
    expect(container.style.justifyContent).toBe('space-between');
    expect(div.textContent).toContain('Auto Item 1');
    expect(div.textContent).toContain('Action');

    await act(async () => {
      root.unmount();
    });
  });

  test('NodeView renders scrollArea with directional overflow', async () => {
    const div = document.createElement('div');
    const root = createRoot(div);

    const scrollNode = {
      id: 'scroll_1',
      type: 'scrollArea',
      name: 'Feed Scroll',
      x: 0,
      y: 100,
      width: 390,
      height: 400,
      scroll: {
        direction: 'vertical',
        contentHeight: 1200,
        contentWidth: 390,
        showIndicator: true,
      },
      children: [],
      style: { fill: 'transparent' },
    };

    await act(async () => {
      root.render(<NodeView node={scrollNode} allNodes={[scrollNode]} components={[]} />);
    });

    const scrollEl = div.querySelector('[data-testid="scrollarea-container-scroll_1"]');
    expect(scrollEl).not.toBeNull();
    expect(scrollEl.style.overflowY).toBe('auto');
    expect(scrollEl.style.overflowX).toBe('hidden');

    await act(async () => {
      root.unmount();
    });
  });

  test('CanvasArea renders frame with dynamic dimensions and safe area guide', async () => {
    const div = document.createElement('div');
    const root = createRoot(div);

    const mockFrames = [
      {
        id: 'f_test',
        name: 'iPhone 15 Frame',
        preset: 'iphone-15',
        width: 393,
        height: 852,
        safeArea: { top: 59, bottom: 34, left: 0, right: 0, visible: true },
        nodes: [
          {
            id: 'n1',
            type: 'rectangle',
            x: 20,
            y: 70,
            width: 100,
            height: 100,
            style: { fill: '#3b82f6' },
          },
        ],
      },
    ];

    await act(async () => {
      root.render(
        <CanvasArea
          frames={mockFrames}
          activeFrameId="f_test"
          selectedIds={[]}
          zoom={1}
          mode="design"
        />
      );
    });

    const safeTop = div.querySelector('[data-testid="safe-area-top-f_test"]');
    const safeBottom = div.querySelector('[data-testid="safe-area-bottom-f_test"]');
    expect(safeTop).not.toBeNull();
    expect(safeBottom).not.toBeNull();
    expect(safeTop.style.height).toBe('59px');
    expect(safeBottom.style.height).toBe('34px');

    await act(async () => {
      root.unmount();
    });
  });

  test('RightPropertiesPanel inspects and updates screen frame preset and safe area', async () => {
    const div = document.createElement('div');
    const root = createRoot(div);

    let presetChanged = null;
    let safeAreaChanged = null;

    const activeFrame = {
      id: 'f_main',
      name: 'Main Screen',
      preset: 'iPhone 15',
      width: 393,
      height: 852,
      safeArea: { top: 59, bottom: 34, left: 0, right: 0, visible: true },
      nodes: [],
    };

    await act(async () => {
      root.render(
        <RightPropertiesPanel
          node={null}
          selectedNodes={[]}
          activeFrame={activeFrame}
          onChangeFramePreset={(pk) => {
            presetChanged = pk;
          }}
          onUpdateSafeArea={(patch) => {
            safeAreaChanged = patch;
          }}
        />
      );
    });

    const presetSelect = div.querySelector('[data-testid="frame-preset-select"]');
    expect(presetSelect).not.toBeNull();
    expect(presetSelect.value).toBe('iPhone 15');

    await act(async () => {
      setReactInputValue(presetSelect, 'Android Compact');
    });
    expect(presetChanged).toBe('Android Compact');

    // Toggle safe area
    const safeToggle = div.querySelector('[data-testid="safe-area-visible-toggle"]');
    expect(safeToggle).not.toBeNull();
    await act(async () => {
      safeToggle.click();
    });
    expect(safeAreaChanged).toEqual({ visible: false });

    await act(async () => {
      root.unmount();
    });
  });

  test('RightPropertiesPanel inspects and edits autoLayout properties and child sizing', async () => {
    const div = document.createElement('div');
    const root = createRoot(div);

    let updatedNodeId = null;
    let nodePatch = null;

    const autoNode = {
      id: 'auto_target',
      type: 'autoLayout',
      name: 'Auto Layout',
      x: 0,
      y: 0,
      width: 300,
      height: 200,
      layout: {
        direction: 'vertical',
        gap: 12,
        padding: { top: 16, right: 16, bottom: 16, left: 16 },
        align: 'stretch',
        justify: 'start',
        wrap: false,
      },
      children: [],
      style: { fill: 'transparent' },
    };

    await act(async () => {
      root.render(
        <RightPropertiesPanel
          node={autoNode}
          selectedNodes={[autoNode]}
          updateNode={(nid, patch) => {
            updatedNodeId = nid;
            nodePatch = patch;
          }}
        />
      );
    });

    // Toggle horizontal direction
    const horizBtn = div.querySelector('[data-testid="autolayout-dir-horizontal"]');
    expect(horizBtn).not.toBeNull();
    await act(async () => {
      horizBtn.click();
    });
    expect(updatedNodeId).toBe('auto_target');
    expect(nodePatch.layout.direction).toBe('horizontal');

    // Change gap
    const gapInput = div.querySelector('[data-testid="autolayout-gap"]');
    expect(gapInput).not.toBeNull();
    await act(async () => {
      setReactInputValue(gapInput, '24');
    });
    expect(nodePatch.layout.gap).toBe(24);

    // Now test a child node inside autoLayout
    const childNode = {
      id: 'child_1',
      type: 'rectangle',
      parentId: 'auto_target',
      x: 0,
      y: 0,
      width: 100,
      height: 40,
      layoutSizing: { width: 'fixed', height: 'fixed' },
      constraints: { horizontal: 'left', vertical: 'top' },
      style: { fill: '#e4e4e7' },
    };

    await act(async () => {
      root.render(
        <RightPropertiesPanel
          node={childNode}
          selectedNodes={[childNode]}
          updateNode={(nid, patch) => {
            updatedNodeId = nid;
            nodePatch = patch;
          }}
        />
      );
    });

    const widthSizingSelect = div.querySelector('[data-testid="child-sizing-width-select"]');
    expect(widthSizingSelect).not.toBeNull();
    await act(async () => {
      setReactInputValue(widthSizingSelect, 'fill');
    });
    expect(updatedNodeId).toBe('child_1');
    expect(nodePatch.layoutSizing.width).toBe('fill');

    // Test constraints update on top-level node
    const topNode = {
      id: 'top_1',
      type: 'rectangle',
      x: 0,
      y: 0,
      width: 100,
      height: 40,
      constraints: { horizontal: 'left', vertical: 'top' },
      style: { fill: '#e4e4e7' },
    };

    await act(async () => {
      root.render(
        <RightPropertiesPanel
          node={topNode}
          selectedNodes={[topNode]}
          updateNode={(nid, patch) => {
            updatedNodeId = nid;
            nodePatch = patch;
          }}
        />
      );
    });

    const hConstraintSelect = div.querySelector('[data-testid="constraint-horizontal-select"]');
    expect(hConstraintSelect).not.toBeNull();
    await act(async () => {
      setReactInputValue(hConstraintSelect, 'left-right');
    });
    expect(updatedNodeId).toBe('top_1');
    expect(nodePatch.constraints.horizontal).toBe('left-right');

    await act(async () => {
      root.unmount();
    });
  });

  test('RightPropertiesPanel multi-select allows creating Auto Layout', async () => {
    const div = document.createElement('div');
    const root = createRoot(div);

    let autoLayoutCreated = false;
    const selectedNodes = [
      { id: 'n1', type: 'rectangle', x: 10, y: 10, width: 100, height: 40, style: {} },
      { id: 'n2', type: 'text', x: 10, y: 60, width: 100, height: 20, style: {} },
    ];

    await act(async () => {
      root.render(
        <RightPropertiesPanel
          node={null}
          selectedNodes={selectedNodes}
          onCreateAutoLayout={() => {
            autoLayoutCreated = true;
          }}
        />
      );
    });

    const createBtn = div.querySelector('[data-testid="create-autolayout-btn"]');
    expect(createBtn).not.toBeNull();
    await act(async () => {
      createBtn.click();
    });
    expect(autoLayoutCreated).toBe(true);

    await act(async () => {
      root.unmount();
    });
  });

  test('Project JSON round-trip preserves Phase 9 responsive properties', () => {
    const projectData = {
      id: 'proj_p9',
      name: 'Phase 9 Project',
      frames: [
        {
          id: 'frame_1',
          name: 'Home',
          preset: 'iphone-15',
          width: 393,
          height: 852,
          safeArea: { top: 59, bottom: 34, left: 0, right: 0, visible: true },
          nodes: [
            {
              id: 'al_1',
              type: 'autoLayout',
              name: 'Auto List',
              x: 16,
              y: 80,
              width: 361,
              height: 400,
              layout: {
                direction: 'vertical',
                gap: 12,
                padding: { top: 16, right: 16, bottom: 16, left: 16 },
                align: 'stretch',
                justify: 'start',
                wrap: false,
              },
              children: ['item_1'],
              style: { fill: '#ffffff' },
            },
            {
              id: 'item_1',
              type: 'rectangle',
              parentId: 'al_1',
              x: 0,
              y: 0,
              width: 329,
              height: 50,
              layoutSizing: { width: 'fill', height: 'fixed' },
              constraints: { horizontal: 'left-right', vertical: 'top' },
              style: { fill: '#f4f4f5' },
            },
          ],
        },
      ],
    };

    const jsonStr = exportProjectJSON(projectData);
    const parsed = parseImportJSON(jsonStr);

    expect(parsed.length).toBe(1);
    const frame = parsed[0];
    expect(frame.preset).toBe('iphone-15');
    expect(frame.width).toBe(393);
    expect(frame.height).toBe(852);
    expect(frame.safeArea.top).toBe(59);

    const alNode = frame.nodes.find((n) => n.id === 'al_1');
    expect(alNode.type).toBe('autoLayout');
    expect(alNode.layout.direction).toBe('vertical');
    expect(alNode.layout.gap).toBe(12);

    const itemNode = frame.nodes.find((n) => n.id === 'item_1');
    expect(itemNode.parentId).toBe('al_1');
    expect(itemNode.layoutSizing.width).toBe('fill');
    expect(itemNode.constraints.horizontal).toBe('left-right');
  });
});
