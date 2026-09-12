import { createRoot } from 'react-dom/client';
import { act } from 'react';
import LeftSidebar from '../LeftSidebar';
import BottomStatusBar from '../BottomStatusBar';
import AiImportPanel from '../AiImportPanel';
import AgentPanel from '../AgentPanel';
global.IS_REACT_ACT_ENVIRONMENT = true;

beforeAll(() => {
  global.fetch = jest.fn(() =>
    Promise.resolve({
      ok: true,
      json: () => Promise.resolve({}),
    })
  );
});

describe('Editor Enhancements & AI Import Engine', () => {
  test('LeftSidebar, BottomStatusBar, and AgentPanel integrity', () => {
    expect(typeof LeftSidebar).toBe('function');
    expect(typeof BottomStatusBar).toBe('function');
    expect(typeof AiImportPanel).toBe('function');
    expect(typeof AgentPanel).toBe('function');
  });

  test('AiImportPanel renders correctly with provider badge and history tab', async () => {
    const div = document.createElement('div');
    const root = createRoot(div);
    await act(async () => {
      root.render(<AiImportPanel projectId="test-p" onApplyPatch={() => {}} />);
    });
    expect(div.querySelector('[data-testid="ai-import-panel"]')).not.toBeNull();
    expect(div.querySelector('[data-testid="ai-generate-btn"]')).not.toBeNull();
    expect(div.querySelector('[data-testid="ai-output-type"]')).not.toBeNull();
    expect(div.querySelector('[data-testid="ai-prompt-input"]')).not.toBeNull();
    expect(div.querySelector('[data-testid="ai-provider-badge"]')).not.toBeNull();
    expect(div.querySelector('[data-testid="ai-history-tab-btn"]')).not.toBeNull();
    await act(async () => {
      root.unmount();
    });
  });

  test('AiImportPanel switches to history tab cleanly', async () => {
    const div = document.createElement('div');
    const root = createRoot(div);
    await act(async () => {
      root.render(<AiImportPanel projectId="test-p" onApplyPatch={() => {}} />);
    });
    const historyBtn = div.querySelector('[data-testid="ai-history-tab-btn"]');
    expect(historyBtn).not.toBeNull();
    await act(async () => {
      historyBtn.click();
    });
    expect(div.querySelector('[data-testid="ai-history-list"]')).not.toBeNull();
    await act(async () => {
      root.unmount();
    });
  });

  test('AgentPanel renders in offline state with preset selector and start button', async () => {
    const div = document.createElement('div');
    const root = createRoot(div);
    await act(async () => {
      root.render(
        <AgentPanel
          session={null}
          onStart={() => {}}
          onStop={() => {}}
        />
      );
    });
    expect(div.querySelector('[data-testid="agent-status"]')?.textContent).toContain('Offline');
    expect(div.querySelector('[data-testid="agent-preset-select"]')).not.toBeNull();
    expect(div.querySelector('[data-testid="agent-start-btn"]')).not.toBeNull();
    await act(async () => {
      root.unmount();
    });
  });

  test('AgentPanel renders in connected state with copy buttons, dry-run toggle, and status badge', async () => {
    const div = document.createElement('div');
    const root = createRoot(div);
    const mockSession = {
      session_id: 'sess_123',
      token: 'tok_abc',
      scopes: ['read_document', 'write_document', 'dry_run'],
      preset: 'design_assistant',
      is_revoked: false,
    };
    await act(async () => {
      root.render(
        <AgentPanel
          session={mockSession}
          onStart={() => {}}
          onStop={() => {}}
          onRevoke={() => {}}
          onSimulate={() => {}}
          onUndoLast={() => {}}
          dryRunMode={false}
        />
      );
    });
    expect(div.querySelector('[data-testid="agent-status"]')?.textContent).toContain('Connected');
    expect(div.querySelector('[data-testid="agent-copy-endpoint"]')).not.toBeNull();
    expect(div.querySelector('[data-testid="agent-copy-session"]')).not.toBeNull();
    expect(div.querySelector('[data-testid="agent-copy-token"]')).not.toBeNull();
    expect(div.querySelector('[data-testid="agent-copy-prompt"]')).not.toBeNull();
    expect(div.querySelector('[data-testid="agent-dryrun-toggle"]')).not.toBeNull();
    expect(div.querySelector('[data-testid="agent-undo-btn"]')).not.toBeNull();
    expect(div.querySelector('[data-testid="agent-revoke-btn"]')).not.toBeNull();
    await act(async () => {
      root.unmount();
    });
  });

  test('AgentPanel renders Revoked badge when session is revoked', async () => {
    const div = document.createElement('div');
    const root = createRoot(div);
    const mockRevokedSession = {
      session_id: 'sess_123',
      token: 'tok_abc',
      scopes: ['read_document'],
      preset: 'read_only',
      is_revoked: true,
    };
    await act(async () => {
      root.render(
        <AgentPanel
          session={mockRevokedSession}
          onStart={() => {}}
          onStop={() => {}}
        />
      );
    });
    expect(div.querySelector('[data-testid="agent-status"]')?.textContent).toContain('Revoked');
    await act(async () => {
      root.unmount();
    });
  });

  test('AiImportPanel settings gear button opens and closes settings modal', async () => {
    const div = document.createElement('div');
    const root = createRoot(div);
    await act(async () => {
      root.render(<AiImportPanel projectId="test-p" onApplyPatch={() => {}} />);
    });
    const gearBtn = div.querySelector('[data-testid="ai-settings-gear-btn"]');
    expect(gearBtn).not.toBeNull();
    await act(async () => {
      gearBtn.click();
    });
    expect(div.querySelector('[data-testid="ai-settings-modal"]')).not.toBeNull();
    const closeBtn = div.querySelector('[data-testid="close-ai-settings-btn"]');
    expect(closeBtn).not.toBeNull();
    await act(async () => {
      closeBtn.click();
    });
    expect(div.querySelector('[data-testid="ai-settings-modal"]')).toBeNull();
    await act(async () => {
      root.unmount();
    });
  });

  test('AgentPanel settings gear button opens and closes settings modal', async () => {
    const div = document.createElement('div');
    const root = createRoot(div);
    await act(async () => {
      root.render(
        <AgentPanel
          session={null}
          onStart={() => {}}
          onStop={() => {}}
        />
      );
    });
    const gearBtn = div.querySelector('[data-testid="agent-settings-gear-btn"]');
    expect(gearBtn).not.toBeNull();
    await act(async () => {
      gearBtn.click();
    });
    expect(div.querySelector('[data-testid="agent-settings-modal"]')).not.toBeNull();
    const closeBtn = div.querySelector('[data-testid="close-agent-settings-btn"]');
    expect(closeBtn).not.toBeNull();
    await act(async () => {
      closeBtn.click();
    });
    expect(div.querySelector('[data-testid="agent-settings-modal"]')).toBeNull();
    await act(async () => {
      root.unmount();
    });
  });
});

