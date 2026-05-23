// Ora MCP landing — dynamic content + clipboard interactions
(() => {
  const TOOLS = [
    { name: 'list_components',       desc: 'Every Ora component with a one-line description.' },
    { name: 'search_components',     desc: 'Keyword search across names, descriptions, and methods.' },
    { name: 'get_component_api',     desc: 'Full method signatures for a single component.' },
    { name: 'get_component_guide',   desc: 'Long-form usage guide with examples and styling notes.' },
    { name: 'get_usage_example',     desc: 'A runnable code snippet showing the component in use.' },
    { name: 'get_component_stories', desc: 'All Storybook stories for a component — full source + names.' },
    { name: 'get_router_docs',       desc: 'RouterBuilder, LinkBuilder, route patterns, navigation.' },
    { name: 'get_architecture_guide',desc: 'Architecture, theme, reactive, builder pattern, icons.' },
  ];

  const grid = document.getElementById('tool-grid');
  grid.innerHTML = TOOLS.map(t => `
    <article class="tool">
      <code class="tool-name">${t.name}</code>
      <p class="tool-desc">${t.desc}</p>
    </article>
  `).join('');

  const endpoint = `https://mcp.ora-components.com/api/mcp`;
  document.getElementById('endpoint-inline').textContent = endpoint;
  document.getElementById('status-link').href = endpoint;

  const snippets = {
    claude: JSON.stringify({
      mcpServers: {
        'ora-components': {
          command: 'npx',
          args: ['-y', 'mcp-remote', endpoint],
        },
      },
    }, null, 2),

    cursor: JSON.stringify({
      mcpServers: {
        'ora-components': {
          url: endpoint,
          transport: 'http',
        },
      },
    }, null, 2),

    opencode: JSON.stringify({
      mcp: {
        'ora-components': {
          type: 'remote',
          url: endpoint,
          enabled: true,
        },
      },
    }, null, 2),

    curl: [
      `curl -sS -X POST ${endpoint} \\`,
      `  -H 'Content-Type: application/json' \\`,
      `  -d '{"jsonrpc":"2.0","id":1,"method":"tools/list"}'`,
    ].join('\n'),
  };

  for (const key of Object.keys(snippets)) {
    const el = document.getElementById(`code-${key}`);
    if (el) el.textContent = snippets[key];
  }

  const toast = document.getElementById('toast');
  let toastTimer;
  function showToast(msg) {
    toast.textContent = msg;
    toast.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toast.classList.remove('show'), 1800);
  }

  async function copy(text) {
    try {
      await navigator.clipboard.writeText(text);
      showToast('Copied to clipboard');
    } catch {
      showToast('Copy failed — please select manually');
    }
  }

  document.querySelectorAll('[data-copy]').forEach(btn => {
    btn.addEventListener('click', () => {
      const key = btn.getAttribute('data-copy');
      copy(snippets[key] ?? '');
    });
  });

  const pulse = document.getElementById('status-pulse');
  const statusText = document.getElementById('status-text');

  async function checkStatus() {
    try {
      const res = await fetch(endpoint, { method: 'GET', signal: AbortSignal.timeout(5000) });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const info = await res.json();
      pulse.className = 'pulse online';
      statusText.textContent = 'Remote MCP server · online';
      if (Array.isArray(info.tools)) {
        document.getElementById('stat-tools').textContent = String(info.tools.length);
      }
    } catch {
      pulse.className = 'pulse offline';
      statusText.textContent = 'Remote MCP server · unavailable';
    }
  }

  checkStatus();
})();
