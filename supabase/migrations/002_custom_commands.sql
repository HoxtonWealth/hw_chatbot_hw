-- Custom Commands table for slash command management
-- Story 6.5: Slash Command Management

------------------------------------------------------------
-- CUSTOM COMMANDS
------------------------------------------------------------
CREATE TABLE custom_commands (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  description TEXT NOT NULL,
  usage_hint TEXT,
  prompt_template TEXT,
  is_builtin BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Name validation: lowercase, alphanumeric + hyphens, max 20 chars, must start with letter/number
ALTER TABLE custom_commands ADD CONSTRAINT chk_command_name
  CHECK (name ~ '^[a-z0-9][a-z0-9-]{0,19}$');

------------------------------------------------------------
-- INDEXES
------------------------------------------------------------
CREATE INDEX idx_custom_commands_name ON custom_commands(name);

------------------------------------------------------------
-- TRIGGERS
------------------------------------------------------------
CREATE TRIGGER custom_commands_updated_at
  BEFORE UPDATE ON custom_commands
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

------------------------------------------------------------
-- SEED BUILT-IN COMMANDS
------------------------------------------------------------
INSERT INTO custom_commands (name, description, usage_hint, is_builtin) VALUES
  ('compare', 'Compare two documents on a topic', '/compare [doc1] vs [doc2] [topic]', true),
  ('summarize', 'Summarize a topic or document', '/summarize [topic or document name]', true),
  ('sources', 'List all documents in the knowledge base', '/sources', true),
  ('export', 'Export conversation to clipboard as Markdown', '/export', true);
