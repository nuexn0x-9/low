import { createRoot } from 'react-dom/client';
import { act } from 'react';
import KeyboardShortcutsModal from '../KeyboardShortcutsModal';
import RightPropertiesPanel from '../RightPropertiesPanel';
import LeftSidebar from '../LeftSidebar';
import CanvasArea from '../CanvasArea';
global.IS_REACT_ACT_ENVIRONMENT = true;

describe('LOW Phase 7: Multi-Selection, Grouping, Alignment & Layer Workflow', () => {
  test('KeyboardShortcutsModal renders shortcuts and triggers onClose', async () => {
    const div = document.createElement('div');
    const root = createRoot(div);
    let closed = false;

    await act(async () => {
      root.render(<KeyboardShortcutsModal onClose={() => { closed = true; }} />);
    });

    expect(div.querySelector('[data-testid="keyboard-shortcuts-modal"]')).not.toBeNull();
    expect(div.textContent).toContain('Keyboard Shortcuts');
    expect(div.textContent).toContain('Selection');
    expect(div.textContent).toContain('Grouping');
    expect(div.textContent).toContain('Layer Hierarchy');

    const closeBtn = div.querySelector('[data-testid="shortcuts-close-btn"]');
    expect(closeBtn).not.toBeNull();
    await act(async () => {
      closeBtn.click();
    });
    expect(closed).toBe(true);

    await act(async () => {
      root.unmount();
    });
  });

  test('RightPropertiesPanel renders Multi-Selection mode when multiple nodes are selected', async () => {
    const div = document.createElement('div');
    const root = createRoot(div);
    const mockNodes = [
      { id: 'node_1', type: 'rectangle', name: 'Box 1', x: 20, y: 30, width: 100, height: 60, style: { fill: '#ffffff' } },
      { id: 'node_2', type: 'text', name: 'Label 1', x: 20, y: 100, width: 80, height: 30, style: { fill: '#ffffff' } },
      { id: 'node_3', type: 'button', name: 'Action', x: 20, y: 140, width: 120, height: 40, style: { fill: '#000000' } },
    ];

    let aligned = null;
    let distributed = null;
    let grouped = false;

    await act(async () => {
      root.render(
        <RightPropertiesPanel
          selectedNodes={mockNodes}
          onAlign={(align) => { aligned = align; }}
          onDistribute={(axis) => { distributed = axis; }}
          onGroup={() => { grouped = true; }}
          updateNode={() => {}}
          deleteNode={() => {}}
        />
      );
    });

    expect(div.querySelector('[data-testid="properties-panel-multi"]')).not.toBeNull();
    expect(div.textContent).toContain('Multiple Selection');
    expect(div.textContent).toContain('3');

    // Alignment buttons exist and fire
    const alignLeftBtn = div.querySelector('[data-testid="align-left-btn"]');
    expect(alignLeftBtn).not.toBeNull();
    await act(async () => {
      alignLeftBtn.click();
    });
    expect(aligned).toBe('left');

    // Distribute buttons exist and fire
    const distHBtn = div.querySelector('[data-testid="distribute-h-btn"]');
    expect(distHBtn).not.toBeNull();
    await act(async () => {
      distHBtn.click();
    });
    expect(distributed).toBe('horizontal');

    // Group button exists and fires
    const groupBtn = div.querySelector('[data-testid="group-selection-btn"]');
    expect(groupBtn).not.toBeNull();
    await act(async () => {
      groupBtn.click();
    });
    expect(grouped).toBe(true);

    await act(async () => {
      root.unmount();
    });
  });

  test('RightPropertiesPanel renders Group inspector with child count and ungroup button for group node', async () => {
    const div = document.createElement('div');
    const root = createRoot(div);
    const mockGroup = {
      id: 'grp_1',
      type: 'group',
      name: 'Card Group',
      x: 10,
      y: 20,
      width: 200,
      height: 150,
      children: ['child_1', 'child_2'],
      style: {},
    };

    let ungroupedId = null;

    await act(async () => {
      root.render(
        <RightPropertiesPanel
          node={mockGroup}
          selectedNodes={[mockGroup]}
          onUngroup={(id) => { ungroupedId = id; }}
          updateNode={() => {}}
          deleteNode={() => {}}
        />
      );
    });

    expect(div.textContent).toContain('Card Group');
    expect(div.textContent).toContain('2 child elements');
    const ungroupBtn = div.querySelector('[data-testid="ungroup-btn"]');
    expect(ungroupBtn).not.toBeNull();
    await act(async () => {
      ungroupBtn.click();
    });
    expect(ungroupedId).toBe('grp_1');

    await act(async () => {
      root.unmount();
    });
  });

  test('LeftSidebar renders Layers with lock and hide toggles', async () => {
    const div = document.createElement('div');
    const root = createRoot(div);
    const mockNodes = [
      { id: 'node_a', type: 'rectangle', name: 'Background', locked: true, hidden: false },
      { id: 'node_b', type: 'text', name: 'Title', locked: false, hidden: true },
    ];

    let lockedId = null;
    let hiddenId = null;

    await act(async () => {
      root.render(
        <LeftSidebar
          tab="layers"
          setTab={() => {}}
          frames={[{ id: 'f_1', name: 'Home', nodes: mockNodes }]}
          activeFrameId="f_1"
          selectFrame={() => {}}
          addScreen={() => {}}
          deleteFrame={() => {}}
          nodes={mockNodes}
          selectedIds={['node_a']}
          onToggleLock={(id) => { lockedId = id; }}
          onToggleHide={(id) => { hiddenId = id; }}
        />
      );
    });

    const lockBtn = div.querySelector('[data-testid="lock-node-node_a"]');
    expect(lockBtn).not.toBeNull();
    await act(async () => {
      lockBtn.click();
    });
    expect(lockedId).toBe('node_a');

    const hideBtn = div.querySelector('[data-testid="hide-node-node_b"]');
    expect(hideBtn).not.toBeNull();
    await act(async () => {
      hideBtn.click();
    });
    expect(hiddenId).toBe('node_b');

    await act(async () => {
      root.unmount();
    });
  });

  test('CanvasArea renders multi-selection outline and omits hidden nodes', async () => {
    const div = document.createElement('div');
    const root = createRoot(div);
    const mockNodes = [
      { id: 'node_1', type: 'rectangle', name: 'Box 1', x: 20, y: 30, width: 100, height: 60, style: {} },
      { id: 'node_2', type: 'rectangle', name: 'Box 2', x: 150, y: 80, width: 80, height: 40, style: {} },
      { id: 'node_hidden', type: 'text', name: 'Ghost', x: 0, y: 0, width: 50, height: 20, hidden: true, style: {} },
    ];

    await act(async () => {
      root.render(
        <CanvasArea
          frames={[{ id: 'f_1', name: 'Screen 1', nodes: mockNodes }]}
          activeFrameId="f_1"
          selectFrame={() => {}}
          selectedIds={['node_1', 'node_2']}
          zoom={1}
          mode="design"
        />
      );
    });

    // Hidden node must not be rendered on canvas
    expect(div.querySelector('[data-testid="canvas-node-node_hidden"]')).toBeNull();

    // Visible nodes are rendered
    expect(div.querySelector('[data-testid="canvas-node-node_1"]')).not.toBeNull();
    expect(div.querySelector('[data-testid="canvas-node-node_2"]')).not.toBeNull();

    // Multi-selection outline is displayed
    const multiOutline = div.querySelector('[data-testid="multi-selection-outline"]');
    expect(multiOutline).not.toBeNull();
    expect(multiOutline.textContent).toContain('2 selected');

    await act(async () => {
      root.unmount();
    });
  });
});
