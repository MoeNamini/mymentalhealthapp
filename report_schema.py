"""Same field names and types as the supplied schema, with generation guidance.

Use alongside runtime validation in ai_report_support: descriptions alone cannot
prevent empty strings. No unsupported Gemini minLength constraint is introduced.
"""

from pydantic import BaseModel, Field


class FrictionCategory(BaseModel):
    category: str = Field(description="Short category for reported missed-Action reasons.")
    percentage: int = Field(description="Integer share of counted missed occurrences.")


class AICoachSchema(BaseModel):
    acknowledgment: str = Field(
        description="Required nonempty opening acknowledgment, grounded in the records."
    )
    action_insights: str = Field(
        description=(
            "Required nonempty connected analysis of the user's Actions and records. "
            "When evidence is insufficient, explain what is known and unknown. "
            "Never leave blank and never move this text into structural_suggestions."
        )
    )
    structural_suggestions: str = Field(
        description=(
            "Required nonempty plain-text adjustments linked to action_insights, "
            "or an explanation that the data does not justify an adjustment."
        )
    )
    encouragement: str = Field(
        description="Required nonempty warm personal closing; this is not a question field."
    )
    friction_categories: list[FrictionCategory] = Field(
        description="Reported friction breakdown; use an empty list when no misses qualify."
    )
