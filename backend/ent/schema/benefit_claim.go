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

type BenefitClaim struct {
	ent.Schema
}

func (BenefitClaim) Annotations() []schema.Annotation {
	return []schema.Annotation{
		entsql.Annotation{Table: "benefit_claims"},
	}
}

func (BenefitClaim) Mixin() []ent.Mixin {
	return []ent.Mixin{
		mixins.TimeMixin{},
	}
}

func (BenefitClaim) Fields() []ent.Field {
	return []ent.Field{
		field.Int64("campaign_id"),
		field.Int64("user_id"),
		field.String("status").
			MaxLen(20).
			Default("claimed"),
		field.Float("eligible_recharge_amount").
			SchemaType(map[string]string{dialect.Postgres: "decimal(20,8)"}),
		field.Float("granted_amount").
			SchemaType(map[string]string{dialect.Postgres: "decimal(20,8)"}),
		field.Float("balance_before").
			SchemaType(map[string]string{dialect.Postgres: "decimal(20,8)"}),
		field.Float("balance_after").
			SchemaType(map[string]string{dialect.Postgres: "decimal(20,8)"}),
		field.Time("claimed_at").
			SchemaType(map[string]string{dialect.Postgres: "timestamptz"}),
		field.String("source_redeem_code").
			Optional().
			Nillable().
			MaxLen(64),
		field.JSON("metadata", map[string]any{}).
			Optional().
			SchemaType(map[string]string{dialect.Postgres: "jsonb"}),
	}
}

func (BenefitClaim) Edges() []ent.Edge {
	return []ent.Edge{
		edge.From("campaign", BenefitCampaign.Type).
			Ref("claims").
			Field("campaign_id").
			Required().
			Unique(),
		edge.From("user", User.Type).
			Ref("benefit_claims").
			Field("user_id").
			Required().
			Unique(),
	}
}

func (BenefitClaim) Indexes() []ent.Index {
	return []ent.Index{
		index.Fields("campaign_id"),
		index.Fields("user_id"),
		index.Fields("campaign_id", "user_id").Unique(),
		index.Fields("claimed_at"),
	}
}
