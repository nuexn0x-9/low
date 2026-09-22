import { createRoot } from 'react-dom/client';
import { act } from 'react';
import TopToolbar from '../TopToolbar';
import CanvasArea from '../CanvasArea';
import RightPropertiesPanel from '../RightPropertiesPanel';
import PreviewModal from '../PreviewModal';
import LeftSidebar from '../LeftSidebar';
import AgentPanel from '../AgentPanel';
import AiImportPanel from '../AiImportPanel';
import * as aiApi from '@/data/aiApi';

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

  test('PreviewModal renders centered phone mockup with components and 4-sided safe area', () => {
    const frame = {
      id: 'f_preview',
      name: 'Preview Screen',
      width: 390,
      height: 844,
      safeArea: { visible: true, top: 44, bottom: 34, left: 10, right: 10 },
      nodes: [
        {
          id: 'n_comp',
          type: 'componentInstance',
          componentId: 'c_header',
          name: 'Custom Header',
          x: 0,
          y: 44,
          width: 390,
          height: 60,
          overrides: { text: 'Custom Header Title' },
        },
      ],
    };

    const components = [
      {
        id: 'c_header',
        name: 'Header Component',
        nodes: [
          {
            id: 'n_leaf',
            type: 'text',
            name: 'Title',
            text: 'Default Header',
            x: 20,
            y: 10,
            width: 300,
            height: 40,
            style: { color: '#18181b' },
          },
        ],
      },
    ];

    act(() => {
      root.render(
        <PreviewModal
          frames={[frame]}
          startFrameId="f_preview"
          onClose={() => {}}
          components={components}
        />
      );
    });

    const modal = container.querySelector('[data-testid="preview-modal"]');
    expect(modal).not.toBeNull();

    // Verify safe area overlay rendered
    const safeOverlay = container.querySelector('[data-testid="preview-safe-area-overlay"]');
    expect(safeOverlay).not.toBeNull();

    // Verify component instance rendered resolved text
    expect(modal.textContent).toContain('Custom Header Title');
  });

  test('PreviewModal handles prototype navigation, overlay opening, and back navigation', () => {
    let closed = false;
    const frame1 = {
      id: 'f_home',
      name: 'Home',
      width: 390,
      height: 844,
      nodes: [
        {
          id: 'btn_nav',
          type: 'button',
          name: 'Details Button',
          text: 'Go to Details',
          x: 20,
          y: 100,
          width: 200,
          height: 50,
          prototype: { trigger: 'tap', action: 'navigate', target: 'f_details' },
        },
        {
          id: 'btn_modal',
          type: 'button',
          name: 'Modal Button',
          text: 'Open Sheet',
          x: 20,
          y: 180,
          width: 200,
          height: 50,
          prototype: { trigger: 'tap', action: 'modal', target: 'f_sheet', overlayType: 'bottom-sheet' },
        },
      ],
    };

    const frame2 = {
      id: 'f_details',
      name: 'Details Screen',
      width: 390,
      height: 844,
      nodes: [
        {
          id: 'btn_back',
          type: 'button',
          name: 'Back',
          text: 'Go Back',
          x: 20,
          y: 100,
          width: 100,
          height: 40,
          prototype: { trigger: 'tap', action: 'back' },
        },
      ],
    };

    const frame3 = {
      id: 'f_sheet',
      name: 'Sheet Screen',
      width: 390,
      height: 400,
      nodes: [
        {
          id: 'txt_sheet',
          type: 'text',
          name: 'Sheet Text',
          text: 'Inside Bottom Sheet',
          x: 20,
          y: 20,
          width: 200,
          height: 30,
        },
      ],
    };

    act(() => {
      root.render(
        <PreviewModal
          frames={[frame1, frame2, frame3]}
          startFrameId="f_home"
          onClose={() => { closed = true; }}
          components={[]}
        />
      );
    });

    const modal = container.querySelector('[data-testid="preview-modal"]');
    expect(modal.textContent).toContain('Preview — Home');

    // 1. Click navigate button
    const navBtn = Array.from(container.querySelectorAll('div')).find(
      (el) => el.textContent === 'Go to Details'
    );
    expect(navBtn).not.toBeNull();
    act(() => {
      navBtn.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });

    // Should now be on Details Screen
    expect(modal.textContent).toContain('Preview — Details Screen');

    // 2. Click back button
    const backBtn = container.querySelector('[data-testid="preview-back-btn"]');
    expect(backBtn).not.toBeNull();
    act(() => {
      backBtn.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });

    // Should be back on Home
    expect(modal.textContent).toContain('Preview — Home');

    // 3. Click modal button
    const modalBtn = Array.from(container.querySelectorAll('div')).find(
      (el) => el.textContent === 'Open Sheet'
    );
    expect(modalBtn).not.toBeNull();
    act(() => {
      modalBtn.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });

    // Overlay backdrop & content should be rendered
    const overlayBackdrop = container.querySelector('[data-testid="preview-overlay-backdrop"]');
    expect(overlayBackdrop).not.toBeNull();
    expect(modal.textContent).toContain('Inside Bottom Sheet');

    // Dismiss overlay via backdrop click
    act(() => {
      overlayBackdrop.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });
    expect(container.querySelector('[data-testid="preview-overlay-backdrop"]')).toBeNull();

    // 4. Close preview
    const closeBtn = container.querySelector('[data-testid="preview-close-btn"]');
    act(() => {
      closeBtn.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });
    expect(closed).toBe(true);
  });

  test('LeftSidebar screens tab supports duplicate screen and guards single screen deletion', () => {
    let duplicatedId = null;
    let deletedId = null;
    const frames = [
      { id: 'f1', name: 'Home Screen', nodes: [] },
      { id: 'f2', name: 'Profile Screen', nodes: [] },
    ];

    act(() => {
      root.render(
        <LeftSidebar
          tab="pages"
          setTab={() => {}}
          frames={frames}
          activeFrameId="f1"
          selectFrame={() => {}}
          addScreen={() => {}}
          deleteFrame={(id) => { deletedId = id; }}
          onDuplicateFrame={(id) => { duplicatedId = id; }}
          nodes={[]}
          selectedIds={[]}
          setSelectedIds={() => {}}
        />
      );
    });

    const dupBtn = container.querySelector('[data-testid="frame-duplicate-f1"]');
    expect(dupBtn).not.toBeNull();
    act(() => {
      dupBtn.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });
    expect(duplicatedId).toBe('f1');

    const delBtn = container.querySelector('[data-testid="frame-delete-f1"]');
    expect(delBtn).not.toBeNull();
    act(() => {
      delBtn.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });
    expect(deletedId).toBe('f1');
  });

  test('LeftSidebar layers tab supports inline rename and layer reordering', () => {
    let reorderedNodeId = null;
    let reorderedDir = null;
    let renamedNodeId = null;
    let renamedVal = null;
    const nodes = [
      { id: 'n1', name: 'Button 1', type: 'rectangle', x: 0, y: 0, width: 100, height: 40 },
      { id: 'n2', name: 'Title Text', type: 'text', x: 0, y: 50, width: 100, height: 20 },
    ];

    act(() => {
      root.render(
        <LeftSidebar
          tab="layers"
          setTab={() => {}}
          frames={[{ id: 'f1', name: 'Screen 1', nodes }]}
          activeFrameId="f1"
          nodes={nodes}
          selectedIds={['n1']}
          setSelectedIds={() => {}}
          onReorderLayer={(id, dir) => {
            reorderedNodeId = id;
            reorderedDir = dir;
          }}
          onRenameNode={(id, name) => {
            renamedNodeId = id;
            renamedVal = name;
          }}
        />
      );
    });

    // Test reorder forward button
    const fwdBtn = container.querySelector('[data-testid="reorder-forward-n1"]');
    expect(fwdBtn).not.toBeNull();
    act(() => {
      fwdBtn.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });
    expect(reorderedNodeId).toBe('n1');
    expect(reorderedDir).toBe('forward');

    // Test double click to rename
    const layerItem = container.querySelector('[data-testid="layer-node-n1"]');
    act(() => {
      layerItem.dispatchEvent(new MouseEvent('dblclick', { bubbles: true }));
    });

    const renameInput = container.querySelector('[data-testid="node-rename-input-n1"]');
    expect(renameInput).not.toBeNull();
    act(() => {
      const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
      setter.call(renameInput, 'Primary CTA');
      renameInput.dispatchEvent(new Event('input', { bubbles: true }));
      renameInput.dispatchEvent(new Event('change', { bubbles: true }));
      renameInput.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
    });

    expect(renamedNodeId).toBe('n1');
    expect(renamedVal).toBe('Primary CTA');
  });

  test('CanvasArea renders 8 resize handles on single selection with strict monochrome styling', () => {
    const frame = {
      id: 'f1',
      name: 'Screen 1',
      x: 0,
      y: 0,
      width: 390,
      height: 844,
      nodes: [
        { id: 'n1', name: 'Hero Card', type: 'rectangle', x: 20, y: 50, width: 350, height: 200, style: {} },
      ],
    };

    act(() => {
      root.render(
        <CanvasArea
          frames={[frame]}
          activeFrameId="f1"
          selectedId="n1"
          selectedIds={['n1']}
          setSelectedId={() => {}}
          setSelectedIds={() => {}}
          zoom={1}
        />
      );
    });

    const outline = container.querySelector('[data-testid="selection-outline"]');
    expect(outline).not.toBeNull();
    // Verify monochrome outline (no blue #2563eb)
    expect(outline.style.outline).toContain('#18181b');
    expect(outline.style.outline).not.toContain('#2563eb');

    // Verify all 8 handles are present
    const handles = ['nw', 'n', 'ne', 'e', 'se', 's', 'sw', 'w'];
    handles.forEach((h) => {
      const handleEl = container.querySelector(`[data-testid="resize-handle-${h}"]`);
      expect(handleEl).not.toBeNull();
      expect(handleEl.className).toContain('border-[#18181b]');
      expect(handleEl.className).not.toContain('#2563eb');
    });
  });

  test('CanvasArea handles wheel zoom with Ctrl key', () => {
    let nextZoom = null;
    const frame = {
      id: 'f1',
      name: 'Screen 1',
      x: 0,
      y: 0,
      width: 390,
      height: 844,
      nodes: [],
    };

    act(() => {
      root.render(
        <CanvasArea
          frames={[frame]}
          activeFrameId="f1"
          selectedIds={[]}
          zoom={1}
          setZoom={(updater) => {
            nextZoom = typeof updater === 'function' ? updater(1) : updater;
          }}
        />
      );
    });

    const canvasMain = container.querySelector('[data-testid="canvas-area"]');
    expect(canvasMain).not.toBeNull();

    act(() => {
      const wheelEvent = new WheelEvent('wheel', {
        bubbles: true,
        cancelable: true,
        ctrlKey: true,
        deltaY: -100, // Zoom in
      });
      canvasMain.dispatchEvent(wheelEvent);
    });

    expect(nextZoom).toBe(1.1);
  });

  test('AiImportPanel loads history drafts and fetches full draft details via getAiDraftById on select', async () => {
    const mockDraft = {
      id: 'draft_999',
      prompt: 'Profile Settings Screen',
      result_type: 'screen',
      created_at: '2026-09-22T10:00:00Z',
    };

    const mockFullDraft = {
      id: 'draft_999',
      prompt: 'Profile Settings Screen',
      frames: [
        {
          id: 'f_profile',
          name: 'Profile Settings Screen',
          nodes: [{ id: 'n_title', type: 'text', name: 'Profile Header' }],
        },
      ],
      validation: { valid: true, errors: [], warnings: [] },
    };

    jest.spyOn(aiApi, 'getAiDraftHistory').mockResolvedValue([mockDraft]);
    const getDraftSpy = jest.spyOn(aiApi, 'getAiDraftById').mockResolvedValue(mockFullDraft);

    await act(async () => {
      root.render(<AiImportPanel projectId="proj_1" onApplyPatch={() => {}} />);
    });

    // Switch to history tab
    const historyTabBtn = container.querySelector('[data-testid="ai-history-tab-btn"]');
    expect(historyTabBtn).not.toBeNull();

    await act(async () => {
      historyTabBtn.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });

    // Locate the draft in the history list
    const draftItem = container.querySelector('[data-testid="history-draft-draft_999"]');
    expect(draftItem).not.toBeNull();

    // Click to select
    await act(async () => {
      draftItem.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });

    // Should call getAiDraftById with draft_999
    expect(getDraftSpy).toHaveBeenCalledWith('draft_999');

    // Should switch back to summary view with preview area showing the screen name
    const previewArea = container.querySelector('[data-testid="ai-preview-area"]');
    expect(previewArea).not.toBeNull();
    expect(previewArea.textContent).toContain('Profile Settings Screen');
  });

  test('AgentPanel displays status, credentials, and granted scopes in monochrome styling', () => {
    const session = {
      session_id: 'sess_12345',
      token: 'tok_abcde',
      preset: 'full_editor_assistant',
      scopes: ['read_document', 'write_document', 'create_screen'],
      is_revoked: false,
    };

    act(() => {
      root.render(
        <AgentPanel
          session={session}
          baseUrl="http://localhost:8000"
          connecting={false}
          onStart={() => {}}
          onStop={() => {}}
          onRevoke={() => {}}
        />
      );
    });

    // Status is Connected
    const statusEl = container.querySelector('[data-testid="agent-status"]');
    expect(statusEl).not.toBeNull();
    expect(statusEl.textContent).toContain('Connected');

    // Scopes list contains the granted scopes
    const scopesEl = container.querySelector('[data-testid="agent-scopes-list"]');
    expect(scopesEl).not.toBeNull();
    expect(scopesEl.textContent).toContain('read_document');
    expect(scopesEl.textContent).toContain('write_document');
    expect(scopesEl.textContent).toContain('create_screen');

    // Credentials copy buttons present
    expect(container.querySelector('[data-testid="agent-copy-session"]')).not.toBeNull();
    expect(container.querySelector('[data-testid="agent-copy-token"]')).not.toBeNull();

    // Verify monochrome palette (no #2563eb)
    expect(container.innerHTML).not.toContain('#2563eb');
  });
});


