# Supabase MCP Setup

## 1. Configurar MCP en tu editor

1. Abre tu editor.
2. Ve a `Cursor Settings > Features > MCP`.
3. Añade un nuevo servidor MCP.
4. Pega este comando, sustituyendo la URL por tu connection string de Supabase:

```bash
npx -y @modelcontextprotocol/server-postgres <AQUI_MI_URL_DE_SUPABASE>
```

Ejemplo de formato de URL:

```bash
postgresql://postgres:<PASSWORD>@db.<PROJECT_REF>.supabase.co:5432/postgres
```

<span style="color:red;font-weight:900;font-size:1.15em">ADVERTENCIA CRITICA: la URL de Supabase incluye password. NUNCA la subas al repositorio, NUNCA la pegues en codigo fuente y NUNCA la dejes en texto plano dentro del proyecto.</span>

## 1.b Plantilla lista para pegar

He dejado una plantilla lista en:

```bash
mcp/postgres.cursor.example.json
```

Abrela, sustituye la URL por la tuya y pega su contenido en la configuracion MCP de Cursor.

## 2. Tipos locales de Supabase

Instala la CLI si no la tienes:

```bash
npm install -D supabase
```

Genera tipos locales:

```bash
npm run supabase:types
```

El resultado se escribira en:

```bash
types/supabase.ts
```

## 3. Regla operativa del repo

Este proyecto ya tiene:

- `MCP_SETUP.md`
- `.cursorrules`
- `mcp/postgres.cursor.example.json`

Con eso, el repo queda preparado para que el MCP de Postgres se conecte siempre de la misma forma en cuanto pegues tu connection string real en el editor.
