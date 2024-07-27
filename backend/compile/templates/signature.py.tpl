import dspy

class {{ schema.name }}Signature(dspy.Signature):
    """ {{ schema.description }} """
    {% for field in schema.fields %}
    {{field.name}} = {% if field.mode == "input" %} dspy.InputField( {% else %} dspy.OutputField( {% endif %}
        desc="{{field.description}}",
        prefix="{{field.prefix}}")
    {% endfor %}

module = dspy.{{strategy}}({{schema.name}}Signature)
name = "{{schema.name}}"

opt_type = dspy.teleprompt.{{opt_type}}
opt_config = {{opt_config}}