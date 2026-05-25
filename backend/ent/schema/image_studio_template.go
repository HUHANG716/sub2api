package schema

import (
	"github.com/Wei-Shaw/sub2api/ent/schema/mixins"

	"entgo.io/ent"
	"entgo.io/ent/dialect"
	"entgo.io/ent/dialect/entsql"
	"entgo.io/ent/schema"
	"entgo.io/ent/schema/field"
	"entgo.io/ent/schema/index"
)

// ImageStudioTemplate stores prompt templates and preview assets for the image studio.
type ImageStudioTemplate struct {
	ent.Schema
}

func (ImageStudioTemplate) Annotations() []schema.Annotation {
	return []schema.Annotation{
		entsql.Annotation{Table: "image_studio_templates"},
	}
}

func (ImageStudioTemplate) Mixin() []ent.Mixin {
	return []ent.Mixin{
		mixins.TimeMixin{},
	}
}

func (ImageStudioTemplate) Fields() []ent.Field {
	return []ent.Field{
		field.String("key").
			NotEmpty().
			MaxLen(120).
			Unique(),
		field.String("mode").
			NotEmpty().
			MaxLen(20).
			Comment("generation or edit"),
		field.String("title").
			NotEmpty().
			MaxLen(160),
		field.String("model").
			NotEmpty().
			MaxLen(80),
		field.String("image").
			NotEmpty().
			MaxLen(1000).
			Comment("preview image URL or local public path"),
		field.String("original_image_url").
			Optional().
			Default("").
			MaxLen(1000).
			Comment("remote preview image URL before local caching"),
		field.String("image_hash").
			Optional().
			Default("").
			MaxLen(64).
			Comment("sha256 hash of the locally cached preview image"),
		field.String("image_download_error").
			Optional().
			Default("").
			MaxLen(1000).
			Comment("last preview image download error"),
		field.String("prompt_hash").
			Optional().
			Default("").
			MaxLen(64).
			Comment("sha256 hash of normalized prompt for import de-duplication"),
		field.String("prompt").
			NotEmpty().
			SchemaType(map[string]string{dialect.Postgres: "text"}),
		field.String("source_name").
			Optional().
			Default("").
			MaxLen(200),
		field.String("source_url").
			Optional().
			Default("").
			MaxLen(1000),
		field.String("source_type").
			Optional().
			Default("").
			MaxLen(50),
		field.String("license").
			Optional().
			Default("").
			MaxLen(120),
		field.String("author").
			Optional().
			Default("").
			MaxLen(120),
		field.String("meta").
			Optional().
			Default("").
			MaxLen(500),
		field.JSON("tags", []string{}).
			Optional().
			SchemaType(map[string]string{dialect.Postgres: "jsonb"}),
		field.Bool("requires_reference").
			Default(false),
		field.Bool("enabled").
			Default(true),
		field.Int("sort_order").
			Default(0),
	}
}

func (ImageStudioTemplate) Indexes() []ent.Index {
	return []ent.Index{
		index.Fields("enabled", "mode"),
		index.Fields("model"),
		index.Fields("sort_order"),
	}
}
