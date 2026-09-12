import { createRoot } from 'react-dom/client';
import { act } from 'react';
import NodeView from '../NodeView';
import CanvasArea from '../CanvasArea';
import RightPropertiesPanel from '../RightPropertiesPanel';
import LeftSidebar from '../LeftSidebar';
import { DEFAULT_DESIGN_TOKENS, STYLE_PRESETS, exportProjectJSON, parseImportJSON } from '@/data/storage';

// Enable act environment for React 18+
global.IS_REACT_ACT_ENVIRONMENT = true;

function setReactInputValue(input, value) {
  const isTextArea = input instanceof window.HTMLTextAreaElement;
  const proto = isTextArea ? window.HTMLTextAreaElement.prototype : window.HTMLInputElement.prototype;
  const setter = Object.getOwnPropertyDescriptor(proto, 'value').set;
  setter.call(input, value);
  input.dispatchEvent(new Event('input', { bubbles: true }));
  input.dispatchEvent(new Event('change', { bubbles: true }));
}

describe('LOW Phase 8: Text, Components, and Design System Upgrade', () => {
  test('NodeView renders typography styles and componentInstance overrides', async () => {
    const div = document.createElement('div');
    const root = createRoot(div);

    const textNode = {
      id: 't1',
      type: 'text',
      x: 10,
      y: 20,
      width: 200,
      height: 40,
      text: 'Custom Typography',
      style: {
        fontFamily: 'Inter',
        fontSize: 18,
        fontWeight: 600,
        lineHeight: 1.4,
        letterSpacing: 0.5,
        textAlign: 'center',
        textTransform: 'uppercase',
        textDecoration: 'underline',
        color: '#123456',
      },
    };

    await act(async () => {
      root.render(<NodeView node={textNode} />);
    });

    const el = div.firstElementChild;
    expect(el.textContent).toContain('Custom Typography');
    expect(el.style.fontFamily).toBe('Inter');
    expect(el.style.fontSize).toBe('18px');
    expect(el.style.fontWeight).toBe('600');
    expect(el.style.letterSpacing).toBe('0.5px');
    expect(el.style.textAlign).toBe('center');
    expect(el.style.textTransform).toBe('uppercase');
    expect(el.style.textDecoration).toBe('underline');

    // Test componentInstance
    const instanceNode = {
      id: 'inst1',
      type: 'componentInstance',
      componentId: 'comp_1',
      name: 'Card Instance',
      x: 0,
      y: 0,
      width: 150,
      height: 50,
      overrides: {
        text: 'Overridden Text',
        style: { fill: '#aabbcc' },
      },
      style: { fill: '#ffffff' },
    };

    await act(async () => {
      root.render(<NodeView node={instanceNode} components={[]} />);
    });

    expect(div.textContent).toContain('Overridden Text');

    await act(async () => {
      root.unmount();
    });
  });

  test('CanvasArea activates inline text editor on double-click and commits on enter', async () => {
    const div = document.createElement('div');
    const root = createRoot(div);

    let committedText = null;
    const mockFrames = [
      {
        id: 'f1',
        name: 'Screen 1',
        nodes: [
          {
            id: 'node_text',
            type: 'text',
            name: 'Title',
            text: 'Original Text',
            x: 20,
            y: 50,
            width: 120,
            height: 30,
            style: { fontSize: 16 },
          },
        ],
      },
    ];

    await act(async () => {
      root.render(
        <CanvasArea
          frames={mockFrames}
          activeFrameId="f1"
          selectFrame={() => {}}
          selectedId="node_text"
          selectedIds={['node_text']}
          onCommitNodeText={(id, text) => {
            committedText = text;
          }}
        />
      );
    });

    const nodeEl = div.querySelector('[data-testid="canvas-node-node_text"]');
    expect(nodeEl).not.toBeNull();

    // Trigger double-click on node wrapper
    const wrapper = nodeEl.parentElement;
    await act(async () => {
      wrapper.dispatchEvent(new MouseEvent('dblclick', { bubbles: true }));
    });

    // Inline textarea editor should appear
    const textarea = div.querySelector('[data-testid="inline-text-editor-node_text"]');
    expect(textarea).not.toBeNull();
    expect(textarea.value).toBe('Original Text');

    // Type and press Enter
    await act(async () => {
      setReactInputValue(textarea, 'New Inline Value');
      textarea.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
    });

    expect(committedText).toBe('New Inline Value');

    await act(async () => {
      root.unmount();
    });
  });

  test('RightPropertiesPanel provides Style Presets, extended Typography, and Component Detach', async () => {
    const div = document.createElement('div');
    const root = createRoot(div);

    let detachedId = null;
    let appliedPreset = null;
    let updatedStyle = {};

    const instanceNode = {
      id: 'inst_1',
      type: 'componentInstance',
      componentId: 'comp_btn',
      name: 'Button Instance',
      x: 10,
      y: 10,
      width: 100,
      height: 40,
      overrides: { text: 'Custom Button' },
      style: { fill: '#18181b', color: '#ffffff', fontSize: 14 },
    };

    await act(async () => {
      root.render(
        <RightPropertiesPanel
          node={instanceNode}
          selectedNodes={[instanceNode]}
          onDetachInstance={(id) => {
            detachedId = id;
          }}
          onApplyPreset={(preset) => {
            appliedPreset = preset;
          }}
          updateNode={(id, patch) => {
            if (patch.style) Object.assign(updatedStyle, patch.style);
          }}
          deleteNode={() => {}}
        />
      );
    });

    // Check Detach button
    const detachBtn = div.querySelector('[data-testid="detach-instance-btn"]');
    expect(detachBtn).not.toBeNull();
    await act(async () => {
      detachBtn.click();
    });
    expect(detachedId).toBe('inst_1');

    // Check Style Preset dropdown
    const presetSelect = div.querySelector('[data-testid="style-preset-select"]');
    expect(presetSelect).not.toBeNull();
    await act(async () => {
      presetSelect.value = 'heading';
      presetSelect.dispatchEvent(new Event('change', { bubbles: true }));
    });
    expect(appliedPreset).toBe('heading');

    // Check Typography controls
    const fontSelect = div.querySelector('[data-testid="prop-fontfamily"]');
    expect(fontSelect).not.toBeNull();
    await act(async () => {
      fontSelect.value = 'Roboto';
      fontSelect.dispatchEvent(new Event('change', { bubbles: true }));
    });
    expect(updatedStyle.fontFamily).toBe('Roboto');

    const lineHInput = div.querySelector('[data-testid="prop-lineheight"]');
    expect(lineHInput).not.toBeNull();
    await act(async () => {
      setReactInputValue(lineHInput, '1.5');
    });
    expect(updatedStyle.lineHeight).toBe(1.5);

    await act(async () => {
      root.unmount();
    });
  });

  test('LeftSidebar supports Design Tokens tab, Component Creation, and Instance badges', async () => {
    const div = document.createElement('div');
    const root = createRoot(div);

    let appliedToken = null;
    let createdCompName = null;
    let insertedCompId = null;

    const mockNodes = [
      { id: 'inst_x', type: 'componentInstance', name: 'Header Instance', componentId: 'comp_hdr' },
    ];

    const mockCustomComponents = [
      { id: 'comp_hdr', name: 'Header Component', width: 300, height: 60 },
    ];

    // 1. Tokens Tab
    await act(async () => {
      root.render(
        <LeftSidebar
          tab="tokens"
          setTab={() => {}}
          frames={[{ id: 'f1', name: 'Home', nodes: mockNodes }]}
          activeFrameId="f1"
          nodes={mockNodes}
          designTokens={DEFAULT_DESIGN_TOKENS}
          onApplyTokenToSelected={(type, val) => {
            appliedToken = { type, val };
          }}
        />
      );
    });

    expect(div.querySelector('[data-testid="tokens-panel"]')).not.toBeNull();
    const primaryColorToken = div.querySelector('[data-testid="token-color-primary"]');
    expect(primaryColorToken).not.toBeNull();
    await act(async () => {
      primaryColorToken.click();
    });
    expect(appliedToken).toEqual({ type: 'color', val: '#18181b' });

    // 2. Components Tab
    await act(async () => {
      root.render(
        <LeftSidebar
          tab="components"
          setTab={() => {}}
          frames={[{ id: 'f1', name: 'Home', nodes: mockNodes }]}
          activeFrameId="f1"
          nodes={mockNodes}
          selectedIds={['inst_x']}
          components={mockCustomComponents}
          onCreateComponentFromSelection={(name) => {
            createdCompName = name;
          }}
          onInsertComponentInstance={(id) => {
            insertedCompId = id;
          }}
        />
      );
    });

    const createCompBtn = div.querySelector('[data-testid="create-component-from-selection-btn"]');
    expect(createCompBtn).not.toBeNull();
    await act(async () => {
      createCompBtn.click();
    });
    expect(createdCompName).toBe('Component');

    const insertBtn = div.querySelector('[data-testid="insert-instance-comp_hdr"]');
    expect(insertBtn).not.toBeNull();
    await act(async () => {
      insertBtn.click();
    });
    expect(insertedCompId).toBe('comp_hdr');

    // 3. Layers Tab (Instance badge)
    await act(async () => {
      root.render(
        <LeftSidebar
          tab="layers"
          setTab={() => {}}
          frames={[{ id: 'f1', name: 'Home', nodes: mockNodes }]}
          activeFrameId="f1"
          nodes={mockNodes}
        />
      );
    });

    const instanceBadge = div.querySelector('[data-testid="instance-badge-inst_x"]');
    expect(instanceBadge).not.toBeNull();
    expect(instanceBadge.textContent).toContain('Instance');

    await act(async () => {
      root.unmount();
    });
  });

  test('Export and import preserves designTokens and components', () => {
    const project = {
      id: 'p_test',
      name: 'Design System Project',
      frames: [{ id: 'f1', name: 'Screen 1', nodes: [] }],
      designTokens: {
        colors: { primary: '#0055ff', background: '#000000' },
        radius: { sm: 4, md: 8, lg: 12 },
        spacing: { sm: 8, md: 16 },
      },
      components: [
        {
          id: 'cmp_nav',
          name: 'Navbar',
          nodes: [{ id: 'n1', type: 'text', text: 'Nav Title' }],
        },
      ],
    };

    const exported = exportProjectJSON(project);
    expect(exported).toContain('lowVersion');
    expect(exported).toContain('"#0055ff"');
    expect(exported).toContain('cmp_nav');

    const imported = parseImportJSON(exported);
    expect(Array.isArray(imported)).toBe(true);
    expect(imported.designTokens.colors.primary).toBe('#0055ff');
    expect(imported.components.length).toBe(1);
    expect(imported.components[0].id).toBe('cmp_nav');
  });
});
