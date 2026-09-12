import { createRoot } from 'react-dom/client';
import { act } from 'react';
import RightPropertiesPanel from '../RightPropertiesPanel';
import TopToolbar from '../TopToolbar';
import CanvasArea from '../CanvasArea';
import {
  generateTokensCss,
  generateNodeCss,
  generateTailwindClasses,
  generateNodeSvg,
  generateFrameSvg,
} from '@/utils/exportUtils';

// Enable act environment for React 18+
global.IS_REACT_ACT_ENVIRONMENT = true;

describe('LOW Phase 10: Export, Handoff, and Developer Mode', () => {
  describe('exportUtils CSS and SVG generation', () => {
    test('generateTokensCss generates valid CSS custom properties', () => {
      const tokens = {
        colors: { primary: '#18181b', background: '#ffffff' },
        radius: { sm: 4, md: 8 },
        spacing: { sm: 8, md: 16 },
      };
      const css = generateTokensCss(tokens);
      expect(css).toContain(':root {');
      expect(css).toContain('--low-color-primary: #18181b;');
      expect(css).toContain('--low-radius-md: 8px;');
      expect(css).toContain('--low-spacing-sm: 8px;');
    });

    test('generateNodeCss generates valid element CSS', () => {
      const node = {
        id: 'btn_1',
        name: 'Submit Button',
        type: 'button',
        x: 20,
        y: 80,
        width: 320,
        height: 48,
        style: {
          fill: '#18181b',
          stroke: '#000000',
          strokeWidth: 1,
          radius: 8,
          color: '#ffffff',
          fontSize: 16,
          fontWeight: 600,
        },
      };
      const css = generateNodeCss(node, false);
      expect(css).toContain('.low-submit-button {');
      expect(css).toContain('position: absolute;');
      expect(css).toContain('left: 20px;');
      expect(css).toContain('top: 80px;');
      expect(css).toContain('width: 320px;');
      expect(css).toContain('height: 48px;');
      expect(css).toContain('background: #18181b;');
      expect(css).toContain('border-radius: 8px;');
      expect(css).toContain('color: #ffffff;');
    });

    test('generateTailwindClasses creates utility classes', () => {
      const node = {
        type: 'text',
        width: 100,
        height: 24,
        style: {
          fontSize: 16,
          fontWeight: 600,
          color: '#18181b',
        },
      };
      const tw = generateTailwindClasses(node);
      expect(tw).toContain('w-[100px]');
      expect(tw).toContain('h-[24px]');
      expect(tw).toContain('font-semibold');
      expect(tw).toContain('text-[16px]');
    });

    test('generateNodeSvg excludes hidden nodes and computes bounds', () => {
      const nodes = [
        { id: 'n1', type: 'rectangle', x: 10, y: 20, width: 100, height: 50, style: { fill: '#e4e4e7' } },
        { id: 'n2', type: 'text', x: 20, y: 80, width: 80, height: 20, hidden: true, text: 'Secret' },
      ];
      const svg = generateNodeSvg(nodes, nodes);
      expect(svg).toContain('<svg width="100" height="50"');
      expect(svg).toContain('id="n1"');
      expect(svg).not.toContain('id="n2"');
      expect(svg).not.toContain('Secret');
    });

    test('generateFrameSvg creates standalone frame svg', () => {
      const frame = {
        id: 'f1',
        name: 'Screen 1',
        width: 390,
        height: 844,
        nodes: [
          { id: 'n1', type: 'button', x: 20, y: 100, width: 350, height: 44, text: 'Next', style: { fill: '#18181b', color: '#fff' } },
        ],
      };
      const svg = generateFrameSvg(frame);
      expect(svg).toContain('<svg width="390" height="844"');
      expect(svg).toContain('Next');
      expect(svg).toContain('id="n1"');
    });
  });

  describe('UI Component Inspect Mode and Export Actions', () => {
    test('RightPropertiesPanel in inspect mode renders Developer Inspect with CSS Preview and export actions', async () => {
      const div = document.createElement('div');
      const root = createRoot(div);

      const targetNode = {
        id: 'btn_main',
        name: 'Main Button',
        type: 'button',
        x: 24,
        y: 120,
        width: 342,
        height: 48,
        style: { fill: '#18181b', radius: 8, color: '#ffffff', fontSize: 16, fontWeight: 600 },
      };

      await act(async () => {
        root.render(
          <RightPropertiesPanel
            mode="inspect"
            node={targetNode}
            selectedNodes={[targetNode]}
            activeFrame={{ id: 'f1', name: 'Home', width: 390, height: 844, nodes: [targetNode] }}
            designTokens={{
              colors: { primary: '#18181b' },
              radius: { md: 8 },
              spacing: { sm: 8 },
            }}
          />
        );
      });

      const inspectPanel = div.querySelector('[data-testid="inspect-panel"]');
      expect(inspectPanel).not.toBeNull();
      expect(inspectPanel.textContent).toContain('Developer Inspect');

      const cssPreview = div.querySelector('[data-testid="inspect-css-preview"]');
      expect(cssPreview).not.toBeNull();
      expect(cssPreview.textContent).toContain('.low-main-button');

      const copyCssBtn = div.querySelector('[data-testid="copy-css-btn"]');
      expect(copyCssBtn).not.toBeNull();

      const copyJsonBtn = div.querySelector('[data-testid="copy-json-btn"]');
      expect(copyJsonBtn).not.toBeNull();

      const copyTwBtn = div.querySelector('[data-testid="copy-tailwind-btn"]');
      expect(copyTwBtn).not.toBeNull();

      const exportSvgBtn = div.querySelector('[data-testid="export-selection-svg-btn"]');
      expect(exportSvgBtn).not.toBeNull();

      const exportPngBtn = div.querySelector('[data-testid="export-selection-png-btn"]');
      expect(exportPngBtn).not.toBeNull();
    });

    test('TopToolbar renders Inspect mode option and quick export buttons', async () => {
      const div = document.createElement('div');
      const root = createRoot(div);

      let exportedSvg = false;
      let exportedPng = false;

      await act(async () => {
        root.render(
          <TopToolbar
            activeTool="select"
            onToolClick={() => {}}
            mode="inspect"
            setMode={() => {}}
            projectName="Export Project"
            activeFrame={{ id: 'f1', name: 'Checkout', preset: 'iPhone 15' }}
            onExportFrameSvg={() => { exportedSvg = true; }}
            onExportFramePng={() => { exportedPng = true; }}
          />
        );
      });

      const svgBtn = div.querySelector('[data-testid="export-frame-svg-btn"]');
      expect(svgBtn).not.toBeNull();
      svgBtn.click();
      expect(exportedSvg).toBe(true);

      const pngBtn = div.querySelector('[data-testid="export-frame-png-btn"]');
      expect(pngBtn).not.toBeNull();
      pngBtn.click();
      expect(exportedPng).toBe(true);
    });

    test('CanvasArea in inspect mode is read-only for element positions', async () => {
      const div = document.createElement('div');
      const root = createRoot(div);

      let updatedPos = false;
      let selectedNodeId = null;

      const testNode = {
        id: 'card1',
        name: 'Card',
        type: 'rectangle',
        x: 10,
        y: 10,
        width: 100,
        height: 100,
      };

      await act(async () => {
        root.render(
          <CanvasArea
            frames={[{ id: 'f1', name: 'Frame 1', width: 390, height: 844, nodes: [testNode] }]}
            activeFrameId="f1"
            selectFrame={() => {}}
            selectedId="card1"
            selectedIds={['card1']}
            setSelectedId={(id) => { selectedNodeId = id; }}
            setSelectedIds={() => {}}
            updateNodeLive={() => { updatedPos = true; }}
            mode="inspect"
            zoom={1}
          />
        );
      });

      const nodeEl = div.querySelector('[data-testid="canvas-node-card1"]');
      expect(nodeEl).not.toBeNull();

      // Trigger mousedown on node in inspect mode
      await act(async () => {
        nodeEl.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, clientX: 20, clientY: 20 }));
      });

      // Selection was set, but no dragging/live update was triggered
      expect(selectedNodeId).toBe('card1');
      expect(updatedPos).toBe(false);
    });
  });
});
