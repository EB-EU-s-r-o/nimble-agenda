# Overenie projektu cez Supabase MCP

V Cursore máš v `.cursor/mcp.json` nakonfigurovaný **Supabase MCP** pre projekt `hrkwqdvfeudxkqttpgls`. Môžeš ho použiť na rýchle overenie bez toho, aby si musel ísť do Dashboardu.

## Čo MCP ponúka

- **Database:** `list_tables`, `execute_sql`, `list_migrations`
- **Edge Functions:** `list_edge_functions`, `get_edge_function`, `deploy_edge_function`
- **Development:** `get_project_url`, `get_publishable_keys`, `generate_typescript_types`
- **Debugging:** `get_logs`, `get_advisors`

Dokumentácia: [Supabase MCP](https://supabase.com/docs/guides/getting-started/mcp).

## Ako overiť v Cursore

1. **Nastavenie:** Settings → Cursor Settings → Tools & MCP. Skontroluj, že je zapnutý Supabase MCP a prihlásený na účet s prístupom k projektu.
2. **Príklady promptov (napíš asistentovi):**
   - „Zoznam Edge Functions v mojom Supabase projekte – použij MCP.“
   - „Aké tabuľky mám v databáze? Použi Supabase MCP.“
   - „Over pomocou MCP, či sú nasadené create-public-booking a save-smtp-config.“

MCP server má v URL `project_ref=hrkwqdvfeudxkqttpgls`, takže všetky volania sú scopnuté na tento projekt.
