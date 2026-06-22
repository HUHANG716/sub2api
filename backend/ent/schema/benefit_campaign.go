package schema

import (
	"github.com/Wei-Shaw/sub2api/ent/schema/mixins"

	"entgo.io/ent"
	"entgo.io/ent/dialect"
	"entgo.io/ent/dialect/entsql"
	"entgo.io/ent/schema"
	"entgo.io/ent/schema/edge"
	"entgo.io/ent/schema/field"
	"entgo.io/ent/schema/index"
)

type BenefitCampaign struct {
	ent.Schema
}

func (BenefitCampaign) Annotations() []schema.Annotation {
	return []schema.Annotation{
		entsql.Annotation{Table: "benefit_campaigns"},
	}
}

func (BenefitCampaign) Mixin() []ent.Mixin {
	return []ent.Mixin{
		mixins.TimeMixin{},
		mixins.SoftDeleteMixin{},
	}
}

func (BenefitCampaign) Fields() []ent.Field {
	return []ent.Field{
		field.String("name").
			MaxLen(120).
			NotEmpty(),
		field.Bool("enabled").
			Default(true),
		field.Bool("visible").
			Default(true),
		field.Time("starts_at").
			SchemaType(map[string]string{dialect.Postgres: "timestamptz"}),
		field.Time("ends_at").
			SchemaType(map[string]string{dialect.Postgres: "timestamptz"}),
		field.Float("threshold_amount").
			SchemaType(map[string]string{dialect.Postgres: "decimal(20,8)"}),
		field.Float("grant_amount").
			SchemaType(map[string]string{dialect.Postgres: "decimal(20,8)"}),
		field.String("recharge_scope").
			MaxLen(32).
			Default("lifetime"),
		field.JSON("copy", map[string]string{}).
			Optional().
			SchemaType(map[string]string{dialect.Postgres: "jsonb"}),
		field.Int("sort_order").
			Default(0),
	}
}

func (BenefitCampaign) Edges() []ent.Edge {
	return []ent.Edge{
		edge.To("claims", BenefitClaim.Type),
	}
}

func (BenefitCampaign) Indexes() []ent.Index {
	return []ent.Index{
		index.Fields("enabled"),
		index.Fields("visible"),
		index.Fields("starts_at", "ends_at"),
		index.Fields("visible", "sort_order"),
		index.Fields("deleted_at"),
	}
}
