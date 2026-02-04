-- Add xlsx and csv as valid source_type values
ALTER TABLE documents DROP CONSTRAINT IF EXISTS documents_source_type_check;
ALTER TABLE documents ADD CONSTRAINT documents_source_type_check
  CHECK (source_type IN ('pdf', 'url', 'text', 'docx', 'md', 'xlsx', 'csv'));
