-- Migration: 147_image_studio_template_remove_inferred_reference
-- Stop carrying importer-inferred image-edit/reference requirements on GitHub templates.

UPDATE image_studio_templates
SET mode = 'generation',
    requires_reference = FALSE
WHERE source_type = 'github';
